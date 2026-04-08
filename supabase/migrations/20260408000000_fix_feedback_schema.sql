-- Ensure the feedback table matches the client payload and admin UI.

ALTER TABLE public.feedback
  ADD COLUMN IF NOT EXISTS platform TEXT;

ALTER TABLE public.feedback
  ADD COLUMN IF NOT EXISTS user_agent TEXT;

ALTER TABLE public.feedback
  ADD COLUMN IF NOT EXISTS app_version TEXT;

UPDATE public.feedback
SET platform = COALESCE(platform, 'web')
WHERE platform IS NULL;

ALTER TABLE public.feedback
  ALTER COLUMN platform SET DEFAULT 'web';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'feedback_platform_check'
      AND conrelid = 'public.feedback'::regclass
  ) THEN
    ALTER TABLE public.feedback
      ADD CONSTRAINT feedback_platform_check
      CHECK (platform IN ('web', 'mobile'));
  END IF;
END $$;