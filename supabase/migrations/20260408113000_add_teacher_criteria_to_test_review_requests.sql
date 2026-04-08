-- Store teacher rubric breakdown for writing review requests.

ALTER TABLE public.test_review_requests
  ADD COLUMN IF NOT EXISTS teacher_criteria JSONB;