-- Add status and admin_remarks to expenses table
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS admin_remarks TEXT;
