-- ============================================================
-- CHUNK 7 — Migration C
-- RPCs (6), triggers (2), REVOKE hardening
-- ============================================================

-- ============================================================
-- Helper: derive a trainer's branch from current_user_branch_ids
-- (Returns first branch; trainers belong to one branch in practice)
-- ============================================================

-- ============================================================
-- RPC 1: rpc_request_unavailability
-- ============================================================
CREATE OR REPLACE FUNCTION public.rpc_request_unavailability(
  _starts_at timestamptz,
  _ends_at   timestamptz,
  _reason    text,
  _idempotency_key text DEFAULT NULL
)
RETURNS public.trainer_unavailability
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _trainer_id uuid := auth.uid();
  _branch_id  uuid;
  _existing   public.trainer_unavailability;
  _row        public.trainer_unavailability;
BEGIN
  IF _trainer_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;
  IF NOT public.has_role(_trainer_id, 'trainer'::public.app_role) THEN
    RAISE EXCEPTION 'Only trainers can request unavailability' USING ERRCODE = '42501';
  END IF;
  IF _ends_at <= _starts_at THEN
    RAISE EXCEPTION 'ends_at must be after starts_at' USING ERRCODE = '22023';
  END IF;
  IF _reason IS NULL OR length(trim(_reason)) = 0 THEN
    RAISE EXCEPTION 'Reason is required' USING ERRCODE = '22023';
  END IF;

  -- idempotency
  IF _idempotency_key IS NOT NULL THEN
    INSERT INTO public.idempotency_keys (key, operation, user_id, status)
    VALUES (_idempotency_key, 'rpc_request_unavailability', _trainer_id, 'in_progress')
    ON CONFLICT (key) DO NOTHING;

    SELECT (response->>'id')::uuid INTO _row.id
    FROM public.idempotency_keys
    WHERE key = _idempotency_key AND status = 'completed';
    IF _row.id IS NOT NULL THEN
      SELECT * INTO _row FROM public.trainer_unavailability WHERE id = _row.id;
      RETURN _row;
    END IF;
  END IF;

  SELECT (public.current_user_branch_ids())[1] INTO _branch_id;
  IF _branch_id IS NULL THEN
    RAISE EXCEPTION 'Trainer has no branch assignment' USING ERRCODE = '23503';
  END IF;

  INSERT INTO public.trainer_unavailability(trainer_id, branch_id, starts_at, ends_at, reason, status)
  VALUES (_trainer_id, _branch_id, _starts_at, _ends_at, _reason, 'pending')
  RETURNING * INTO _row;

  PERFORM public.log_audit(
    'create'::public.audit_action, 'trainer_unavailability', _row.id, _branch_id,
    NULL, to_jsonb(_row), NULL
  );

  IF _idempotency_key IS NOT NULL THEN
    UPDATE public.idempotency_keys
    SET status='completed', completed_at=now(), response = jsonb_build_object('id', _row.id)
    WHERE key = _idempotency_key;
  END IF;

  RETURN _row;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.rpc_request_unavailability(timestamptz,timestamptz,text,text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.rpc_request_unavailability(timestamptz,timestamptz,text,text) TO authenticated;

-- ============================================================
-- RPC 2: rpc_assign_trainer
-- Reassigns trainer for group + future scheduled sessions
-- ============================================================
CREATE OR REPLACE FUNCTION public.rpc_assign_trainer(
  _group_id        uuid,
  _new_trainer_id  uuid,
  _effective_from  date DEFAULT CURRENT_DATE,
  _idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller     uuid := auth.uid();
  _branch_id  uuid;
  _old_trainer uuid;
  _affected_sessions int;
BEGIN
  IF _caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;
  IF NOT (public.is_super_admin(_caller)
          OR public.has_any_role(_caller, ARRAY['branch_admin','reception']::public.app_role[])) THEN
    RAISE EXCEPTION 'Only admins/reception can reassign trainers' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_role(_new_trainer_id, 'trainer'::public.app_role) THEN
    RAISE EXCEPTION 'Target user is not a trainer' USING ERRCODE = '22023';
  END IF;

  SELECT branch_id, trainer_id INTO _branch_id, _old_trainer
  FROM public.groups WHERE id = _group_id AND deleted_at IS NULL;
  IF _branch_id IS NULL THEN
    RAISE EXCEPTION 'Group not found' USING ERRCODE = '23503';
  END IF;
  IF NOT (public.is_super_admin(_caller) OR _branch_id = ANY(public.current_user_branch_ids())) THEN
    RAISE EXCEPTION 'Group not in your branch' USING ERRCODE = '42501';
  END IF;

  -- idempotency
  IF _idempotency_key IS NOT NULL THEN
    INSERT INTO public.idempotency_keys(key, operation, user_id, status)
    VALUES (_idempotency_key, 'rpc_assign_trainer', _caller, 'in_progress')
    ON CONFLICT (key) DO NOTHING;
    PERFORM 1 FROM public.idempotency_keys WHERE key = _idempotency_key AND status='completed';
    IF FOUND THEN
      RETURN (SELECT response FROM public.idempotency_keys WHERE key = _idempotency_key);
    END IF;
  END IF;

  UPDATE public.groups SET trainer_id = _new_trainer_id, updated_at = now()
  WHERE id = _group_id;

  UPDATE public.group_sessions
  SET trainer_id = _new_trainer_id, version = version + 1, updated_at = now()
  WHERE group_id = _group_id
    AND scheduled_at_utc::date >= _effective_from
    AND status = 'scheduled';
  GET DIAGNOSTICS _affected_sessions = ROW_COUNT;

  PERFORM public.log_audit(
    'update'::public.audit_action, 'groups', _group_id, _branch_id,
    jsonb_build_object('trainer_id', _old_trainer),
    jsonb_build_object('trainer_id', _new_trainer_id, 'effective_from', _effective_from, 'sessions_updated', _affected_sessions),
    NULL
  );

  IF _idempotency_key IS NOT NULL THEN
    UPDATE public.idempotency_keys
    SET status='completed', completed_at=now(),
        response = jsonb_build_object('group_id', _group_id, 'new_trainer_id', _new_trainer_id, 'sessions_updated', _affected_sessions)
    WHERE key = _idempotency_key;
  END IF;

  RETURN jsonb_build_object('group_id', _group_id, 'new_trainer_id', _new_trainer_id, 'sessions_updated', _affected_sessions);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.rpc_assign_trainer(uuid,uuid,date,text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.rpc_assign_trainer(uuid,uuid,date,text) TO authenticated;

-- ============================================================
-- RPC 3: rpc_enroll_student
-- Creates enrollment + subscription + payment + applies sibling/promo discounts
-- ============================================================
CREATE OR REPLACE FUNCTION public.rpc_enroll_student(
  _student_id      uuid,
  _group_id        uuid,
  _package_id      uuid,
  _billing_type    public.billing_type,
  _promo_code      text DEFAULT NULL,
  _payment_method  text DEFAULT 'cash',
  _idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller          uuid := auth.uid();
  _branch_id       uuid;
  _student_branch  uuid;
  _group_branch    uuid;
  _gross_amount    numeric(12,2);
  _net_amount      numeric(12,2);
  _discount_total  numeric(12,2) := 0;
  _sibling_pct     numeric(5,2)  := 0;
  _sibling_count   int;
  _enrollment_id   uuid;
  _subscription_id uuid;
  _payment_id      uuid;
  _promo           public.promo_codes;
  _promo_discount  numeric(12,2) := 0;
  _existing_resp   jsonb;
  _payment_idem    uuid := gen_random_uuid();
  _sessions_count  int;
  _ends_at_calc    timestamptz;
BEGIN
  IF _caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;
  IF NOT (public.is_super_admin(_caller)
          OR public.has_any_role(_caller, ARRAY['branch_admin','reception']::public.app_role[])) THEN
    RAISE EXCEPTION 'Only admins/reception can enroll students' USING ERRCODE = '42501';
  END IF;

  -- idempotency early return
  IF _idempotency_key IS NOT NULL THEN
    INSERT INTO public.idempotency_keys(key, operation, user_id, status)
    VALUES (_idempotency_key, 'rpc_enroll_student', _caller, 'in_progress')
    ON CONFLICT (key) DO NOTHING;
    SELECT response INTO _existing_resp
    FROM public.idempotency_keys
    WHERE key = _idempotency_key AND status='completed';
    IF _existing_resp IS NOT NULL THEN
      RETURN _existing_resp;
    END IF;
  END IF;

  -- Validate student + group + branch consistency
  SELECT branch_id INTO _student_branch FROM public.students WHERE id = _student_id;
  SELECT branch_id INTO _group_branch  FROM public.groups   WHERE id = _group_id AND deleted_at IS NULL;
  IF _student_branch IS NULL THEN RAISE EXCEPTION 'Student not found' USING ERRCODE='23503'; END IF;
  IF _group_branch   IS NULL THEN RAISE EXCEPTION 'Group not found'   USING ERRCODE='23503'; END IF;
  IF _student_branch <> _group_branch THEN
    RAISE EXCEPTION 'Student and group are in different branches' USING ERRCODE='23514';
  END IF;
  _branch_id := _group_branch;
  IF NOT (public.is_super_admin(_caller) OR _branch_id = ANY(public.current_user_branch_ids())) THEN
    RAISE EXCEPTION 'Branch out of scope' USING ERRCODE='42501';
  END IF;

  -- Resolve package price + sessions
  IF _billing_type = 'monthly' THEN
    SELECT price, sessions_count INTO _gross_amount, _sessions_count
    FROM public.packages WHERE id = _package_id AND deleted_at IS NULL;
  ELSE
    SELECT full_price, sessions_count INTO _gross_amount, _sessions_count
    FROM public.packages WHERE id = _package_id AND deleted_at IS NULL;
    IF _gross_amount IS NULL THEN
      RAISE EXCEPTION 'Package has no full-level price' USING ERRCODE='23514';
    END IF;
  END IF;
  IF _gross_amount IS NULL THEN
    RAISE EXCEPTION 'Package not found or inactive' USING ERRCODE='23503';
  END IF;

  -- Sibling discount (count siblings actively enrolled via parent_student_links)
  SELECT count(DISTINCT psl2.student_id) INTO _sibling_count
  FROM public.parent_student_links psl1
  JOIN public.parent_student_links psl2 ON psl1.parent_id = psl2.parent_id AND psl2.student_id <> _student_id
  WHERE psl1.student_id = _student_id
    AND EXISTS (
      SELECT 1 FROM public.group_enrollments ge
      WHERE ge.student_id = psl2.student_id AND ge.status = 'active'
    );

  IF _sibling_count > 0 THEN
    BEGIN
      _sibling_pct := COALESCE((public.get_policy('sibling_discount_pct')::text)::numeric, 0);
    EXCEPTION WHEN OTHERS THEN
      _sibling_pct := 0;
    END;
  END IF;

  -- Promo code
  IF _promo_code IS NOT NULL AND length(trim(_promo_code)) > 0 THEN
    SELECT * INTO _promo FROM public.promo_codes
    WHERE code = _promo_code AND is_active = true
      AND now() >= valid_from
      AND (valid_until IS NULL OR now() < valid_until)
      AND (max_uses IS NULL OR used_count < max_uses)
      AND (branch_id IS NULL OR branch_id = _branch_id)
    FOR UPDATE;
    IF _promo.id IS NULL THEN
      RAISE EXCEPTION 'Promo code invalid or expired' USING ERRCODE='22023';
    END IF;
  END IF;

  -- Compute discounts (sibling stackable with promo)
  _discount_total := round(_gross_amount * (_sibling_pct/100.0), 2);
  IF _promo.id IS NOT NULL THEN
    IF _promo.discount_pct IS NOT NULL THEN
      _promo_discount := round((_gross_amount - _discount_total) * (_promo.discount_pct/100.0), 2);
    ELSE
      _promo_discount := LEAST(_promo.discount_amount, _gross_amount - _discount_total);
    END IF;
    _discount_total := _discount_total + _promo_discount;
  END IF;
  _net_amount := GREATEST(_gross_amount - _discount_total, 0);

  -- Create enrollment
  INSERT INTO public.group_enrollments(student_id, group_id, package_id, status, billing_type)
  VALUES (_student_id, _group_id, _package_id, 'active', _billing_type)
  RETURNING id INTO _enrollment_id;

  -- Create subscription
  _ends_at_calc := CASE WHEN _billing_type = 'monthly'
                        THEN now() + interval '1 month'
                        ELSE now() + (interval '1 month' * GREATEST(_sessions_count/4, 1)) END;

  INSERT INTO public.subscriptions(
    student_id, enrollment_id, branch_id, package_id, status,
    remaining_sessions, started_at, ends_at, subscription_end_date
  ) VALUES (
    _student_id, _enrollment_id, _branch_id, _package_id, 'active'::public.payment_status,
    _sessions_count, now(), _ends_at_calc, _ends_at_calc::date
  ) RETURNING id INTO _subscription_id;

  -- Create payment header
  INSERT INTO public.payments(
    student_id, subscription_id, branch_id, idempotency_key,
    amount_total, amount_paid, discount_amount, payment_method,
    status, created_by
  ) VALUES (
    _student_id, _subscription_id, _branch_id, _payment_idem,
    _net_amount, 0, _discount_total, _payment_method,
    'pending'::public.payment_status, _caller
  ) RETURNING id INTO _payment_id;

  -- Record discount entries
  IF _sibling_pct > 0 THEN
    INSERT INTO public.enrollment_discounts(
      enrollment_id, student_id, branch_id, source, discount_pct, discount_amount, applied_at
    ) VALUES (
      _enrollment_id, _student_id, _branch_id, 'sibling',
      _sibling_pct, round(_gross_amount * (_sibling_pct/100.0), 2), now()
    );
  END IF;
  IF _promo.id IS NOT NULL THEN
    INSERT INTO public.enrollment_discounts(
      enrollment_id, student_id, branch_id, source, promo_code_id,
      discount_pct, discount_amount, applied_at
    ) VALUES (
      _enrollment_id, _student_id, _branch_id, 'promo_code', _promo.id,
      _promo.discount_pct, _promo_discount, now()
    );
    UPDATE public.promo_codes SET used_count = used_count + 1, updated_at = now()
    WHERE id = _promo.id;
  END IF;
  IF _billing_type = 'full_level' THEN
    INSERT INTO public.enrollment_discounts(
      enrollment_id, student_id, branch_id, source,
      discount_amount, reason, applied_at
    ) VALUES (
      _enrollment_id, _student_id, _branch_id, 'full_level_price',
      0, 'Full-level pricing applied (not a discount)', now()
    );
  END IF;

  PERFORM public.log_audit(
    'create'::public.audit_action, 'group_enrollments', _enrollment_id, _branch_id,
    NULL,
    jsonb_build_object('student_id', _student_id, 'group_id', _group_id,
                       'billing_type', _billing_type, 'gross', _gross_amount,
                       'discount', _discount_total, 'net', _net_amount),
    NULL
  );

  IF _idempotency_key IS NOT NULL THEN
    UPDATE public.idempotency_keys
    SET status='completed', completed_at=now(),
        response = jsonb_build_object(
          'enrollment_id', _enrollment_id,
          'subscription_id', _subscription_id,
          'payment_id', _payment_id,
          'gross_amount', _gross_amount,
          'discount_total', _discount_total,
          'net_amount', _net_amount
        )
    WHERE key = _idempotency_key;
  END IF;

  RETURN jsonb_build_object(
    'enrollment_id', _enrollment_id,
    'subscription_id', _subscription_id,
    'payment_id', _payment_id,
    'gross_amount', _gross_amount,
    'discount_total', _discount_total,
    'net_amount', _net_amount
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.rpc_enroll_student(uuid,uuid,uuid,public.billing_type,text,text,text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.rpc_enroll_student(uuid,uuid,uuid,public.billing_type,text,text,text) TO authenticated;

-- ============================================================
-- RPC 4: rpc_calculate_trainer_payroll
-- ============================================================
CREATE OR REPLACE FUNCTION public.rpc_calculate_trainer_payroll(
  _trainer_id uuid,
  _year       integer,
  _month      integer
)
RETURNS public.trainer_monthly_payroll
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller     uuid := auth.uid();
  _branch_id  uuid;
  _cfg        public.trainer_compensation_config;
  _period_start date;
  _period_end   date;
  _base_pay   numeric(12,2) := 0;
  _session_pay numeric(12,2) := 0;
  _comp_session_pay numeric(12,2) := 0;
  _training_pay numeric(12,2) := 0;
  _commission_pay numeric(12,2) := 0;
  _kpi_pending numeric(12,2) := 0;
  _kpi_rule   public.role_kpi_bonus_rules;
  _kpi        public.trainer_kpis;
  _row        public.trainer_monthly_payroll;
  _metric_val numeric(12,2);
BEGIN
  IF _caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE='28000';
  END IF;
  IF NOT (public.is_super_admin(_caller) OR public.has_role(_caller, 'branch_admin'::public.app_role)) THEN
    RAISE EXCEPTION 'Only admins can calculate payroll' USING ERRCODE='42501';
  END IF;
  IF _month < 1 OR _month > 12 THEN
    RAISE EXCEPTION 'Invalid month' USING ERRCODE='22023';
  END IF;

  _period_start := make_date(_year, _month, 1);
  _period_end   := (_period_start + interval '1 month')::date;

  -- Get active compensation config covering the period
  SELECT * INTO _cfg
  FROM public.trainer_compensation_config
  WHERE trainer_id = _trainer_id
    AND effective_from <= _period_end
    AND (effective_to IS NULL OR effective_to >= _period_start)
  ORDER BY effective_from DESC
  LIMIT 1;

  IF _cfg.id IS NULL THEN
    RAISE EXCEPTION 'No compensation config for trainer in this period' USING ERRCODE='23503';
  END IF;
  _branch_id := _cfg.branch_id;

  IF NOT (public.is_super_admin(_caller) OR _branch_id = ANY(public.current_user_branch_ids())) THEN
    RAISE EXCEPTION 'Branch out of scope' USING ERRCODE='42501';
  END IF;

  -- Compute pay by model
  IF _cfg.model = 'fixed_monthly' THEN
    _base_pay := _cfg.base_monthly_amount;
  ELSIF _cfg.model = 'hourly_session' THEN
    SELECT COALESCE(SUM(
      EXTRACT(EPOCH FROM (scheduled_end_at_utc - scheduled_at_utc))/3600.0 * _cfg.hourly_rate
    ), 0)::numeric(12,2)
    INTO _session_pay
    FROM public.group_sessions
    WHERE trainer_id = _trainer_id
      AND status = 'closed'
      AND scheduled_at_utc >= _period_start
      AND scheduled_at_utc <  _period_end;
  ELSIF _cfg.model = 'paid_training' THEN
    SELECT COALESCE(count(*), 0) * _cfg.training_session_pay
    INTO _training_pay
    FROM public.group_sessions
    WHERE trainer_id = _trainer_id
      AND status = 'closed'
      AND scheduled_at_utc >= _period_start
      AND scheduled_at_utc <  _period_end;
  ELSIF _cfg.model = 'unpaid_training' THEN
    _training_pay := 0;
  ELSIF _cfg.model = 'fixed_plus_commission' THEN
    _base_pay := _cfg.base_monthly_amount;
    -- commission base = number of active enrollments in trainer's groups during period
    SELECT COALESCE(count(*), 0) * (_cfg.commission_pct)
    INTO _commission_pay
    FROM public.group_enrollments ge
    JOIN public.groups g ON g.id = ge.group_id
    WHERE g.trainer_id = _trainer_id
      AND ge.enrolled_at >= _period_start AND ge.enrolled_at < _period_end;
  END IF;

  -- Compensation session pay (always added regardless of model)
  SELECT COALESCE(SUM(trainer_extra_pay), 0)
  INTO _comp_session_pay
  FROM public.compensation_sessions
  WHERE trainer_id = _trainer_id
    AND status = 'completed'
    AND completed_at >= _period_start AND completed_at < _period_end;

  -- KPI bonus pending: read trainer_kpis row + apply role_kpi_bonus_rules
  SELECT * INTO _kpi FROM public.trainer_kpis
  WHERE trainer_id = _trainer_id AND year = _year AND month = _month
  LIMIT 1;

  IF _kpi.id IS NOT NULL THEN
    FOR _kpi_rule IN
      SELECT * FROM public.role_kpi_bonus_rules
      WHERE role = 'trainer'::public.app_role
        AND is_active = true
        AND (branch_id IS NULL OR branch_id = _branch_id)
    LOOP
      _metric_val := CASE _kpi_rule.kpi_code
        WHEN 'attendance_pct'        THEN _kpi.avg_attendance_pct
        WHEN 'student_satisfaction'  THEN _kpi.student_satisfaction_score
        WHEN 'completed_sessions'    THEN _kpi.completed_sessions::numeric
        WHEN 'avg_student_score'     THEN _kpi.avg_student_score
        WHEN 'assignments_graded'    THEN _kpi.assignments_graded::numeric
        WHEN 'quizzes_graded'        THEN _kpi.quizzes_graded::numeric
        ELSE NULL
      END;
      IF _metric_val IS NULL THEN CONTINUE; END IF;
      IF (_kpi_rule.min_threshold IS NULL OR _metric_val >= _kpi_rule.min_threshold)
         AND (_kpi_rule.max_threshold IS NULL OR _metric_val <= _kpi_rule.max_threshold) THEN
        _kpi_pending := _kpi_pending + _kpi_rule.bonus_amount - _kpi_rule.penalty_amount;
      END IF;
    END LOOP;
  END IF;

  -- Upsert payroll row (draft, awaiting admin approval for KPI bonus)
  INSERT INTO public.trainer_monthly_payroll(
    trainer_id, branch_id, year, month, compensation_config_id, model,
    base_pay, session_pay, compensation_session_pay, training_pay, commission_pay,
    kpi_bonus_pending, kpi_bonus_approved, status, computed_at
  ) VALUES (
    _trainer_id, _branch_id, _year, _month, _cfg.id, _cfg.model,
    _base_pay, _session_pay, _comp_session_pay, _training_pay, _commission_pay,
    _kpi_pending, 0, 'pending_approval', now()
  )
  ON CONFLICT (trainer_id, year, month) DO UPDATE
    SET compensation_config_id = EXCLUDED.compensation_config_id,
        model                  = EXCLUDED.model,
        base_pay               = EXCLUDED.base_pay,
        session_pay            = EXCLUDED.session_pay,
        compensation_session_pay = EXCLUDED.compensation_session_pay,
        training_pay           = EXCLUDED.training_pay,
        commission_pay         = EXCLUDED.commission_pay,
        kpi_bonus_pending      = EXCLUDED.kpi_bonus_pending,
        computed_at            = now(),
        status                 = CASE
          WHEN public.trainer_monthly_payroll.status = 'paid' THEN 'paid'
          ELSE 'pending_approval' END
  RETURNING * INTO _row;

  PERFORM public.log_audit(
    'update'::public.audit_action, 'trainer_monthly_payroll', _row.id, _branch_id,
    NULL, to_jsonb(_row), NULL
  );

  RETURN _row;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.rpc_calculate_trainer_payroll(uuid,integer,integer) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.rpc_calculate_trainer_payroll(uuid,integer,integer) TO authenticated;

-- ============================================================
-- RPC 5: rpc_approve_kpi_bonus
-- ============================================================
CREATE OR REPLACE FUNCTION public.rpc_approve_kpi_bonus(
  _payroll_id      uuid,
  _approved_amount numeric,
  _notes           text DEFAULT NULL
)
RETURNS public.trainer_monthly_payroll
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
  _row    public.trainer_monthly_payroll;
BEGIN
  IF _caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE='28000';
  END IF;
  IF NOT (public.is_super_admin(_caller) OR public.has_role(_caller,'branch_admin'::public.app_role)) THEN
    RAISE EXCEPTION 'Only admins can approve KPI bonus' USING ERRCODE='42501';
  END IF;
  IF _approved_amount < 0 THEN
    RAISE EXCEPTION 'Approved amount cannot be negative' USING ERRCODE='22023';
  END IF;

  SELECT * INTO _row FROM public.trainer_monthly_payroll WHERE id = _payroll_id FOR UPDATE;
  IF _row.id IS NULL THEN
    RAISE EXCEPTION 'Payroll row not found' USING ERRCODE='23503';
  END IF;
  IF NOT (public.is_super_admin(_caller) OR _row.branch_id = ANY(public.current_user_branch_ids())) THEN
    RAISE EXCEPTION 'Branch out of scope' USING ERRCODE='42501';
  END IF;
  IF _row.status = 'paid' THEN
    RAISE EXCEPTION 'Payroll already paid' USING ERRCODE='22023';
  END IF;

  UPDATE public.trainer_monthly_payroll
  SET kpi_bonus_approved    = _approved_amount,
      kpi_bonus_approved_by = _caller,
      kpi_bonus_approved_at = now(),
      status                = 'approved',
      notes                 = COALESCE(_notes, notes),
      updated_at            = now()
  WHERE id = _payroll_id
  RETURNING * INTO _row;

  PERFORM public.log_audit(
    'update'::public.audit_action, 'trainer_monthly_payroll', _payroll_id, _row.branch_id,
    NULL, jsonb_build_object('kpi_bonus_approved', _approved_amount, 'status', 'approved'), NULL
  );

  RETURN _row;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.rpc_approve_kpi_bonus(uuid,numeric,text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.rpc_approve_kpi_bonus(uuid,numeric,text) TO authenticated;

-- ============================================================
-- RPC 6: rpc_apply_promo_code (standalone, for already-created enrollment)
-- ============================================================
CREATE OR REPLACE FUNCTION public.rpc_apply_promo_code(
  _code          text,
  _enrollment_id uuid
)
RETURNS public.enrollment_discounts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller    uuid := auth.uid();
  _enr       public.group_enrollments;
  _student_branch uuid;
  _group_branch   uuid;
  _promo     public.promo_codes;
  _payment   public.payments;
  _discount  numeric(12,2);
  _row       public.enrollment_discounts;
BEGIN
  IF _caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE='28000';
  END IF;
  IF NOT (public.is_super_admin(_caller)
          OR public.has_any_role(_caller, ARRAY['branch_admin','reception']::public.app_role[])) THEN
    RAISE EXCEPTION 'Only admins/reception can apply promo codes' USING ERRCODE='42501';
  END IF;

  SELECT * INTO _enr FROM public.group_enrollments WHERE id = _enrollment_id;
  IF _enr.id IS NULL THEN RAISE EXCEPTION 'Enrollment not found' USING ERRCODE='23503'; END IF;
  SELECT branch_id INTO _group_branch FROM public.groups WHERE id = _enr.group_id;

  IF NOT (public.is_super_admin(_caller) OR _group_branch = ANY(public.current_user_branch_ids())) THEN
    RAISE EXCEPTION 'Branch out of scope' USING ERRCODE='42501';
  END IF;

  SELECT * INTO _promo FROM public.promo_codes
  WHERE code = _code AND is_active = true
    AND now() >= valid_from
    AND (valid_until IS NULL OR now() < valid_until)
    AND (max_uses IS NULL OR used_count < max_uses)
    AND (branch_id IS NULL OR branch_id = _group_branch)
  FOR UPDATE;
  IF _promo.id IS NULL THEN
    RAISE EXCEPTION 'Promo code invalid or expired' USING ERRCODE='22023';
  END IF;

  -- Find the latest payment for this enrollment via subscription
  SELECT p.* INTO _payment
  FROM public.payments p
  JOIN public.subscriptions s ON s.id = p.subscription_id
  WHERE s.enrollment_id = _enrollment_id
  ORDER BY p.created_at DESC LIMIT 1;
  IF _payment.id IS NULL THEN
    RAISE EXCEPTION 'No payment found for enrollment' USING ERRCODE='23503';
  END IF;

  IF _promo.discount_pct IS NOT NULL THEN
    _discount := round(_payment.amount_total * (_promo.discount_pct/100.0), 2);
  ELSE
    _discount := LEAST(_promo.discount_amount, _payment.amount_total);
  END IF;

  INSERT INTO public.enrollment_discounts(
    enrollment_id, student_id, branch_id, source, promo_code_id,
    discount_pct, discount_amount, applied_at
  ) VALUES (
    _enrollment_id, _enr.student_id, _group_branch, 'promo_code', _promo.id,
    _promo.discount_pct, _discount, now()
  ) RETURNING * INTO _row;

  UPDATE public.payments
  SET discount_amount = discount_amount + _discount,
      amount_total    = GREATEST(amount_total - _discount, amount_paid),
      updated_at      = now()
  WHERE id = _payment.id;

  UPDATE public.promo_codes SET used_count = used_count + 1, updated_at = now()
  WHERE id = _promo.id;

  PERFORM public.log_audit(
    'create'::public.audit_action, 'enrollment_discounts', _row.id, _group_branch,
    NULL, to_jsonb(_row), NULL
  );

  RETURN _row;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.rpc_apply_promo_code(text,uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.rpc_apply_promo_code(text,uuid) TO authenticated;

-- ============================================================
-- TRIGGER 1: validate billing_type on group_enrollments insert
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_validate_enrollment_billing_type()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _full_price numeric(12,2);
BEGIN
  IF NEW.billing_type = 'full_level' AND NEW.package_id IS NOT NULL THEN
    SELECT full_price INTO _full_price FROM public.packages WHERE id = NEW.package_id;
    IF _full_price IS NULL THEN
      RAISE EXCEPTION 'Package % has no full-level price set', NEW.package_id
        USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.fn_validate_enrollment_billing_type() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS trg_validate_billing_type ON public.group_enrollments;
CREATE TRIGGER trg_validate_billing_type
  BEFORE INSERT OR UPDATE OF billing_type, package_id ON public.group_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.fn_validate_enrollment_billing_type();

-- ============================================================
-- TRIGGER 2: waiting-list auto-promote
-- When an active enrollment ends, promote first waiting enrollment.
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_promote_waiting_list()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _next_id uuid;
BEGIN
  IF OLD.status = 'active'
     AND NEW.status IN ('dropped','completed','transferred','frozen')
  THEN
    SELECT id INTO _next_id
    FROM public.group_enrollments
    WHERE group_id = NEW.group_id AND status = 'waiting'
    ORDER BY enrolled_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF _next_id IS NOT NULL THEN
      UPDATE public.group_enrollments
      SET status = 'active', enrolled_at = now()
      WHERE id = _next_id;

      PERFORM public.log_audit(
        'update'::public.audit_action, 'group_enrollments', _next_id, NULL,
        jsonb_build_object('status','waiting'),
        jsonb_build_object('status','active','promoted_from_waiting_list', true),
        NULL
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.fn_promote_waiting_list() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS trg_waiting_list_promote ON public.group_enrollments;
CREATE TRIGGER trg_waiting_list_promote
  AFTER UPDATE OF status ON public.group_enrollments
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.fn_promote_waiting_list();

-- ============================================================
-- TRIGGER 3: validate trainer compensation model against role rules
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_validate_trainer_comp_model()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _allowed public.compensation_model[];
BEGIN
  SELECT allowed_models INTO _allowed
  FROM public.role_compensation_rules WHERE role = 'trainer'::public.app_role;
  IF _allowed IS NULL THEN
    RETURN NEW; -- no rules defined yet → allow
  END IF;
  IF NOT (NEW.model = ANY(_allowed)) THEN
    RAISE EXCEPTION 'Compensation model % not allowed for trainers', NEW.model
      USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.fn_validate_trainer_comp_model() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS trg_validate_trainer_comp_model ON public.trainer_compensation_config;
CREATE TRIGGER trg_validate_trainer_comp_model
  BEFORE INSERT OR UPDATE OF model ON public.trainer_compensation_config
  FOR EACH ROW EXECUTE FUNCTION public.fn_validate_trainer_comp_model();