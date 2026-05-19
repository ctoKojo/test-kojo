
-- ============ TABLES ============

CREATE TABLE public.session_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.group_sessions(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('slides','summary','full_video','short_video','attachment')),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.group_sessions(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ NOT NULL,
  max_score NUMERIC(5,2) NOT NULL DEFAULT 100,
  is_compensation BOOLEAN NOT NULL DEFAULT false,
  source_session_id UUID REFERENCES public.group_sessions(id),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  session_id UUID NOT NULL REFERENCES public.group_sessions(id),
  source_session_id UUID REFERENCES public.group_sessions(id),
  submission_url TEXT,
  submitted_at TIMESTAMPTZ,
  score NUMERIC(5,2) CHECK (score >= 0),
  graded_by UUID REFERENCES public.profiles(id),
  graded_at TIMESTAMPTZ,
  feedback TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','submitted','graded','missed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_submission_student_assignment UNIQUE (assignment_id, student_id)
);

CREATE TABLE public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.group_sessions(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 30,
  max_score NUMERIC(5,2) NOT NULL DEFAULT 100,
  passing_score NUMERIC(5,2) NOT NULL DEFAULT 50,
  deadline TIMESTAMPTZ NOT NULL,
  is_compensation BOOLEAN NOT NULL DEFAULT false,
  source_session_id UUID REFERENCES public.group_sessions(id),
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  session_id UUID NOT NULL REFERENCES public.group_sessions(id),
  source_session_id UUID REFERENCES public.group_sessions(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  score NUMERIC(5,2) CHECK (score >= 0),
  passed BOOLEAN,
  answers JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_quiz_attempt_student UNIQUE (quiz_id, student_id)
);

CREATE TABLE public.session_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.group_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  source_session_id UUID REFERENCES public.group_sessions(id),
  evaluated_by UUID REFERENCES public.profiles(id),
  attendance_score NUMERIC(5,2),
  participation_score NUMERIC(5,2),
  homework_score NUMERIC(5,2),
  overall_score NUMERIC(5,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_evaluation_student_session UNIQUE (session_id, student_id)
);

CREATE TABLE public.final_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  academic_term_id UUID NOT NULL REFERENCES public.academic_terms(id),
  title TEXT NOT NULL,
  exam_date DATE NOT NULL,
  max_score NUMERIC(5,2) NOT NULL DEFAULT 100,
  passing_score NUMERIC(5,2) NOT NULL DEFAULT 50,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.final_exam_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.final_exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  score NUMERIC(5,2) CHECK (score >= 0),
  passed BOOLEAN,
  failure_reason_type TEXT CHECK (failure_reason_type IN ('academy_fault','student_fault','external')),
  graded_by UUID REFERENCES public.profiles(id),
  graded_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_exam_result_student UNIQUE (exam_id, student_id)
);

CREATE TABLE public.student_progression_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  academic_term_id UUID NOT NULL REFERENCES public.academic_terms(id),
  from_level_id UUID REFERENCES public.levels(id),
  to_level_id UUID REFERENCES public.levels(id),
  progression_type TEXT NOT NULL CHECK (progression_type IN ('promoted','retained','dropped','reinstated')),
  failure_reason_type TEXT CHECK (failure_reason_type IN ('academy_fault','student_fault','external')),
  decided_by UUID REFERENCES public.profiles(id),
  decided_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ TRIGGERS ============

CREATE TRIGGER trg_session_content_updated_at BEFORE UPDATE ON public.session_content FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_assignments_updated_at BEFORE UPDATE ON public.assignments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_assignment_submissions_updated_at BEFORE UPDATE ON public.assignment_submissions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_quizzes_updated_at BEFORE UPDATE ON public.quizzes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_quiz_attempts_updated_at BEFORE UPDATE ON public.quiz_attempts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_session_evaluations_updated_at BEFORE UPDATE ON public.session_evaluations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_final_exams_updated_at BEFORE UPDATE ON public.final_exams FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_final_exam_results_updated_at BEFORE UPDATE ON public.final_exam_results FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.fn_set_quiz_passed()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_passing NUMERIC;
BEGIN
  SELECT passing_score INTO v_passing FROM public.quizzes WHERE id = NEW.quiz_id;
  IF NEW.score IS NOT NULL THEN
    NEW.passed := (NEW.score >= v_passing);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_set_quiz_passed
  BEFORE INSERT OR UPDATE ON public.quiz_attempts
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_quiz_passed();

