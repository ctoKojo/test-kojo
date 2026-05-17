# Kojo Academy — Phase 0: Database Foundation (v7 Final)

نظام أكاديمية تعليمية متعدد الفروع. كل البيزنس لوجيك في الـ Database (Triggers + RPCs). الـ Frontend عرض + Forms فقط.

---

## القرارات المحسومة

| القرار | الاختيار |
|---|---|
| Parent onboarding | Magic link من الريسيبشن (Supabase invite) — الريسيبشن تسجل الطفل + إيميل ولي الأمر، النظام يبعت magic link أوتوماتيك |
| Route structure | Shared routes + smart redirect حسب الـ active role بعد اللوجين. الـ UI يتغير ديناميكياً. |
| Final Exam | جدول مستقل `final_exams` مرتبط بـ `group_session_id` + `level_id` — proctoring/grading/weight مختلف عن الكويز |
| Subscription tracking | `remaining_sessions` = source of truth، `subscription_end_date` = derived/cached. التحديث في `fn_close_session` فقط |
| Multi-day groups | Multi-slot weekly recurrence engine: `schedule_meta = {pattern, sessions_per_week, slots:[{day,time}]}`. `fn_create_group_sessions` تعمل round-robin على الـ slots حسب weekday recurrence حتى total_sessions |

---

## Architecture Contract (ثابت طول المشروع)

1. كل business logic في DB (triggers + RPCs). الـ Frontend ممنوع يعمل calculation/conditional.
2. كل Supabase call من `src/lib/api/*` فقط. ممنوع `supabase.from(...)` في component.
3. كل data fetching من TanStack Query hooks في `src/hooks/queries/*`.
4. ممنوع optimistic updates للعمليات المالية أو الحضور.
5. Zustand للـ UI state فقط (modals, filters, active branch).
6. كل عملية حساسة → RPC بـ `SECURITY DEFINER` + RAISE EXCEPTION للأخطاء.

---

## 1. Database Layers (42 جدول)

### Layer 0: Identity & Config (8)
`profiles`, `user_roles` (M2M: user_id + role + branch_id, unique), `branches`, `system_policies` (per-branch JSONB), `age_groups`, `audit_logs`, `notifications`, `app_settings`

### Layer 1: Curriculum (6)
`packages`, `levels` (weights: attendance/classwork/quiz/final_exam, passing_score), `level_indicators`, `session_templates`, `session_content` (package_id للـ access control), `quizzes` + `quiz_questions` + `quiz_options`

### Layer 2: Operations (10)
`students`, `parent_student_links`, `entry_test_attempts`, `groups` (schedule_meta JSONB), `group_enrollments` (remaining_sessions INT, subscription_end_date TIMESTAMPTZ cached), `group_sessions` (is_opened, opened_at, closed_at, scheduled_at), `attendance` (is_locked), `assignments`, `quiz_attempts`, `evaluations`

### Layer 3: Financial (8)
`treasuries` (balance), `treasury_transactions`, `payments`, `installments`, `pricing_rules`, `discounts` (siblings auto), `refunds`, `pauses` (freezes installments + remaining_sessions)

### Layer 4: Compensation & Progression (5)
`compensation_requests` (status, deadline, parent decision), `compensation_slots`, `level_progressions` (final_score, passed, failure_reason: academy_fault/student_fault), `final_exams` (group_session_id + level_id + proctor_id + max_score + weight), `student_documents`

### Layer 5: Staff & KPIs (5)
`staff`, `staff_schedules`, `warnings`, `kpi_definitions`, `kpi_scores` (per staff, per month, JSONB scores)

---

## 2. Triggers (Mandatory)

| Trigger | Table | Purpose |
|---|---|---|
| `trg_create_profile_on_signup` | auth.users | auto-create profile |
| `trg_handle_attendance` | attendance | hw restriction + late counter |
| `trg_attendance_lock_check` | attendance | reject if NOW() > scheduled_at + lock_minutes |
| `trg_session_content_package_check` | session_content (RLS) | student sees only own package |
| `trg_restore_access_on_payment` | installments | unlock content when paid |
| `trg_treasury_debit/credit/transfer` | treasury_transactions | atomic balance updates |
| `trg_create_group_sessions` | groups (insert) | calls fn_create_group_sessions (multi-slot engine) |
| `trg_activate_on_first_session` | attendance | flip student status to active on first present |
| `trg_siblings_discount` | parent_student_links | recalc discount when 2nd+ child added |
| `trg_check_hw_restriction` | assignments | block submission if locked |
| `trg_freeze_on_pause` | pauses | freeze installments + remaining_sessions |
| `trg_audit_all_writes` | sensitive tables | log to audit_logs |

---

## 3. RPC Functions (Complete List)

### Onboarding & Placement
- `fn_invite_parent(p_email, p_student_id)` — Supabase admin invite + link parent_student_links
- `fn_evaluate_entry_test(p_student_id, p_age_group_id, p_answers JSONB)` → level + borderline flag (mid-range → lower level + admin flag)
- `fn_change_package_in_waitlist(p_student_id, p_new_package_id)` — recalc payment + siblings discount + re-matching

### Sessions
- `fn_open_session(p_group_session_id)` — flip to live, record opened_at, audit late opens, return lock_at
- `fn_close_session(p_group_session_id)` — mark absent for missing students, close quizzes, decrement remaining_sessions, recompute subscription_end_date, status=completed
- `fn_submit_quiz_attempt(...)` — validate within session window only (deadline = session.closed_at)
- `fn_submit_assignment(...)` — check hw_restriction

