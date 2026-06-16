-- Add branch_ambassador_id to kiosks
ALTER TABLE public.kiosks ADD COLUMN IF NOT EXISTS branch_ambassador_id UUID REFERENCES public.investors(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_kiosks_branch_ambassador ON public.kiosks(branch_ambassador_id);

-- Add bill_url, approved_by, approved_at to expenses
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS bill_url TEXT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.investors(id) ON DELETE SET NULL;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_expenses_approved_by ON public.expenses(approved_by);

-- Create storage bucket for expense bills
INSERT INTO storage.buckets (id, name, public)
VALUES ('bills', 'bills', true)
ON CONFLICT (id) DO NOTHING;

-- Grant permissions for storage
CREATE POLICY "Allow public read access to bills"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'bills');

CREATE POLICY "Allow authenticated uploads to bills"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'bills');

-- Update RLS policies on kiosks table
DROP POLICY IF EXISTS "Investors can view assigned kiosks" ON public.kiosks;
CREATE POLICY "Investors and ambassadors can view assigned kiosks"
  ON public.kiosks FOR SELECT
  USING (
    is_admin() OR
    id IN (SELECT get_my_kiosk_ids()) OR
    branch_ambassador_id = get_my_investor_id() OR
    status = 'pending'
  );

-- Update RLS policies on expenses table
DROP POLICY IF EXISTS "Investors can view expenses for their kiosks" ON public.expenses;
CREATE POLICY "Investors and ambassadors can view expenses"
  ON public.expenses FOR SELECT
  USING (
    kiosk_id IN (SELECT get_my_kiosk_ids()) OR
    is_admin() OR
    created_by = get_my_investor_id()
  );

CREATE POLICY "Ambassadors can insert own expenses"
  ON public.expenses FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = get_my_investor_id()
  );

-- RPC for admin to create Branch Ambassador accounts
CREATE OR REPLACE FUNCTION public.create_ambassador_account(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id UUID;
  new_ambassador_id UUID;
BEGIN
  -- Verify if current session is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.investors 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Only administrators can create ambassador accounts';
  END IF;

  -- Create user in auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    jsonb_build_object('full_name', p_full_name),
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO new_user_id;

  -- The trigger public.on_auth_user_created will auto-create the public.investors profile.
  -- We query the profile to get the generated investor ID:
  SELECT id INTO new_ambassador_id FROM public.investors WHERE user_id = new_user_id;

  -- Update role to branch_ambassador
  UPDATE public.investors 
  SET role = 'branch_ambassador' 
  WHERE id = new_ambassador_id;

  RETURN new_ambassador_id;
END;
$$;
