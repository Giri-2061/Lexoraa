-- Allow students to submit completed tests for teacher review in classrooms.

CREATE TABLE IF NOT EXISTS public.test_review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_result_id UUID NOT NULL REFERENCES public.test_results(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'graded')),
  teacher_score NUMERIC,
  teacher_comment TEXT,
  teacher_rubric JSONB,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  graded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (classroom_id, student_id, test_result_id)
);

ALTER TABLE public.test_review_requests
  ADD COLUMN IF NOT EXISTS teacher_rubric JSONB;

CREATE INDEX IF NOT EXISTS idx_test_review_requests_classroom_id
  ON public.test_review_requests(classroom_id);

CREATE INDEX IF NOT EXISTS idx_test_review_requests_student_id
  ON public.test_review_requests(student_id);

CREATE INDEX IF NOT EXISTS idx_test_review_requests_status
  ON public.test_review_requests(status);

ALTER TABLE public.test_review_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students and teachers can view classroom test review requests" ON public.test_review_requests;
CREATE POLICY "Students and teachers can view classroom test review requests"
  ON public.test_review_requests FOR SELECT
  USING (
    student_id = auth.uid()
    OR is_classroom_teacher(auth.uid(), classroom_id)
  );

DROP POLICY IF EXISTS "Students can create own test review requests" ON public.test_review_requests;
CREATE POLICY "Students can create own test review requests"
  ON public.test_review_requests FOR INSERT
  WITH CHECK (
    student_id = auth.uid()
    AND is_classroom_member(auth.uid(), classroom_id)
    AND EXISTS (
      SELECT 1
      FROM public.test_results tr
      WHERE tr.id = test_result_id
        AND tr.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Teachers can grade classroom test review requests" ON public.test_review_requests;
CREATE POLICY "Teachers can grade classroom test review requests"
  ON public.test_review_requests FOR UPDATE
  USING (is_classroom_teacher(auth.uid(), classroom_id));