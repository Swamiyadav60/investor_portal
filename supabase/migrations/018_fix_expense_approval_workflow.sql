-- ============================================================
-- 018_fix_expense_approval_workflow.sql
-- Branch Ambassador → Admin Approval Workflow (Safe Migration)
--
-- FIXES:
--   017 used ADD COLUMN submitted_by NOT NULL which breaks existing rows.
--   This migration ensures all approval columns exist correctly.
--
-- BUSINESS RULES:
--   1. Branch Ambassador submits expense  → status = 'pending'
--   2. Admin approves                     → status = 'approved'
--   3. Admin rejects with reason          → status = 'rejected'
--   4. Only 'approved' expenses affect investor reports/dashboard
-- ============================================================

-- Step 1: Ensure status column exists with the correct default
--   (010 added it but some envs may differ)
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';

-- Add a CHECK constraint to enforce allowed values (idempotent‑safe via DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'expenses_status_check'
    AND conrelid = 'public.expenses'::regclass
  ) THEN
    ALTER TABLE public.expenses
      ADD CONSTRAINT expenses_status_check
      CHECK (status IN ('pending', 'approved', 'rejected'));
  END IF;
END;
$$;

-- Step 2: Add admin_remarks (from 010 — safe to repeat with IF NOT EXISTS)
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS admin_remarks TEXT;

-- Step 3: Add approval workflow columns (from 011 — safe)
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS bill_url      TEXT,
  ADD COLUMN IF NOT EXISTS approved_by   UUID REFERENCES public.investors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at   TIMESTAMPTZ;

-- Step 4: Add remaining approval fields (from 017 — but NULLABLE, not NOT NULL)
--   submitted_by: who submitted the expense (Branch Ambassador or Admin)
--   rejected_at:  timestamp when admin rejected it
--   rejection_reason: why it was rejected (shown to ambassador)
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS submitted_by     UUID REFERENCES public.investors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejected_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Step 5: Backfill submitted_by = created_by for existing rows that have created_by set
UPDATE public.expenses
  SET submitted_by = created_by
  WHERE submitted_by IS NULL AND created_by IS NOT NULL;

-- Step 6: Indexes for efficient querying by status and submitted_by
CREATE INDEX IF NOT EXISTS idx_expenses_status       ON public.expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_submitted_by ON public.expenses(submitted_by);
CREATE INDEX IF NOT EXISTS idx_expenses_approved_by  ON public.expenses(approved_by);

-- ============================================================
-- RLS Policy Updates
-- ============================================================

-- Drop outdated policies that may conflict
DROP POLICY IF EXISTS "Investors can view expenses for their kiosks"     ON public.expenses;
DROP POLICY IF EXISTS "Investors and ambassadors can view expenses"       ON public.expenses;
DROP POLICY IF EXISTS "Ambassadors can insert own expenses"               ON public.expenses;

-- SELECT: Investors see expenses for their kiosks (approved only via app logic).
--         Admins see all. Ambassadors see what they submitted.
CREATE POLICY "expenses_select_policy"
  ON public.expenses FOR SELECT
  USING (
    is_admin()
    OR kiosk_id IN (SELECT get_my_kiosk_ids())
    OR submitted_by = get_my_investor_id()
    OR created_by   = get_my_investor_id()
  );

-- INSERT: Branch Ambassadors and Admins can create expenses.
--         submitted_by must be the current user.
CREATE POLICY "expenses_insert_policy"
  ON public.expenses FOR INSERT
  TO authenticated
  WITH CHECK (
    (submitted_by = get_my_investor_id() OR submitted_by IS NULL)
    AND (created_by = get_my_investor_id() OR created_by IS NULL OR is_admin())
  );

-- UPDATE: Only Admins can update expenses (approve / reject).
CREATE POLICY "expenses_update_policy"
  ON public.expenses FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- DELETE: Only Admins can delete expenses.
CREATE POLICY "expenses_delete_policy"
  ON public.expenses FOR DELETE
  USING (is_admin());

-- ============================================================
-- Helper RPC: approve_expense
-- Usage: SELECT approve_expense(p_expense_id := '<uuid>');
-- ============================================================
CREATE OR REPLACE FUNCTION public.approve_expense(p_expense_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: only admins can approve expenses';
  END IF;

  UPDATE public.expenses
  SET
    status      = 'approved',
    approved_by = get_my_investor_id(),
    approved_at = NOW()
  WHERE id = p_expense_id;
END;
$$;

-- ============================================================
-- Helper RPC: reject_expense
-- Usage: SELECT reject_expense(p_expense_id := '<uuid>', p_reason := 'Invalid bill');
-- ============================================================
CREATE OR REPLACE FUNCTION public.reject_expense(
  p_expense_id UUID,
  p_reason     TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: only admins can reject expenses';
  END IF;

  UPDATE public.expenses
  SET
    status           = 'rejected',
    rejected_at      = NOW(),
    rejection_reason = p_reason,
    admin_remarks    = COALESCE(p_reason, admin_remarks)
  WHERE id = p_expense_id;
END;
$$;
