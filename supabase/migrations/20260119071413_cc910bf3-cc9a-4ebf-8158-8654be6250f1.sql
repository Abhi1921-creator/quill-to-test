-- Create a secure view that hides correct_answer and explanation for students during active exams
CREATE OR REPLACE VIEW public.questions_for_students 
WITH (security_invoker = on) AS
SELECT 
  id, 
  exam_id, 
  section_id, 
  question_text, 
  question_type, 
  options, 
  marks, 
  negative_marks, 
  order_index, 
  image_url,
  difficulty,
  created_at,
  -- Only show correct_answer after exam is completed or for teachers/admins
  CASE 
    WHEN public.has_role(auth.uid(), 'teacher'::app_role) 
      OR public.has_role(auth.uid(), 'institute_admin'::app_role) 
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
    THEN correct_answer
    WHEN EXISTS (
      SELECT 1 FROM public.exam_sessions es
      WHERE es.exam_id = questions.exam_id
      AND es.student_id = auth.uid()
      AND es.status = 'in_progress'
    ) THEN NULL -- Hide during active exam
    ELSE correct_answer
  END AS correct_answer,
  -- Only show explanation after exam is completed or for teachers/admins
  CASE 
    WHEN public.has_role(auth.uid(), 'teacher'::app_role) 
      OR public.has_role(auth.uid(), 'institute_admin'::app_role) 
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
    THEN explanation
    WHEN EXISTS (
      SELECT 1 FROM public.exam_sessions es
      WHERE es.exam_id = questions.exam_id
      AND es.student_id = auth.uid()
      AND es.status = 'in_progress'
    ) THEN NULL
    ELSE explanation
  END AS explanation
FROM public.questions;

-- Grant SELECT on the view to authenticated users
GRANT SELECT ON public.questions_for_students TO authenticated;

-- Drop the student SELECT policy on questions table that allows full access
DROP POLICY IF EXISTS "Students can view published exam questions" ON public.questions;

-- Create a more restrictive policy that denies student direct SELECT access
-- Students should use the view instead
CREATE POLICY "Students access questions via secure view only" 
ON public.questions 
FOR SELECT 
USING (
  -- Teachers and admins can directly access
  EXISTS (
    SELECT 1 FROM public.exams e
    WHERE e.id = questions.exam_id
    AND (
      e.created_by = auth.uid()
      OR public.has_role(auth.uid(), 'institute_admin'::app_role, e.institute_id)
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
      OR public.has_role(auth.uid(), 'teacher'::app_role, e.institute_id)
    )
  )
);

-- Add comment to document the secure view usage
COMMENT ON VIEW public.questions_for_students IS 'Secure view for students that hides correct_answer and explanation during active exam sessions. Use this view in TakeExam.tsx for student queries.';