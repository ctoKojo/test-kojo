-- [S-06a] Rename age group trigger to canonical name
ALTER TRIGGER trg_student_age_group ON public.students
  RENAME TO trg_auto_assign_age_group;

-- [S-06b] Rename group capacity trigger to canonical name
ALTER TRIGGER trg_validate_group_capacity ON public.group_enrollments
  RENAME TO trg_check_group_capacity;

-- [S-06c] Add explicit trainer-overlap check trigger
CREATE OR REPLACE FUNCTION public.check_trainer_overlap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('scheduled','rescheduled') AND EXISTS (
    SELECT 1 FROM public.group_sessions gs
    WHERE gs.trainer_id = NEW.trainer_id
      AND gs.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND gs.status IN ('scheduled','rescheduled')
      AND tstzrange(gs.scheduled_at_utc, gs.scheduled_end_at_utc, '[)')
          && tstzrange(NEW.scheduled_at_utc, NEW.scheduled_end_at_utc, '[)')
  ) THEN
    RAISE EXCEPTION 'Trainer % has an overlapping session', NEW.trainer_id
      USING ERRCODE = 'exclusion_violation';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_check_trainer_overlap
  BEFORE INSERT OR UPDATE OF scheduled_at_utc, scheduled_end_at_utc, trainer_id, status
  ON public.group_sessions
  FOR EACH ROW EXECUTE FUNCTION public.check_trainer_overlap();

-- [B-05] Add tsrange_slot generated column on group_sessions
ALTER TABLE public.group_sessions
  ADD COLUMN tsrange_slot tstzrange
  GENERATED ALWAYS AS (tstzrange(scheduled_at_utc, scheduled_end_at_utc, '[)')) STORED;

-- [S-07] Rename net_pay → net_amount on trainer_monthly_payroll
ALTER TABLE public.trainer_monthly_payroll
  RENAME COLUMN net_pay TO net_amount;

-- [B-02] Insert missing system policy: lock_grace_hours
INSERT INTO public.system_policies (key, value, description, category)
VALUES (
  'attendance.lock_grace_hours',
  '24'::jsonb,
  'Hours after session end before attendance records are auto-locked',
  'attendance'
)
ON CONFLICT (key) DO NOTHING;
