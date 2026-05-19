
DO $$
DECLARE
  v_group uuid := 'b98dc544-3791-4502-b5d8-0d6ed709f75a';
  v_branch uuid := 'e20c3006-3f33-4907-86e0-33046f51871c';
  v_trainer uuid := '49aeed97-57a4-43e4-b55b-3ae57536500d';
  v_level uuid := '506cd629-b91f-4f30-a519-eafc1e57f048';
  v_anas uuid := '81f97260-1164-4bd7-90ab-e0cf6e808104';
  v_adam uuid := 'be90e5e6-0c47-4cdf-87c9-78161ed1ac60';
  v_malek uuid := 'cbc1b2c6-ed14-4ee7-82df-f5572d2eeef1';
  v_anas_enr uuid := 'c40242f9-e3ea-48bd-ba88-9b60caa3bb9d';
  v_adam_enr uuid := '0f259fda-010d-4e6c-881a-a8ca4d9feaff';
  v_malek_enr uuid := '663da648-a061-4cc3-b917-f7df96c27bac';
  v_session_id uuid;
  v_start timestamptz;
  i int;
  v_anas_st attendance_status;
  v_adam_st attendance_status;
  v_malek_st attendance_status;
  v_anas_score numeric;
  v_adam_score numeric;
  v_malek_score numeric;
  v_is_past boolean;
BEGIN
  FOR i IN 1..12 LOOP
    v_is_past := i <= 8;
    IF v_is_past THEN
      v_start := date_trunc('hour', now()) - ((9 - i) * interval '7 days') + interval '16 hours';
    ELSE
      v_start := date_trunc('hour', now()) + ((i - 8) * interval '7 days') + interval '16 hours';
    END IF;

    INSERT INTO group_sessions (group_id, branch_id, trainer_id, level_id, session_number, scheduled_at_utc, scheduled_end_at_utc, status)
    VALUES (v_group, v_branch, v_trainer, v_level, i, v_start, v_start + interval '90 minutes', 'scheduled')
    ON CONFLICT (group_id, session_number) DO NOTHING
    RETURNING id INTO v_session_id;

    IF v_session_id IS NULL THEN
      SELECT id INTO v_session_id FROM group_sessions WHERE group_id = v_group AND session_number = i;
    END IF;

    IF v_is_past THEN
      UPDATE group_sessions SET status = 'closed' WHERE id = v_session_id AND status <> 'closed';

      v_anas_st := CASE WHEN i = 3 THEN 'absent'::attendance_status WHEN i = 6 THEN 'late'::attendance_status ELSE 'present'::attendance_status END;
      v_adam_st := CASE WHEN i = 5 THEN 'late'::attendance_status ELSE 'present'::attendance_status END;
      v_malek_st := CASE WHEN i = 2 THEN 'excused'::attendance_status WHEN i = 7 THEN 'absent'::attendance_status ELSE 'present'::attendance_status END;

      INSERT INTO session_attendance (session_id, student_id, enrollment_id, status, marked_by, marked_at)
      VALUES
        (v_session_id, v_anas, v_anas_enr, v_anas_st, v_trainer, v_start + interval '10 minutes'),
        (v_session_id, v_adam, v_adam_enr, v_adam_st, v_trainer, v_start + interval '10 minutes'),
        (v_session_id, v_malek, v_malek_enr, v_malek_st, v_trainer, v_start + interval '10 minutes')
      ON CONFLICT (session_id, student_id) DO NOTHING;

      v_anas_score := LEAST(95, 70 + i * 2.5);
      v_adam_score := LEAST(92, 65 + i * 3);
      v_malek_score := LEAST(90, 60 + i * 3.5);

      INSERT INTO session_evaluations (session_id, student_id, evaluated_by, attendance_score, participation_score, homework_score, overall_score, notes)
      VALUES
        (v_session_id, v_anas, v_trainer,
          CASE v_anas_st WHEN 'present' THEN 100 WHEN 'late' THEN 70 ELSE 0 END,
          v_anas_score, GREATEST(0, v_anas_score - 5), v_anas_score, 'Strong engagement'),
        (v_session_id, v_adam, v_trainer,
          CASE v_adam_st WHEN 'present' THEN 100 WHEN 'late' THEN 70 ELSE 0 END,
          v_adam_score, GREATEST(0, v_adam_score - 3), v_adam_score, 'Steady improvement'),
        (v_session_id, v_malek, v_trainer,
          CASE v_malek_st WHEN 'present' THEN 100 WHEN 'late' THEN 70 WHEN 'excused' THEN 50 ELSE 0 END,
          v_malek_score, GREATEST(0, v_malek_score - 4), v_malek_score, 'Catching up well')
      ON CONFLICT (session_id, student_id) DO NOTHING;
    END IF;

    v_session_id := NULL;
  END LOOP;
END $$;
