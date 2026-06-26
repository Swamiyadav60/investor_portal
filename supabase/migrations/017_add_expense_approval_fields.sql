-- Add expense approval workflow fields
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS submitted_by UUID NOT NULL REFERENCES investors(id),
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES investors(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS bill_url TEXT;
