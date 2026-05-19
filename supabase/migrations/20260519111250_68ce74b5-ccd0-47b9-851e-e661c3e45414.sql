
-- ============================================================
-- Chunk 2: Academic & Operations Layer
-- ============================================================

-- Extension for GIST exclusion constraints
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============================================================
-- 0. Missing enums
-- ============================================================
DO $$ BEGIN
  CREATE TYPE enrollment_status AS ENUM ('active','completed','dropped','transferred','frozen');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE subscription_type AS ENUM ('offline','online','hybrid');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 2A. Curriculum
-- ============================================================
CREATE TABLE packages (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id        uuid NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  name             text NOT NULL,
  tier             package_tier NOT NULL,
  max_students     int NOT NULL CHECK (max_students > 0),
  sessions_count   int NOT NULL DEFAULT 12,
  price            numeric(12,2) NOT NULL,
  is_active        boolean NOT NULL DEFAULT true,
  deleted_at       timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE package_content_access (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier         package_tier NOT NULL,
  content_type content_type NOT NULL,
  allowed      boolean NOT NULL DEFAULT false,
  UNIQUE (tier, content_type)
);

CREATE TABLE levels (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id        uuid NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  name             text NOT NULL,
  order_index      int NOT NULL,
  sessions_count   int NOT NULL DEFAULT 12,
  passing_score    numeric(5,2) NOT NULL DEFAULT 60.00,
  classwork_weight numeric(5,2) NOT NULL DEFAULT 60.00,
  exam_weight      numeric(5,2) NOT NULL DEFAULT 40.00,
  description      text,
  deleted_at       timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CHECK (classwork_weight + exam_weight = 100),
  UNIQUE (branch_id, order_index)
);

CREATE TABLE level_prerequisites (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level_id       uuid NOT NULL REFERENCES levels(id) ON DELETE RESTRICT,
  requires_level uuid NOT NULL REFERENCES levels(id) ON DELETE RESTRICT,
  UNIQUE (level_id, requires_level),
  CHECK (level_id != requires_level)
);

CREATE TABLE level_determination_rules (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id      uuid NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  level_id       uuid NOT NULL REFERENCES levels(id) ON DELETE RESTRICT,
  question_tag   text NOT NULL,
  min_score_pct  numeric(5,2) NOT NULL,
  priority       int NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 2B. Students & Parents
-- ============================================================
CREATE TABLE students (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id          uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  branch_id           uuid NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  age_group_id        uuid REFERENCES age_groups(id) ON DELETE RESTRICT,
  current_level_id    uuid REFERENCES levels(id) ON DELETE RESTRICT,
  current_group_id    uuid,
  subscription_status subscription_status NOT NULL DEFAULT 'pending_payment',
  birthdate           date,
  gender              text CHECK (gender IN ('male','female')),
  school              text,
  notes               text,
  deleted_at          timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE parents (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  branch_id      uuid NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  relation_type  text NOT NULL DEFAULT 'parent' CHECK (relation_type IN ('parent','guardian')),
  deleted_at     timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE parent_student_links (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id    uuid NOT NULL REFERENCES parents(id) ON DELETE RESTRICT,
  student_id   uuid NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  is_primary   boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (parent_id, student_id)
);

CREATE TABLE entry_test_attempts (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id           uuid NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  branch_id            uuid NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  answers              jsonb NOT NULL DEFAULT '{}',
  score_pct            numeric(5,2),
  recommended_level_id uuid REFERENCES levels(id) ON DELETE RESTRICT,
  confirmed_level_id   uuid REFERENCES levels(id) ON DELETE RESTRICT,
  confirmed_by         uuid REFERENCES profiles(id) ON DELETE RESTRICT,
  confirmed_at         timestamptz,
  status               text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','scored','confirmed')),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE waiting_list (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   uuid NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  branch_id    uuid NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  level_id     uuid REFERENCES levels(id) ON DELETE RESTRICT,
  package_tier package_tier,
  position     int,
  notes        text,
  joined_at    timestamptz NOT NULL DEFAULT now(),
  assigned_at  timestamptz,
  UNIQUE (student_id, branch_id)
);

-- ============================================================
-- 2C. Groups & Sessions
-- ============================================================
CREATE TABLE groups (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id         uuid NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  level_id          uuid NOT NULL REFERENCES levels(id) ON DELETE RESTRICT,
  package_tier      package_tier NOT NULL,
  term_id           uuid REFERENCES academic_terms(id) ON DELETE RESTRICT,
  trainer_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  room_id           uuid REFERENCES rooms(id) ON DELETE RESTRICT,
  name              text NOT NULL,
  subscription_type subscription_type NOT NULL DEFAULT 'offline',
  online_link       text,
  schedule_meta     jsonb NOT NULL DEFAULT '{}',
  max_students      int NOT NULL DEFAULT 8,
  status            text NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','frozen','completed','cancelled')),
  starts_on         date,
  deleted_at        timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_online_needs_link
    CHECK (subscription_type != 'online' OR online_link IS NOT NULL)
);

ALTER TABLE students
  ADD CONSTRAINT fk_students_current_group
  FOREIGN KEY (current_group_id) REFERENCES groups(id) ON DELETE RESTRICT;

CREATE TABLE group_enrollments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    uuid NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  group_id      uuid NOT NULL REFERENCES groups(id) ON DELETE RESTRICT,
  package_id    uuid REFERENCES packages(id) ON DELETE RESTRICT,
  status        enrollment_status NOT NULL DEFAULT 'active',
  enrolled_at   timestamptz NOT NULL DEFAULT now(),
  completed_at  timestamptz,
  dropped_at    timestamptz,
  drop_reason   text,
  UNIQUE (student_id, group_id)
);

-- Add deferred FK on policy_snapshots: add nullable columns first, then FK
ALTER TABLE policy_snapshots
  ADD COLUMN IF NOT EXISTS enrollment_id uuid,
  ADD COLUMN IF NOT EXISTS branch_id     uuid;

ALTER TABLE policy_snapshots
  ADD CONSTRAINT fk_policy_snapshots_enrollment
  FOREIGN KEY (enrollment_id) REFERENCES group_enrollments(id) ON DELETE RESTRICT;

CREATE TABLE group_sessions (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id             uuid NOT NULL REFERENCES groups(id) ON DELETE RESTRICT,
  branch_id            uuid NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  trainer_id           uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  room_id              uuid REFERENCES rooms(id) ON DELETE RESTRICT,
  session_number       int NOT NULL,
  scheduled_at_utc     timestamptz NOT NULL,
  scheduled_end_at_utc timestamptz NOT NULL,
  status               session_status NOT NULL DEFAULT 'scheduled',
  closed_by            uuid REFERENCES profiles(id) ON DELETE RESTRICT,
  close_reason         text,
  version              int NOT NULL DEFAULT 0,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CHECK (scheduled_end_at_utc > scheduled_at_utc),
  UNIQUE (group_id, session_number)
);

ALTER TABLE group_sessions ADD CONSTRAINT no_trainer_overlap
  EXCLUDE USING gist (
    trainer_id WITH =,
    tstzrange(scheduled_at_utc, scheduled_end_at_utc) WITH &&
  ) WHERE (status NOT IN ('cancelled','needs_admin_review'));

ALTER TABLE group_sessions ADD CONSTRAINT no_room_overlap
  EXCLUDE USING gist (
    room_id WITH =,
    tstzrange(scheduled_at_utc, scheduled_end_at_utc) WITH &&
  ) WHERE (status NOT IN ('cancelled','needs_admin_review') AND room_id IS NOT NULL);

CREATE TABLE session_attendance (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    uuid NOT NULL REFERENCES group_sessions(id) ON DELETE RESTRICT,
  student_id    uuid NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  enrollment_id uuid NOT NULL REFERENCES group_enrollments(id) ON DELETE RESTRICT,
  status        attendance_status NOT NULL DEFAULT 'absent',
  marked_by     uuid REFERENCES profiles(id) ON DELETE RESTRICT,
  marked_at     timestamptz,
  locked_at     timestamptz,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, student_id)
);

-- ============================================================
-- Triggers
-- ============================================================
CREATE TRIGGER trg_set_updated_at_packages           BEFORE UPDATE ON packages           FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_set_updated_at_levels             BEFORE UPDATE ON levels             FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_set_updated_at_students           BEFORE UPDATE ON students           FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_set_updated_at_parents            BEFORE UPDATE ON parents            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_set_updated_at_entry_tests        BEFORE UPDATE ON entry_test_attempts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_set_updated_at_groups             BEFORE UPDATE ON groups             FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_set_updated_at_group_sessions     BEFORE UPDATE ON group_sessions     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_set_updated_at_session_attendance BEFORE UPDATE ON session_attendance FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- T2: assign age_group by birthdate (age_groups is global, match by age range only)
CREATE OR REPLACE FUNCTION fn_assign_age_group()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public AS $$
BEGIN
  IF NEW.birthdate IS NOT NULL THEN
    SELECT id INTO NEW.age_group_id
    FROM age_groups
    WHERE EXTRACT(YEAR FROM AGE(NEW.birthdate))::int BETWEEN min_age AND max_age
    ORDER BY sort_order
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_student_age_group
  BEFORE INSERT OR UPDATE OF birthdate ON students
  FOR EACH ROW EXECUTE FUNCTION fn_assign_age_group();

-- T3: validate group capacity
CREATE OR REPLACE FUNCTION fn_validate_group_capacity()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public AS $$
DECLARE
  v_current_count int;
  v_max int;
BEGIN
  SELECT COUNT(*) INTO v_current_count
  FROM group_enrollments
  WHERE group_id = NEW.group_id AND status = 'active';

  SELECT max_students INTO v_max FROM groups WHERE id = NEW.group_id;

  IF v_current_count >= v_max THEN
    RAISE EXCEPTION 'GROUP_FULL: group % has reached max capacity of %', NEW.group_id, v_max;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_group_capacity
  BEFORE INSERT ON group_enrollments
  FOR EACH ROW EXECUTE FUNCTION fn_validate_group_capacity();

-- T4: snapshot policies on enrollment (system_policies is global key/value)
CREATE OR REPLACE FUNCTION fn_snapshot_policies_on_enrollment()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public AS $$
DECLARE
  v_snapshot jsonb;
  v_branch_id uuid;
  v_keys text[];
BEGIN
  SELECT branch_id INTO v_branch_id FROM groups WHERE id = NEW.group_id;

  SELECT jsonb_object_agg(key, value), array_agg(key)
    INTO v_snapshot, v_keys
  FROM system_policies;

  INSERT INTO policy_snapshots (scope_table, scope_id, policy_keys, snapshot, enrollment_id, branch_id)
  VALUES ('group_enrollments', NEW.id, COALESCE(v_keys, ARRAY[]::text[]), COALESCE(v_snapshot, '{}'::jsonb), NEW.id, v_branch_id);

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_snapshot_policies_on_enrollment
  AFTER INSERT ON group_enrollments
  FOR EACH ROW EXECUTE FUNCTION fn_snapshot_policies_on_enrollment();

-- T5: block attendance edits after lock (super_admin bypass)
CREATE OR REPLACE FUNCTION fn_attendance_lock_check()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public AS $$
BEGIN
  IF OLD.locked_at IS NOT NULL AND NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'ATTENDANCE_LOCKED: attendance for session % is locked', OLD.session_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_attendance_lock
  BEFORE UPDATE ON session_attendance
  FOR EACH ROW EXECUTE FUNCTION fn_attendance_lock_check();

-- T6: online group must have link (double-check)
CREATE OR REPLACE FUNCTION fn_check_online_link()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public AS $$
BEGIN
  IF NEW.subscription_type = 'online' AND (NEW.online_link IS NULL OR NEW.online_link = '') THEN
    RAISE EXCEPTION 'ONLINE_LINK_REQUIRED: online group must have a link';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_online_link
  BEFORE INSERT OR UPDATE ON groups
  FOR EACH ROW EXECUTE FUNCTION fn_check_online_link();

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_students_branch_id ON students(branch_id);
CREATE INDEX idx_students_subscription_status ON students(subscription_status);
CREATE INDEX idx_students_current_group ON students(current_group_id) WHERE current_group_id IS NOT NULL;

CREATE INDEX idx_groups_branch_level ON groups(branch_id, level_id);
CREATE INDEX idx_groups_trainer ON groups(trainer_id);
CREATE INDEX idx_groups_status ON groups(status) WHERE deleted_at IS NULL;

CREATE INDEX idx_enrollments_student ON group_enrollments(student_id);
CREATE INDEX idx_enrollments_group ON group_enrollments(group_id);
CREATE INDEX idx_enrollments_status ON group_enrollments(status);

CREATE INDEX idx_sessions_group ON group_sessions(group_id);
CREATE INDEX idx_sessions_trainer ON group_sessions(trainer_id);
CREATE INDEX idx_sessions_scheduled ON group_sessions(scheduled_at_utc);
CREATE INDEX idx_sessions_status ON group_sessions(status);

CREATE INDEX idx_attendance_session ON session_attendance(session_id);
CREATE INDEX idx_attendance_student ON session_attendance(student_id);
CREATE INDEX idx_attendance_enrollment ON session_attendance(enrollment_id);

CREATE INDEX idx_entry_tests_student ON entry_test_attempts(student_id);
CREATE INDEX idx_waiting_list_branch ON waiting_list(branch_id);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_content_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE level_prerequisites ENABLE ROW LEVEL SECURITY;
ALTER TABLE level_determination_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_student_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE entry_test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE waiting_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "packages_read_branch_staff" ON packages FOR SELECT
  USING (branch_id = ANY(current_user_branch_ids()) OR is_super_admin(auth.uid()));
CREATE POLICY "packages_write_admin" ON packages FOR ALL
  USING (is_super_admin(auth.uid()) OR (has_role(auth.uid(),'branch_admin'::app_role) AND branch_id = ANY(current_user_branch_ids())))
  WITH CHECK (is_super_admin(auth.uid()) OR (has_role(auth.uid(),'branch_admin'::app_role) AND branch_id = ANY(current_user_branch_ids())));

CREATE POLICY "package_content_access_read" ON package_content_access FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "package_content_access_write_super" ON package_content_access FOR ALL
  USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "levels_read_branch_staff" ON levels FOR SELECT
  USING (branch_id = ANY(current_user_branch_ids()) OR is_super_admin(auth.uid()));
CREATE POLICY "levels_write_admin" ON levels FOR ALL
  USING (is_super_admin(auth.uid()) OR (has_role(auth.uid(),'branch_admin'::app_role) AND branch_id = ANY(current_user_branch_ids())))
  WITH CHECK (is_super_admin(auth.uid()) OR (has_role(auth.uid(),'branch_admin'::app_role) AND branch_id = ANY(current_user_branch_ids())));

CREATE POLICY "level_prereqs_read" ON level_prerequisites FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "level_prereqs_write_super" ON level_prerequisites FOR ALL
  USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "level_det_rules_read" ON level_determination_rules FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "level_det_rules_write_admin" ON level_determination_rules FOR ALL
  USING (is_super_admin(auth.uid()) OR (has_role(auth.uid(),'branch_admin'::app_role) AND branch_id = ANY(current_user_branch_ids())))
  WITH CHECK (is_super_admin(auth.uid()) OR (has_role(auth.uid(),'branch_admin'::app_role) AND branch_id = ANY(current_user_branch_ids())));

-- students
CREATE POLICY "students_read" ON students FOR SELECT
  USING (
    is_super_admin(auth.uid())
    OR branch_id = ANY(current_user_branch_ids())
    OR profile_id = auth.uid()
    OR id IN (
      SELECT psl.student_id FROM parent_student_links psl
      JOIN parents p ON p.id = psl.parent_id
      WHERE p.profile_id = auth.uid()
    )
  );
CREATE POLICY "students_write_staff" ON students FOR ALL
  USING (
    is_super_admin(auth.uid())
    OR (has_any_role(auth.uid(), ARRAY['branch_admin','reception']::app_role[]) AND branch_id = ANY(current_user_branch_ids()))
  )
  WITH CHECK (
    is_super_admin(auth.uid())
    OR (has_any_role(auth.uid(), ARRAY['branch_admin','reception']::app_role[]) AND branch_id = ANY(current_user_branch_ids()))
  );

-- parents
CREATE POLICY "parents_read" ON parents FOR SELECT
  USING (is_super_admin(auth.uid()) OR branch_id = ANY(current_user_branch_ids()) OR profile_id = auth.uid());
CREATE POLICY "parents_write_staff" ON parents FOR ALL
  USING (
    is_super_admin(auth.uid())
    OR (has_any_role(auth.uid(), ARRAY['branch_admin','reception']::app_role[]) AND branch_id = ANY(current_user_branch_ids()))
  )
  WITH CHECK (
    is_super_admin(auth.uid())
    OR (has_any_role(auth.uid(), ARRAY['branch_admin','reception']::app_role[]) AND branch_id = ANY(current_user_branch_ids()))
  );

-- parent_student_links
CREATE POLICY "psl_read" ON parent_student_links FOR SELECT
  USING (
    is_super_admin(auth.uid())
    OR parent_id IN (SELECT id FROM parents WHERE profile_id = auth.uid())
    OR student_id IN (SELECT id FROM students WHERE branch_id = ANY(current_user_branch_ids()))
  );
CREATE POLICY "psl_write_staff" ON parent_student_links FOR ALL
  USING (is_super_admin(auth.uid()) OR has_any_role(auth.uid(), ARRAY['branch_admin','reception']::app_role[]))
  WITH CHECK (is_super_admin(auth.uid()) OR has_any_role(auth.uid(), ARRAY['branch_admin','reception']::app_role[]));

-- entry_test_attempts
CREATE POLICY "entry_tests_read" ON entry_test_attempts FOR SELECT
  USING (
    is_super_admin(auth.uid())
    OR branch_id = ANY(current_user_branch_ids())
    OR student_id IN (SELECT id FROM students WHERE profile_id = auth.uid())
  );
CREATE POLICY "entry_tests_write_staff" ON entry_test_attempts FOR ALL
  USING (
    is_super_admin(auth.uid())
    OR (has_any_role(auth.uid(), ARRAY['branch_admin','reception']::app_role[]) AND branch_id = ANY(current_user_branch_ids()))
  )
  WITH CHECK (
    is_super_admin(auth.uid())
    OR (has_any_role(auth.uid(), ARRAY['branch_admin','reception']::app_role[]) AND branch_id = ANY(current_user_branch_ids()))
  );

-- waiting_list
CREATE POLICY "waiting_list_read" ON waiting_list FOR SELECT
  USING (
    is_super_admin(auth.uid())
    OR branch_id = ANY(current_user_branch_ids())
    OR student_id IN (SELECT id FROM students WHERE profile_id = auth.uid())
  );
CREATE POLICY "waiting_list_write_staff" ON waiting_list FOR ALL
  USING (
    is_super_admin(auth.uid())
    OR (has_any_role(auth.uid(), ARRAY['branch_admin','reception']::app_role[]) AND branch_id = ANY(current_user_branch_ids()))
  )
  WITH CHECK (
    is_super_admin(auth.uid())
    OR (has_any_role(auth.uid(), ARRAY['branch_admin','reception']::app_role[]) AND branch_id = ANY(current_user_branch_ids()))
  );

-- groups
CREATE POLICY "groups_read" ON groups FOR SELECT
  USING (is_super_admin(auth.uid()) OR branch_id = ANY(current_user_branch_ids()) OR trainer_id = auth.uid());
CREATE POLICY "groups_write_admin" ON groups FOR ALL
  USING (
    is_super_admin(auth.uid())
    OR (has_any_role(auth.uid(), ARRAY['branch_admin','reception']::app_role[]) AND branch_id = ANY(current_user_branch_ids()))
  )
  WITH CHECK (
    is_super_admin(auth.uid())
    OR (has_any_role(auth.uid(), ARRAY['branch_admin','reception']::app_role[]) AND branch_id = ANY(current_user_branch_ids()))
  );

-- group_enrollments
CREATE POLICY "enrollments_read" ON group_enrollments FOR SELECT
  USING (
    is_super_admin(auth.uid())
    OR student_id IN (SELECT id FROM students WHERE branch_id = ANY(current_user_branch_ids()) OR profile_id = auth.uid())
    OR student_id IN (
      SELECT psl.student_id FROM parent_student_links psl
      JOIN parents p ON p.id = psl.parent_id WHERE p.profile_id = auth.uid()
    )
  );
CREATE POLICY "enrollments_write_staff" ON group_enrollments FOR ALL
  USING (
    is_super_admin(auth.uid())
    OR has_any_role(auth.uid(), ARRAY['branch_admin','reception']::app_role[])
  )
  WITH CHECK (
    is_super_admin(auth.uid())
    OR has_any_role(auth.uid(), ARRAY['branch_admin','reception']::app_role[])
  );

-- group_sessions
CREATE POLICY "sessions_read" ON group_sessions FOR SELECT
  USING (is_super_admin(auth.uid()) OR branch_id = ANY(current_user_branch_ids()) OR trainer_id = auth.uid());
CREATE POLICY "sessions_write" ON group_sessions FOR ALL
  USING (
    is_super_admin(auth.uid())
    OR trainer_id = auth.uid()
    OR (has_any_role(auth.uid(), ARRAY['branch_admin','reception']::app_role[]) AND branch_id = ANY(current_user_branch_ids()))
  )
  WITH CHECK (
    is_super_admin(auth.uid())
    OR trainer_id = auth.uid()
    OR (has_any_role(auth.uid(), ARRAY['branch_admin','reception']::app_role[]) AND branch_id = ANY(current_user_branch_ids()))
  );

-- session_attendance
CREATE POLICY "attendance_read" ON session_attendance FOR SELECT
  USING (
    is_super_admin(auth.uid())
    OR session_id IN (SELECT id FROM group_sessions WHERE trainer_id = auth.uid() OR branch_id = ANY(current_user_branch_ids()))
    OR student_id IN (SELECT id FROM students WHERE profile_id = auth.uid())
    OR student_id IN (
      SELECT psl.student_id FROM parent_student_links psl
      JOIN parents p ON p.id = psl.parent_id WHERE p.profile_id = auth.uid()
    )
  );
CREATE POLICY "attendance_write" ON session_attendance FOR ALL
  USING (
    is_super_admin(auth.uid())
    OR session_id IN (SELECT id FROM group_sessions WHERE trainer_id = auth.uid())
    OR has_any_role(auth.uid(), ARRAY['branch_admin','reception']::app_role[])
  )
  WITH CHECK (
    is_super_admin(auth.uid())
    OR session_id IN (SELECT id FROM group_sessions WHERE trainer_id = auth.uid())
    OR has_any_role(auth.uid(), ARRAY['branch_admin','reception']::app_role[])
  );

-- ============================================================
-- Seed: package_content_access
-- ============================================================
INSERT INTO package_content_access (tier, content_type, allowed) VALUES
  ('squad','slides',true),
  ('squad','summary_video',false),
  ('squad','full_video',false),
  ('core','slides',true),
  ('core','summary_video',true),
  ('core','full_video',false),
  ('x','slides',true),
  ('x','summary_video',true),
  ('x','full_video',true);

-- ============================================================
-- View: student_accessible_content
-- ============================================================
CREATE OR REPLACE VIEW student_accessible_content
WITH (security_invoker = true) AS
SELECT
  ge.student_id,
  ge.group_id,
  pca.content_type,
  pca.allowed
FROM group_enrollments ge
JOIN packages pk ON pk.id = ge.package_id
JOIN package_content_access pca ON pca.tier = pk.tier
WHERE ge.status = 'active';
