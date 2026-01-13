-- Allow exams to be created without an institute
ALTER TABLE public.exams 
ALTER COLUMN institute_id DROP NOT NULL;

-- Update RLS policies to handle null institute_id
DROP POLICY IF EXISTS "Anyone can view published exams" ON public.exams;
CREATE POLICY "Anyone can view published exams" 
ON public.exams 
FOR SELECT 
USING (
  (status = 'published'::exam_status) 
  OR (created_by = auth.uid()) 
  OR (institute_id IS NOT NULL AND has_role(auth.uid(), 'institute_admin'::app_role, institute_id))
  OR (institute_id IS NOT NULL AND has_role(auth.uid(), 'teacher'::app_role, institute_id))
);

DROP POLICY IF EXISTS "Teachers and admins can create exams" ON public.exams;
CREATE POLICY "Teachers and admins can create exams" 
ON public.exams 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'teacher'::app_role)
  OR has_role(auth.uid(), 'institute_admin'::app_role)
);