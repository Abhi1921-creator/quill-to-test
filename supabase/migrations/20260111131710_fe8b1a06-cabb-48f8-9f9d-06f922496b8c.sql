-- Update the handle_new_user function to use the role from user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  selected_role app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.email
  );
  
  -- Get role from user metadata, default to student if not specified or invalid
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
$function$;