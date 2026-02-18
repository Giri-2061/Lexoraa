-- =============================================================================
-- COMPREHENSIVE IDEMPOTENT MIGRATION
-- Consolidates ALL schema changes into a single file.
-- Safe to run on a database that already has some/all of these tables.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. ENUM TYPE
-- ─────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('super_admin', 'consultancy_owner', 'student');
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. BASE TABLES
-- ─────────────────────────────────────────────────────────────────────────────

-- 2a. profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name  TEXT,
  email      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- profiles extra columns (added by later migrations)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='target_score') THEN
    ALTER TABLE public.profiles ADD COLUMN target_score numeric DEFAULT 7.0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='is_premium') THEN
    ALTER TABLE public.profiles ADD COLUMN is_premium boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='last_feedback_prompt_at') THEN
    ALTER TABLE public.profiles ADD COLUMN last_feedback_prompt_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='has_submitted_feedback') THEN
    ALTER TABLE public.profiles ADD COLUMN has_submitted_feedback BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='feedback_dismissed_at') THEN
    ALTER TABLE public.profiles ADD COLUMN feedback_dismissed_at TIMESTAMPTZ;
  END IF;
END $$;

-- 2b. user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role       app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 2c. test_results
CREATE TABLE IF NOT EXISTS public.test_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  test_id         TEXT NOT NULL,
  test_type       TEXT NOT NULL CHECK (test_type IN ('listening', 'reading', 'writing', 'speaking')),
  correct_count   INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  band_score      DECIMAL(2,1) NOT NULL DEFAULT 0,
  duration_minutes INTEGER,
  answers         JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_test_results_user_id ON public.test_results(user_id);
CREATE INDEX IF NOT EXISTS idx_test_results_test_type ON public.test_results(test_type);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. CLASSROOM TABLES
-- ─────────────────────────────────────────────────────────────────────────────

-- 3a. consultancies
CREATE TABLE IF NOT EXISTS public.consultancies (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  owner_id   UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.consultancies ENABLE ROW LEVEL SECURITY;

-- 3b. classrooms
CREATE TABLE IF NOT EXISTS public.classrooms (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  description     TEXT,
  consultancy_id  UUID NOT NULL REFERENCES public.consultancies(id) ON DELETE CASCADE,
  teacher_id      UUID NOT NULL,
  invite_code     TEXT UNIQUE NOT NULL DEFAULT substring(md5(random()::text), 1, 8),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;

-- 3c. classroom_memberships
CREATE TABLE IF NOT EXISTS public.classroom_memberships (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  student_id   UUID NOT NULL,
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(classroom_id, student_id)
);
ALTER TABLE public.classroom_memberships ENABLE ROW LEVEL SECURITY;

-- 3d. classroom_posts
CREATE TABLE IF NOT EXISTS public.classroom_posts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id   UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  teacher_id     UUID NOT NULL,
  title          TEXT NOT NULL,
  content        TEXT,
  post_type      TEXT NOT NULL CHECK (post_type IN ('resource', 'announcement', 'question')),
  attachment_url TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.classroom_posts ENABLE ROW LEVEL SECURITY;

-- 3e. assignments
CREATE TABLE IF NOT EXISTS public.assignments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  teacher_id   UUID NOT NULL,
  title        TEXT NOT NULL,
  description  TEXT,
  test_type    TEXT NOT NULL CHECK (test_type IN ('listening', 'reading')),
  book_id      TEXT NOT NULL,
  test_id      TEXT NOT NULL,
  section_ids  TEXT[],
  due_date     TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- 3f. assignment_submissions
CREATE TABLE IF NOT EXISTS public.assignment_submissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id   UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL,
  test_result_id  UUID REFERENCES public.test_results(id),
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'graded')),
  submitted_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(assignment_id, student_id)
);
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

-- assignment_submissions extra columns (grading)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='assignment_submissions' AND column_name='graded_score') THEN
    ALTER TABLE public.assignment_submissions ADD COLUMN graded_score numeric;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='assignment_submissions' AND column_name='teacher_comment') THEN
    ALTER TABLE public.assignment_submissions ADD COLUMN teacher_comment text;
  END IF;
END $$;

