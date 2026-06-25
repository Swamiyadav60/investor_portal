-- Fix colleges RLS policy to allow select access for all authenticated users and anonymous guests
DROP POLICY IF EXISTS "Anyone authenticated can view active colleges" ON public.colleges;
DROP POLICY IF EXISTS "Anyone can view active colleges" ON public.colleges;

CREATE POLICY "Anyone can view active colleges"
  ON public.colleges FOR SELECT
  USING (is_active = true OR is_admin());
