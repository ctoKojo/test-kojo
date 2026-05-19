-- ============================================================
-- CHUNK 8 — DB Gaps Migration (adapted to actual schema)
-- Parts 1-5 only. Parts 6-8 deferred (depend on tables not yet created).
-- ============================================================

-- ============================================================
-- PART 1: SESSION & ATTENDANCE TIME GUARDS
-- Admin override → logged to audit_logs. Others → hard block.
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_session_time_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND COALESCE(OLD.status::text, '') <> 'completed' THEN
    IF now() < OLD.scheduled_at_utc THEN
      IF has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'branch_admin'::app_role]) THEN
        INSERT INTO audit_logs (actor_id, action, resource_type, resource_id, branch_id, before_data, after_data, metadata)
        VALUES (
          auth.uid(),
          'update'::audit_action,
          'group_sessions',
          OLD.id,
          OLD.branch_id,
          jsonb_build_object('status', OLD.status, 'scheduled_at_utc', OLD.scheduled_at_utc),
          jsonb_build_object('status', NEW.status, 'completed_at', now()),
          jsonb_build_object('override_reason', 'completed_before_scheduled_time', 'admin_override', true)
        );
      ELSE
        RAISE EXCEPTION 'Cannot mark session as completed before its scheduled time (%).',
          OLD.scheduled_at_utc;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_session_time_guard ON group_sessions;
CREATE TRIGGER trg_session_time_guard
  BEFORE UPDATE OF status ON group_sessions
  FOR EACH ROW EXECUTE FUNCTION fn_session_time_guard();

CREATE OR REPLACE FUNCTION public.fn_attendance_time_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_scheduled_at timestamptz;
BEGIN
  SELECT scheduled_at_utc INTO v_scheduled_at
  FROM group_sessions WHERE id = NEW.session_id;

  IF v_scheduled_at IS NOT NULL AND now() < v_scheduled_at THEN
    IF has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'branch_admin'::app_role]) THEN
      INSERT INTO audit_logs (actor_id, action, resource_type, resource_id, branch_id, after_data, metadata)
      VALUES (
        auth.uid(),
        'create'::audit_action,
        'attendance_records',
        NEW.id,
        NEW.branch_id,
        to_jsonb(NEW),
        jsonb_build_object(
          'override_reason', 'attendance_before_session_start',
          'admin_override', true,
          'scheduled_at', v_scheduled_at
        )
      );
    ELSE
      RAISE EXCEPTION 'Cannot record attendance before session starts (%).', v_scheduled_at;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_attendance_time_guard ON attendance_records;
CREATE TRIGGER trg_attendance_time_guard
  BEFORE INSERT ON attendance_records
  FOR EACH ROW EXECUTE FUNCTION fn_attendance_time_guard();

-- ============================================================
-- PART 2: is_auto_generated على group_sessions
-- ============================================================

ALTER TABLE group_sessions
  ADD COLUMN IF NOT EXISTS is_auto_generated boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN group_sessions.is_auto_generated IS
  'true = أنشأها cron/backfill أوتوماتيك، false = أنشأها يدوي';

-- ============================================================
-- PART 3: level_id denormalized على group_sessions (immutable)
-- ============================================================

ALTER TABLE group_sessions
  ADD COLUMN IF NOT EXISTS level_id uuid REFERENCES levels(id) ON DELETE SET NULL;

COMMENT ON COLUMN group_sessions.level_id IS
  'Denormalized من groups.level_id وقت الإنشاء — immutable بعد كده';

CREATE OR REPLACE FUNCTION public.fn_set_session_level_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.level_id IS NULL THEN
    SELECT level_id INTO NEW.level_id FROM groups WHERE id = NEW.group_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_session_level_id ON group_sessions;
CREATE TRIGGER trg_set_session_level_id
  BEFORE INSERT ON group_sessions
  FOR EACH ROW EXECUTE FUNCTION fn_set_session_level_id();

CREATE OR REPLACE FUNCTION public.fn_lock_session_level_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.level_id IS NOT NULL AND NEW.level_id IS DISTINCT FROM OLD.level_id THEN
    RAISE EXCEPTION 'level_id is immutable after session creation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lock_session_level_id ON group_sessions;
CREATE TRIGGER trg_lock_session_level_id
  BEFORE UPDATE OF level_id ON group_sessions
  FOR EACH ROW EXECUTE FUNCTION fn_lock_session_level_id();

-- Backfill
UPDATE group_sessions gs
SET level_id = g.level_id
FROM groups g
WHERE g.id = gs.group_id AND gs.level_id IS NULL;

-- ============================================================
-- PART 4: PARTIAL UNIQUE INDEX (active enrollment per student/group)
-- ============================================================

DROP INDEX IF EXISTS uq_active_enrollment_per_student_group;
CREATE UNIQUE INDEX uq_active_enrollment_per_student_group
  ON group_enrollments(student_id, group_id)
  WHERE status = 'active';

-- ============================================================
-- PART 5: parent_confirmation_status على compensation_sessions
-- ============================================================

ALTER TABLE compensation_sessions
  ADD COLUMN IF NOT EXISTS parent_confirmation_status text
    NOT NULL DEFAULT 'pending'
    CHECK (parent_confirmation_status IN ('pending','confirmed','rejected'));

ALTER TABLE compensation_sessions
  ADD COLUMN IF NOT EXISTS parent_confirmed_at timestamptz;

ALTER TABLE compensation_sessions
  ADD COLUMN IF NOT EXISTS parent_rejection_reason text;

COMMENT ON COLUMN compensation_sessions.parent_confirmation_status IS
  'موافقة ولي الأمر: pending/confirmed/rejected';

-- RLS: trainer يشوف confirmed فقط (يستبدل compensation_read_staff للـ trainer)
DROP POLICY IF EXISTS trainer_read_compensation_confirmed_only ON compensation_sessions;
CREATE POLICY trainer_read_compensation_confirmed_only
  ON compensation_sessions FOR SELECT TO authenticated
  USING (
    CASE
      WHEN has_role(auth.uid(), 'trainer'::app_role)
           AND NOT has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'branch_admin'::app_role, 'reception'::app_role])
      THEN parent_confirmation_status = 'confirmed' AND trainer_id = auth.uid()
      ELSE false
    END
  );