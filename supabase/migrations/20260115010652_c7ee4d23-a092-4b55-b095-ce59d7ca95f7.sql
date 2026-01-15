-- Fix #1: Require authentication to view published exams
DROP POLICY IF EXISTS "Anyone can view published exams" ON public.exams;

CREATE POLICY "Authenticated users can view published exams" 
ON public.exams FOR SELECT USING (
  (status = 'published' AND auth.uid() IS NOT NULL) OR 
  created_by = auth.uid() OR
  public.has_role(auth.uid(), 'institute_admin', institute_id) OR
  public.has_role(auth.uid(), 'teacher', institute_id)
);

-- Fix #2: Restrict self-signup to student role only (teachers must be assigned by admins)
DROP POLICY IF EXISTS "Users can create their own initial role" ON public.user_roles;

CREATE POLICY "Users can create student role only"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() 
  AND role = 'student'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid()
  )
);

-- Update the handle_new_user trigger to only assign student role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.email
  );
  
  -- Always assign student role - teacher role must be granted by admin
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student'::app_role);
  
  RETURN NEW;
END;
$$;