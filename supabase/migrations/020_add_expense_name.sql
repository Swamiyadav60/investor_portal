-- Add expense_name and expense_catalog_id to public.expenses
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS expense_name TEXT,
  ADD COLUMN IF NOT EXISTS expense_catalog_id UUID REFERENCES public.expense_catalog(id) ON DELETE SET NULL;

-- Backfill: for existing expenses, set expense_name = category if null
UPDATE public.expenses
SET expense_name = category
WHERE expense_name IS NULL;
