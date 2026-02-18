-- =============================================================================
-- Classroom Enhancements Migration
-- Adds post comments, realtime for participants, graded_score to submissions
-- =============================================================================

-- 1. Add graded_score & teacher_comment to assignment_submissions for teacher grading
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'assignment_submissions'
      AND column_name = 'graded_score'
  ) THEN
    ALTER TABLE public.assignment_submissions ADD COLUMN graded_score numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'assignment_submissions'
      AND column_name = 'teacher_comment'
  ) THEN
    ALTER TABLE public.assignment_submissions ADD COLUMN teacher_comment text;
  END IF;
END $$;

-- 2. Create post_comments table for discussion on classroom posts
CREATE TABLE IF NOT EXISTS public.post_comments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id       UUID NOT NULL REFERENCES public.classroom_posts(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL,
  content       TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_post_comments_post ON public.post_comments(post_id, created_at);

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

-- RLS: Classroom members & teachers can read comments on posts in their classroom
CREATE POLICY "Users can read comments on their classroom posts"
ON public.post_comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.classroom_posts cp
    WHERE cp.id = post_id
      AND (
        is_classroom_member(auth.uid(), cp.classroom_id)
        OR is_classroom_teacher(auth.uid(), cp.classroom_id)
      )
  )
);

-- Users can insert comments on posts in their classroom
CREATE POLICY "Users can comment on their classroom posts"
ON public.post_comments FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.classroom_posts cp
    WHERE cp.id = post_id
      AND (
        is_classroom_member(auth.uid(), cp.classroom_id)
        OR is_classroom_teacher(auth.uid(), cp.classroom_id)
      )
  )
);

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
ON public.post_comments FOR DELETE
USING (user_id = auth.uid());

-- 3. Enable realtime for live_session_participants (live_sessions already published)
DO $$
BEGIN
  -- Only add if not already in publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'live_session_participants'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.live_session_participants;
  END IF;

  -- Also publish post_comments for realtime updates
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'post_comments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comments;
  END IF;
END $$;
