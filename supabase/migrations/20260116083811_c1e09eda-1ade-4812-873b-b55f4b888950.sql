-- Create a function to handle institute creation with automatic admin role
CREATE OR REPLACE FUNCTION public.handle_institute_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Assign institute_admin role to the creator
  INSERT INTO public.user_roles (user_id, role, institute_id)
  VALUES (NEW.created_by, 'institute_admin'::app_role, NEW.id)
  ON CONFLICT DO NOTHING;
  
  -- Update the creator's profile with the institute_id
  UPDATE public.profiles
  SET institute_id = NEW.id
  WHERE id = NEW.created_by;
  
  RETURN NEW;
END;
$$;

-- Create trigger for automatic admin role on institute creation
DROP TRIGGER IF EXISTS on_institute_created ON public.institutes;
CREATE TRIGGER on_institute_created
  AFTER INSERT ON public.institutes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_institute_creation();

-- Allow institute admins to view profiles of users in their institute (for user management)
DROP POLICY IF EXISTS "Institute admins can view institute member profiles" ON public.profiles;
CREATE POLICY "Institute admins can view institute member profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  institute_id IS NOT NULL 
  AND has_role(auth.uid(), 'institute_admin'::app_role, institute_id)
);

-- Allow institute admins to manage teacher roles within their institute
DROP POLICY IF EXISTS "Institute admins can manage teacher roles" ON public.user_roles;
CREATE POLICY "Institute admins can manage teacher roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  role = 'teacher'::app_role
  AND institute_id IS NOT NULL
  AND has_role(auth.uid(), 'institute_admin'::app_role, institute_id)
)
WITH CHECK (
  role = 'teacher'::app_role
  AND institute_id IS NOT NULL
  AND has_role(auth.uid(), 'institute_admin'::app_role, institute_id)
);