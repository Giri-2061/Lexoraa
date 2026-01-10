-- Create consultancies table
CREATE TABLE public.consultancies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create classrooms table
CREATE TABLE public.classrooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  consultancy_id uuid NOT NULL REFERENCES public.consultancies(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL,
  invite_code text UNIQUE NOT NULL DEFAULT substring(md5(random()::text), 1, 8),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create classroom memberships table
CREATE TABLE public.classroom_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(classroom_id, student_id)
);

-- Create classroom posts table
CREATE TABLE public.classroom_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL,
  title text NOT NULL,
  content text,
  post_type text NOT NULL CHECK (post_type IN ('resource', 'announcement', 'question')),
  attachment_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create assignments table
CREATE TABLE public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  test_type text NOT NULL CHECK (test_type IN ('listening', 'reading')),
  book_id text NOT NULL,
  test_id text NOT NULL,
  section_ids text[], -- optional: specific sections only
  due_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create assignment submissions table
CREATE TABLE public.assignment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  test_result_id uuid REFERENCES public.test_results(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'graded')),
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(assignment_id, student_id)
);

-- Enable RLS on all tables
ALTER TABLE public.consultancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is teacher of a classroom
CREATE OR REPLACE FUNCTION public.is_classroom_teacher(_user_id uuid, _classroom_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.classrooms
    WHERE id = _classroom_id AND teacher_id = _user_id
  )
$$;

-- Helper function to check if user is member of a classroom
CREATE OR REPLACE FUNCTION public.is_classroom_member(_user_id uuid, _classroom_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.classroom_memberships
    WHERE classroom_id = _classroom_id AND student_id = _user_id
  )
$$;

-- Helper function to check if user owns the consultancy
CREATE OR REPLACE FUNCTION public.is_consultancy_owner(_user_id uuid, _consultancy_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.consultancies
    WHERE id = _consultancy_id AND owner_id = _user_id
  )
$$;

-- Consultancies policies
CREATE POLICY "Users can view their own consultancy"
ON public.consultancies FOR SELECT
USING (owner_id = auth.uid());

CREATE POLICY "Consultancy owners can create consultancies"
ON public.consultancies FOR INSERT
WITH CHECK (owner_id = auth.uid() AND has_role(auth.uid(), 'consultancy_owner'));

CREATE POLICY "Consultancy owners can update their consultancy"
ON public.consultancies FOR UPDATE
USING (owner_id = auth.uid());

-- Classrooms policies
CREATE POLICY "Teachers can view their classrooms"
ON public.classrooms FOR SELECT
USING (teacher_id = auth.uid());

CREATE POLICY "Students can view classrooms they belong to"
ON public.classrooms FOR SELECT
USING (is_classroom_member(auth.uid(), id));

CREATE POLICY "Teachers can create classrooms in their consultancy"
ON public.classrooms FOR INSERT
WITH CHECK (teacher_id = auth.uid() AND is_consultancy_owner(auth.uid(), consultancy_id));

CREATE POLICY "Teachers can update their classrooms"
ON public.classrooms FOR UPDATE
USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can delete their classrooms"
ON public.classrooms FOR DELETE
USING (teacher_id = auth.uid());

-- Classroom memberships policies
CREATE POLICY "Teachers can view their classroom members"
ON public.classroom_memberships FOR SELECT
USING (is_classroom_teacher(auth.uid(), classroom_id));

CREATE POLICY "Students can view their own memberships"
ON public.classroom_memberships FOR SELECT
USING (student_id = auth.uid());

CREATE POLICY "Teachers can add students to their classrooms"
ON public.classroom_memberships FOR INSERT
WITH CHECK (is_classroom_teacher(auth.uid(), classroom_id));

CREATE POLICY "Students can join classrooms with invite code"
ON public.classroom_memberships FOR INSERT
WITH CHECK (student_id = auth.uid() AND has_role(auth.uid(), 'student'));

CREATE POLICY "Teachers can remove students from their classrooms"
ON public.classroom_memberships FOR DELETE
USING (is_classroom_teacher(auth.uid(), classroom_id));

-- Classroom posts policies
CREATE POLICY "Teachers can view posts in their classrooms"
ON public.classroom_posts FOR SELECT
USING (is_classroom_teacher(auth.uid(), classroom_id));

CREATE POLICY "Students can view posts in their classrooms"
ON public.classroom_posts FOR SELECT
USING (is_classroom_member(auth.uid(), classroom_id));

CREATE POLICY "Teachers can create posts in their classrooms"
ON public.classroom_posts FOR INSERT
WITH CHECK (is_classroom_teacher(auth.uid(), classroom_id) AND teacher_id = auth.uid());

CREATE POLICY "Teachers can update their posts"
ON public.classroom_posts FOR UPDATE
USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can delete their posts"
ON public.classroom_posts FOR DELETE
USING (teacher_id = auth.uid());

-- Assignments policies
CREATE POLICY "Teachers can view assignments in their classrooms"
ON public.assignments FOR SELECT
USING (is_classroom_teacher(auth.uid(), classroom_id));

CREATE POLICY "Students can view assignments in their classrooms"
ON public.assignments FOR SELECT
USING (is_classroom_member(auth.uid(), classroom_id));

CREATE POLICY "Teachers can create assignments"
ON public.assignments FOR INSERT
WITH CHECK (is_classroom_teacher(auth.uid(), classroom_id) AND teacher_id = auth.uid());

CREATE POLICY "Teachers can update their assignments"
ON public.assignments FOR UPDATE
USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can delete their assignments"
ON public.assignments FOR DELETE
USING (teacher_id = auth.uid());

-- Assignment submissions policies
CREATE POLICY "Teachers can view submissions in their classrooms"
ON public.assignment_submissions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.assignments a
    WHERE a.id = assignment_id AND is_classroom_teacher(auth.uid(), a.classroom_id)
  )
);

CREATE POLICY "Students can view their own submissions"
ON public.assignment_submissions FOR SELECT
USING (student_id = auth.uid());

CREATE POLICY "Students can create their submissions"
ON public.assignment_submissions FOR INSERT
WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can update their submissions"
ON public.assignment_submissions FOR UPDATE
USING (student_id = auth.uid());

-- Add triggers for updated_at
CREATE TRIGGER update_consultancies_updated_at
BEFORE UPDATE ON public.consultancies
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_classrooms_updated_at
BEFORE UPDATE ON public.classrooms
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_classroom_posts_updated_at
BEFORE UPDATE ON public.classroom_posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at
BEFORE UPDATE ON public.assignments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();