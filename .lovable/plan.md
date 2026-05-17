# Kojo Academy — Phase 0: Database Foundation

تنفيذ الـ Database كاملة على Lovable Cloud (Supabase) — **بدون أي UI أو frontend code**.

النتيجة بعد الـ Phase: schema جاهزة بالكامل + business logic كلها في الـ DB (triggers + RPCs + cron + RLS)، وأي feature جاي يبني فوقها بدون spaghetti.

---

## 1. تفعيل Lovable Cloud

تأكيد إن المشروع متربوط بـ Supabase (لو مش متفعل، يتفعل أول حاجة).

---

## 2. الـ Schema — 42 جدول على 5 طبقات

كل الجداول بـ `uuid PRIMARY KEY DEFAULT gen_random_uuid()` + `created_at` + `updated_at` + FKs صحيحة + ENUMs للـ states.

**Layer 0 — Identity & Config (11):**
`branches, profiles, user_roles, students, age_groups, parent_student_links, system_policies, policy_snapshots, audit_logs, notifications, notification_preferences`

**Layer 1 — Curriculum (8):**
`packages, levels, level_sessions, session_content, assignments, quizzes, quiz_questions, entry_test_questions`

**Layer 2 — Operations (14):**
`groups, group_sessions, group_enrollments, attendance, absence_excuses, evaluations, student_blocks, compensation_requests, compensation_sessions, assignment_submissions, quiz_attempts, entry_test_attempts, transfer_requests, substitutions, admin_attendance_overrides, level_progressions`

**Layer 3 — Financial (8):**
`treasuries, treasury_transactions, payments, installments, expenses, commission_rules, commission_assignments, commissions, reinstatement_fees`

**Layer 4 — Staff & KPIs (8):**
`staff, staff_schedules, leave_requests, kpi_definitions, kpi_weights_snapshots, kpi_scores, warnings, certificates`

**ENUMs أساسية:** `app_role`, `subscription_status`, `attendance_status`, `payment_status`, `installment_status`, `block_type`, `session_status`, `enrollment_status`, `submission_status`, `compensation_status`, `package_tier`.

**ملاحظة أمنية:** الـ roles في جدول `user_roles` منفصل عن `profiles` (منع privilege escalation)، مع function `has_role(uuid, app_role)` SECURITY DEFINER.

---

## 3. Seed Data

- `age_groups`: أطفال (6-9)، ناشئين (10-13)، مراهقين (14-18)
- `packages`: Kojo Squad (6-8)، Kojo Core (2-3)، Kojo X (1) + content flags
- `system_policies` لكل branch (15 policy: absence limits، lock minutes، payment block days، siblings discount 10%، hw limits، reinstatement fee 500، thresholds…)

---

## 4. Indexes (14)

على الأعمدة الحرجة: `students.branch_id`, `group_enrollments(student_id,group_id)`, `attendance(student_id,group_session_id)`, `payments.student_id`, `installments(due_date,status)`, `notifications(recipient_id,read_at)`, `policy_snapshots.enrollment_id`, إلخ.

---

## 5. Triggers (مع التعديلات الإلزامية)

1. `trg_handle_attendance` — موحّد (reset عداد متتالي عند الحضور / زيادة العدادات + فحص الحرمان + reinstatement fee + notification عند الغياب)
2. `trg_restore_access_on_payment` — يفحص باقي الـ installments والـ block types قبل ما يرجع `active`
3. `trg_treasury_on_payment` / `trg_treasury_on_expense` / `trg_treasury_on_reinstatement` — 3 functions منفصلة
4. `trg_create_group_sessions` — يحسب تواريخ السيشنات من الـ schedule (DOW + start_date + weekly)
5. `trg_activate_on_first_session` — `active_waiting` → `active` بعد أول حضور
6. `trg_siblings_discount` — خصم 10% أوتوماتيك على installments الأخوات
7. `trg_check_hw_restriction` — حرمان عند تجاوز حد الواجبات (consecutive/total)
8. `trg_snapshot_policies_on_enrollment` — snapshot للسياسات وقت التسجيل
9. `trg_validate_group_capacity` — منع تخطي capacity حسب الباقة
10. `trg_cascade_group_freeze` — تجميد السيشنات لو الجروب اتجمد
11. `trg_student_age_group` — تحديد age_group أوتوماتيك من birthdate
12. `trg_set_quiz_deadline` — تحديد deadline للـ quiz من policy
13. `trg_auto_grade_quiz` — تصحيح أوتوماتيك للـ MCQ
14. `trg_update_missed_hw_counters` — تحديث counters المهمة للـ KPIs

