
-- Fix search_path on trigger func
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Revoke public EXECUTE from all SECURITY DEFINER helpers; grant to authenticated only
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_any_role(uuid, app_role[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_user_branch_ids() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_has_branch_access(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_policy(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.log_audit(audit_action, text, uuid, uuid, jsonb, jsonb, jsonb) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, app_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_branch_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_branch_access(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_policy(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_audit(audit_action, text, uuid, uuid, jsonb, jsonb, jsonb) TO authenticated;
