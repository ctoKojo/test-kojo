
-- ============ Tables ============

CREATE TABLE public.student_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  warning_type TEXT NOT NULL CHECK (warning_type IN ('attendance','payment','behavior','academic','other')),
  severity TEXT NOT NULL DEFAULT 'low' CHECK (severity IN ('low','medium','high','critical')),
  title TEXT NOT NULL,
  description TEXT,
  issued_by UUID REFERENCES public.profiles(id),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES public.profiles(id),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id),
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  academic_term_id UUID REFERENCES public.academic_terms(id),
  group_id UUID REFERENCES public.groups(id),
  certificate_type TEXT NOT NULL CHECK (certificate_type IN ('completion','excellence','participation','custom')),
  title TEXT NOT NULL,
  issued_at DATE NOT NULL DEFAULT CURRENT_DATE,
  issued_by UUID REFERENCES public.profiles(id),
  certificate_url TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.branch_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  academic_term_id UUID NOT NULL REFERENCES public.academic_terms(id),
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INT NOT NULL,
  total_students INT NOT NULL DEFAULT 0,
  active_students INT NOT NULL DEFAULT 0,
  restricted_students INT NOT NULL DEFAULT 0,
  new_enrollments INT NOT NULL DEFAULT 0,
  dropped_students INT NOT NULL DEFAULT 0,
  total_sessions INT NOT NULL DEFAULT 0,
  completed_sessions INT NOT NULL DEFAULT 0,
  cancelled_sessions INT NOT NULL DEFAULT 0,
  avg_attendance_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  total_revenue NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_expenses NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_revenue NUMERIC(12,2) GENERATED ALWAYS AS (total_revenue - total_expenses) STORED,
  total_refunds NUMERIC(12,2) NOT NULL DEFAULT 0,
  overdue_installments INT NOT NULL DEFAULT 0,
  promotions_count INT NOT NULL DEFAULT 0,
  retentions_count INT NOT NULL DEFAULT 0,
  academy_fault_failures INT NOT NULL DEFAULT 0,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_branch_kpi_month UNIQUE (branch_id, academic_term_id, month, year)
);

-- NOTE: no public.trainers table exists; trainers are profiles with role='trainer'.
CREATE TABLE public.trainer_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  academic_term_id UUID NOT NULL REFERENCES public.academic_terms(id),
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INT NOT NULL,
  total_sessions INT NOT NULL DEFAULT 0,
  completed_sessions INT NOT NULL DEFAULT 0,
  cancelled_sessions INT NOT NULL DEFAULT 0,
  compensation_sessions INT NOT NULL DEFAULT 0,
  avg_student_score NUMERIC(5,2),
  avg_attendance_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  student_satisfaction_score NUMERIC(3,2),
  assignments_graded INT NOT NULL DEFAULT 0,
  quizzes_graded INT NOT NULL DEFAULT 0,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_trainer_kpi_month UNIQUE (trainer_id, academic_term_id, month, year)
);

CREATE TABLE public.student_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  academic_term_id UUID NOT NULL REFERENCES public.academic_terms(id),
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INT NOT NULL,
  attendance_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  sessions_attended INT NOT NULL DEFAULT 0,
  sessions_absent INT NOT NULL DEFAULT 0,
  sessions_excused INT NOT NULL DEFAULT 0,
  assignments_submitted INT NOT NULL DEFAULT 0,
  assignments_missed INT NOT NULL DEFAULT 0,
  avg_assignment_score NUMERIC(5,2),
  avg_quiz_score NUMERIC(5,2),
  quizzes_passed INT NOT NULL DEFAULT 0,
  quizzes_failed INT NOT NULL DEFAULT 0,
  compensation_sessions_taken INT NOT NULL DEFAULT 0,
  warnings_issued INT NOT NULL DEFAULT 0,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_student_kpi_month UNIQUE (student_id, academic_term_id, month, year)
);

CREATE TABLE public.system_health_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES public.branches(id),
  check_type TEXT NOT NULL CHECK (check_type IN ('cron_run','data_integrity','rls_check','backup','custom')),
  status TEXT NOT NULL DEFAULT 'ok' CHECK (status IN ('ok','warning','error')),
  details JSONB,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.feedback_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  trainer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  session_id UUID REFERENCES public.group_sessions(id) ON DELETE SET NULL,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('session_rating','trainer_rating','academy_rating','nps')),
  score INT CHECK (score BETWEEN 1 AND 10),
  comment TEXT,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ Triggers ============
