
CREATE TABLE public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.group_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE RESTRICT,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'absent' CHECK (status IN ('present','absent','excused','late')),
  marked_by UUID REFERENCES public.profiles(id),
  marked_at TIMESTAMPTZ,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_attendance_session_student UNIQUE (session_id, student_id)
);

CREATE TABLE public.absence_excuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  session_id UUID NOT NULL REFERENCES public.group_sessions(id) ON DELETE RESTRICT,
  attendance_record_id UUID REFERENCES public.attendance_records(id),
  submitted_by UUID REFERENCES public.profiles(id),
  reason TEXT NOT NULL,
  attachment_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_excuse_student_session UNIQUE (student_id, session_id)
);

CREATE TABLE public.student_restriction_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  restriction_type TEXT NOT NULL CHECK (restriction_type IN ('attendance','payment','manual')),
  trigger_value INT,
  restricted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  lifted_at TIMESTAMPTZ,
  lifted_by UUID REFERENCES public.profiles(id),
  lift_reason TEXT,
  requires_admin_approval BOOLEAN NOT NULL DEFAULT false,
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.compensation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_session_id UUID NOT NULL REFERENCES public.group_sessions(id) ON DELETE RESTRICT,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE RESTRICT,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 60,
  trainer_id UUID REFERENCES public.profiles(id),
  room_id UUID REFERENCES public.rooms(id),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','cancelled')),
  is_within_working_hours BOOLEAN NOT NULL DEFAULT true,
  trainer_extra_pay NUMERIC(10,2) NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_compensation_student_original UNIQUE (student_id, original_session_id)
);

