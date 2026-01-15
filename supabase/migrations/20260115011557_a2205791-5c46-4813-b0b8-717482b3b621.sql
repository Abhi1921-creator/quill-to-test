-- Fix profiles RLS policy to prevent access to profiles with NULL institute_id
-- Issue: Institute admins could potentially access profiles with NULL institute_id

DROP POLICY IF EXISTS "Admins can view all profiles in institute" ON public.profiles;

CREATE POLICY "Admins can view all profiles in institute" 
  ON public.profiles FOR SELECT USING (
  public.has_role(auth.uid(), 'super_admin') OR
  (institute_id IS NOT NULL AND public.has_role(auth.uid(), 'institute_admin', institute_id))
);