-- Create table: expense_catalog
CREATE TABLE IF NOT EXISTS public.expense_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  default_amount NUMERIC NOT NULL DEFAULT 0 CHECK (default_amount >= 0),
  expense_mode TEXT NOT NULL CHECK (expense_mode IN ('fixed', 'custom')),
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.expense_catalog ENABLE ROW LEVEL SECURITY;

-- Select policy: Anyone authenticated can view active expense catalog items
CREATE POLICY "Anyone authenticated can view expense catalog"
  ON public.expense_catalog FOR SELECT
  TO authenticated
  USING (true);

-- Insert/Update/Delete policy: Only Admins can manage catalog
CREATE POLICY "Admins can manage expense catalog"
  ON public.expense_catalog FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Seed initial catalog data
INSERT INTO public.expense_catalog (name, category, default_amount, expense_mode, description, is_active)
VALUES
  ('Paper Refill', 'Paper', 250, 'fixed', 'Standard paper tray refill', true),
  ('Printer Cleaning', 'Maintenance', 200, 'fixed', 'Regular kiosk cleaning and maintenance', true),
  ('Toner Refill', 'Toner / Ink', 1500, 'fixed', 'Standard toner cartridge replacement', true),
  ('Emergency Repair', 'Maintenance', 0, 'custom', 'Unexpected technical repairs', true),
  ('Spare Part Replacement', 'Maintenance', 0, 'custom', 'Replacement of physical hardware parts', true)
ON CONFLICT (name) DO NOTHING;
