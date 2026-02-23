-- ============================================================================
-- Tiered Multi-Tenancy: Add tier column + student limit enforcement
-- ============================================================================

-- 1. Create the tier enum type
DO $$ BEGIN
  CREATE TYPE consultancy_tier AS ENUM ('basic', 'professional', 'enterprise');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Add tier column to consultancies (default 'basic')
ALTER TABLE consultancies
  ADD COLUMN IF NOT EXISTS tier consultancy_tier NOT NULL DEFAULT 'basic';

-- 3. Create the check_student_limit() trigger function
CREATE OR REPLACE FUNCTION check_student_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_consultancy_id uuid;
  v_tier consultancy_tier;
  v_max_students int;
  v_current_count int;
BEGIN
  -- Get the consultancy_id for the classroom being joined
  SELECT c.consultancy_id INTO v_consultancy_id
  FROM classrooms c
  WHERE c.id = NEW.classroom_id;

  IF v_consultancy_id IS NULL THEN
    RAISE EXCEPTION 'Classroom not found';
  END IF;

  -- Get the tier of the consultancy
  SELECT tier INTO v_tier
  FROM consultancies
  WHERE id = v_consultancy_id;

  -- Determine the max students based on tier
  v_max_students := CASE v_tier
    WHEN 'basic' THEN 5
    WHEN 'professional' THEN 15
    WHEN 'enterprise' THEN 100
    ELSE 5
  END;

  -- Count ALL students across ALL classrooms in this consultancy
  SELECT COUNT(*) INTO v_current_count
  FROM classroom_memberships cm
  INNER JOIN classrooms cl ON cl.id = cm.classroom_id
  WHERE cl.consultancy_id = v_consultancy_id;

  -- Enforce the limit
  IF v_current_count >= v_max_students THEN
    RAISE EXCEPTION 'Student limit reached for this consultancy tier (% tier allows % students)',
      v_tier, v_max_students;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create the trigger on classroom_memberships
DROP TRIGGER IF EXISTS trg_check_student_limit ON classroom_memberships;
CREATE TRIGGER trg_check_student_limit
  BEFORE INSERT ON classroom_memberships
  FOR EACH ROW
  EXECUTE FUNCTION check_student_limit();
