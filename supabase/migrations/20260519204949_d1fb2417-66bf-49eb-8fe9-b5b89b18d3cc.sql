REVOKE ALL ON FUNCTION public.is_parent_of_student(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.student_is_in_current_user_branch(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_parent_of_student(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_is_in_current_user_branch(uuid) TO authenticated;