CREATE OR REPLACE FUNCTION public.fn_set_exam_passed()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_passing NUMERIC;
BEGIN
  SELECT passing_score INTO v_passing FROM public.final_exams WHERE id = NEW.exam_id;
  IF NEW.score IS NOT NULL THEN
    NEW.passed := (NEW.score >= v_passing);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_set_exam_passed
  BEFORE INSERT OR UPDATE ON public.final_exam_results
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_exam_passed();

-- ============ RPCs ============

CREATE OR REPLACE FUNCTION public.rpc_submit_assignment(
  p_assignment_id UUID,
  p_student_id UUID,
  p_submission_url TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
) RETURNS JSONB
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_existing JSONB;
  v_result UUID;
  v_assignment RECORD;
BEGIN
  IF p_idempotency_key IS NOT NULL THEN
    SELECT response INTO v_existing FROM public.idempotency_keys
    WHERE key = p_idempotency_key AND operation = 'submit_assignment' AND expires_at > now();
    IF FOUND THEN RETURN v_existing; END IF;
  END IF;

  SELECT * INTO v_assignment FROM public.assignments WHERE id = p_assignment_id;
  IF v_assignment IS NULL THEN
    RAISE EXCEPTION 'ASSIGNMENT_NOT_FOUND';
  END IF;
  IF now() > v_assignment.due_date THEN
    RAISE EXCEPTION 'ASSIGNMENT_DEADLINE_PASSED: deadline was %', v_assignment.due_date;
  END IF;

  INSERT INTO public.assignment_submissions(
    assignment_id, student_id, session_id, source_session_id,
    submission_url, submitted_at, status
  ) VALUES (
    p_assignment_id, p_student_id, v_assignment.session_id,
    v_assignment.source_session_id, p_submission_url, now(), 'submitted'
  )
  ON CONFLICT (assignment_id, student_id)
  DO UPDATE SET submission_url = EXCLUDED.submission_url, submitted_at = now(), status = 'submitted'
  RETURNING id INTO v_result;

  IF p_idempotency_key IS NOT NULL THEN
    INSERT INTO public.idempotency_keys(key, operation, user_id, status, response, completed_at)
    VALUES (p_idempotency_key, 'submit_assignment', auth.uid(), 'completed',
            jsonb_build_object('success', true, 'submission_id', v_result), now())
    ON CONFLICT (key) DO NOTHING;
  END IF;

  RETURN jsonb_build_object('success', true, 'submission_id', v_result);
END;
$$;
GRANT EXECUTE ON FUNCTION public.rpc_submit_assignment TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_grade_assignment(
  p_submission_id UUID,
  p_score NUMERIC,
  p_feedback TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
) RETURNS JSONB
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE v_existing JSONB;
BEGIN
  IF p_idempotency_key IS NOT NULL THEN
    SELECT response INTO v_existing FROM public.idempotency_keys
    WHERE key = p_idempotency_key AND operation = 'grade_assignment' AND expires_at > now();
    IF FOUND THEN RETURN v_existing; END IF;
  END IF;

  UPDATE public.assignment_submissions
  SET score = p_score, feedback = p_feedback,
      graded_by = auth.uid(), graded_at = now(), status = 'graded'
  WHERE id = p_submission_id;

  PERFORM public.log_audit('update'::audit_action, 'assignment_submissions', p_submission_id,
    NULL, NULL, NULL, jsonb_build_object('grade_event', true, 'score', p_score));

  IF p_idempotency_key IS NOT NULL THEN
    INSERT INTO public.idempotency_keys(key, operation, user_id, status, response, completed_at)
    VALUES (p_idempotency_key, 'grade_assignment', auth.uid(), 'completed',
            jsonb_build_object('success', true, 'submission_id', p_submission_id), now())
    ON CONFLICT (key) DO NOTHING;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.rpc_grade_assignment TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_submit_quiz_attempt(
  p_quiz_id UUID,
  p_student_id UUID,
  p_answers JSONB,
  p_score NUMERIC,
  p_idempotency_key TEXT DEFAULT NULL
) RETURNS JSONB
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_existing JSONB;
  v_result UUID;
  v_quiz RECORD;
