
DELETE FROM public.age_groups;
INSERT INTO public.age_groups (code, name, min_age, max_age, sort_order) VALUES
  ('kids',   'Kids (6-9)',    6,  9,  1),
  ('tweens', 'Tweens (10-13)',10, 13, 2),
  ('teens',  'Teens (14-18)', 14, 18, 3);

DO $seed$
DECLARE
  v_branch_id   uuid := gen_random_uuid();
  v_level_id    uuid := gen_random_uuid();
  v_package_id  uuid := gen_random_uuid();
  v_feeplan_id  uuid := gen_random_uuid();
  v_group_id    uuid := gen_random_uuid();
  v_trainer_id  uuid := '49aeed97-57a4-43e4-b55b-3ae57536500d';
  v_anas_uid    uuid := gen_random_uuid();
  v_adam_uid    uuid := gen_random_uuid();
  v_malek_uid   uuid := gen_random_uuid();
  v_parent_uid  uuid := gen_random_uuid();
  v_anas_student  uuid;
  v_adam_student  uuid;
  v_malek_student uuid;
  v_parent_id   uuid;
  v_enr_id      uuid;
  v_sub_id      uuid;
  v_pay_id      uuid;
BEGIN
  INSERT INTO public.branches (id, code, name, city, timezone, is_active)
  VALUES (v_branch_id, 'CAI01', 'Kojobot Cairo HQ', 'Cairo', 'Africa/Cairo', true);

  INSERT INTO public.levels (id, branch_id, name, order_index, sessions_count)
  VALUES (v_level_id, v_branch_id, 'Level 0', 0, 12);

  INSERT INTO public.packages (id, branch_id, name, tier, max_students, sessions_count, price, full_price)
  VALUES (v_package_id, v_branch_id, 'Kojo Squad', 'squad', 8, 12, 2700, 2700);

  INSERT INTO public.fee_plans (id, branch_id, package_id, name, installments_count, discount_pct)
  VALUES (v_feeplan_id, v_branch_id, v_package_id, 'Kojo Squad — 3 installments', 3, 0);

  INSERT INTO public.groups (id, branch_id, level_id, package_tier, trainer_id, name, subscription_type, online_link, max_students, status, starts_on)
  VALUES (v_group_id, v_branch_id, v_level_id, 'squad', v_trainer_id, 'T21', 'online', 'https://meet.example.com/t21', 8, 'active', '2026-04-13');

  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change, raw_app_meta_data, raw_user_meta_data, is_super_admin)
  VALUES
    ('00000000-0000-0000-0000-000000000000', v_anas_uid,   'authenticated','authenticated','Kojo0077@kojobot.com','', now(), now(), now(), '', '', '', '', '{"provider":"email"}'::jsonb, '{}'::jsonb, false),
    ('00000000-0000-0000-0000-000000000000', v_adam_uid,   'authenticated','authenticated','Kojo0076@kojobot.com','', now(), now(), now(), '', '', '', '', '{"provider":"email"}'::jsonb, '{}'::jsonb, false),
    ('00000000-0000-0000-0000-000000000000', v_malek_uid,  'authenticated','authenticated','Kojo0074@kojobot.com','', now(), now(), now(), '', '', '', '', '{"provider":"email"}'::jsonb, '{}'::jsonb, false),
    ('00000000-0000-0000-0000-000000000000', v_parent_uid, 'authenticated','authenticated','samaheltoney@gmail.com','', now(), now(), now(), '', '', '', '', '{"provider":"email"}'::jsonb, '{}'::jsonb, false);

  -- Profile rows may be auto-created by a trigger on auth.users; upsert to set names/phones.
  INSERT INTO public.profiles (id, full_name, phone, email, preferred_lang, is_active) VALUES
    (v_anas_uid,   'Anas Ahmed Farouq',  '01033389637', 'Kojo0077@kojobot.com',     'ar', true),
    (v_adam_uid,   'Adam Ahmed Farouq',  '01033389637', 'Kojo0076@kojobot.com',     'ar', true),
    (v_malek_uid,  'Malek Yehia Ahmed',  '01070389810', 'Kojo0074@kojobot.com',     'ar', true),
    (v_parent_uid, 'Samah Eltoney',      NULL,          'samaheltoney@gmail.com',   'ar', true)
  ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        phone     = EXCLUDED.phone,
        email     = EXCLUDED.email;

  INSERT INTO public.students (profile_id, branch_id, current_level_id, current_group_id, subscription_status, birthdate)
  VALUES (v_anas_uid,  v_branch_id, v_level_id, v_group_id, 'active', '2019-11-08') RETURNING id INTO v_anas_student;
  INSERT INTO public.students (profile_id, branch_id, current_level_id, current_group_id, subscription_status, birthdate)
  VALUES (v_adam_uid,  v_branch_id, v_level_id, v_group_id, 'active', '2016-09-02') RETURNING id INTO v_adam_student;
  INSERT INTO public.students (profile_id, branch_id, current_level_id, current_group_id, subscription_status, birthdate)
  VALUES (v_malek_uid, v_branch_id, v_level_id, v_group_id, 'active', '2019-11-07') RETURNING id INTO v_malek_student;

  INSERT INTO public.parents (profile_id, branch_id, relation_type)
  VALUES (v_parent_uid, v_branch_id, 'guardian') RETURNING id INTO v_parent_id;

  INSERT INTO public.parent_student_links (parent_id, student_id, is_primary) VALUES
    (v_parent_id, v_anas_student, true),
    (v_parent_id, v_adam_student, false);

  -- ANAS
  INSERT INTO public.group_enrollments (student_id, group_id, package_id, status, enrolled_at, billing_type)
  VALUES (v_anas_student, v_group_id, v_package_id, 'active', '2026-04-18'::timestamptz, 'full_level') RETURNING id INTO v_enr_id;
  INSERT INTO public.subscriptions (student_id, enrollment_id, branch_id, package_id, status, remaining_sessions, started_at)
  VALUES (v_anas_student, v_enr_id, v_branch_id, v_package_id, 'active', 12, '2026-04-18'::timestamptz) RETURNING id INTO v_sub_id;
  INSERT INTO public.payments (student_id, subscription_id, branch_id, fee_plan_id, idempotency_key, amount_total, amount_paid, payment_method, status)
  VALUES (v_anas_student, v_sub_id, v_branch_id, v_feeplan_id, gen_random_uuid(), 2700, 200, 'cash', 'partial') RETURNING id INTO v_pay_id;
  INSERT INTO public.installments (payment_id, student_id, branch_id, amount, due_date, status, paid_amount, paid_at, payment_method) VALUES
    (v_pay_id, v_anas_student, v_branch_id, 900, '2026-04-18', 'paid',    200, '2026-04-18'::timestamptz, 'cash'),
    (v_pay_id, v_anas_student, v_branch_id, 900, '2026-05-18', 'pending', NULL, NULL, NULL),
    (v_pay_id, v_anas_student, v_branch_id, 900, '2026-06-18', 'pending', NULL, NULL, NULL);

  -- ADAM
  INSERT INTO public.group_enrollments (student_id, group_id, package_id, status, enrolled_at, billing_type)
  VALUES (v_adam_student, v_group_id, v_package_id, 'active', '2026-04-18'::timestamptz, 'full_level') RETURNING id INTO v_enr_id;
  INSERT INTO public.subscriptions (student_id, enrollment_id, branch_id, package_id, status, remaining_sessions, started_at)
  VALUES (v_adam_student, v_enr_id, v_branch_id, v_package_id, 'active', 12, '2026-04-18'::timestamptz) RETURNING id INTO v_sub_id;
  INSERT INTO public.payments (student_id, subscription_id, branch_id, fee_plan_id, idempotency_key, amount_total, amount_paid, payment_method, status)
  VALUES (v_adam_student, v_sub_id, v_branch_id, v_feeplan_id, gen_random_uuid(), 2700, 1000, 'cash', 'partial') RETURNING id INTO v_pay_id;
  INSERT INTO public.installments (payment_id, student_id, branch_id, amount, due_date, status, paid_amount, paid_at, payment_method) VALUES
    (v_pay_id, v_adam_student, v_branch_id, 900, '2026-04-18', 'paid',    900, '2026-04-18'::timestamptz, 'cash'),
    (v_pay_id, v_adam_student, v_branch_id, 900, '2026-05-18', 'paid',    100, '2026-05-15'::timestamptz, 'cash'),
    (v_pay_id, v_adam_student, v_branch_id, 900, '2026-06-18', 'pending', NULL, NULL, NULL);

  -- MALEK
  INSERT INTO public.group_enrollments (student_id, group_id, package_id, status, enrolled_at, billing_type)
  VALUES (v_malek_student, v_group_id, v_package_id, 'active', '2026-04-13'::timestamptz, 'full_level') RETURNING id INTO v_enr_id;
  INSERT INTO public.subscriptions (student_id, enrollment_id, branch_id, package_id, status, remaining_sessions, started_at)
  VALUES (v_malek_student, v_enr_id, v_branch_id, v_package_id, 'active', 12, '2026-04-13'::timestamptz) RETURNING id INTO v_sub_id;
  INSERT INTO public.payments (student_id, subscription_id, branch_id, fee_plan_id, idempotency_key, amount_total, amount_paid, payment_method, status)
  VALUES (v_malek_student, v_sub_id, v_branch_id, v_feeplan_id, gen_random_uuid(), 2250, 2250, 'cash', 'paid') RETURNING id INTO v_pay_id;
  INSERT INTO public.installments (payment_id, student_id, branch_id, amount, due_date, status, paid_amount, paid_at, payment_method) VALUES
    (v_pay_id, v_malek_student, v_branch_id, 2250, '2026-04-13', 'paid', 2250, '2026-04-13'::timestamptz, 'cash');
END
$seed$;