CREATE TRIGGER trg_student_warnings_updated_at BEFORE UPDATE ON public.student_warnings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_certificates_updated_at BEFORE UPDATE ON public.certificates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_branch_kpis_updated_at BEFORE UPDATE ON public.branch_kpis FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_trainer_kpis_updated_at BEFORE UPDATE ON public.trainer_kpis FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_student_kpis_updated_at BEFORE UPDATE ON public.student_kpis FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ Indexes ============
CREATE INDEX idx_warnings_student ON public.student_warnings(student_id);
CREATE INDEX idx_warnings_branch ON public.student_warnings(branch_id, issued_at DESC);
CREATE INDEX idx_warnings_unresolved ON public.student_warnings(student_id) WHERE resolved_at IS NULL;
CREATE INDEX idx_certificates_student ON public.certificates(student_id);
CREATE INDEX idx_certificates_branch ON public.certificates(branch_id);
CREATE INDEX idx_branch_kpis_lookup ON public.branch_kpis(branch_id, year, month);
CREATE INDEX idx_trainer_kpis_lookup ON public.trainer_kpis(trainer_id, year, month);
CREATE INDEX idx_student_kpis_lookup ON public.student_kpis(student_id, year, month);
CREATE INDEX idx_feedback_session ON public.feedback_responses(session_id);
CREATE INDEX idx_feedback_trainer ON public.feedback_responses(trainer_id);
CREATE INDEX idx_health_log_checked ON public.system_health_log(checked_at DESC);

-- ============ RLS ============
ALTER TABLE public.student_warnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "warnings_read_staff" ON public.student_warnings FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['super_admin','branch_admin','reception','trainer']::app_role[]));
CREATE POLICY "warnings_read_parent" ON public.student_warnings FOR SELECT TO authenticated
  USING (student_id IN (
    SELECT psl.student_id FROM public.parent_student_links psl
    JOIN public.parents pr ON pr.id = psl.parent_id WHERE pr.profile_id = auth.uid()
  ));
CREATE POLICY "warnings_write_staff" ON public.student_warnings FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['super_admin','branch_admin','reception']::app_role[]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['super_admin','branch_admin','reception']::app_role[]));

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "certificates_read_staff" ON public.certificates FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['super_admin','branch_admin','reception']::app_role[]));
CREATE POLICY "certificates_read_own" ON public.certificates FOR SELECT TO authenticated
  USING (
    student_id IN (SELECT id FROM public.students WHERE profile_id = auth.uid())
    OR student_id IN (
      SELECT psl.student_id FROM public.parent_student_links psl
      JOIN public.parents pr ON pr.id = psl.parent_id WHERE pr.profile_id = auth.uid()
    )
  );
CREATE POLICY "certificates_write_admin" ON public.certificates FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['super_admin','branch_admin']::app_role[]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['super_admin','branch_admin']::app_role[]));

ALTER TABLE public.branch_kpis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "branch_kpis_admin_only" ON public.branch_kpis FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['super_admin','branch_admin']::app_role[]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['super_admin','branch_admin']::app_role[]));

ALTER TABLE public.trainer_kpis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trainer_kpis_rw" ON public.trainer_kpis FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['super_admin','branch_admin']::app_role[]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['super_admin','branch_admin']::app_role[]));

ALTER TABLE public.student_kpis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "student_kpis_read_staff" ON public.student_kpis FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['super_admin','branch_admin','reception','trainer']::app_role[]));
CREATE POLICY "student_kpis_read_own" ON public.student_kpis FOR SELECT TO authenticated
  USING (
    student_id IN (SELECT id FROM public.students WHERE profile_id = auth.uid())
    OR student_id IN (
      SELECT psl.student_id FROM public.parent_student_links psl
      JOIN public.parents pr ON pr.id = psl.parent_id WHERE pr.profile_id = auth.uid()
    )
  );
CREATE POLICY "student_kpis_write_system" ON public.student_kpis FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['super_admin','branch_admin']::app_role[]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['super_admin','branch_admin']::app_role[]));

ALTER TABLE public.system_health_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "health_log_admin_only" ON public.system_health_log FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['super_admin']::app_role[]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['super_admin']::app_role[]));