### Financial
- `fn_create_payment_with_installments(p_student_id, p_group_id, p_total, p_type, p_treasury_id, p_num_installments)` — atomic payment + installments rows
- `fn_transfer_between_treasuries(p_from, p_to, p_amount, p_note)` — balance check + 2 transactions
- `fn_freeze_student_installments(p_student_id, p_pause_id)` — pause-aware freeze
- `fn_apply_refund(p_payment_id, p_amount, p_reason)`

### Compensation
- `fn_calculate_compensation_options(p_student_id, p_missed_session_id)` — validates no older pending request first
- `fn_confirm_compensation(p_request_id, p_chosen_slot)` — locks slot + notifies trainer
- `fn_escalate_compensation()` — called by cron (48h reminder, 72h escalate, deadline → failed_scheduling)

### Progression & KPIs
- `fn_calculate_level_result(p_student_id, p_level_id, p_enrollment_id)` — full GPA calc with failure_reason logic
- `fn_promote_student_to_next_level(p_student_id)` — requires passed=true in level_progressions
- `fn_calculate_trainer_kpis(p_staff_id, p_month)` — session_open_rate, attendance_rate, assignment_upload_rate, warnings_count
- `fn_calculate_receptionist_kpis(p_staff_id, p_month)` — collection_rate, response_time, errors_count
- `fn_monthly_close(p_month)` — runs all KPI calcs + locks data

---

## 4. Multi-Slot Scheduling Engine

```text
fn_create_group_sessions(group_id):
  meta := groups.schedule_meta
  current := group.start_date
  i := 0
  FOR session_number IN 1..level.total_sessions:
    slot := meta.slots[i % length(meta.slots)]
    next_date := find_next_occurrence(current, slot.day, slot.time)
    INSERT group_sessions(group_id, session_number, scheduled_at=next_date)
    current := next_date
    i := i + 1
```

Deterministic. Same input = same schedule. Supports 1-N days/week.

---

## 5. Views (Dashboards)

- `waiting_list_dashboard` — ordered by payment date (FCFS)
- `todays_sessions_trainer` — per trainer, today's sessions with attendance status
- `overdue_installments_dashboard` — pending installments past due_date
- `pending_compensations_dashboard` — with hours_waiting + escalation status
- `student_lifetime_performance` — all levels + scores + attendance %

---

## 6. Cron Jobs (pg_cron)

| Cron | Schedule | Purpose |
|---|---|---|
| `cron_lock_attendance` | every 5 min | lock attendance after window |
| `cron_compensation_escalation` | hourly | 48h reminder + 72h escalate + deadline failures |
| `cron_overdue_installments` | daily | mark overdue + notify |
| `cron_monthly_close` | 1st of month | trigger fn_monthly_close + KPIs |

---

## 7. RLS Policies

- `has_role(uid, role, branch_id)` SECURITY DEFINER helper
- Super Admin: all branches
- Branch Admin / Receptionist: own branch only
- Trainer: own groups + assigned sessions
- Parent: own children only (via parent_student_links)
- Student: own data + session_content WHERE package_id = current enrollment package

---

## 8. Storage Buckets

`avatars` (public), `student_documents` (private), `assignments` (private), `session_content` (private + signed URLs), `quiz_media` (private)

---

## 9. Frontend Structure

```text
src/
  lib/
    api/           ← all supabase calls (one file per domain)
    supabase.ts
  hooks/
    queries/       ← TanStack Query hooks (useStudents, useSessions...)
    mutations/     ← RPC calls (useOpenSession, useSubmitPayment...)
    useAuth.ts     ← returns { roles[], activeBranchId, setActiveBranch, isSuperAdmin }
  stores/          ← Zustand UI state only
  routes/          ← shared paths, redirect on /login by active role
  components/
    forms/         ← Zod + react-hook-form
    tables/        ← display only
  types/
    database.types.ts  ← supabase gen types
```

---

## 10. Execution Order

1. Migration 001: Layer 0 + `has_role` + RLS helpers + profile trigger
2. Migration 002: Layer 1 (curriculum)
3. Migration 003: Layer 2 (operations) + `fn_create_group_sessions` + multi-slot engine
4. Migration 004: Layer 3 (financial) + treasury triggers + `fn_create_payment_with_installments` + siblings
5. Migration 005: Layer 4 (compensation + final_exams + progression) + escalation cron
6. Migration 006: Layer 5 (staff + KPIs) + monthly_close cron
7. Migration 007: All views + remaining RPCs
8. Generate types → `src/types/database.types.ts`
9. Build `src/lib/api/*` skeleton (empty functions, one per RPC)
10. Build `useAuth` + role-based redirect + login page

Phase 1 (Auth UI) starts only after Phase 0 verified.

---

## 11. Edge Cases Covered

- Race on attendance lock → trigger checks NOW() vs scheduled_at + lock_minutes
- Race on group capacity → DB-level capacity check in fn_enroll
- Older pending compensation → blocks new one
- Package change in waitlist → recalc siblings + payment
- Trainer late opening → late counter recorded but lock_at stays at scheduled_at + 30min
- Quiz outside session → rejected (deadline = session.closed_at)
- Student tries higher-package content → RLS blocks
- Pause → freezes both installments AND remaining_sessions
