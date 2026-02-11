-- =============================================================================
-- Feedback System Migration
-- Creates the feedback table and adds feedback-tracking columns to profiles.
-- =============================================================================

-- 1. Create the feedback table
CREATE TABLE IF NOT EXISTS public.feedback (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating        SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  message       TEXT,
  user_agent    TEXT,
  platform      TEXT DEFAULT 'web' CHECK (platform IN ('web', 'mobile')),
  app_version   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups and admin queries
CREATE INDEX idx_feedback_user_id    ON public.feedback(user_id);
CREATE INDEX idx_feedback_created_at ON public.feedback(created_at DESC);
CREATE INDEX idx_feedback_rating     ON public.feedback(rating);

-- 2. Add feedback-tracking columns to profiles (safe IF NOT EXISTS approach)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles'
      AND column_name = 'last_feedback_prompt_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN last_feedback_prompt_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles'
      AND column_name = 'has_submitted_feedback'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN has_submitted_feedback BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles'
      AND column_name = 'feedback_dismissed_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN feedback_dismissed_at TIMESTAMPTZ;
  END IF;
END $$;

-- 3. Row Level Security
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Users can insert their own feedback
CREATE POLICY "Users can insert own feedback"
  ON public.feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can read their own feedback
CREATE POLICY "Users can read own feedback"
  ON public.feedback FOR SELECT
  USING (auth.uid() = user_id);

-- Super admins can read all feedback
CREATE POLICY "Admins can read all feedback"
  ON public.feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'super_admin'
    )
  );

-- 4. Prevent duplicate submissions (one feedback per 24h window)
CREATE UNIQUE INDEX idx_feedback_unique_per_day
  ON public.feedback (user_id, (created_at::date));