BEGIN
  IF p_idempotency_key IS NOT NULL THEN
    SELECT response INTO v_existing FROM public.idempotency_keys
    WHERE key = p_idempotency_key AND operation = 'submit_quiz' AND expires_at > now();
    IF FOUND THEN RETURN v_existing; END IF;
  END IF;

  SELECT * INTO v_quiz FROM public.quizzes WHERE id = p_quiz_id;
  IF v_quiz IS NULL THEN
    RAISE EXCEPTION 'QUIZ_NOT_FOUND';
  END IF;
  IF now() > v_quiz.deadline THEN
    RAISE EXCEPTION 'QUIZ_DEADLINE_PASSED: deadline was %', v_quiz.deadline;
  END IF;

  INSERT INTO public.quiz_attempts(
    quiz_id, student_id, session_id, source_session_id,
    submitted_at, score, answers
  ) VALUES (
    p_quiz_id, p_student_id, v_quiz.session_id, v_quiz.source_session_id,
    now(), p_score, p_answers
  )
  ON CONFLICT (quiz_id, student_id)
  DO UPDATE SET score = EXCLUDED.score, answers = EXCLUDED.answers, submitted_at = now()
  RETURNING id INTO v_result;

  IF p_idempotency_key IS NOT NULL THEN
    INSERT INTO public.idempotency_keys(key, operation, user_id, status, response, completed_at)
    VALUES (p_idempotency_key, 'submit_quiz', auth.uid(), 'completed',
            jsonb_build_object('success', true, 'attempt_id', v_result,
                               'passed', (p_score >= v_quiz.passing_score)), now())
    ON CONFLICT (key) DO NOTHING;
  END IF;

  RETURN jsonb_build_object('success', true, 'attempt_id', v_result,
                            'passed', (p_score >= v_quiz.passing_score));
END;
$$;
GRANT EXECUTE ON FUNCTION public.rpc_submit_quiz_attempt TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_record_progression(
  p_student_id UUID,
  p_academic_term_id UUID,
  p_progression_type TEXT,
  p_from_level_id UUID DEFAULT NULL,
  p_to_level_id UUID DEFAULT NULL,
  p_failure_reason_type TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
) RETURNS JSONB
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_existing JSONB;
  v_result UUID;
BEGIN
  IF p_idempotency_key IS NOT NULL THEN
    SELECT response INTO v_existing FROM public.idempotency_keys
    WHERE key = p_idempotency_key AND operation = 'record_progression' AND expires_at > now();
    IF FOUND THEN RETURN v_existing; END IF;
  END IF;

  INSERT INTO public.student_progression_log(
    student_id, academic_term_id, from_level_id, to_level_id,
    progression_type, failure_reason_type, decided_by, notes
  ) VALUES (
    p_student_id, p_academic_term_id, p_from_level_id, p_to_level_id,
    p_progression_type, p_failure_reason_type, auth.uid(), p_notes
  ) RETURNING id INTO v_result;

  IF p_progression_type = 'promoted' AND p_to_level_id IS NOT NULL THEN
    UPDATE public.students SET current_level_id = p_to_level_id, updated_at = now()
    WHERE id = p_student_id;
  END IF;

  PERFORM public.log_audit('create'::audit_action, 'student_progression_log', v_result,
    NULL, NULL, NULL, jsonb_build_object('type', p_progression_type, 'student', p_student_id));

  IF p_idempotency_key IS NOT NULL THEN
    INSERT INTO public.idempotency_keys(key, operation, user_id, status, response, completed_at)
    VALUES (p_idempotency_key, 'record_progression', auth.uid(), 'completed',
            jsonb_build_object('success', true, 'log_id', v_result), now())
    ON CONFLICT (key) DO NOTHING;
  END IF;

  RETURN jsonb_build_object('success', true, 'log_id', v_result);