CREATE TABLE public.pending_reassignment_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.group_sessions(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL,
  urgency TEXT NOT NULL DEFAULT 'normal' CHECK (urgency IN ('low','normal','high','critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','cancelled')),
  assigned_to UUID REFERENCES public.profiles(id),
  resolved_by UUID REFERENCES public.profiles(id),
  resolved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.consecutive_absence_tracker (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  consecutive_absences INT NOT NULL DEFAULT 0,
  consecutive_missed_hw INT NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_tracker_student_group UNIQUE (student_id, group_id)
);

CREATE INDEX idx_attrec_session ON public.attendance_records(session_id);
CREATE INDEX idx_attrec_student ON public.attendance_records(student_id);
CREATE INDEX idx_attrec_status ON public.attendance_records(status);
CREATE INDEX idx_attrec_unlocked ON public.attendance_records(is_locked) WHERE is_locked = false;
CREATE INDEX idx_absexc_student ON public.absence_excuses(student_id);
CREATE INDEX idx_absexc_pending ON public.absence_excuses(status) WHERE status = 'pending';
CREATE INDEX idx_restlog_active ON public.student_restriction_log(student_id) WHERE lifted_at IS NULL;
CREATE INDEX idx_comp_student ON public.compensation_sessions(student_id);
CREATE INDEX idx_comp_original ON public.compensation_sessions(original_session_id);
CREATE INDEX idx_comp_status ON public.compensation_sessions(status);
CREATE INDEX idx_reass_status ON public.pending_reassignment_queue(status, urgency);
CREATE INDEX idx_cabt_student ON public.consecutive_absence_tracker(student_id);

CREATE TRIGGER trg_attendance_updated_at BEFORE UPDATE ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_excuses_updated_at BEFORE UPDATE ON public.absence_excuses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_compensation_updated_at BEFORE UPDATE ON public.compensation_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_reassignment_updated_at BEFORE UPDATE ON public.pending_reassignment_queue
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.fn_update_absence_tracker()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_group_id UUID; v_consecutive INT := 0; v_threshold INT;
BEGIN
  SELECT group_id INTO v_group_id FROM public.group_sessions WHERE id = NEW.session_id;
  WITH ordered AS (
    SELECT ar.status, ROW_NUMBER() OVER (PARTITION BY ar.student_id ORDER BY gs.scheduled_at_utc DESC) AS rn
    FROM public.attendance_records ar JOIN public.group_sessions gs ON gs.id = ar.session_id
    WHERE ar.student_id = NEW.student_id AND gs.group_id = v_group_id
  ),
  streak AS (
    SELECT COUNT(*) AS cnt FROM ordered
    WHERE rn <= COALESCE((SELECT MIN(rn) - 1 FROM ordered WHERE status <> 'absent'), (SELECT COUNT(*) FROM ordered))
      AND status = 'absent'
  )
  SELECT COALESCE(cnt, 0) INTO v_consecutive FROM streak;

  INSERT INTO public.consecutive_absence_tracker(student_id, group_id, consecutive_absences, last_updated)
  VALUES (NEW.student_id, v_group_id, v_consecutive, now())
  ON CONFLICT (student_id, group_id) DO UPDATE
    SET consecutive_absences = EXCLUDED.consecutive_absences, last_updated = now();

  v_threshold := COALESCE((public.get_policy('attendance.consecutive_absences_for_restriction'))::INT, 3);

  IF v_consecutive >= v_threshold AND NEW.status = 'absent' THEN
    UPDATE public.students SET subscription_status = 'restricted', updated_at = now()
    WHERE id = NEW.student_id AND subscription_status = 'active';
    IF FOUND THEN
      INSERT INTO public.student_restriction_log(student_id, restriction_type, trigger_value, requires_admin_approval)
      VALUES (NEW.student_id, 'attendance', v_consecutive, true);
      INSERT INTO public.notifications(user_id, category, title, body, payload)
      SELECT ur.user_id, 'student_restricted',
        'طالب محظور تلقائياً',
        'الطالب تجاوز حد الغياب المتتالي (' || v_consecutive || ' غيابات)',
        jsonb_build_object('student_id', NEW.student_id, 'consecutive_absences', v_consecutive)
      FROM public.user_roles ur
      WHERE ur.role IN ('super_admin','branch_admin') AND ur.revoked_at IS NULL;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_update_absence_tracker AFTER INSERT OR UPDATE ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_absence_tracker();

CREATE OR REPLACE FUNCTION public.fn_lock_attendance_check()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.is_locked = true AND NEW.is_locked = true THEN
    RAISE EXCEPTION 'ATTENDANCE_LOCKED: cannot modify a locked attendance record';
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_lock_attendance_check BEFORE UPDATE ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION public.fn_lock_attendance_check();

CREATE OR REPLACE FUNCTION public.fn_approve_excuse()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    UPDATE public.attendance_records SET status = 'excused', updated_at = now()
    WHERE student_id = NEW.student_id AND session_id = NEW.session_id AND is_locked = false;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_approve_excuse AFTER UPDATE ON public.absence_excuses
  FOR EACH ROW EXECUTE FUNCTION public.fn_approve_excuse();

CREATE OR REPLACE FUNCTION public.rpc_mark_attendance(
  p_session_id UUID, p_student_id UUID, p_status TEXT,
  p_notes TEXT DEFAULT NULL, p_idempotency_key TEXT DEFAULT NULL
) RETURNS JSONB SECURITY DEFINER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_existing JSONB; v_result UUID; v_group_id UUID; v_branch_id UUID;
BEGIN
  IF p_idempotency_key IS NOT NULL THEN
    SELECT response INTO v_existing FROM public.idempotency_keys WHERE key = p_idempotency_key AND expires_at > now();
    IF FOUND THEN RETURN v_existing; END IF;
  END IF;
  SELECT group_id, branch_id INTO v_group_id, v_branch_id FROM public.group_sessions WHERE id = p_session_id;
  INSERT INTO public.attendance_records(session_id, student_id, group_id, branch_id, status, marked_by, marked_at, notes)
  VALUES (p_session_id, p_student_id, v_group_id, v_branch_id, p_status, auth.uid(), now(), p_notes)
  ON CONFLICT (session_id, student_id) DO UPDATE
    SET status = EXCLUDED.status, marked_by = auth.uid(), marked_at = now(), notes = EXCLUDED.notes
  RETURNING id INTO v_result;
  IF p_idempotency_key IS NOT NULL THEN
    INSERT INTO public.idempotency_keys(key, operation, response, expires_at)
    VALUES (p_idempotency_key, 'mark_attendance', jsonb_build_object('id', v_result), now() + interval '24 hours')
    ON CONFLICT (key) DO NOTHING;
  END IF;
  RETURN jsonb_build_object('success', true, 'record_id', v_result);
END; $$;

CREATE OR REPLACE FUNCTION public.rpc_submit_excuse(
  p_student_id UUID, p_session_id UUID, p_reason TEXT,
  p_attachment_url TEXT DEFAULT NULL, p_idempotency_key TEXT DEFAULT NULL
) RETURNS JSONB SECURITY DEFINER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_existing JSONB; v_result UUID; v_attendance_id UUID;
BEGIN
  IF p_idempotency_key IS NOT NULL THEN
    SELECT response INTO v_existing FROM public.idempotency_keys WHERE key = p_idempotency_key AND expires_at > now();
    IF FOUND THEN RETURN v_existing; END IF;
  END IF;
  SELECT id INTO v_attendance_id FROM public.attendance_records
  WHERE student_id = p_student_id AND session_id = p_session_id;
  INSERT INTO public.absence_excuses(student_id, session_id, attendance_record_id, submitted_by, reason, attachment_url)
  VALUES (p_student_id, p_session_id, v_attendance_id, auth.uid(), p_reason, p_attachment_url)
  ON CONFLICT (student_id, session_id) DO UPDATE
    SET reason = EXCLUDED.reason, attachment_url = EXCLUDED.attachment_url, status = 'pending', updated_at = now()
  RETURNING id INTO v_result;
  INSERT INTO public.notifications(user_id, category, title, body, payload)
  SELECT ur.user_id, 'excuse_submitted', 'طلب عذر غياب جديد', 'طالب قدّم عذر غياب يحتاج مراجعة',
    jsonb_build_object('excuse_id', v_result, 'student_id', p_student_id, 'session_id', p_session_id)
  FROM public.user_roles ur
  WHERE ur.role IN ('super_admin','branch_admin','reception') AND ur.revoked_at IS NULL;
  IF p_idempotency_key IS NOT NULL THEN
    INSERT INTO public.idempotency_keys(key, operation, response, expires_at)
    VALUES (p_idempotency_key, 'submit_excuse', jsonb_build_object('id', v_result), now() + interval '24 hours')
    ON CONFLICT (key) DO NOTHING;
  END IF;
  RETURN jsonb_build_object('success', true, 'excuse_id', v_result);
END; $$;

CREATE OR REPLACE FUNCTION public.rpc_approve_excuse(
  p_excuse_id UUID, p_approved BOOLEAN,
  p_rejection_reason TEXT DEFAULT NULL, p_idempotency_key TEXT DEFAULT NULL
) RETURNS JSONB SECURITY DEFINER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_existing JSONB; v_new_status TEXT;
BEGIN
  IF p_idempotency_key IS NOT NULL THEN
    SELECT response INTO v_existing FROM public.idempotency_keys WHERE key = p_idempotency_key AND expires_at > now();
    IF FOUND THEN RETURN v_existing; END IF;
  END IF;
  v_new_status := CASE WHEN p_approved THEN 'approved' ELSE 'rejected' END;
  UPDATE public.absence_excuses
  SET status = v_new_status, reviewed_by = auth.uid(), reviewed_at = now(),
      rejection_reason = p_rejection_reason, updated_at = now()
  WHERE id = p_excuse_id;
  IF p_idempotency_key IS NOT NULL THEN
    INSERT INTO public.idempotency_keys(key, operation, response, expires_at)
    VALUES (p_idempotency_key, 'approve_excuse',
      jsonb_build_object('excuse_id', p_excuse_id, 'status', v_new_status), now() + interval '24 hours')
    ON CONFLICT (key) DO NOTHING;
  END IF;
  RETURN jsonb_build_object('success', true, 'status', v_new_status);
END; $$;

CREATE OR REPLACE FUNCTION public.rpc_schedule_compensation(
  p_original_session_id UUID, p_student_id UUID, p_scheduled_at TIMESTAMPTZ,
  p_duration_minutes INT DEFAULT 60, p_trainer_id UUID DEFAULT NULL,
  p_room_id UUID DEFAULT NULL, p_is_within_working_hours BOOLEAN DEFAULT true,
  p_trainer_extra_pay NUMERIC DEFAULT 0, p_idempotency_key TEXT DEFAULT NULL
) RETURNS JSONB SECURITY DEFINER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_existing JSONB; v_result UUID; v_group_id UUID; v_branch_id UUID;
BEGIN
  IF p_idempotency_key IS NOT NULL THEN
    SELECT response INTO v_existing FROM public.idempotency_keys WHERE key = p_idempotency_key AND expires_at > now();
    IF FOUND THEN RETURN v_existing; END IF;
  END IF;
  SELECT group_id, branch_id INTO v_group_id, v_branch_id FROM public.group_sessions WHERE id = p_original_session_id;
  INSERT INTO public.compensation_sessions(
    original_session_id, student_id, group_id, branch_id, scheduled_at, duration_minutes,
    trainer_id, room_id, is_within_working_hours, trainer_extra_pay, created_by
  ) VALUES (
    p_original_session_id, p_student_id, v_group_id, v_branch_id, p_scheduled_at, p_duration_minutes,
    p_trainer_id, p_room_id, p_is_within_working_hours, p_trainer_extra_pay, auth.uid()
  )
  ON CONFLICT (student_id, original_session_id) DO UPDATE
    SET scheduled_at = EXCLUDED.scheduled_at, trainer_id = EXCLUDED.trainer_id,
        room_id = EXCLUDED.room_id, is_within_working_hours = EXCLUDED.is_within_working_hours,
        trainer_extra_pay = EXCLUDED.trainer_extra_pay, status = 'scheduled', updated_at = now()
  RETURNING id INTO v_result;
  IF p_idempotency_key IS NOT NULL THEN
    INSERT INTO public.idempotency_keys(key, operation, response, expires_at)
    VALUES (p_idempotency_key, 'schedule_compensation',
      jsonb_build_object('id', v_result), now() + interval '24 hours')
    ON CONFLICT (key) DO NOTHING;
  END IF;
  RETURN jsonb_build_object('success', true, 'compensation_id', v_result);
END; $$;

CREATE OR REPLACE FUNCTION public.rpc_lift_restriction(
  p_student_id UUID, p_lift_reason TEXT, p_idempotency_key TEXT DEFAULT NULL
) RETURNS JSONB SECURITY DEFINER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_existing JSONB; v_requires_approval BOOLEAN;
BEGIN
  IF p_idempotency_key IS NOT NULL THEN
    SELECT response INTO v_existing FROM public.idempotency_keys WHERE key = p_idempotency_key AND expires_at > now();
    IF FOUND THEN RETURN v_existing; END IF;
  END IF;
  SELECT requires_admin_approval INTO v_requires_approval
  FROM public.student_restriction_log
  WHERE student_id = p_student_id AND lifted_at IS NULL
  ORDER BY restricted_at DESC LIMIT 1;
  IF v_requires_approval = true
    AND NOT public.has_any_role(auth.uid(), ARRAY['super_admin','branch_admin']::app_role[]) THEN
    RAISE EXCEPTION 'ADMIN_APPROVAL_REQUIRED: only admin can lift this restriction';
  END IF;
  UPDATE public.students SET subscription_status = 'active', updated_at = now()
  WHERE id = p_student_id AND subscription_status = 'restricted';
  UPDATE public.student_restriction_log
  SET lifted_at = now(), lifted_by = auth.uid(), lift_reason = p_lift_reason
  WHERE student_id = p_student_id AND lifted_at IS NULL;
  UPDATE public.consecutive_absence_tracker SET consecutive_absences = 0, last_updated = now()
  WHERE student_id = p_student_id;
  IF p_idempotency_key IS NOT NULL THEN
    INSERT INTO public.idempotency_keys(key, operation, response, expires_at)
    VALUES (p_idempotency_key, 'lift_restriction',
      jsonb_build_object('student_id', p_student_id), now() + interval '24 hours')
    ON CONFLICT (key) DO NOTHING;
  END IF;
  RETURN jsonb_build_object('success', true, 'student_id', p_student_id);
END; $$;

REVOKE EXECUTE ON FUNCTION public.rpc_mark_attendance(UUID,UUID,TEXT,TEXT,TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_mark_attendance(UUID,UUID,TEXT,TEXT,TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.rpc_submit_excuse(UUID,UUID,TEXT,TEXT,TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_submit_excuse(UUID,UUID,TEXT,TEXT,TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.rpc_approve_excuse(UUID,BOOLEAN,TEXT,TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_approve_excuse(UUID,BOOLEAN,TEXT,TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.rpc_schedule_compensation(UUID,UUID,TIMESTAMPTZ,INT,UUID,UUID,BOOLEAN,NUMERIC,TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_schedule_compensation(UUID,UUID,TIMESTAMPTZ,INT,UUID,UUID,BOOLEAN,NUMERIC,TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.rpc_lift_restriction(UUID,TEXT,TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_lift_restriction(UUID,TEXT,TEXT) TO authenticated;

ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attendance_read_staff" ON public.attendance_records FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','branch_admin','reception','trainer']::app_role[]));
CREATE POLICY "attendance_read_own" ON public.attendance_records FOR SELECT TO authenticated
  USING (
    student_id IN (SELECT id FROM public.students WHERE profile_id = auth.uid())
    OR student_id IN (
      SELECT psl.student_id FROM public.parent_student_links psl
      JOIN public.parents pr ON pr.id = psl.parent_id WHERE pr.profile_id = auth.uid()
    )
  );
CREATE POLICY "attendance_write_staff" ON public.attendance_records FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','branch_admin','reception','trainer']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','branch_admin','reception','trainer']::app_role[]));

ALTER TABLE public.absence_excuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "excuses_read_staff" ON public.absence_excuses FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','branch_admin','reception']::app_role[]));
CREATE POLICY "excuses_read_own" ON public.absence_excuses FOR SELECT TO authenticated
  USING (
    student_id IN (SELECT id FROM public.students WHERE profile_id = auth.uid())
    OR student_id IN (
      SELECT psl.student_id FROM public.parent_student_links psl
      JOIN public.parents pr ON pr.id = psl.parent_id WHERE pr.profile_id = auth.uid()
    )
  );
CREATE POLICY "excuses_submit_own" ON public.absence_excuses FOR INSERT TO authenticated
  WITH CHECK (
    student_id IN (SELECT id FROM public.students WHERE profile_id = auth.uid())
    OR student_id IN (
      SELECT psl.student_id FROM public.parent_student_links psl
      JOIN public.parents pr ON pr.id = psl.parent_id WHERE pr.profile_id = auth.uid()
    )
  );
CREATE POLICY "excuses_review_staff" ON public.absence_excuses FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','branch_admin','reception']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','branch_admin','reception']::app_role[]));

ALTER TABLE public.student_restriction_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "restriction_log_read" ON public.student_restriction_log FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','branch_admin','reception']::app_role[]));
CREATE POLICY "restriction_log_insert_admin" ON public.student_restriction_log FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','branch_admin']::app_role[]));

ALTER TABLE public.compensation_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "compensation_read_staff" ON public.compensation_sessions FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','branch_admin','reception','trainer']::app_role[]));
CREATE POLICY "compensation_write_staff" ON public.compensation_sessions FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','branch_admin','reception']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','branch_admin','reception']::app_role[]));

ALTER TABLE public.pending_reassignment_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reassignment_read" ON public.pending_reassignment_queue FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','branch_admin','reception']::app_role[]));
CREATE POLICY "reassignment_write" ON public.pending_reassignment_queue FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','branch_admin']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','branch_admin']::app_role[]));

