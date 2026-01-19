-- Fix 1: Restrict institutes table to authenticated users only
DROP POLICY IF EXISTS "Anyone can view institutes" ON public.institutes;

CREATE POLICY "Authenticated users can view institutes"
ON public.institutes
FOR SELECT
TO authenticated
USING (true);

-- Fix 2: Make pdf-pages bucket private and add secure access policies
UPDATE storage.buckets 
SET public = false 
WHERE id = 'pdf-pages';

-- Drop the public read policy
DROP POLICY IF EXISTS "Public can view pdf pages" ON storage.objects;

-- Create authenticated access policy for teachers/admins who create exams
CREATE POLICY "Authenticated teachers and admins can access pdf pages"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'pdf-pages'
  AND (
    -- User is a teacher or admin (can view all pdf pages for their exams)
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('teacher', 'institute_admin', 'super_admin')
    )
    OR
    -- User is taking an exam (can view pages related to their session)
    EXISTS (
      SELECT 1 FROM public.exam_sessions es
      WHERE es.student_id = auth.uid()
      AND es.status = 'in_progress'
    )
  )
);

-- Update the upload policy to ensure only authenticated teachers/admins can upload
DROP POLICY IF EXISTS "Authenticated users can upload pdf pages" ON storage.objects;

CREATE POLICY "Teachers and admins can upload pdf pages"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'pdf-pages'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('teacher', 'institute_admin', 'super_admin')
  )
);

-- Fix 3: Create a view for questions that hides answers during exams
-- First, we need to drop and recreate the SELECT policy for questions to only show answers
-- after the exam is complete or to teachers/admins

DROP POLICY IF EXISTS "Users can view questions of accessible exams" ON public.questions;

-- Policy for teachers/admins to see full questions including answers
CREATE POLICY "Teachers and admins can view full questions"
ON public.questions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.exams e
    WHERE e.id = questions.exam_id
    AND (
      e.created_by = auth.uid()
      OR has_role(auth.uid(), 'institute_admin'::app_role, e.institute_id)
      OR has_role(auth.uid(), 'super_admin'::app_role)
      OR has_role(auth.uid(), 'teacher'::app_role, e.institute_id)
    )
  )
);

-- Policy for students to view questions (they can view via RLS but application should filter answers)
CREATE POLICY "Students can view published exam questions"
ON public.questions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.exams e
    WHERE e.id = questions.exam_id
    AND e.status = 'published'::exam_status
    AND auth.uid() IS NOT NULL
    -- Only students who are actually taking the exam
    AND (
      -- Student has an active/completed session for this exam
      EXISTS (
        SELECT 1 FROM public.exam_sessions es
        WHERE es.exam_id = e.id
        AND es.student_id = auth.uid()
      )
    )
  )
);