END;
$$;
GRANT EXECUTE ON FUNCTION public.rpc_record_progression TO authenticated;

-- ============ INDEXES ============

CREATE INDEX idx_session_content_session ON public.session_content(session_id);
CREATE INDEX idx_assignments_session ON public.assignments(session_id);
CREATE INDEX idx_assignments_group ON public.assignments(group_id);
CREATE INDEX idx_submissions_student ON public.assignment_submissions(student_id);
CREATE INDEX idx_submissions_assignment ON public.assignment_submissions(assignment_id);
CREATE INDEX idx_quiz_attempts_student ON public.quiz_attempts(student_id);
CREATE INDEX idx_quiz_attempts_quiz ON public.quiz_attempts(quiz_id);
CREATE INDEX idx_evaluations_session ON public.session_evaluations(session_id);
CREATE INDEX idx_evaluations_student ON public.session_evaluations(student_id);
CREATE INDEX idx_final_exam_results_student ON public.final_exam_results(student_id);
CREATE INDEX idx_progression_student ON public.student_progression_log(student_id, academic_term_id);

-- ============ RLS ============

ALTER TABLE public.session_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "content_read_staff" ON public.session_content FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','branch_admin','reception','trainer']::app_role[]));
CREATE POLICY "content_write_trainer" ON public.session_content FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','branch_admin','trainer']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','branch_admin','trainer']::app_role[]));

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assignments_read" ON public.assignments FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','branch_admin','reception','trainer']::app_role[]));
CREATE POLICY "assignments_write" ON public.assignments FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','branch_admin','trainer']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','branch_admin','trainer']::app_role[]));

ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "submissions_read_staff" ON public.assignment_submissions FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','branch_admin','trainer']::app_role[]));
CREATE POLICY "submissions_read_student" ON public.assignment_submissions FOR SELECT TO authenticated
  USING (student_id IN (SELECT id FROM public.students WHERE profile_id = auth.uid()));
CREATE POLICY "submissions_write_student" ON public.assignment_submissions FOR INSERT TO authenticated
  WITH CHECK (student_id IN (SELECT id FROM public.students WHERE profile_id = auth.uid()));
CREATE POLICY "submissions_grade_trainer" ON public.assignment_submissions FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','branch_admin','trainer']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','branch_admin','trainer']::app_role[]));

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quizzes_read" ON public.quizzes FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','branch_admin','reception','trainer']::app_role[]));
CREATE POLICY "quizzes_write" ON public.quizzes FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','branch_admin','trainer']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','branch_admin','trainer']::app_role[]));

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attempts_read_staff" ON public.quiz_attempts FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','branch_admin','trainer']::app_role[]));
CREATE POLICY "attempts_read_student" ON public.quiz_attempts FOR SELECT TO authenticated
  USING (student_id IN (SELECT id FROM public.students WHERE profile_id = auth.uid()));
CREATE POLICY "attempts_write_student" ON public.quiz_attempts FOR INSERT TO authenticated
  WITH CHECK (student_id IN (SELECT id FROM public.students WHERE profile_id = auth.uid()));

ALTER TABLE public.session_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "evaluations_read" ON public.session_evaluations FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','branch_admin','trainer']::app_role[]));
CREATE POLICY "evaluations_write" ON public.session_evaluations FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','branch_admin','trainer']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','branch_admin','trainer']::app_role[]));

ALTER TABLE public.final_exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exams_read" ON public.final_exams FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','branch_admin','trainer']::app_role[]));
CREATE POLICY "exams_write" ON public.final_exams FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','branch_admin']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','branch_admin']::app_role[]));

ALTER TABLE public.final_exam_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exam_results_read" ON public.final_exam_results FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','branch_admin','trainer']::app_role[]));
CREATE POLICY "exam_results_write" ON public.final_exam_results FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','branch_admin','trainer']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','branch_admin','trainer']::app_role[]));

ALTER TABLE public.student_progression_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "progression_read" ON public.student_progression_log FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','branch_admin']::app_role[]));
CREATE POLICY "progression_write" ON public.student_progression_log FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','branch_admin']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','branch_admin']::app_role[]));