ALTER TABLE public.feedback_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feedback_read_admin" ON public.feedback_responses FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['super_admin','branch_admin']::app_role[]));
CREATE POLICY "feedback_insert_authenticated" ON public.feedback_responses FOR INSERT TO authenticated
  WITH CHECK (branch_id = ANY (public.current_user_branch_ids()));

-- ============ RPCs ============

CREATE OR REPLACE FUNCTION public.rpc_issue_warning(
  p_student_id UUID, p_warning_type TEXT, p_severity TEXT,
  p_title TEXT, p_description TEXT DEFAULT NULL, p_idempotency_key TEXT DEFAULT NULL
) RETURNS JSONB SECURITY DEFINER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_existing JSONB; v_result UUID; v_branch_id UUID;
BEGIN
  IF p_idempotency_key IS NOT NULL THEN
    SELECT response INTO v_existing FROM public.idempotency_keys
    WHERE key = p_idempotency_key AND expires_at > now();
    IF FOUND THEN RETURN v_existing; END IF;
  END IF;
  SELECT branch_id INTO v_branch_id FROM public.students WHERE id = p_student_id;
  INSERT INTO public.student_warnings(student_id, branch_id, warning_type, severity, title, description, issued_by)
  VALUES (p_student_id, v_branch_id, p_warning_type, p_severity, p_title, p_description, auth.uid())
  RETURNING id INTO v_result;

  INSERT INTO public.notifications(user_id, branch_id, category, title, body, payload)
  SELECT par.profile_id, v_branch_id, 'student_warning', 'تحذير جديد للطالب', p_title,
    jsonb_build_object('warning_id', v_result, 'student_id', p_student_id, 'severity', p_severity)
  FROM public.parent_student_links psl
  JOIN public.parents par ON par.id = psl.parent_id
  WHERE psl.student_id = p_student_id;

  IF p_idempotency_key IS NOT NULL THEN
    INSERT INTO public.idempotency_keys(key, operation, response, expires_at)
    VALUES (p_idempotency_key, 'issue_warning', jsonb_build_object('id', v_result), now() + interval '24 hours')
    ON CONFLICT (key) DO NOTHING;
  END IF;
  RETURN jsonb_build_object('success', true, 'warning_id', v_result);
