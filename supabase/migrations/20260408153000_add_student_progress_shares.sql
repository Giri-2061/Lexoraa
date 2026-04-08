-- Public student progress share snapshots.

CREATE TABLE IF NOT EXISTS public.student_progress_shares (
  share_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS student_progress_shares_user_id_key
  ON public.student_progress_shares (user_id);

ALTER TABLE public.student_progress_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view public student progress shares" ON public.student_progress_shares;
CREATE POLICY "Public can view public student progress shares"
  ON public.student_progress_shares
  FOR SELECT
  USING (is_public = true);

DROP POLICY IF EXISTS "Users can view their own student progress shares" ON public.student_progress_shares;
CREATE POLICY "Users can view their own student progress shares"
  ON public.student_progress_shares
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own student progress shares" ON public.student_progress_shares;
CREATE POLICY "Users can create their own student progress shares"
  ON public.student_progress_shares
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own student progress shares" ON public.student_progress_shares;
CREATE POLICY "Users can update their own student progress shares"
  ON public.student_progress_shares
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