-- 3g. post_comments  (NEW)
CREATE TABLE IF NOT EXISTS public.post_comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID NOT NULL REFERENCES public.classroom_posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_post_comments_post ON public.post_comments(post_id, created_at);
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. LIVE SESSIONS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.live_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id    UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  teacher_id      UUID NOT NULL,
  test_type       TEXT NOT NULL,
  book_id         TEXT NOT NULL,
  test_id         TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active',
  current_section INTEGER DEFAULT 1,
  audio_state     JSONB DEFAULT '{"playing": false, "currentTime": 0}'::jsonb,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at        TIMESTAMPTZ
);
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.live_session_participants (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, student_id)
);
ALTER TABLE public.live_session_participants ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. EVALUATIONS
-- ─────────────────────────────────────────────────────────────────────────────

-- 5a. writing_evaluations
CREATE TABLE IF NOT EXISTS public.writing_evaluations (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  test_id                   TEXT NOT NULL,
  task_number               INT NOT NULL CHECK (task_number IN (1, 2)),
  essay_text                TEXT NOT NULL,
  task_achievement_score    DECIMAL(2,1) CHECK (task_achievement_score >= 0 AND task_achievement_score <= 9),
  coherence_cohesion_score  DECIMAL(2,1) CHECK (coherence_cohesion_score >= 0 AND coherence_cohesion_score <= 9),
  lexical_resource_score    DECIMAL(2,1) CHECK (lexical_resource_score >= 0 AND lexical_resource_score <= 9),
  grammar_score             DECIMAL(2,1) CHECK (grammar_score >= 0 AND grammar_score <= 9),
  overall_band_score        DECIMAL(2,1) CHECK (overall_band_score >= 0 AND overall_band_score <= 9),
  feedback                  JSONB,
  created_at                TIMESTAMPTZ DEFAULT now(),
  updated_at                TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.writing_evaluations ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS writing_evaluations_user_id_idx ON public.writing_evaluations(user_id);
CREATE INDEX IF NOT EXISTS writing_evaluations_test_id_idx ON public.writing_evaluations(test_id);
CREATE INDEX IF NOT EXISTS writing_evaluations_created_at_idx ON public.writing_evaluations(created_at DESC);

-- 5b. speaking_evaluations
CREATE TABLE IF NOT EXISTS public.speaking_evaluations (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  test_id                 TEXT NOT NULL,
  fluency_coherence_score DECIMAL(2,1) CHECK (fluency_coherence_score BETWEEN 0 AND 9),
  lexical_resource_score  DECIMAL(2,1) CHECK (lexical_resource_score BETWEEN 0 AND 9),
  grammatical_range_score DECIMAL(2,1) CHECK (grammatical_range_score BETWEEN 0 AND 9),
  pronunciation_score     DECIMAL(2,1) CHECK (pronunciation_score BETWEEN 0 AND 9),
  overall_score           DECIMAL(2,1) CHECK (overall_score BETWEEN 0 AND 9),
  transcript_part1        TEXT,
  transcript_part2        TEXT,
  transcript_part3        TEXT,
  fluency_metrics         JSONB,
  grammar_analysis        JSONB,
  vocabulary_analysis     JSONB,
  pronunciation_analysis  JSONB,
  fluency_coherence_data  JSONB,
  lexical_resource_data   JSONB,
  grammatical_range_data  JSONB,
  pronunciation_data      JSONB,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.speaking_evaluations ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_speaking_evaluations_user_id ON public.speaking_evaluations(user_id);
CREATE INDEX IF NOT EXISTS idx_speaking_evaluations_test_id ON public.speaking_evaluations(test_id);
CREATE INDEX IF NOT EXISTS idx_speaking_evaluations_created_at ON public.speaking_evaluations(created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. FEEDBACK
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.feedback (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating      SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  message     TEXT,
  user_agent  TEXT,
  platform    TEXT DEFAULT 'web' CHECK (platform IN ('web', 'mobile')),
  app_version TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_user_id    ON public.feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_rating     ON public.feedback(rating);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. PREMIUM REQUESTS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.premium_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,
  reason      TEXT,
  status      TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.premium_requests ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. TEACHER REQUESTS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.teacher_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name    TEXT NOT NULL,
  email        TEXT NOT NULL,
  organization TEXT,
  reason       TEXT,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by  UUID REFERENCES auth.users(id),
  reviewed_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_teacher_requests_user_id ON public.teacher_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_teacher_requests_status ON public.teacher_requests(status);
ALTER TABLE public.teacher_requests ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. FUNCTIONS (all CREATE OR REPLACE, safe to re-run)
-- ─────────────────────────────────────────────────────────────────────────────

-- update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- is_classroom_teacher
CREATE OR REPLACE FUNCTION public.is_classroom_teacher(_user_id UUID, _classroom_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.classrooms
    WHERE id = _classroom_id AND teacher_id = _user_id
  )
$$;

-- is_classroom_member
CREATE OR REPLACE FUNCTION public.is_classroom_member(_user_id UUID, _classroom_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.classroom_memberships
    WHERE classroom_id = _classroom_id AND student_id = _user_id
  )
$$;

-- is_consultancy_owner
CREATE OR REPLACE FUNCTION public.is_consultancy_owner(_user_id UUID, _consultancy_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.consultancies
    WHERE id = _consultancy_id AND owner_id = _user_id
  )
$$;

-- handle_new_user (signup trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (new.id, new.raw_user_meta_data ->> 'full_name', new.email);
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'student');
  RETURN new;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. TRIGGERS (drop-if-exists + create for idempotency)
-- ─────────────────────────────────────────────────────────────────────────────

-- Signup trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_consultancies_updated_at ON public.consultancies;
CREATE TRIGGER update_consultancies_updated_at
  BEFORE UPDATE ON public.consultancies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_classrooms_updated_at ON public.classrooms;
CREATE TRIGGER update_classrooms_updated_at
  BEFORE UPDATE ON public.classrooms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_classroom_posts_updated_at ON public.classroom_posts;
CREATE TRIGGER update_classroom_posts_updated_at
  BEFORE UPDATE ON public.classroom_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_assignments_updated_at ON public.assignments;
CREATE TRIGGER update_assignments_updated_at
  BEFORE UPDATE ON public.assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_writing_evaluations_updated_at ON public.writing_evaluations;
CREATE TRIGGER update_writing_evaluations_updated_at
  BEFORE UPDATE ON public.writing_evaluations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. RLS POLICIES (all drop-if-exists + create for idempotency)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── profiles ──
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Super admin can view all profiles" ON public.profiles;
CREATE POLICY "Super admin can view all profiles"
  ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'));

-- ── user_roles ──
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Super admin can manage all roles" ON public.user_roles;
CREATE POLICY "Super admin can manage all roles"
  ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- ── test_results ──
DROP POLICY IF EXISTS "Users can view their own test results" ON public.test_results;
CREATE POLICY "Users can view their own test results"
  ON public.test_results FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own test results" ON public.test_results;
CREATE POLICY "Users can insert their own test results"
  ON public.test_results FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── consultancies (with super_admin fix) ──
DROP POLICY IF EXISTS "Consultancy owners can create consultancies" ON public.consultancies;
DROP POLICY IF EXISTS "Consultancy owners and admins can create consultancies" ON public.consultancies;
CREATE POLICY "Consultancy owners and admins can create consultancies"
  ON public.consultancies FOR INSERT
  WITH CHECK (
    owner_id = auth.uid()
    AND (has_role(auth.uid(), 'consultancy_owner') OR has_role(auth.uid(), 'super_admin'))
  );

DROP POLICY IF EXISTS "Users can view their own consultancy" ON public.consultancies;
CREATE POLICY "Users can view their own consultancy"
  ON public.consultancies FOR SELECT
  USING (owner_id = auth.uid() OR has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Consultancy owners can update their consultancy" ON public.consultancies;
CREATE POLICY "Consultancy owners can update their consultancy"
  ON public.consultancies FOR UPDATE
  USING (owner_id = auth.uid() OR has_role(auth.uid(), 'super_admin'));

-- ── classrooms (with super_admin fix) ──
DROP POLICY IF EXISTS "Teachers can view their classrooms" ON public.classrooms;
CREATE POLICY "Teachers can view their classrooms"
  ON public.classrooms FOR SELECT USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Students can view classrooms they belong to" ON public.classrooms;
CREATE POLICY "Students can view classrooms they belong to"
  ON public.classrooms FOR SELECT USING (is_classroom_member(auth.uid(), id));

DROP POLICY IF EXISTS "Teachers can create classrooms in their consultancy" ON public.classrooms;
CREATE POLICY "Teachers can create classrooms in their consultancy"
  ON public.classrooms FOR INSERT
  WITH CHECK (
    teacher_id = auth.uid()
    AND (is_consultancy_owner(auth.uid(), consultancy_id) OR has_role(auth.uid(), 'super_admin'))
  );

DROP POLICY IF EXISTS "Teachers can update their classrooms" ON public.classrooms;
CREATE POLICY "Teachers can update their classrooms"
  ON public.classrooms FOR UPDATE USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can delete their classrooms" ON public.classrooms;
CREATE POLICY "Teachers can delete their classrooms"
  ON public.classrooms FOR DELETE USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Super admins can view all classrooms" ON public.classrooms;
CREATE POLICY "Super admins can view all classrooms"
  ON public.classrooms FOR SELECT USING (has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Super admins can update any classroom" ON public.classrooms;
CREATE POLICY "Super admins can update any classroom"
  ON public.classrooms FOR UPDATE USING (has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Super admins can delete any classroom" ON public.classrooms;
CREATE POLICY "Super admins can delete any classroom"
  ON public.classrooms FOR DELETE USING (has_role(auth.uid(), 'super_admin'));

-- ── classroom_memberships ──
DROP POLICY IF EXISTS "Teachers can view their classroom members" ON public.classroom_memberships;
CREATE POLICY "Teachers can view their classroom members"
  ON public.classroom_memberships FOR SELECT
  USING (is_classroom_teacher(auth.uid(), classroom_id));

DROP POLICY IF EXISTS "Students can view their own memberships" ON public.classroom_memberships;
CREATE POLICY "Students can view their own memberships"
  ON public.classroom_memberships FOR SELECT USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can add students to their classrooms" ON public.classroom_memberships;
CREATE POLICY "Teachers can add students to their classrooms"
  ON public.classroom_memberships FOR INSERT
  WITH CHECK (is_classroom_teacher(auth.uid(), classroom_id));

DROP POLICY IF EXISTS "Students can join classrooms with invite code" ON public.classroom_memberships;
CREATE POLICY "Students can join classrooms with invite code"
  ON public.classroom_memberships FOR INSERT
  WITH CHECK (student_id = auth.uid() AND has_role(auth.uid(), 'student'));

DROP POLICY IF EXISTS "Teachers can remove students from their classrooms" ON public.classroom_memberships;
CREATE POLICY "Teachers can remove students from their classrooms"
  ON public.classroom_memberships FOR DELETE
  USING (is_classroom_teacher(auth.uid(), classroom_id));

-- ── classroom_posts ──
DROP POLICY IF EXISTS "Teachers can view posts in their classrooms" ON public.classroom_posts;
CREATE POLICY "Teachers can view posts in their classrooms"
  ON public.classroom_posts FOR SELECT
  USING (is_classroom_teacher(auth.uid(), classroom_id));

DROP POLICY IF EXISTS "Students can view posts in their classrooms" ON public.classroom_posts;
CREATE POLICY "Students can view posts in their classrooms"
  ON public.classroom_posts FOR SELECT
  USING (is_classroom_member(auth.uid(), classroom_id));

DROP POLICY IF EXISTS "Teachers can create posts in their classrooms" ON public.classroom_posts;
CREATE POLICY "Teachers can create posts in their classrooms"
  ON public.classroom_posts FOR INSERT
  WITH CHECK (is_classroom_teacher(auth.uid(), classroom_id) AND teacher_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can update their posts" ON public.classroom_posts;
CREATE POLICY "Teachers can update their posts"
  ON public.classroom_posts FOR UPDATE USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can delete their posts" ON public.classroom_posts;
CREATE POLICY "Teachers can delete their posts"
  ON public.classroom_posts FOR DELETE USING (teacher_id = auth.uid());

-- ── assignments ──
DROP POLICY IF EXISTS "Teachers can view assignments in their classrooms" ON public.assignments;
CREATE POLICY "Teachers can view assignments in their classrooms"
  ON public.assignments FOR SELECT
  USING (is_classroom_teacher(auth.uid(), classroom_id));

DROP POLICY IF EXISTS "Students can view assignments in their classrooms" ON public.assignments;
CREATE POLICY "Students can view assignments in their classrooms"
  ON public.assignments FOR SELECT
  USING (is_classroom_member(auth.uid(), classroom_id));

DROP POLICY IF EXISTS "Teachers can create assignments" ON public.assignments;
CREATE POLICY "Teachers can create assignments"
  ON public.assignments FOR INSERT
  WITH CHECK (is_classroom_teacher(auth.uid(), classroom_id) AND teacher_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can update their assignments" ON public.assignments;
CREATE POLICY "Teachers can update their assignments"
  ON public.assignments FOR UPDATE USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can delete their assignments" ON public.assignments;
CREATE POLICY "Teachers can delete their assignments"
  ON public.assignments FOR DELETE USING (teacher_id = auth.uid());

-- ── assignment_submissions (with teacher grading fix) ──
DROP POLICY IF EXISTS "Teachers can view submissions in their classrooms" ON public.assignment_submissions;
CREATE POLICY "Teachers can view submissions in their classrooms"
  ON public.assignment_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.assignments a
      WHERE a.id = assignment_id AND is_classroom_teacher(auth.uid(), a.classroom_id)
    )
  );

DROP POLICY IF EXISTS "Students can view their own submissions" ON public.assignment_submissions;
CREATE POLICY "Students can view their own submissions"
  ON public.assignment_submissions FOR SELECT USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Students can create their submissions" ON public.assignment_submissions;
CREATE POLICY "Students can create their submissions"
  ON public.assignment_submissions FOR INSERT WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Students can update their submissions" ON public.assignment_submissions;
CREATE POLICY "Students can update their submissions"
  ON public.assignment_submissions FOR UPDATE USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can grade submissions" ON public.assignment_submissions;
CREATE POLICY "Teachers can grade submissions"
  ON public.assignment_submissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.assignments a
      WHERE a.id = assignment_id AND is_classroom_teacher(auth.uid(), a.classroom_id)
    )
  );

-- ── post_comments ──
DROP POLICY IF EXISTS "Users can read comments on their classroom posts" ON public.post_comments;
CREATE POLICY "Users can read comments on their classroom posts"
  ON public.post_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.classroom_posts cp
      WHERE cp.id = post_id
        AND (is_classroom_member(auth.uid(), cp.classroom_id) OR is_classroom_teacher(auth.uid(), cp.classroom_id))
    )
  );

DROP POLICY IF EXISTS "Users can comment on their classroom posts" ON public.post_comments;
CREATE POLICY "Users can comment on their classroom posts"
  ON public.post_comments FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.classroom_posts cp
      WHERE cp.id = post_id
        AND (is_classroom_member(auth.uid(), cp.classroom_id) OR is_classroom_teacher(auth.uid(), cp.classroom_id))
    )
  );

DROP POLICY IF EXISTS "Users can delete own comments" ON public.post_comments;
CREATE POLICY "Users can delete own comments"
  ON public.post_comments FOR DELETE USING (user_id = auth.uid());

-- ── live_sessions ──
DROP POLICY IF EXISTS "Teachers can create live sessions in their classrooms" ON public.live_sessions;
CREATE POLICY "Teachers can create live sessions in their classrooms"
  ON public.live_sessions FOR INSERT
  WITH CHECK (is_classroom_teacher(auth.uid(), classroom_id) AND teacher_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can update their live sessions" ON public.live_sessions;
CREATE POLICY "Teachers can update their live sessions"
  ON public.live_sessions FOR UPDATE USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can view their live sessions" ON public.live_sessions;
CREATE POLICY "Teachers can view their live sessions"
  ON public.live_sessions FOR SELECT USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Students can view live sessions in their classrooms" ON public.live_sessions;
CREATE POLICY "Students can view live sessions in their classrooms"
  ON public.live_sessions FOR SELECT USING (is_classroom_member(auth.uid(), classroom_id));

DROP POLICY IF EXISTS "Teachers can delete their live sessions" ON public.live_sessions;
CREATE POLICY "Teachers can delete their live sessions"
  ON public.live_sessions FOR DELETE USING (teacher_id = auth.uid());

-- ── live_session_participants ──
DROP POLICY IF EXISTS "Students can join live sessions in their classrooms" ON public.live_session_participants;
CREATE POLICY "Students can join live sessions in their classrooms"
  ON public.live_session_participants FOR INSERT
  WITH CHECK (
    student_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.live_sessions ls
      WHERE ls.id = session_id AND is_classroom_member(auth.uid(), ls.classroom_id)
    )
  );

DROP POLICY IF EXISTS "Students can view their own participation" ON public.live_session_participants;
CREATE POLICY "Students can view their own participation"
  ON public.live_session_participants FOR SELECT USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can view participants in their sessions" ON public.live_session_participants;
CREATE POLICY "Teachers can view participants in their sessions"
  ON public.live_session_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.live_sessions ls
      WHERE ls.id = session_id AND ls.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Students can leave sessions" ON public.live_session_participants;
CREATE POLICY "Students can leave sessions"
  ON public.live_session_participants FOR DELETE USING (student_id = auth.uid());

-- ── writing_evaluations ──
DROP POLICY IF EXISTS "Users can view own evaluations" ON public.writing_evaluations;
CREATE POLICY "Users can view own evaluations"
  ON public.writing_evaluations FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own evaluations" ON public.writing_evaluations;
CREATE POLICY "Users can insert own evaluations"
  ON public.writing_evaluations FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Teachers can view all evaluations" ON public.writing_evaluations;
CREATE POLICY "Teachers can view all evaluations"
  ON public.writing_evaluations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('consultancy_owner', 'super_admin')
    )
  );

