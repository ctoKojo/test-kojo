
-- 1) Warnings always tied to student's branch — drop the extra overload
DROP FUNCTION IF EXISTS public.rpc_issue_warning(
  uuid, text, text, text, text, text, uuid, text
);

-- 2) Trainer overlap: extend to cross-check group_sessions <-> compensation_sessions.
--    Compensation session is allowed to overlap a regular session ONLY when both
--    belong to the same group (same package_tier + same level + same age group).
CREATE OR REPLACE FUNCTION public.check_trainer_overlap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('scheduled','rescheduled') THEN
    RETURN NEW;
  END IF;

  -- vs other group_sessions
  IF EXISTS (
    SELECT 1 FROM public.group_sessions gs
    WHERE gs.trainer_id = NEW.trainer_id
      AND gs.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND gs.status IN ('scheduled','rescheduled')
      AND gs.deleted_at IS NULL
      AND tstzrange(gs.scheduled_at_utc, gs.scheduled_end_at_utc, '[)')
          && tstzrange(NEW.scheduled_at_utc, NEW.scheduled_end_at_utc, '[)')
  ) THEN
    RAISE EXCEPTION 'Trainer % has an overlapping group session', NEW.trainer_id
      USING ERRCODE = 'exclusion_violation';
  END IF;

  -- vs compensation_sessions in a DIFFERENT group only
  IF EXISTS (
    SELECT 1 FROM public.compensation_sessions cs
    WHERE cs.trainer_id = NEW.trainer_id
      AND cs.status = 'scheduled'
      AND cs.group_id <> NEW.group_id
      AND tstzrange(cs.scheduled_at,
                    cs.scheduled_at + (cs.duration_minutes || ' minutes')::interval,
                    '[)')
          && tstzrange(NEW.scheduled_at_utc, NEW.scheduled_end_at_utc, '[)')
  ) THEN
    RAISE EXCEPTION 'Trainer % overlaps a compensation session of a different group', NEW.trainer_id
      USING ERRCODE = 'exclusion_violation';
  END IF;

  RETURN NEW;
END $$;

-- Mirror trigger on compensation_sessions
CREATE OR REPLACE FUNCTION public.check_compensation_overlap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status <> 'scheduled' OR NEW.trainer_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- vs other compensation_sessions in a different group
  IF EXISTS (
    SELECT 1 FROM public.compensation_sessions cs
    WHERE cs.trainer_id = NEW.trainer_id
      AND cs.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND cs.status = 'scheduled'
      AND cs.group_id <> NEW.group_id
      AND tstzrange(cs.scheduled_at,
                    cs.scheduled_at + (cs.duration_minutes || ' minutes')::interval,
                    '[)')
          && tstzrange(NEW.scheduled_at,
                       NEW.scheduled_at + (NEW.duration_minutes || ' minutes')::interval,
                       '[)')
  ) THEN
    RAISE EXCEPTION 'Trainer overlap with a compensation session of a different group'
      USING ERRCODE = 'exclusion_violation';
  END IF;

  -- vs group_sessions in a different group
  IF EXISTS (
    SELECT 1 FROM public.group_sessions gs
    WHERE gs.trainer_id = NEW.trainer_id
      AND gs.status IN ('scheduled','rescheduled')
      AND gs.deleted_at IS NULL
      AND gs.group_id <> NEW.group_id
      AND tstzrange(gs.scheduled_at_utc, gs.scheduled_end_at_utc, '[)')
          && tstzrange(NEW.scheduled_at,
                       NEW.scheduled_at + (NEW.duration_minutes || ' minutes')::interval,
                       '[)')
  ) THEN
    RAISE EXCEPTION 'Compensation session overlaps a regular session of a different group'
      USING ERRCODE = 'exclusion_violation';
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_check_compensation_overlap ON public.compensation_sessions;
CREATE TRIGGER trg_check_compensation_overlap
BEFORE INSERT OR UPDATE ON public.compensation_sessions
FOR EACH ROW EXECUTE FUNCTION public.check_compensation_overlap();

-- 3) Hard-block DELETE on group_sessions (sessions are never deleted, only cancelled)
CREATE OR REPLACE FUNCTION public.fn_block_group_session_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'group_sessions cannot be deleted; cancel the session instead';
END $$;

DROP TRIGGER IF EXISTS trg_block_group_session_delete ON public.group_sessions;
CREATE TRIGGER trg_block_group_session_delete
BEFORE DELETE ON public.group_sessions
FOR EACH ROW EXECUTE FUNCTION public.fn_block_group_session_delete();

-- 4) branches: deletion already restricted to super_admin via existing ALL policy.
--    No change required; documenting here for the migration record.