END; $$;
GRANT EXECUTE ON FUNCTION public.rpc_issue_warning(UUID,TEXT,TEXT,TEXT,TEXT,TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.rpc_issue_warning(UUID,TEXT,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.rpc_issue_certificate(
  p_student_id UUID, p_certificate_type TEXT, p_title TEXT,
  p_academic_term_id UUID DEFAULT NULL, p_group_id UUID DEFAULT NULL,
  p_certificate_url TEXT DEFAULT NULL, p_metadata JSONB DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
) RETURNS JSONB SECURITY DEFINER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_existing JSONB; v_result UUID; v_branch_id UUID;
BEGIN
  IF p_idempotency_key IS NOT NULL THEN
    SELECT response INTO v_existing FROM public.idempotency_keys
    WHERE key = p_idempotency_key AND expires_at > now();
    IF FOUND THEN RETURN v_existing; END IF;
  END IF;
  SELECT branch_id INTO v_branch_id FROM public.students WHERE id = p_student_id;
  INSERT INTO public.certificates(
    student_id, branch_id, academic_term_id, group_id,
    certificate_type, title, issued_by, certificate_url, metadata
  ) VALUES (
    p_student_id, v_branch_id, p_academic_term_id, p_group_id,
    p_certificate_type, p_title, auth.uid(), p_certificate_url, p_metadata
  ) RETURNING id INTO v_result;

  -- Notify student
  INSERT INTO public.notifications(user_id, branch_id, category, title, body, payload)
  SELECT s.profile_id, v_branch_id, 'certificate_issued', 'شهادة جديدة',
    'تم إصدار شهادة: ' || p_title,
    jsonb_build_object('certificate_id', v_result, 'student_id', p_student_id)
  FROM public.students s WHERE s.id = p_student_id;

  -- Notify parents
  INSERT INTO public.notifications(user_id, branch_id, category, title, body, payload)
  SELECT par.profile_id, v_branch_id, 'certificate_issued', 'شهادة جديدة',
    'تم إصدار شهادة لطالبك: ' || p_title,
    jsonb_build_object('certificate_id', v_result, 'student_id', p_student_id)
  FROM public.parent_student_links psl
  JOIN public.parents par ON par.id = psl.parent_id
  WHERE psl.student_id = p_student_id;

  IF p_idempotency_key IS NOT NULL THEN
    INSERT INTO public.idempotency_keys(key, operation, response, expires_at)
    VALUES (p_idempotency_key, 'issue_certificate', jsonb_build_object('id', v_result), now() + interval '24 hours')
    ON CONFLICT (key) DO NOTHING;
  END IF;
  RETURN jsonb_build_object('success', true, 'certificate_id', v_result);
END; $$;
GRANT EXECUTE ON FUNCTION public.rpc_issue_certificate(UUID,TEXT,TEXT,UUID,UUID,TEXT,JSONB,TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.rpc_issue_certificate(UUID,TEXT,TEXT,UUID,UUID,TEXT,JSONB,TEXT) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.rpc_compute_branch_kpis(
  p_branch_id UUID, p_academic_term_id UUID, p_month INT, p_year INT,
  p_idempotency_key TEXT DEFAULT NULL
) RETURNS JSONB SECURITY DEFINER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_existing JSONB; v_kpi_id UUID;
  v_total_students INT; v_active_students INT; v_restricted_students INT;
  v_new_enrollments INT; v_dropped INT;
  v_total_sessions INT; v_completed_sessions INT; v_cancelled_sessions INT;
  v_avg_attendance NUMERIC;
  v_total_revenue NUMERIC; v_total_expenses NUMERIC; v_total_refunds NUMERIC;
  v_overdue INT; v_promotions INT; v_retentions INT; v_academy_failures INT;
BEGIN
  IF p_idempotency_key IS NOT NULL THEN
    SELECT response INTO v_existing FROM public.idempotency_keys
    WHERE key = p_idempotency_key AND expires_at > now();
    IF FOUND THEN RETURN v_existing; END IF;
  END IF;

  SELECT COUNT(*) INTO v_total_students FROM public.students WHERE branch_id = p_branch_id;
  SELECT COUNT(*) INTO v_active_students FROM public.students WHERE branch_id = p_branch_id AND subscription_status = 'active';
  SELECT COUNT(*) INTO v_restricted_students FROM public.students WHERE branch_id = p_branch_id AND subscription_status = 'restricted';

  SELECT COUNT(*) INTO v_new_enrollments
  FROM public.group_enrollments ge JOIN public.groups g ON g.id = ge.group_id
  WHERE g.branch_id = p_branch_id
    AND EXTRACT(MONTH FROM ge.enrolled_at) = p_month
    AND EXTRACT(YEAR FROM ge.enrolled_at) = p_year;

  SELECT COUNT(*) INTO v_dropped
  FROM public.student_progression_log spl
  JOIN public.students s ON s.id = spl.student_id
  WHERE s.branch_id = p_branch_id AND spl.progression_type = 'dropped'
    AND spl.academic_term_id = p_academic_term_id
    AND EXTRACT(MONTH FROM spl.decided_at) = p_month
    AND EXTRACT(YEAR FROM spl.decided_at) = p_year;

  SELECT COUNT(*) INTO v_total_sessions
  FROM public.group_sessions gs WHERE gs.branch_id = p_branch_id
    AND EXTRACT(MONTH FROM gs.scheduled_at_utc) = p_month
    AND EXTRACT(YEAR FROM gs.scheduled_at_utc) = p_year;
  SELECT COUNT(*) INTO v_completed_sessions
  FROM public.group_sessions gs WHERE gs.branch_id = p_branch_id AND gs.status = 'completed'
    AND EXTRACT(MONTH FROM gs.scheduled_at_utc) = p_month
    AND EXTRACT(YEAR FROM gs.scheduled_at_utc) = p_year;
  SELECT COUNT(*) INTO v_cancelled_sessions
  FROM public.group_sessions gs WHERE gs.branch_id = p_branch_id AND gs.status = 'cancelled'
    AND EXTRACT(MONTH FROM gs.scheduled_at_utc) = p_month
    AND EXTRACT(YEAR FROM gs.scheduled_at_utc) = p_year;

  SELECT COALESCE(AVG(CASE WHEN ar.status = 'present' THEN 100.0 ELSE 0 END), 0)
  INTO v_avg_attendance
  FROM public.attendance_records ar
  JOIN public.group_sessions gs ON gs.id = ar.session_id
  WHERE gs.branch_id = p_branch_id
    AND EXTRACT(MONTH FROM gs.scheduled_at_utc) = p_month
    AND EXTRACT(YEAR FROM gs.scheduled_at_utc) = p_year;

  SELECT COALESCE(SUM(amount_paid), 0) INTO v_total_revenue
  FROM public.payments WHERE branch_id = p_branch_id
    AND EXTRACT(MONTH FROM created_at) = p_month
    AND EXTRACT(YEAR FROM created_at) = p_year;
  SELECT COALESCE(SUM(amount), 0) INTO v_total_expenses
  FROM public.expenses WHERE branch_id = p_branch_id
    AND EXTRACT(MONTH FROM expense_date) = p_month
    AND EXTRACT(YEAR FROM expense_date) = p_year;
  SELECT COALESCE(SUM(amount), 0) INTO v_total_refunds
  FROM public.refunds WHERE branch_id = p_branch_id AND status = 'processed'
    AND processed_at IS NOT NULL
    AND EXTRACT(MONTH FROM processed_at) = p_month
    AND EXTRACT(YEAR FROM processed_at) = p_year;

  SELECT COUNT(*) INTO v_overdue
  FROM public.installments WHERE branch_id = p_branch_id AND status = 'overdue';

  SELECT COUNT(*) INTO v_promotions
  FROM public.student_progression_log spl
  JOIN public.students s ON s.id = spl.student_id
  WHERE s.branch_id = p_branch_id AND spl.progression_type = 'promoted'
    AND spl.academic_term_id = p_academic_term_id
    AND EXTRACT(MONTH FROM spl.decided_at) = p_month
    AND EXTRACT(YEAR FROM spl.decided_at) = p_year;
  SELECT COUNT(*) INTO v_retentions
  FROM public.student_progression_log spl
  JOIN public.students s ON s.id = spl.student_id
  WHERE s.branch_id = p_branch_id AND spl.progression_type = 'retained'
    AND spl.academic_term_id = p_academic_term_id
    AND EXTRACT(MONTH FROM spl.decided_at) = p_month
    AND EXTRACT(YEAR FROM spl.decided_at) = p_year;
  SELECT COUNT(*) INTO v_academy_failures
  FROM public.student_progression_log spl
  JOIN public.students s ON s.id = spl.student_id
  WHERE s.branch_id = p_branch_id AND spl.failure_reason_type = 'academy_fault'
    AND spl.academic_term_id = p_academic_term_id
    AND EXTRACT(MONTH FROM spl.decided_at) = p_month
    AND EXTRACT(YEAR FROM spl.decided_at) = p_year;

  INSERT INTO public.branch_kpis(
    branch_id, academic_term_id, month, year,
    total_students, active_students, restricted_students,
    new_enrollments, dropped_students,
    total_sessions, completed_sessions, cancelled_sessions,
    avg_attendance_pct, total_revenue, total_expenses,
    total_refunds, overdue_installments,
    promotions_count, retentions_count, academy_fault_failures, computed_at
  ) VALUES (
    p_branch_id, p_academic_term_id, p_month, p_year,
    v_total_students, v_active_students, v_restricted_students,
    v_new_enrollments, v_dropped,
    v_total_sessions, v_completed_sessions, v_cancelled_sessions,
    v_avg_attendance, v_total_revenue, v_total_expenses,
    v_total_refunds, v_overdue,
    v_promotions, v_retentions, v_academy_failures, now()
  )
  ON CONFLICT (branch_id, academic_term_id, month, year) DO UPDATE SET
    total_students = EXCLUDED.total_students,
    active_students = EXCLUDED.active_students,
    restricted_students = EXCLUDED.restricted_students,
    new_enrollments = EXCLUDED.new_enrollments,
    dropped_students = EXCLUDED.dropped_students,
    total_sessions = EXCLUDED.total_sessions,
    completed_sessions = EXCLUDED.completed_sessions,
    cancelled_sessions = EXCLUDED.cancelled_sessions,
    avg_attendance_pct = EXCLUDED.avg_attendance_pct,
    total_revenue = EXCLUDED.total_revenue,
    total_expenses = EXCLUDED.total_expenses,
    total_refunds = EXCLUDED.total_refunds,
    overdue_installments = EXCLUDED.overdue_installments,
    promotions_count = EXCLUDED.promotions_count,
    retentions_count = EXCLUDED.retentions_count,
    academy_fault_failures = EXCLUDED.academy_fault_failures,
    computed_at = now(), updated_at = now()
  RETURNING id INTO v_kpi_id;

  IF p_idempotency_key IS NOT NULL THEN
    INSERT INTO public.idempotency_keys(key, operation, response, expires_at)
    VALUES (p_idempotency_key, 'compute_branch_kpis', jsonb_build_object('kpi_id', v_kpi_id), now() + interval '24 hours')
    ON CONFLICT (key) DO NOTHING;
  END IF;
  RETURN jsonb_build_object('success', true, 'kpi_id', v_kpi_id, 'net_revenue', v_total_revenue - v_total_expenses);
END; $$;
GRANT EXECUTE ON FUNCTION public.rpc_compute_branch_kpis(UUID,UUID,INT,INT,TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.rpc_compute_branch_kpis(UUID,UUID,INT,INT,TEXT) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.rpc_compute_student_kpis(
  p_student_id UUID, p_academic_term_id UUID, p_month INT, p_year INT,
  p_idempotency_key TEXT DEFAULT NULL
) RETURNS JSONB SECURITY DEFINER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_existing JSONB; v_kpi_id UUID;
  v_attended INT; v_absent INT; v_excused INT;
  v_total_att INT; v_att_pct NUMERIC;
  v_submitted INT; v_missed INT;
  v_avg_assign NUMERIC; v_avg_quiz NUMERIC;
  v_q_passed INT; v_q_failed INT;
  v_comp INT; v_warnings INT;
BEGIN
  IF p_idempotency_key IS NOT NULL THEN
    SELECT response INTO v_existing FROM public.idempotency_keys
    WHERE key = p_idempotency_key AND expires_at > now();
    IF FOUND THEN RETURN v_existing; END IF;
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE ar.status = 'present'),
    COUNT(*) FILTER (WHERE ar.status = 'absent'),
    COUNT(*) FILTER (WHERE ar.status = 'excused')
  INTO v_attended, v_absent, v_excused
  FROM public.attendance_records ar
  JOIN public.group_sessions gs ON gs.id = ar.session_id
  WHERE ar.student_id = p_student_id
    AND EXTRACT(MONTH FROM gs.scheduled_at_utc) = p_month
    AND EXTRACT(YEAR FROM gs.scheduled_at_utc) = p_year;

  v_total_att := COALESCE(v_attended,0) + COALESCE(v_absent,0) + COALESCE(v_excused,0);
  v_att_pct := CASE WHEN v_total_att > 0 THEN (v_attended::NUMERIC / v_total_att) * 100 ELSE 0 END;

  SELECT
    COUNT(*) FILTER (WHERE status IN ('submitted','graded')),
    COUNT(*) FILTER (WHERE status = 'missed'),
    AVG(score) FILTER (WHERE status = 'graded')
  INTO v_submitted, v_missed, v_avg_assign
  FROM public.assignment_submissions
  WHERE student_id = p_student_id
    AND EXTRACT(MONTH FROM created_at) = p_month
    AND EXTRACT(YEAR FROM created_at) = p_year;

  SELECT
    AVG(score),
    COUNT(*) FILTER (WHERE passed = true),
    COUNT(*) FILTER (WHERE passed = false)
  INTO v_avg_quiz, v_q_passed, v_q_failed
  FROM public.quiz_attempts
  WHERE student_id = p_student_id
    AND EXTRACT(MONTH FROM created_at) = p_month
    AND EXTRACT(YEAR FROM created_at) = p_year;

  SELECT COUNT(*) INTO v_comp
  FROM public.compensation_sessions
  WHERE student_id = p_student_id AND status = 'completed'
    AND completed_at IS NOT NULL
    AND EXTRACT(MONTH FROM completed_at) = p_month
    AND EXTRACT(YEAR FROM completed_at) = p_year;

  SELECT COUNT(*) INTO v_warnings
  FROM public.student_warnings
  WHERE student_id = p_student_id
    AND EXTRACT(MONTH FROM issued_at) = p_month
    AND EXTRACT(YEAR FROM issued_at) = p_year;

  INSERT INTO public.student_kpis(
    student_id, academic_term_id, month, year,
    attendance_pct, sessions_attended, sessions_absent, sessions_excused,
    assignments_submitted, assignments_missed, avg_assignment_score,
    avg_quiz_score, quizzes_passed, quizzes_failed,
    compensation_sessions_taken, warnings_issued, computed_at
  ) VALUES (
    p_student_id, p_academic_term_id, p_month, p_year,
    v_att_pct, COALESCE(v_attended,0), COALESCE(v_absent,0), COALESCE(v_excused,0),
    COALESCE(v_submitted,0), COALESCE(v_missed,0), v_avg_assign,
    v_avg_quiz, COALESCE(v_q_passed,0), COALESCE(v_q_failed,0),
    COALESCE(v_comp,0), COALESCE(v_warnings,0), now()
  )
  ON CONFLICT (student_id, academic_term_id, month, year) DO UPDATE SET
    attendance_pct = EXCLUDED.attendance_pct,
    sessions_attended = EXCLUDED.sessions_attended,
    sessions_absent = EXCLUDED.sessions_absent,
    sessions_excused = EXCLUDED.sessions_excused,
    assignments_submitted = EXCLUDED.assignments_submitted,
    assignments_missed = EXCLUDED.assignments_missed,
    avg_assignment_score = EXCLUDED.avg_assignment_score,
    avg_quiz_score = EXCLUDED.avg_quiz_score,
    quizzes_passed = EXCLUDED.quizzes_passed,
    quizzes_failed = EXCLUDED.quizzes_failed,
    compensation_sessions_taken = EXCLUDED.compensation_sessions_taken,
    warnings_issued = EXCLUDED.warnings_issued,
    computed_at = now(), updated_at = now()
  RETURNING id INTO v_kpi_id;

  IF p_idempotency_key IS NOT NULL THEN
    INSERT INTO public.idempotency_keys(key, operation, response, expires_at)
    VALUES (p_idempotency_key, 'compute_student_kpis', jsonb_build_object('kpi_id', v_kpi_id), now() + interval '24 hours')
    ON CONFLICT (key) DO NOTHING;
  END IF;
  RETURN jsonb_build_object('success', true, 'kpi_id', v_kpi_id, 'attendance_pct', v_att_pct);
END; $$;
GRANT EXECUTE ON FUNCTION public.rpc_compute_student_kpis(UUID,UUID,INT,INT,TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.rpc_compute_student_kpis(UUID,UUID,INT,INT,TEXT) FROM PUBLIC, anon;

-- ============ Cron Jobs ============
SELECT cron.schedule('cron_compute_branch_kpis_monthly', '0 5 1 * *', $cron$
DO $body$
DECLARE
  v_branch RECORD;
  v_term UUID;
  v_month INT := EXTRACT(MONTH FROM now() - interval '1 month')::INT;
  v_year INT := EXTRACT(YEAR FROM now() - interval '1 month')::INT;
BEGIN
  FOR v_branch IN SELECT id FROM public.branches WHERE is_active = true LOOP
    SELECT id INTO v_term FROM public.academic_terms
    WHERE branch_id = v_branch.id AND is_active = true
    ORDER BY starts_on DESC LIMIT 1;
    IF v_term IS NOT NULL THEN
      PERFORM public.rpc_compute_branch_kpis(v_branch.id, v_term, v_month, v_year, NULL);
    END IF;
  END LOOP;
END $body$;
$cron$);

SELECT cron.schedule('cron_system_health_check', '0 4 * * *', $cron$
INSERT INTO public.system_health_log(check_type, status, details, checked_at)
VALUES (
  'cron_run', 'ok',
  jsonb_build_object(
    'tables_count', (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'),
    'active_students', (SELECT COUNT(*) FROM public.students WHERE subscription_status = 'active'),
    'open_reassignments', (SELECT COUNT(*) FROM public.pending_reassignment_queue WHERE status = 'open'),
    'pending_excuses', (SELECT COUNT(*) FROM public.absence_excuses WHERE status = 'pending'),
    'overdue_installments', (SELECT COUNT(*) FROM public.installments WHERE status = 'overdue')
  ),
  now()
);
$cron$);
