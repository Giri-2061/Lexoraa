-- =============================================================================
-- Fix Classroom RLS Policies
-- 1. Allow super_admin to create consultancies
-- 2. Allow super_admin to create classrooms without owning a consultancy check
-- 3. Allow teachers to grade (update) assignment submissions
-- 4. Allow super_admin to view all consultancies
-- =============================================================================

-- Fix: Allow super_admin to create consultancies (currently only consultancy_owner)
DROP POLICY IF EXISTS "Consultancy owners can create consultancies" ON public.consultancies;
CREATE POLICY "Consultancy owners and admins can create consultancies"
ON public.consultancies FOR INSERT
WITH CHECK (
  owner_id = auth.uid()
  AND (
    has_role(auth.uid(), 'consultancy_owner')
    OR has_role(auth.uid(), 'super_admin')
  )
);

-- Fix: Allow super_admin to view all consultancies (not just their own)
DROP POLICY IF EXISTS "Users can view their own consultancy" ON public.consultancies;
CREATE POLICY "Users can view their own consultancy"
ON public.consultancies FOR SELECT
USING (
  owner_id = auth.uid()
  OR has_role(auth.uid(), 'super_admin')
);

-- Fix: Allow super_admin to update any consultancy
DROP POLICY IF EXISTS "Consultancy owners can update their consultancy" ON public.consultancies;
CREATE POLICY "Consultancy owners can update their consultancy"
ON public.consultancies FOR UPDATE
USING (
  owner_id = auth.uid()
  OR has_role(auth.uid(), 'super_admin')
);

-- Fix: Allow super_admin to create classrooms
DROP POLICY IF EXISTS "Teachers can create classrooms in their consultancy" ON public.classrooms;
CREATE POLICY "Teachers can create classrooms in their consultancy"
ON public.classrooms FOR INSERT
WITH CHECK (
  teacher_id = auth.uid()
  AND (
    is_consultancy_owner(auth.uid(), consultancy_id)
    OR has_role(auth.uid(), 'super_admin')
  )
);

-- Fix: Allow super_admin to view all classrooms
CREATE POLICY "Super admins can view all classrooms"
ON public.classrooms FOR SELECT
USING (has_role(auth.uid(), 'super_admin'));

-- Fix: Allow super_admin to update/delete any classroom
CREATE POLICY "Super admins can update any classroom"
ON public.classrooms FOR UPDATE
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete any classroom"
ON public.classrooms FOR DELETE
USING (has_role(auth.uid(), 'super_admin'));

-- Fix: Allow teachers to update (grade) assignment submissions
CREATE POLICY "Teachers can grade submissions"
ON public.assignment_submissions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.assignments a
    WHERE a.id = assignment_id AND is_classroom_teacher(auth.uid(), a.classroom_id)
  )
);
