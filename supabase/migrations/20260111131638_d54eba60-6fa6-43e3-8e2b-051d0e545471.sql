-- Allow users to insert their own role during signup (one-time only)
CREATE POLICY "Users can create their own initial role"
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