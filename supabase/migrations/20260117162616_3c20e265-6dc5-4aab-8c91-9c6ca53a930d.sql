-- Drop the restrictive student-only RLS policy
DROP POLICY IF EXISTS "Users can create student role only" ON public.user_roles;

-- Create a new policy that allows users to self-assign student or teacher role during signup
CREATE POLICY "Users can create own role during signup"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() 
  AND role IN ('student', 'teacher')
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid()
  )
);

-- Update the handle_new_user function to respect role selection from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  selected_role app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.email
  );
  
  -- Get role from user metadata, only allow student or teacher, default to student
  selected_role := CASE 
    WHEN NEW.raw_user_meta_data ->> 'role' IN ('student', 'teacher') 
    THEN (NEW.raw_user_meta_data ->> 'role')::app_role
    ELSE 'student'::app_role
  END;
  
  -- Assign selected role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, selected_role);
  
  RETURN NEW;
END;
$$;