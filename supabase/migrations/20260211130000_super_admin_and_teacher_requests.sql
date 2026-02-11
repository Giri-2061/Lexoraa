-- ============================================================
-- 1. Grant super_admin role to lexoraielts@gmail.com
-- ============================================================
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::app_role
FROM auth.users
WHERE email = 'lexoraielts@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- ============================================================
-- 2. Create teacher_requests table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.teacher_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  organization TEXT,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_teacher_requests_user_id ON public.teacher_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_teacher_requests_status ON public.teacher_requests(status);

-- ============================================================
-- 3. RLS policies for teacher_requests
-- ============================================================
ALTER TABLE public.teacher_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
DROP POLICY IF EXISTS "Users can view own teacher requests" ON public.teacher_requests;
CREATE POLICY "Users can view own teacher requests"
  ON public.teacher_requests FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own requests
DROP POLICY IF EXISTS "Users can create teacher requests" ON public.teacher_requests;
CREATE POLICY "Users can create teacher requests"
  ON public.teacher_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Super admins can view all requests
DROP POLICY IF EXISTS "Super admins can view all teacher requests" ON public.teacher_requests;
CREATE POLICY "Super admins can view all teacher requests"
  ON public.teacher_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'super_admin'
    )
  );

-- Super admins can update requests (approve/reject)
DROP POLICY IF EXISTS "Super admins can update teacher requests" ON public.teacher_requests;
CREATE POLICY "Super admins can update teacher requests"
  ON public.teacher_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'super_admin'
    )
  );