ALTER TABLE public.consecutive_absence_tracker ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tracker_read_staff" ON public.consecutive_absence_tracker FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','branch_admin','reception','trainer']::app_role[]));
CREATE POLICY "tracker_write_admin" ON public.consecutive_absence_tracker FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','branch_admin']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','branch_admin']::app_role[]));

SELECT cron.schedule('cron_lock_stale_attendance', '0 1 * * *', $CRON$
  UPDATE public.attendance_records ar
  SET is_locked = true, updated_at = now()
  WHERE ar.is_locked = false
    AND EXISTS (
      SELECT 1 FROM public.group_sessions gs
      WHERE gs.id = ar.session_id
        AND gs.scheduled_at_utc + (COALESCE(public.get_policy('attendance.lock_minutes_after_session_start')::INT, 30) * interval '1 minute') < now()
    );
$CRON$);

SELECT cron.schedule('cron_auto_restrict_absent_students', '0 2 * * *', $CRON$
  UPDATE public.students s
  SET subscription_status = 'restricted', updated_at = now()
  WHERE s.subscription_status = 'active'
    AND EXISTS (
      SELECT 1 FROM public.consecutive_absence_tracker cat
      WHERE cat.student_id = s.id
        AND cat.consecutive_absences >= COALESCE(public.get_policy('attendance.consecutive_absences_for_restriction')::INT, 3)
    );
$CRON$);
