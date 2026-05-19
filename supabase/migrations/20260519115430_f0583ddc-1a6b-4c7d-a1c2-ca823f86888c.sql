REVOKE EXECUTE ON FUNCTION public.rpc_grade_assignment(uuid, numeric, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.rpc_record_progression(uuid, uuid, text, uuid, uuid, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.rpc_submit_assignment(uuid, uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.rpc_submit_quiz_attempt(uuid, uuid, jsonb, numeric, text) FROM PUBLIC, anon;