-- ── speaking_evaluations ──
DROP POLICY IF EXISTS "Users can view own speaking evaluations" ON public.speaking_evaluations;
CREATE POLICY "Users can view own speaking evaluations"
  ON public.speaking_evaluations FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own speaking evaluations" ON public.speaking_evaluations;
CREATE POLICY "Users can insert own speaking evaluations"
  ON public.speaking_evaluations FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Teachers can view all speaking evaluations" ON public.speaking_evaluations;
CREATE POLICY "Teachers can view all speaking evaluations"
  ON public.speaking_evaluations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('consultancy_owner', 'super_admin')
    )
  );

-- ── feedback ──
DROP POLICY IF EXISTS "Users can insert own feedback" ON public.feedback;
CREATE POLICY "Users can insert own feedback"
  ON public.feedback FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own feedback" ON public.feedback;
CREATE POLICY "Users can read own feedback"
  ON public.feedback FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read all feedback" ON public.feedback;
CREATE POLICY "Admins can read all feedback"
  ON public.feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'super_admin'
    )
  );

-- ── premium_requests ──
DROP POLICY IF EXISTS "Users can view their own requests" ON public.premium_requests;
CREATE POLICY "Users can view their own requests"
  ON public.premium_requests FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own requests" ON public.premium_requests;
