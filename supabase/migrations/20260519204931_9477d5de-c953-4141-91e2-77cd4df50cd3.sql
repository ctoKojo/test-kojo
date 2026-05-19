-- Fix recursive RLS between students and parent_student_links by moving
-- cross-table checks into SECURITY DEFINER helper functions.

CREATE OR REPLACE FUNCTION public.is_parent_of_student(_user_id uuid, _student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.parent_student_links psl
    JOIN public.parents p ON p.id = psl.parent_id
    WHERE psl.student_id = _student_id
      AND p.profile_id = _user_id
      AND p.deleted_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.student_is_in_current_user_branch(_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.students s
    WHERE s.id = _student_id
      AND s.deleted_at IS NULL
      AND s.branch_id = ANY (public.current_user_branch_ids())
  );
$$;

DROP POLICY IF EXISTS "students_read" ON public.students;
CREATE POLICY "students_read"
ON public.students
FOR SELECT
TO public
USING (
  public.is_super_admin(auth.uid())
  OR branch_id = ANY (public.current_user_branch_ids())
  OR profile_id = auth.uid()
  OR public.is_parent_of_student(auth.uid(), id)
);

DROP POLICY IF EXISTS "psl_read" ON public.parent_student_links;
CREATE POLICY "psl_read"
ON public.parent_student_links
FOR SELECT
TO public
USING (
  public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.parents p
    WHERE p.id = parent_student_links.parent_id
      AND p.profile_id = auth.uid()
      AND p.deleted_at IS NULL
  )
  OR public.student_is_in_current_user_branch(student_id)
);