---

## 6. RPC Functions (6)

- `rpc_enroll_student(student, group, package)` — تسجيل atomic + snapshot + installments + capacity check
- `rpc_record_attendance_bulk(session_id, records[])` — تسجيل حضور جماعي
- `rpc_request_compensation(student, session)` — طلب تعويض (مجاني)
- `rpc_process_transfer(student, from_group, to_group)` — نقل بدون رسوم
- `rpc_calculate_commissions(period)` — حساب عمولات الـ staff
- `rpc_progress_student_level(student, level)` — انتقال للمستوى التالي بعد فحص الـ thresholds

---

## 7. Cron Jobs (4) عبر pg_cron

- `cron_lock_attendance` — كل 30 دقيقة، يقفل تعديل الحضور بعد `session_lock_minutes`
- `cron_auto_close_sessions` — كل ساعة، يقفل السيشنات بعد 24 ساعة **ويسجّل غياب أوتوماتيك** للطلاب اللي مفيش ليهم record
- `cron_payment_block` — يومي، يقطع access للطلاب اللي عندهم overdue > N أيام
- `cron_check_missed_assignments` — يومي، يحدّث submissions لـ `missed` ويشغّل trigger الحرمان

---

## 8. RLS Policies

كل الجداول `ENABLE ROW LEVEL SECURITY` مع policies بـ `has_role()`:

- **Branch isolation**: `students/groups/payments/…` مفلترة بـ `branch_id ∈ user's branches`
- **Trainer**: يشوف سيشناته و attendance بتاعته بس
- **Financial tables**: `super_admin / branch_admin / receptionist` فقط
- **Notifications**: كل user يشوف بتاعته (`recipient_id = auth.uid()`)
- **Students/Parents**: يشوفوا بياناتهم فقط عبر `parent_student_links`

---

## 9. Storage Buckets

- `session-content` (private) — slides/summary_video/full_video
- `assignments` (private)
- `submissions` (private)
- `certificates` (private)
- `avatars` (public)

كل bucket بـ RLS policies على path pattern: `{branch_id}/{student_id}/…`.

---

## 10. Type Generation

بعد ما الـ migration يتنفذ، Lovable Cloud بيولّد الـ types تلقائي في `src/integrations/supabase/types.ts` — مفيش حاجة manual.

---

## 11. القواعد الثابتة للمشروع كله (Architecture Contract)

- كل business logic = في الـ DB (triggers + RPCs) أو Edge Functions. **ممنوع** في React.
- Frontend = Display + Forms + Navigation فقط.
- كل supabase call من `src/lib/api/*` فقط — ممنوع مباشرة في component.
- كل data fetching = TanStack Query hooks فقط.
- كل عملية مالية: **انتظر السيرفر**، ممنوع optimistic update.
- مفيش conditional logic مالي/أكاديمي في الـ UI.

---

## القسم التقني (DDL مختصر)

- migrations تتقسم على ملفات: `0001_enums.sql`, `0002_layer0.sql`, `0003_layer1.sql`, `0004_layer2.sql`, `0005_layer3.sql`, `0006_layer4.sql`, `0007_indexes.sql`, `0008_triggers.sql`, `0009_rpcs.sql`, `0010_cron.sql`, `0011_rls.sql`, `0012_seed.sql`, `0013_storage.sql`.
- التنفيذ بالترتيب ده عشان الـ FKs والـ triggers ميقعوش.
- كل function `SET search_path = public` و SECURITY DEFINER عند اللزوم فقط.

---

## بعد الموافقة

أبدأ Phase 0 فوراً (database فقط — مفيش UI). أبلغك لما يخلص علشان نبدأ Phase 1 (Auth + Routing).