CREATE POLICY "Users can create their own requests"
  ON public.premium_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Super admin can view all requests" ON public.premium_requests;
CREATE POLICY "Super admin can view all requests"
  ON public.premium_requests FOR SELECT USING (has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Super admin can update requests" ON public.premium_requests;
CREATE POLICY "Super admin can update requests"
  ON public.premium_requests FOR UPDATE USING (has_role(auth.uid(), 'super_admin'));

-- ── teacher_requests ──
DROP POLICY IF EXISTS "Users can view own teacher requests" ON public.teacher_requests;
CREATE POLICY "Users can view own teacher requests"
  ON public.teacher_requests FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create teacher requests" ON public.teacher_requests;
CREATE POLICY "Users can create teacher requests"
  ON public.teacher_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Super admins can view all teacher requests" ON public.teacher_requests;
CREATE POLICY "Super admins can view all teacher requests"
  ON public.teacher_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "Super admins can update teacher requests" ON public.teacher_requests;
CREATE POLICY "Super admins can update teacher requests"
  ON public.teacher_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'super_admin'
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. REALTIME PUBLICATIONS
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='live_sessions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.live_sessions;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='live_session_participants') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.live_session_participants;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='post_comments') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comments;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 13. SEED: Grant super_admin to lexoraielts@gmail.com
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::app_role
FROM auth.users
WHERE email = 'lexoraielts@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
