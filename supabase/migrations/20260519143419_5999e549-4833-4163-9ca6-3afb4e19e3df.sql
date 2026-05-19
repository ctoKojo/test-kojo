-- B-08: allow 'manual_test' check_type
ALTER TABLE public.system_health_log DROP CONSTRAINT system_health_log_check_type_check;
ALTER TABLE public.system_health_log ADD CONSTRAINT system_health_log_check_type_check
  CHECK (check_type = ANY (ARRAY['cron_run','data_integrity','rls_check','backup','custom','manual_test']));

-- B-09: extend rpc_issue_warning signature with p_branch_id + p_reason (optional)
CREATE OR REPLACE FUNCTION public.rpc_issue_warning(
  p_student_id uuid,
  p_warning_type text,
  p_severity text,
  p_title text,
  p_description text DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL,
  p_branch_id uuid DEFAULT NULL,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_branch_id uuid;
  v_warning_id uuid;
  v_existing jsonb;
BEGIN
  IF NOT has_any_role(auth.uid(), ARRAY['super_admin','branch_admin','reception']::app_role[]) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT response INTO v_existing FROM idempotency_keys
      WHERE key = p_idempotency_key AND status = 'completed';
    IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;
  END IF;

  v_branch_id := COALESCE(p_branch_id, (SELECT branch_id FROM students WHERE id = p_student_id));

  INSERT INTO public.student_warnings (
    student_id, branch_id, warning_type, severity, title, description, issued_by, issued_at
  ) VALUES (
    p_student_id, v_branch_id, p_warning_type, p_severity, p_title,
    COALESCE(p_description, p_reason), auth.uid(), now()
  ) RETURNING id INTO v_warning_id;

  IF p_idempotency_key IS NOT NULL THEN
    INSERT INTO idempotency_keys (key, operation, status, response, user_id, completed_at)
    VALUES (p_idempotency_key, 'rpc_issue_warning', 'completed',
            jsonb_build_object('warning_id', v_warning_id), auth.uid(), now())
    ON CONFLICT (key) DO NOTHING;
  END IF;

  RETURN jsonb_build_object('warning_id', v_warning_id);
END $$;

REVOKE EXECUTE ON FUNCTION public.rpc_issue_warning(uuid,text,text,text,text,text,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_issue_warning(uuid,text,text,text,text,text,uuid,text) TO authenticated;

-- E-02: add soft-delete columns
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.group_sessions ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- E-07: add student_id to admin_approval_requests
ALTER TABLE public.admin_approval_requests ADD COLUMN IF NOT EXISTS student_id uuid REFERENCES public.students(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_admin_approval_student ON public.admin_approval_requests(student_id);
