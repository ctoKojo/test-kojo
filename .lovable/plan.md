# Kojo Academy — Master Architecture Plan v2 (Enterprise-Safe)

> نسخة نهائية محسومة + كل blockers و gaps من الـ stress-test مدمجين. النظام ده مصمم يعيش سنين بدون سباجيتي ولا data corruption.

---

## 1. القواعد الذهبية (Architecture Contract — ثابتة طول عمر المشروع)

### 1.1 فصل المسؤوليات

```text
UI Components  →  Hooks (TanStack Query)  →  API Layer (lib/api)  →  Supabase (RPC + RLS + Triggers)
   عرض فقط          cache + invalidation         pass-through            كل business logic هنا
```

### 1.2 قواعد ممنوع كسرها

| القاعدة | السبب |
|---|---|
| ممنوع `supabase.from()` في component | separation + testing |
| ممنوع optimistic update على money/session | inconsistency خطيرة |
| ممنوع business logic في React | DB = single source of truth |
| ممنوع تخزين role في profile | privilege escalation |
| كل money/session mutation = RPC | atomicity + audit |
| كل RPC = transaction + audit_log | traceability |
| ممنوع DELETE فعلي — soft delete (`deleted_at`) | recovery + audit |
| FK افتراضي = `ON DELETE RESTRICT` (cascade rules محسومة في §3.5) | يمنع corruption |
| money = `numeric(12,2)` ممنوع float | precision |
| timestamp = `timestamptz` ممنوع `timestamp` | timezone safety |
| كل RPC مالي/سيشن = `idempotency_key uuid` مطلوب | منع double-charge |

### 1.3 ستراكتشر المشروع الثابت

```text
src/
├── routes/                    # TanStack file-based routing
│   ├── __root.tsx
│   ├── index.tsx, login.tsx, unauthorized.tsx
│   └── _authenticated/        # beforeLoad guard + smart redirect
│       ├── route.tsx
│       ├── dashboard.tsx
│       └── (students|groups|sessions|payments|treasury|staff|settings).*.tsx
├── lib/
│   ├── api/                   # الوصول الوحيد لـ Supabase
│   ├── email-templates/       # React Email
│   ├── auth/                  # useAuth + RoleGuard + permissions.ts
│   ├── validators/            # Zod schemas
│   └── utils/
├── hooks/
│   ├── queries/  └─ mutations/
├── components/
│   ├── ui/  └─ shared/  └─ features/<domain>/
├── stores/                    # Zustand — UI state فقط
└── integrations/supabase/
```

### 1.4 Permissions Matrix — ملف واحد
`src/lib/auth/permissions.ts` — role × action × resource. `<RoleGuard>` و `beforeLoad` بيقرأوا منه.

---

## 2. الأدوار
`super_admin` | `branch_admin` | `reception` | `trainer` | `parent` | `student`

- `user_roles(user_id, role, branch_id)` — M2M.
- `useAuth() → { user, roles[], activeRole, switchRole(), activeBranchId }`.
- Smart redirect بعد لوجين حسب `activeRole`.

---

## 3. Database Schema (48 جدول / 5 طبقات)

### Layer 0 — Identity, Config & Safety
`profiles`, `user_roles`, `branches` (`timezone text not null`), `rooms`, `system_policies` (JSONB per branch: refund, late_fee, session_duration, grace_period, max_final_retakes, absence_block_threshold), `audit_log`, `notifications`, `notifications_archive` *(G5)*, **`branch_holidays`** *(B6)*, **`trainer_unavailability`** *(B7)*, **`academic_terms`** *(G2: term_id, branch_id, start_date, end_date, label)*, **`idempotency_keys`** *(G1: key uuid pk, scope, created_at, response_hash)*.

### Layer 1 — Curriculum
`stages`, `levels`, `level_prerequisites`, `lesson_packages`, `lessons`, `quizzes`, `quiz_questions`, **`final_exams`** (`level_id`, `group_session_id`, `proctoring_rules`, `grading_rules`, `weight_in_gpa`, `max_attempts`), **`final_exam_attempts`** (`attempt_number`, `status`, `score`).

### Layer 2 — Operations
`students`, `parents`, `parent_student_links`, `waiting_list`, `entry_tests`, `groups` (`schedule_meta jsonb`, `branch_id`, `term_id`), `group_enrollments`, `group_sessions` (`status`: scheduled/open/closed/cancelled/**`needs_admin_review`** *(B1)*, `closed_by`, `close_reason`, `scheduled_at_utc`, `scheduled_end_at_utc`, `version int default 0` لـ optimistic lock), `session_attendance`, `session_content`, `substitutions`, `compensations`, `student_progression` (`status`: in_progress/passed/**`repeat_level`** *(B5)*), `quiz_attempts`, **`pending_reassignment_queue`** *(B7)*.

### Layer 3 — Financial
`fee_plans`, `subscriptions` (`remaining_sessions` source of truth, `subscription_end_date` derived cache), `payments` (`idempotency_key uuid unique not null`), `installments`, `siblings_discounts`, `refunds`, `treasury_accounts`, `treasury_movements` (`idempotency_key`), `expenses`, **`student_transfers`** *(G4: from_branch_id, to_branch_id, from_group_id, to_group_id, sessions_carried, type: intra_branch | inter_branch)*.

### Layer 4 — Staff & KPIs
`staff_profiles`, `trainer_assignments`, `trainer_payouts`, `staff_kpis` (**`term_id`** *(G2)*), `branch_kpis` (**`term_id`**).

### 3.1 Constraints الحرجة

```sql
-- DST-safe: gist constraints بتستخدم UTC columns
ALTER TABLE group_sessions ADD CONSTRAINT no_trainer_overlap
  EXCLUDE USING gist (
    trainer_id WITH =,
    tstzrange(scheduled_at_utc, scheduled_end_at_utc) WITH &&
  ) WHERE (status NOT IN ('cancelled','needs_admin_review'));

ALTER TABLE group_sessions ADD CONSTRAINT no_room_overlap
  EXCLUDE USING gist (
    room_id WITH =,
    tstzrange(scheduled_at_utc, scheduled_end_at_utc) WITH &&
  ) WHERE (status NOT IN ('cancelled','needs_admin_review'));

-- attendance مقفول بعد closed_at
CREATE TRIGGER trg_attendance_lock BEFORE INSERT OR UPDATE ON session_attendance ...

-- session_content مطلوب قبل open
CREATE TRIGGER trg_session_must_have_content BEFORE UPDATE ON group_sessions ...

-- race condition: optimistic lock + row lock في fn_close_session
-- (SELECT ... FOR UPDATE WHERE status = 'open')
```

### 3.2 Timezone Strategy *(B2)*
- `schedule_meta.slots[].time` = `time without timezone` (local wall clock).
- `branches.timezone` = IANA (e.g. `Africa/Cairo`).
- Session generation: يحسب `scheduled_at_utc = (date + local_time) AT TIME ZONE branch.timezone`.
- كل GIST constraint و كل query زمنية تستخدم UTC columns. عرض UI بـ branch timezone.

### 3.3 Soft-Delete Cascade Rules *(G3)*
| Entity | Behavior |
|---|---|
| `students.deleted_at` | يحجب من lists; sessions/payments/history باقية للمراجعة |
| `groups.deleted_at` | ممنوع لو فيه `status='open'` enrollments نشطة |
| `branches.deleted_at` | ممنوع لو فيه أي نشاط — admin only via RPC `fn_archive_branch` |
| `trainers (staff)` | ممنوع لو عنده sessions مستقبلية — لازم reassign الأول |
| Cascade hard-delete | ممنوع نهائياً — كل شيء `set_deleted_at` |

---

## 4. Business Flows (كل سيناريو محسوم)

### 4.1 Parent Onboarding (Magic Link)
Reception → `fn_register_student_with_parent` → student + parent profile + link + `inviteUserByEmail` → parent يضبط password → `/dashboard`.

### 4.2 Entry Test → Placement
`fn_evaluate_entry_test` → `recommended_level_id` → reception confirms → `fn_enroll_student_in_group`.

### 4.3 Multi-Slot Scheduling Engine
```json
"schedule_meta": {
  "pattern": "weekly",
  "sessions_per_week": 2,
  "slots": [
    {"day":"sun","time":"16:00","duration_min":90,"room_id":"..."},
    {"day":"wed","time":"16:00","duration_min":90,"room_id":"..."}
  ]
}
```
- `trg_create_group_sessions` يولّد N sessions بـ round-robin على الـ slots.
- يقرأ `branch_holidays` ويتخطاها ويمدّ آخر سيشن *(B6)*.
- يقرأ `trainer_unavailability` ويولّد `pending_reassignment_queue` للسيشن المتأثرة *(B7)*.
- يدعم 1-7 days/week, intensive, biweekly.

### 4.4 Session Lifecycle (Hybrid Closing — Fixed)
```text
scheduled → open (fn_open_session — يتحقق من session_content + يقفل الـ row)
         → closed (fn_close_session: trainer/admin manual)
         → needs_admin_review (cron auto-close بدون attendance) ← B1
         → cancelled (admin only)
```
- `fn_close_session(session_id, closed_by, idempotency_key)`:
  - `SELECT ... FOR UPDATE WHERE status='open'` *(B3)*.
  - لو `closed_by='cron' AND attendance_count=0` → status=`needs_admin_review`، **no compensation, no payouts, no KPI**، notification للـ branch_admin.
  - غير كده: تحديث attendance، نقص `remaining_sessions`، compensations للغايبين، KPIs، trainer_payout.
- `cron_auto_close_sessions` كل 15 دقيقة = safety net.

### 4.5 Trainer Substitution & Conflicts
- GIST constraints تمنع double-booking تلقائياً.
- Frontend يستقبل error code → `<ConflictDialog>` بـ 3 options.
- `fn_reassign_session(session_id, new_trainer_id, reason, idempotency_key)` → update + substitutions + audit + notify.
- `fn_request_trainer_leave(trainer_id, range, reason)` → ينشئ `trainer_unavailability` + يحط السيشن المتأثرة في `pending_reassignment_queue` *(B7)*.

### 4.6 Attendance & Compensation
- `trg_handle_attendance` after update: `status='absent'` → compensation pending.
- لو غياب > `absence_block_threshold` → حظر homework.

### 4.7 Payments & Installments
- `fn_create_payment_with_installments(..., idempotency_key)` *(G1)* — atomic.
- `trg_restore_access_on_payment` يفك الحظر.
- `cron_flag_overdue_installments` يومياً.
- `trg_siblings_discount` على **INSERT + UPDATE + DELETE** لـ `parent_student_links` + `fn_recalculate_sibling_discounts(parent_id)` *(B4)*.

### 4.8 Treasury
`fn_record_income`, `fn_record_expense`, `fn_transfer_between_accounts` — كلها `idempotency_key`.

### 4.9 Transfers & Refunds
- `fn_transfer_student(student_id, new_group_id, type, idempotency_key)` *(G4)*:
  - `type='intra_branch'` → مجاني، ينقل remaining_sessions + history.
  - `type='inter_branch'` → يتأكد من توافر مقعد، ينقل subscription + balance بين الـ treasury accounts، insert في `student_transfers`.
- `fn_apply_refund(student_id, reason, idempotency_key)` — يقرأ `system_policies.refund_policy` JSONB لكل فرع، pro-rated.

### 4.10 Level Progression & Final Exam *(B5)*
- `final_exams` table منفصل + `final_exam_attempts(attempt_number, max_attempts)`.
- `fn_calculate_level_result` = weighted(quizzes, attendance, final_exam).
- Pass → `fn_advance_student_to_next_level`.
- Fail + attempts < max → `fn_request_final_retake` (admin approval).
- Fail + attempts = max → `student_progression.status='repeat_level'` → re-enroll في نفس الـ level.

### 4.11 Notifications (In-app + Email)
- جدول `notifications` (in-app) + Lovable Emails.
- `notifications_archive` لأي notification > 90 يوم *(G5)* — cron نقل تلقائي.
- Events: magic link, reassign, payment due, overdue, results, refund, `needs_admin_review`, leave request.

### 4.12 Cron Jobs
| Cron | Schedule | الغرض |
|---|---|---|
| `cron_auto_close_sessions` | كل 15 دقيقة | safety net (B1 logic) |
| `cron_flag_overdue_installments` | يومياً 00:30 | يحظر + ينوتيفاي |
| `cron_calculate_daily_kpis` | يومياً 02:00 | staff + branch KPIs per term |
| `cron_recompute_subscription_end` | يومياً 03:00 | يصلح drift |
| `cron_archive_notifications` | أسبوعياً | ينقل > 90 يوم *(G5)* |
| `cron_cleanup_idempotency_keys` | يومياً | يحذف keys > 30 يوم *(G1)* |

---

## 5. Frontend Patterns

### 5.1 Data Page
```tsx
function PageX() {
  const { data, isLoading, error } = useXxxQuery(filters);
  if (isLoading) return <PageSkeleton />;
  if (error) return <ErrorState error={error} onRetry={...} />;
  return <XxxView data={data} />;
}
```

### 5.2 Mutation (no optimistic for money/session)
```tsx
const mutation = useXxxMutation();
mutation.mutate({ ...payload, idempotency_key: crypto.randomUUID() });
```

### 5.3 RoleGuard
```tsx
<RoleGuard resource="payments" action="create" fallback={<Forbidden/>}>
  <CreatePaymentForm />
</RoleGuard>
```

---

## 6. Storage Buckets
- `student-documents` (private)
- `homework-uploads` (private)
- `branch-assets` (public-read)
- `staff-documents` (private, admin only)

---

## 7. Phases

| Phase | المحتوى |
|---|---|
| 0 | DB Foundation: 48 tables + RLS + 16 triggers + 24 RPCs + 6 cron + 5 views + buckets + types |
| 1 | Auth shell: useAuth + RoleGuard + permissions matrix + smart redirect |
| 2 | Students + Parents + Waiting List + Entry Tests + Magic Link |
| 3 | Groups + Multi-slot Engine + Holidays + Trainer Unavailability + Sessions CRUD + Conflict UI |
| 4 | Attendance + Compensations + Trainer dashboard + Hybrid Closing |
| 5 | Financial: Payments + Installments + Treasury + Siblings + Refunds + Transfers (intra+inter) |
| 6 | Curriculum runtime: Lessons + Quizzes + Final Exams (+ Retakes + Repeat) |
| 7 | KPIs per term + Reports + Notifications feed + Archive + Email templates |
| 8 | Polish: Empty states, skeletons, error boundaries, i18n RTL |

كل phase = PR مستقل + migration + types regen + RPC tests.

---

## 8. الضمانات ضد السباجيتي

1. ملف واحد لكل دومين في `lib/api/` (> 300 سطر = split).
2. ممنوع cross-domain imports بين features.
3. كل RPC له Zod schema في `lib/validators/`.
4. Permissions Matrix = ملف واحد.
5. Notifications kind enum ثابت.
6. كل cron + trigger موثّق في `docs/db-events.md`.
7. audit_log إجباري على كل RPC حرج.
8. Idempotency على كل money/session mutation.
9. Timezone-aware دائماً (UTC في DB، local في UI).
10. Term-scoped KPIs — historical comparisons صحيحة.

---

## 9. الفروقات بين v1 و v2

| المحور | v1 | v2 |
|---|---|---|
| Cron auto-close | يقفل ويعمل compensation | `needs_admin_review` *(B1)* |
| Timezone | local فقط | UTC + branch tz *(B2)* |
| Close race | possible | row lock + version *(B3)* |
| Siblings discount | INSERT only | INSERT+UPDATE+DELETE + recalc *(B4)* |
| Final exam fail | undefined | retakes + `repeat_level` *(B5)* |
| Holidays | ignored | `branch_holidays` *(B6)* |
| Trainer leave | manual | `trainer_unavailability` + queue *(B7)* |
| Idempotency | absent | required *(G1)* |
| Terms/year | absent | `academic_terms` *(G2)* |
| Soft-delete | undefined | cascade rules *(G3)* |
| Inter-branch transfer | unclear | explicit + treasury sync *(G4)* |
| Notifications | grow forever | archive cron *(G5)* |

---

## 10. v2.1 — Fixes للـ 6 مشاكل اللي ظهرت من مراجعة الـ DDL

### 10.1 Waiting List → Active Transition (Fix #1)
- `trg_activate_enrollment_on_group_start` AFTER UPDATE ON `group_enrollments`:
  - لو `status` تغيّر من `active_waiting` → `active` → يحدّث `students.subscription_status='active'` + insert notification.
- مدخل تاني: `fn_start_group(group_id)` admin RPC → loops على enrollments ويفعّلهم atomically.

### 10.2 Policy Snapshot Atomicity (Fix #2)
- `rpc_enroll_student` يعمل INSERT في `group_enrollments` + INSERT في `policy_snapshots` **في نفس الـ transaction** (مش trigger).
- الـ FK `policy_snapshots.enrollment_id → group_enrollments.id` يضمن الـ pair دايماً موجود.
- Trigger إضافي `trg_block_late_snapshot` يمنع أي INSERT في `policy_snapshots` لو الـ enrollment موجود قبل > 1 ثانية.

### 10.3 Compensation Session Grading (Fix #3 — قرارك)
**القرار:** التعويضية ليها grading مستقل، لكن النتيجة بتتسجل على السيشن الأصلية اللي اتغاب فيها.

Schema:
```text
compensations (
  id, original_session_id, makeup_session_id,
  student_id, status, ...
)
session_attendance (
  session_id,           -- = original_session_id
  student_id,
  status,               -- 'present' بعد التعويض
  graded_in_session_id  -- = makeup_session_id (للتتبع)
)
session_grades (
  session_id,           -- = makeup_session_id (مكان التقييم الفعلي)
  student_id,
  quiz_score, assignment_score, evaluation, ...
)
```
- `fn_complete_compensation(compensation_id, grades)`:
  - INSERT grades في `session_grades` على `makeup_session_id`.
  - UPDATE `session_attendance` للسيشن الأصلية: `status='present'`, `graded_in_session_id=makeup_session_id`.
  - UPDATE compensation `status='completed'`.
  - KPI recalc.
- View `v_student_session_history` بيدمج الاتنين: الـ attendance من الأصلية + الـ grade من التعويضية.

### 10.4 Restricted Recovery RPC (Fix #4)
- `admin_approval_requests` موجود في الـ schema (Layer 0) — كويس.
- Workflow:
  1. `fn_request_reinstatement(student_id, reason)` → INSERT approval request (`request_type='restricted_recovery'`).
  2. Notification للـ branch_admin.
  3. `fn_review_approval_request(request_id, decision, note)` (admin only via RoleGuard + RLS):
     - approved → يفك `student_blocks.is_active=false` + يحصل `reinstatement_fee` من policy + يحدّث `subscription_status='active'`.
     - rejected → notification للـ requester مع السبب.
- RLS على `student_blocks`: ممنوع UPDATE من أي role غير via RPC. RPC = `SECURITY DEFINER` بتتحقق `has_role(auth.uid(),'branch_admin')`.

### 10.5 Content Access by Package (Fix #5 — قرارك)
**القرار:** كل باقة ليها صلاحيات محددة على المحتوى، لكن كل الباقات عندها وصول كامل لـ assignments + quizzes + evaluations + finals.

Implementation: **table منفصلة للـ mapping** (أوضح وقابلة للتعديل بدون code):

```sql
CREATE TABLE package_content_permissions (
  package_tier  package_tier NOT NULL,
  content_type  content_type NOT NULL,
  is_allowed    boolean NOT NULL DEFAULT true,
  PRIMARY KEY (package_tier, content_type)
);

-- Seed:
-- ('squad','slides',true), ('squad','summary_video',false), ('squad','full_video',false)
-- ('core','slides',true),  ('core','summary_video',true),  ('core','full_video',false)
-- ('x','slides',true),     ('x','summary_video',true),     ('x','full_video',true)
```

- View `v_student_accessible_content`:
  ```sql
  SELECT lc.*, s.id AS student_id
  FROM lesson_contents lc
  JOIN group_enrollments ge ON ge.group_id = lc.group_id
  JOIN students s ON s.id = ge.student_id
  JOIN groups g ON g.id = ge.group_id
  JOIN package_content_permissions pcp
    ON pcp.package_tier = g.package_tier
   AND pcp.content_type = lc.content_type
  WHERE pcp.is_allowed = true
    AND ge.status = 'active';
  ```
- RLS على `lesson_contents`: `EXISTS (SELECT 1 FROM v_student_accessible_content WHERE student_id = auth.uid() AND id = lesson_contents.id)` للـ student role.
- Assignments/quizzes/finals = صلاحيات مفتوحة لكل الباقات (RLS على enrollment فقط، مش على tier).

### 10.6 Absence Excuse Flow (Fix #6)
- Reuse `admin_approval_requests` (`request_type='absence_excuse'`) بدل `absence_excuses` المنفصلة.
- Workflow:
  1. `fn_submit_absence_excuse(attendance_id, reason, evidence_url)`:
     - INSERT approval request + `expires_at = now() + 72h`.
     - Notification للـ branch_admin.
  2. `fn_review_approval_request(request_id, decision, note)`:
     - approved → UPDATE `session_attendance.status='excused'` + `fn_recalculate_absence_counter(student_id)` → يفك أي block ناتج من العداد.
     - rejected → notification.
  3. `cron_expire_pending_excuses` يومياً → expires_at < now() → status='expired' + notification.
- View `v_student_absence_summary` للأدمن يراجع.

---

## 11. v2 Schema Additions الكاملة

- Tables الإضافية اللي ظهرت من المراجعة:
  - `age_groups`, `policy_snapshots`, `notification_preferences`, `admin_approval_requests`, `package_content_permissions`, `student_blocks`, `compensations`, `session_grades`, `lesson_contents`.
- Total = **57 جدول** (بدل 48 في v2 الأصلية).

---

## 12. Final Stress-Test على v2.1 (كل السيناريوهات)

| # | السيناريو | الـ Owner | الـ Flow | الـ Guard | النتيجة |
|---|---|---|---|---|---|
| S1 | تسجيل طالب جديد + ولي أمر | Reception | `rpc_register_student_with_parent` → magic link → snapshot policies في نفس tx | RoleGuard reception + idempotency | ✅ |
| S2 | Entry test → placement | Reception | `rpc_evaluate_entry_test` → recommended_level → enroll | trainer-only grading | ✅ |
| S3 | جروب جديد ببداية مؤجلة (waiting) | Branch admin | enrollments = `active_waiting` → `fn_start_group` → trigger يفعّلهم | لا compensation قبل start_date | ✅ |
| S4 | 3 إخوة في 3 جروبات | Reception | INSERT links → `trg_recalculate_sibling_discounts` (INS/UPD/DEL) | discount دقيق | ✅ |
| S5 | غياب طالب + تعويض | Trainer → Admin | absent → compensation pending → admin schedules makeup → trainer grades makeup → attendance على الأصلية + grade على makeup | session_grades مرتبط بـ makeup_session_id | ✅ |
| S6 | غياب بعذر | Parent → Admin | `fn_submit_absence_excuse` → approval → `status='excused'` + recalc counter | expires 72h | ✅ |
| S7 | حرمان (absence/hw) → فك | System → Admin | trigger يحط block → `fn_request_reinstatement` → admin approve → fee + unblock | ممنوع UPDATE مباشر على blocks | ✅ |
| S8 | Cron يقفل سيشن بدون attendance | System → Admin | status = `needs_admin_review` → notification → admin يقرر | لا compensation ولا KPI تلقائي | ✅ |
| S9 | Race: trainer + cron يقفلوا نفس السيشن | DB | `SELECT FOR UPDATE WHERE status='open'` + version | الثاني يفشل بـ stale_version | ✅ |
| S10 | Trainer leave مفاجئ | Trainer → Admin | `fn_request_trainer_leave` → sessions → `pending_reassignment_queue` → admin reassign | GIST يمنع overlap | ✅ |
| S11 | تغيير trainer لسيشن واحدة | Admin | `fn_reassign_session` → GIST check → substitutions + notify | conflict dialog | ✅ |
| S12 | تأجيل سيشن (reschedule) | Admin | `fn_reschedule_session` → UTC recalc → GIST recheck | holidays awareness | ✅ |
| S13 | Holiday في نص الجروب | System | generation/reschedule يتخطى `branch_holidays` ويمد آخر سيشن | term boundary aware | ✅ |
| S14 | Payment + installments + late fee | Reception | `fn_create_payment` idempotent → installments → cron flag overdue → block | snapshot للـ policy وقت الدفع | ✅ |
| S15 | Refund pro-rated | Admin | `fn_apply_refund` يقرأ snapshot policy + remaining_sessions → treasury movement | idempotency_key مطلوب | ✅ |
| S16 | نقل داخل الفرع | Reception | `fn_transfer_student type=intra_branch` → free + carry sessions | بدون treasury movement | ✅ |
| S17 | نقل بين فروع | Admin | `type=inter_branch` → seat check → treasury transfer بين accounts | atomic transaction | ✅ |
| S18 | امتحان نهائي + رسوب + إعادة | Trainer → Admin → Student | attempt 1 fail → `fn_request_final_retake` → approve → attempt 2 → max → `repeat_level` | max_attempts من policy | ✅ |
| S19 | Level pass → advance | System | `fn_calculate_level_result` → pass → `fn_advance_to_next_level` + new enrollment | prerequisites check | ✅ |
| S20 | Squad student يحاول يفتح full video | Student | RLS يرفض via `v_student_accessible_content` | 0 leak | ✅ |
| S21 | Parent يشوف أولاده فقط | Parent | RLS عبر `parent_student_links` | branch isolation | ✅ |
| S22 | Super_admin يبدّل فرع | Super admin | `useAuth.switchBranch()` → `activeBranchId` يتحدث → كل queries scoped | RLS بـ `current_user_branch_ids()` | ✅ |
| S23 | Trainer يحاول grade سيشن مش بتاعته | Trainer | RLS على `session_grades` بـ trainer_id | denied | ✅ |
| S24 | Reception يحاول يحذف payment | Reception | RoleGuard + RLS deny | audit log | ✅ |
| S25 | KPIs per term | System | cron يحسب بـ `term_id` → historical مقارنة دقيقة | لا drift بين الترمات | ✅ |
| S26 | Notifications تتراكم > 90 يوم | System | weekly cron → `notifications_archive` | feed سريع | ✅ |
| S27 | Soft-delete branch فيه نشاط | Super admin | `fn_archive_branch` يفحص dependencies → reject أو archive | لا cascade hard | ✅ |
| S28 | Idempotent retry للـ payment | Client | نفس `idempotency_key` → same response, no double-charge | 30-day TTL | ✅ |
| S29 | DST switch في مصر | System | UTC columns ثابتة → GIST يشتغل بدون false overlap | local UI يعرض صح | ✅ |
| S30 | Bootcamp intensive (5 أيام/أسبوع) | Admin | `schedule_meta.sessions_per_week=5` → engine يولّد بـ round-robin | بدون أي تغيير في الكود | ✅ |

**النتيجة:** كل الـ 30 سيناريو مغطى. مفيش break point، مفيش owner غامض، مفيش flow ناقص.

---

## 13. Architecture Contract — ثابت طول عمر المشروع

ده الـ Contract اللي أي feature جديدة هتنضاف لازم تتبعه — يمنع السباجيتي تماماً:

### 13.1 الـ 6 طبقات الثابتة (لكل feature)

```text
1. DB Layer        → migration: tables + RLS + indexes + constraints
2. Logic Layer     → RPC SECURITY DEFINER + triggers + audit + idempotency
3. Validation      → Zod schema في src/lib/validators/<domain>.ts
4. API Layer       → src/lib/api/<domain>.ts (الوحيد اللي يستدعي supabase)
5. Hooks Layer     → src/hooks/queries/use<Domain>.ts + mutations/use<Action>.ts
6. UI Layer        → src/components/features/<domain>/ + route file
```

### 13.2 قواعد التوسع (Extension Rules)

| لو عايز تضيف... | المسار الثابت |
|---|---|
| Field جديد لجدول | migration → regen types → update Zod → update API → hook auto-typed |
| Action جديد (RPC) | migration RPC → Zod schema → API wrapper → mutation hook → UI button مع RoleGuard |
| Role جديد | enum migration → seed permissions → update `permissions.ts` matrix → خلاص |
| Domain جديد بالكامل | folder في api/ + validators/ + features/ + routes/ — صفر تأثير على الباقي |
| Cron جديد | function + entry في `cron.config` + توثيق في `docs/db-events.md` |
| Notification type جديد | enum value + template في `email-templates/` + entry في `notification-types.ts` |

### 13.3 الـ Boundaries المقدسة (Forbidden Imports)

```text
components/features/<A>   ✗ ←→ ✗   components/features/<B>     (cross-feature direct import)
components/                ✗ ──→ ✗   integrations/supabase       (لازم يعدّي على api/)
hooks/                     ✗ ──→ ✗   integrations/supabase       (لازم يعدّي على api/)
stores/                    ✗ ──→ ✗   api/                        (Zustand للـ UI state فقط)
lib/api/                   ✗ ──→ ✗   components/                 (one-way only)
```

- ESLint rule `no-restricted-imports` يطبّق الـ boundaries دي تلقائياً.

### 13.4 الـ Naming Convention الثابت

```text
DB:       snake_case          (table_name, column_name, fn_action_name)
RPC:      fn_<verb>_<noun>    (fn_close_session, fn_create_payment)
Trigger:  trg_<event>_<noun>  (trg_recalculate_siblings)
Cron:     cron_<verb>_<noun>  (cron_auto_close_sessions)
View:     v_<descriptive>     (v_student_session_history)
TS API:   camelCase           (closeSession, createPayment)
Hook:     use<Verb><Noun>     (useCloseSession, usePaymentsQuery)
Component:PascalCase          (SessionCloseDialog)
Route:    kebab-case          (group-sessions.tsx)
```

### 13.5 Single Source of Truth Map

| المعلومة | مكانها الوحيد |
|---|---|
| Permissions | `src/lib/auth/permissions.ts` |
| Policies | `system_policies` table (per branch JSONB) |
| Subscription end | derived من `remaining_sessions` + recalc cron |
| Attendance count | `session_attendance` (لا cache) |
| Sibling discount | `fn_recalculate_sibling_discounts` |
| Session status | `group_sessions.status` + `version` |
| User role | `user_roles` table (مش في profile) |
| Time | UTC في DB، local في UI عبر `branches.timezone` |

### 13.6 Quality Gates (PR Checklist إجباري)

- [ ] Migration + RLS + indexes
- [ ] RPC = SECURITY DEFINER + audit_log + idempotency (لو money/session)
- [ ] Zod validator
- [ ] API wrapper في الـ domain الصح
- [ ] Hook (query أو mutation)
- [ ] RoleGuard على الـ UI action
- [ ] Empty/Loading/Error states
- [ ] Types regenerated
- [ ] Cron/trigger موثّق في `docs/db-events.md`

---

## 14. Enterprise Hardening Additions (v2.2)

كل النقاط دي مدمجة في Phase 0 كـ foundation عشان متبقاش retrofit مؤلم بعدين.

### 14.1 Notification Queue (durable + retry-safe)

**المشكلة:** notification inline داخل transaction → لو email provider وقع → transaction تفشل أو notification تضيع.

```text
RPC (داخل tx): INSERT notification_jobs(status='pending', idempotency_key)
Worker (cron 30s أو Inngest):
   SELECT FOR UPDATE SKIP LOCKED LIMIT 50 WHERE status='pending' AND next_attempt_at <= now()
   → render → send → status='sent' أو attempts++ + exponential backoff
   → بعد max_attempts (5) → status='dead_letter' + alert admin
```

**جداول:**
- `notification_jobs(id, channel[email|inapp], recipient_id, template_key, payload jsonb, status, attempts, next_attempt_at, last_error, idempotency_key, created_at)`
- `notification_templates(key, channel, subject, body_template, version, locale)`
- `notification_dead_letter` archive للـ failed

**ممنوع:** أي كود يبعت email/notification مباشرة. كل شيء يعدّي على `fn_enqueue_notification`.

### 14.2 Analytics Abstraction Layer (OLTP ≠ Analytics)

**المشكلة:** KPIs بتتحسب من operational tables مباشرة → بعد 100k records → slow + lock contention.

```text
OLTP tables → triggers → analytics_events (append-only, partitioned by month)
            → materialized views (mv_kpi_*) refreshed كل ساعة
            → reports/dashboards تقرأ من MVs فقط
```

**جداول:**
- `analytics_events(id, event_type, entity_type, entity_id, branch_id, term_id, payload jsonb, occurred_at)` — partitioned شهرياً.
- MVs: `mv_branch_revenue_monthly`, `mv_trainer_performance`, `mv_student_retention`, `mv_group_health`, `mv_attendance_summary`.
- `analytics_refresh_log` لتتبع الـ refresh.

**Abstraction:** كل KPI query يعدّي على `src/lib/api/analytics.ts` adapter. لو يوماً بدّلنا لـ ClickHouse/BigQuery → نغيّر الـ adapter بس، صفر تأثير على UI.

### 14.3 Search Layer (scale-ready)

**المشكلة:** `ILIKE '%query%'` على 50k rows = full table scan.

```sql
CREATE EXTENSION pg_trgm;
CREATE EXTENSION unaccent;

ALTER TABLE students ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
  to_tsvector('simple', unaccent(coalesce(full_name,'')||' '||coalesce(phone,'')||' '||coalesce(student_code,'')))
) STORED;
CREATE INDEX idx_students_search ON students USING GIN(search_vector);
CREATE INDEX idx_students_phone_trgm ON students USING GIN(phone gin_trgm_ops);
```

نفس الباترن على: `parents`, `trainers`, `groups`, `payments`. كل بحث يعدّي على `fn_search_<entity>(query)` موحّد.

### 14.4 File Lifecycle Management

**المشكلة:** uploads بتتراكم → orphans → storage cost ينفجر.

**جداول:**
- `storage_objects_registry(id, bucket, path, owner_id, entity_type, entity_id, size_bytes, mime, uploaded_at, last_accessed_at, retention_policy_key)`
- `retention_policies(key, days_to_keep, action[archive|delete], applies_to)` — مثال: `homework_uploads`=180d delete، `session_recordings`=365d archive، `payment_receipts`=2555d keep.
- `storage_cleanup_jobs` cron يومي ينظف orphans + يطبّق policies.

**القاعدة:** أي upload يعدّي على `fn_register_upload()`. مفيش raw upload مسموح.

### 14.5 Session Change History (Audit Timeline)

**المشكلة:** `version` لوحده ما بيقولش *إيه* اتغيّر، مين، وليه.

```sql
CREATE TABLE session_change_history (
  id uuid pk, session_id uuid, changed_by uuid,
  change_type text, -- reschedule|reassign|close|reopen|grade_edit|attendance_edit
  before_state jsonb, after_state jsonb,
  reason text, related_approval_id uuid, changed_at timestamptz
);
```

Trigger على UPDATE → diff. نفس الباترن على `payments`, `enrollments`, `student_blocks` (entity_change_history pattern).

### 14.6 Double-Entry Ledger Foundation

**الوضع الحالي:** `treasury_movements` single-entry يكفي لـ MVP. **لكن** نعمل foundation من اليوم الأول.

```text
accounts_chart(id, code, name, type[asset|liability|revenue|expense|equity], branch_id)
journal_entries(id, entry_date, description, idempotency_key, posted_by, related_entity)
ledger_entries(id, journal_entry_id, account_id, debit numeric(14,2), credit numeric(14,2))
   CONSTRAINT: SUM(debit) = SUM(credit) per journal_entry  ← DB-enforced
```

**في Phase 0:**
- `accounts_chart` seeded (Cash, Bank, Revenue:Subscriptions, Expense:Salaries, Liability:DeferredRevenue, AR:Students).
- `fn_post_journal_entry(entries jsonb[])` مع balance check.
- `treasury_movements` يصبح **view** فوق ledger_entries أو wrapper RPC يكتب journal entries.

→ reconciliation بين فروع جاهزة من اليوم الأول، صفر pain لاحقاً.

### 14.7 AI Anti-Corruption Layer

**القاعدة:** ممنوع أي AI integration يكتب مباشرة في operational DB. ممنوع AI يحمل service_role key.

```text
AI service → ai_suggestions(status='pending') → notification للـ reviewer
          → human approve/reject → on approve: نفس الـ RPC العادي يتنفّذ
                                              بـ actor_type='ai_assisted' + reviewer_id
```

**جدول:**
- `ai_suggestions(id, suggestion_type, target_entity_type, target_entity_id, payload jsonb, confidence numeric, status[pending|approved|rejected|expired], reviewer_id, reviewed_at, rejection_reason, expires_at)`

AI = read + suggest. Writes = human-approved.

### 14.8 Architecture Decision Records (ADRs)

كل قرار معماري كبير يتوثّق:

```text
docs/adr/
├── README.md                                    # index + template
├── ADR-001-hybrid-session-closing.md
├── ADR-002-compensation-grading-model.md
├── ADR-003-policy-snapshots-on-enrollment.md
├── ADR-004-tiered-content-access.md
├── ADR-005-notification-queue.md
├── ADR-006-analytics-separation.md
├── ADR-007-double-entry-foundation.md
├── ADR-008-ai-anti-corruption.md
├── ADR-009-timezone-utc-strategy.md
└── ADR-010-soft-delete-cascade-rules.md
```

**Template:** Context → Decision → Alternatives Considered → Consequences → Status. ADR يتكتب **قبل** أي migration كبيرة. PR checklist يطلبه.

### 14.9 Updated Layer Map (v2.2)

```text
Layer 0 — Foundation:     branches, academic_terms, branch_holidays, system_policies,
                          accounts_chart, retention_policies, notification_templates
Layer 1 — Identity:       profiles, user_roles, parent_student_links, audit_log, idempotency_keys
Layer 2 — Catalog:        packages, levels, curriculum, content, package_content_permissions
Layer 3 — Operations:     students, groups, enrollments, group_sessions, session_attendance,
                          session_grades, compensations, substitutions, *_change_history
Layer 4 — Finance:        payments, installments, journal_entries, ledger_entries,
                          treasury_movements (view), refunds, student_transfers
Layer 5 — Engagement:     homework, quizzes, final_exam_attempts, student_progression,
                          student_blocks, admin_approval_requests
Layer 6 — Infrastructure: notification_jobs, ai_suggestions, storage_objects_registry,
                          analytics_events, mv_kpi_*, search indexes, cleanup_jobs
```

إجمالي ≈ **72 جدول** موزعة على 7 طبقات نظيفة.

---

## 15. الخلاصة النهائية (v2.2)

- **72 جدول** على 7 layers — كل layer مسؤوليته محسومة.
- **30 سيناريو** مغطى بـ flow + owner واضحين، صفر break points.
- **Architecture Contract + Extension Rules** = صفر سباجيتي مدى الحياة.
- **Notification Queue + Analytics separation + Search + File lifecycle + Change history + Double-entry foundation + AI ACL + ADRs** = enterprise-safe من اليوم الأول.
- أي scale لاحقاً (10x branches، 100k students، AI features، multi-currency، multi-country) = extension مش refactor.

لما توافق على v2.2 هبدأ Phase 0: DDL كامل + RLS + RPCs + triggers + cron + ADR-001 → ADR-010 + seed.

---

## 16. Sales & Moderator Module (v2.3)

موديول مبيعات كامل متدمج في نفس الـ Architecture Contract. صفر سباجيتي. Roles جديدة: `sales`, `moderator`. كلهم موظفين في `staff_employees` زي أي رول تاني.

### 16.1 Roles & Responsibilities

| Role | بيعمل | ممنوع |
|---|---|---|
| **moderator** | يضيف Lead + يختار `lead_source` من قائمة ثابتة + يكتب `pre_call_brief` (ملاحظات للسيلز يقرأها قبل المكالمة) | يتواصل مع leads، يعدّل بعد التسليم، يشوف commissions |
| **sales** | يسحب lead من pool/auto-assigned، يكلّم، يسجّل مكالمة داخل السيستم، يحدّث status، يحوّل lead لـ enrollment | يضيف lead جديد، يغيّر source، يشوف leads مش متعيّنة ليه، يحوّل لـ sales تاني (يحوّل للريسيبشن فقط) |
| **branch_admin** | يسمع تسجيلات فرعه، يشوف KPIs، يعدّل targets per branch | يغيّر commission tiers (super_admin only) |
| **super_admin** | يحدّد `lead_sources` list، `commission_tiers` per package، يسمع كل التسجيلات، archive policy | — |

**ملاحظة حاسمة:** الموديريتور هو **المصدر الوحيد** لإدخال leads. مفيش webhook، مفيش website form direct، مفيش manual entry من sales. لو جه lead من أي قناة خارجية → الموديريتور يدخّله يدوياً مع تحديد الـ source.

### 16.2 Lead Lifecycle (State Machine)

```text
new → assigned → contacted → qualified → negotiation → won
                          ↘ unreachable (attempt 1,2,3)
                          ↘ lost (with reason)

unreachable (after 3 attempts) ────────► archived
lost / rejected ────────────────────────► archived
archived (after N months) ──reactivate──► new (موديريتور فقط)
```

- كل transition عبر RPC `fn_transition_lead(lead_id, to_status, reason, idempotency_key)`.
- `lead_status_history` table — كل تغيير + timestamp + actor.
- `archive_after_attempts = 3` (configurable في `system_policies`).
- `reactivation_cooldown_months = 6` (configurable).

### 16.3 Assignment Strategy (Hybrid)

```text
Lead created
  → IF active_sales_count = 1 → assign directly
  → ELSE IF auto_assign_enabled (per branch) → round-robin بناءً على open_leads_count
  → ELSE → pool (sales يسحب من pool)

Sales pulls from pool: fn_claim_lead(lead_id) — SELECT FOR UPDATE SKIP LOCKED
   → assigned_to = me, assigned_at = now()
   → max 1 pull/click، مفيش race condition
```

`system_policies.sales.assignment_mode` = `auto_round_robin` | `pool` | `hybrid`. الافتراضي **hybrid**.

### 16.4 Call Recording (In-System)

**Flow:** السيلز يضغط **Start Recording** في الواجهة → المتصفح يفتح MediaRecorder API على الـ mic → السيلز بيكلّم من موبايله على speakerphone → الـ mic يلتقط الصوت → عند End يرفع على Storage.

**Privacy & consent:**
- قبل أول مكالمة في اليوم: confirmation modal "تأكد إن العميل عارف إن المكالمة بتتسجل لأغراض جودة الخدمة" — إجباري tick.
- `consent_acknowledged_at` يتسجّل في `call_recordings`.

**Storage:**
- bucket `call-recordings` (private، RLS strict).
- retention **6 شهور** عبر `retention_policies` (§14.4) → بعدها auto-delete.
- format: `webm/opus` (small + browser-native).

**جداول:**
```text
call_recordings(id, lead_id, sales_id, started_at, ended_at, duration_sec,
                storage_path, consent_acknowledged_at, pre_call_brief_snapshot,
                call_outcome, notes, deleted_at)
```

**Access control (RLS):**
- `sales` → يسمع تسجيلاته فقط.
- `branch_admin` → يسمع تسجيلات sales في فرعه.
- `super_admin` → كل التسجيلات.
- `moderator` → ممنوع نهائياً.

**Pre-call brief:** قبل أي مكالمة → الواجهة تعرض `lead.pre_call_brief` (اللي كتبه الموديريتور) + آخر 3 interactions. السيلز ميقدرش يبدأ recording قبل ما يأكد قراءة الـ brief.

### 16.5 Commission Engine (Tiered, Per-Package, Per-Branch)

**القواعد المحسومة:**
1. التارجت **per branch** مش per sales (الفرع كله يحقق → الكل ياخد).
2. التارجت **per package tier** منفصل (Squad targets ≠ Core ≠ X).
3. **Highest tier achieved** wins (لو حقق tier 3 → كل الطلاب بنسبة tier 3، مش mix).
4. لو محققش أقل tier → **صفر commission**.
5. الكوميشن **على أول enrollment فقط** للطالب (مفيش renewal commission).
6. **Timing:** يُحسب بعد دفع الطالب + activation الفعلية في السيستم.
7. **Refund clawback:** لو ريفند قبل 30 يوم من الدفع → commission يتشطب (lock تلقائي قبل payout). لو بعد 30 يوم → يفضل.
8. **Payout monthly:** نهاية كل شهر → snapshot → payable.
9. **Student transfer بين فروع:** commission يفضل للفرع الأصلي اللي عمل الـ enrollment.

**جداول:**
```text
commission_plans(id, name, effective_from, effective_to, status, created_by)

commission_tiers(id, plan_id, package_tier[squad|core|x], branch_id,
                 min_enrollments int, percentage numeric(5,2))
   -- مثال: plan=2026Q1, package=squad, branch=Maadi
   --   tier1: min=14 → 5%
   --   tier2: min=30 → 8%
   --   tier3: min=50 → 12%

commission_ledger(id, sales_id, enrollment_id, payment_id, branch_id,
                  package_tier, base_amount numeric(12,2),
                  applied_percentage numeric(5,2), commission_amount numeric(12,2),
                  status[pending|locked|paid|clawed_back], 
                  computed_at, locked_at, paid_at, clawback_reason)

commission_payouts(id, sales_id, period_month date, total numeric(12,2),
                   payout_date, journal_entry_id)
```

**Engine flow:**
```text
Monthly cron (1st of month, 02:00):
  FOR each branch, FOR each package_tier:
    count = enrollments(prev_month, branch, tier, status='active', not_refunded_within_30d)
    achieved_tier = highest tier where count >= min_enrollments (per branch policy)
    IF achieved_tier IS NULL → skip (zero commission)
    ELSE FOR each enrollment in that bucket:
      base = first_payment_amount
      commission = base * achieved_tier.percentage
      INSERT commission_ledger(status='locked', applied_percentage, commission_amount)
    
    Aggregate per sales_id → commission_payouts(status='pending_payout')
    fn_post_journal_entry → debit Expense:SalesCommission, credit Liability:CommissionPayable
```

**Refund clawback trigger:** عند `fn_refund(payment_id)` → IF days_since_payment < 30 AND commission_ledger.status='locked' → UPDATE status='clawed_back' + reverse journal entry.

### 16.6 Lead Reassignment & Receptionist Handoff

- Sales **ميقدرش** يحوّل lead لـ sales تاني.
- لو الـ lead احتاج handoff (مثلاً sales في إجازة) → يحوّل **للريسيبشن** اللي تقسّمه على الفريق المتاح.
- RPC `fn_handoff_lead_to_reception(lead_id, reason)` → status='reassigned_pending' → reception dashboard يشوفه → reception RPC `fn_reassign_lead(lead_id, new_sales_id)`.

### 16.7 KPIs (Priority Order)

الـ Sales Dashboard يعرض بالترتيب ده (مش كلهم نفس الوزن):

| # | KPI | تعريف | Source |
|---|---|---|---|
| 1 | **Revenue per Sales** | sum(payments.amount) من enrollments اللي السيلز كسبها، الشهر الحالي | mv_sales_revenue_monthly |
| 2 | **Conversion Rate** | won / (won + lost + archived) للـ leads المتعيّنة في الفترة | mv_sales_conversion |
| 3 | **Response Time (avg)** | avg(first_interaction_at - assigned_at) | mv_sales_response_time |
| 4 | **Source ROI** | revenue per lead_source / cost (لو متسجّل) | mv_lead_source_roi |
| 5 | **Lead Aging** | distribution of leads by days_since_assigned (buckets: 0-2, 3-7, 8-14, 15+) | mv_lead_aging |
| 6 | **Loss Reasons** | breakdown of lost leads by reason | mv_loss_reasons |
| 7 | **Calls per Day** | count(call_recordings) per day per sales | mv_calls_per_day |

كلها materialized views تحت §14.2 (refreshed hourly). الـ adapter `src/lib/api/analytics.ts` يعرضها بنفس الباترن.

### 16.8 Tables Summary (v2.3 additions = 11 tables)

```text
Layer 1 (Identity):       staff_employees (موحّد لكل الموظفين: sales, moderator, trainer, reception, branch_admin)
                          staff_salaries (monthly base salary per employee)
Layer 4 (Finance):        commission_plans, commission_tiers, commission_ledger, commission_payouts
Layer 7 (Sales — NEW):    lead_sources (catalog, super_admin managed)
                          leads (core entity)
                          lead_status_history
                          lead_interactions (calls, notes, meetings)
                          call_recordings
                          lead_archive (auto-archived leads + reactivation log)
```

**إجمالي جديد: 72 + 11 = 83 جدول على 8 layers.**

### 16.9 RLS Matrix (Sales Module)

| Table | sales | moderator | branch_admin | super_admin | reception |
|---|---|---|---|---|---|
| leads (insert) | ✗ | ✓ (own branch) | ✓ | ✓ | ✗ |
| leads (select own assigned) | ✓ | own-created only | branch | all | branch (handoff queue only) |
| leads (update status) | ✓ (own + state machine) | ✗ | ✓ | ✓ | reassign only |
| call_recordings (listen) | own only | ✗ | branch | all | ✗ |
| commission_ledger (read) | own only | ✗ | branch summary | all | ✗ |
| commission_tiers (write) | ✗ | ✗ | ✗ | ✓ | ✗ |
| lead_sources (write) | ✗ | ✗ | ✗ | ✓ | ✗ |

### 16.10 ADRs Added (v2.3)

```text
ADR-011-moderator-as-sole-lead-entry.md
ADR-012-hybrid-lead-assignment.md
ADR-013-browser-mediarecorder-vs-twilio.md
ADR-014-per-branch-tiered-commission.md
ADR-015-30day-refund-clawback-window.md
ADR-016-first-enrollment-only-commission.md
ADR-017-staff-employees-unified-table.md
```

### 16.11 Future Extensions (نتركها كـ extension points، مش implementation الآن)

- `team_lead` role (hierarchy جاهز في `staff_employees.manager_id` من اليوم الأول).
- Twilio integration كـ alternative recording channel (المكان واحد: `call_recordings.source='twilio'|'browser'`).
- Lead scoring (AI suggestion عبر §14.7 ACL).
- Renewal commission (toggle في `commission_plans.applies_to_renewals=false` الافتراضي).

---

## 17. Sales Module Hardening — Edge Cases & Flow Completeness (v2.3 audit)

راجعت v2.3 خط بخط. النقاط دي كانت ممكن تبقى break points أو سباجيتي → كلها محسومة هنا قبل أي كود.

### 17.1 Lead → Enrollment Conversion (الـ flow الناقص)

`status='won'` لوحده مش enrollment. الفلو الكامل:

```text
sales: fn_transition_lead(lead, 'won')  
  → lead.status='won', conversion_started_at=now()
  → notification → reception(branch) "lead جاهز للتسجيل"
  → lead يدخل reception_handoff_queue (يقفل في dashboard السيلز كـ awaiting_enrollment)

reception: fn_convert_lead_to_student(lead_id, idempotency_key)
  داخل tx:
    1. إنشاء/ربط student (dedup على phone+full_name)
    2. ربط parent (لو موجود) + sibling discount recalc
    3. entry_test scheduling (لو الباقة بتطلبه)
    4. enrollment + payment plan
    5. INSERT commission_eligibility(lead_id, sales_id, enrollment_id, status='pending_payment')
    6. UPDATE lead.status='converted', linked_enrollment_id, converted_at

payment received → trigger → commission_eligibility.status='pending_activation'
student activated (first session attended OR 7 days passed) → status='locked_for_payout'
   → monthly cron يلتقطها لـ commission_ledger
```

**القاعدة الذهبية:** commission attribution = `lead.assigned_to` لحظة `status='won'`، حتى لو السيلز ده ساب الشركة بعد كده (audit-safe).

### 17.2 Lead Deduplication (منع double-entry)

- `leads` فيه `UNIQUE(phone_normalized) WHERE status NOT IN ('archived','lost','converted')` — partial unique index.
- موديريتور لما يدخل lead بنفس الموبايل → السيستم يكشف ويعرضله:
  - "موجود active مع sales X" → ممنوع duplicate.
  - "موجود في archive منذ Y شهر" → خيار `reactivate` (يرجع لـ pool) بدل create.
- لو الموبايل لـ student موجود → flag كـ "potential renewal/sibling lead" + ربط بـ `existing_student_id`.

### 17.3 Branch Ownership of Lead

- كل lead له `branch_id` إجباري (الموديريتور يحدّده وقت الإنشاء).
- assignment، commission، KPIs، call recording RLS كلهم scoped على `lead.branch_id`.
- لو العميل غيّر رأيه على فرع تاني بعد قابل sales → RPC `fn_transfer_lead_branch(lead_id, new_branch_id, reason)` → موافقة `branch_admin` للفرعين → commission credit يفضل للفرع الأصلي إن تم الـ won قبل التحويل.

### 17.4 Sales Lifecycle Events (موظف يدخل/يخرج/ينقل)

| Event | تأثير على leads | تأثير على commission |
|---|---|---|
| sales joins | يدخل في round-robin pool فوراً | — |
| sales on leave (vacation flag) | leads جديدة ما بتتوزّعش عليه؛ leads مفتوحة → reception handoff queue اختياري | pending commissions تفضل |
| sales transferred to other branch | leads مفتوحة → handoff queue للريسيبشن في الفرع القديم | commission ledger القديم يتدفع normal |
| sales terminated | كل open leads → handoff queue تلقائي + alert | pending commissions: rule في `system_policies.sales.terminated_commission_policy` = `pay_locked_only` (default) أو `pay_all_pending` |

كل ده عبر RPCs محددة، صفر manual SQL.

### 17.5 Commission Edge Cases (محسومة)

| Case | السلوك |
|---|---|
| Partial refund | clawback نسبي = `commission * (refunded / total_paid)` |
| Package upgrade Squad→Core mid-term | commission على الـ delta فقط، attributed لنفس السيلز لو خلال 30 يوم من الـ enrollment، غير كده = renewal (zero commission افتراضي) |
| Installments | base_amount = **first installment paid**. باقي القساط مش تكسب commission إضافية (rule موثقة في ADR-016) |
| Multi-currency لاحقاً | commission_ledger يحفظ `currency` + `fx_rate_snapshot` |
| Sales achieved tier 3 بس فيه refund خلّاه tier 2 | recompute في نفس الـ monthly cron قبل lock، snapshot واحد per شهر |
| Pre-existing student renews via sales | renewal_commission flag في `commission_plans` (default false) |
| Branch لم يحقق أقل tier بس سيلز واحد جاب 90% من الـ enrollments | صفر commission (target فرع، مش فردي) — موضح للسيلز في dashboard كـ "Branch target: 12/14" |

### 17.6 Call Recording Edge Cases

- **Browser crash mid-call:** MediaRecorder بيـ chunk كل 10s → الـ chunks ترفع تدريجياً عبر signed URLs. لو وقع → resume من آخر chunk عند reopen. `call_recordings.status` = `recording | uploading | complete | failed`.
- **Two tabs مفتوحين:** `active_recording_session` lock per sales_id → ميقدرش يبدأ tow في نفس الوقت.
- **Test/training calls:** flag `is_training=true` → مش بيدخل KPIs أو call_count.
- **Consent withdrawn:** RPC `fn_delete_recording(id, reason)` → soft delete + audit، super_admin only.

### 17.7 Round-Robin Fairness

- `fn_assign_lead_auto(branch_id)` يختار السيلز بـ:
  1. أقل `open_leads_count` (status in new/assigned/contacted/qualified/negotiation)
  2. tiebreaker: أقدم `last_assigned_at`
  3. skip لو `is_on_leave=true` أو `is_active=false`
- Idempotent: نفس الـ lead لو حاول يتعيّن مرتين → no-op.

### 17.8 Pre-Call Brief Versioning

- موديريتور ممكن يعدّل الـ brief قبل أول call فقط.
- بعد أول call → brief يـ freeze، أي إضافة تبقى `lead_notes` (append-only).
- `pre_call_brief_snapshot` يتحفظ في كل `call_recording` (immutable per call).

### 17.9 KPI Integrity Rules

- Response time: يحسب من `assigned_at` لـ **أول outbound interaction** (call attempt أو message)، مش inbound.
- Conversion rate: denominator = leads `assigned_at` في الفترة، numerator = `converted_at` في أي وقت لاحق (cohort analysis، مش same-period).
- Calls/day: counts `call_recordings.duration_sec >= 15s` فقط (يستبعد misdials).
- كل KPI له **definition doc** في `docs/kpi-definitions.md` (single source of truth).

### 17.10 Permission Matrix Completeness Check

كل combination (role × action × entity × ownership) ليه explicit rule في `src/lib/auth/permissions.ts` + RLS policy. أي action مش في الـ matrix = denied by default (whitelist مش blacklist). PR checklist يطلب update الـ matrix مع كل feature.

### 17.11 Why No Spaghetti (الـ guarantee)

| المخاطرة | الـ guard |
|---|---|
| Business logic يتسرّب لـ UI | كل mutation = RPC + Zod، UI tier محظور fetch مباشرة (§1.2) |
| Module جديد يكسر القديم | Extension rules (§13): jدول جديدة، RPC جديدة، layer واضح |
| Roles تتشابك | `staff_employees` unified + permissions whitelist + role transitions audited |
| State machine يفلت | كل transition عبر `fn_transition_*` + `*_status_history` + DB CHECK constraints |
| Commission calc drift | DB-enforced (SUM(debit)=SUM(credit)) + monthly snapshot immutable + recomputable من ledger |
| Two devs يبنوا نفس الحاجة بطريقتين | Architecture Contract (§1) + PR checklist (§13.6) + ADRs (§14.8) |

---

## 18. الخلاصة النهائية (v2.3 — Audit-Complete)

- **83 جدول** على 8 layers، **9 roles** unified تحت `staff_employees`.
- **38 سيناريو** (30 academy + 8 sales) مغطى end-to-end بـ owner + flow + edge cases.
- **Lead → Enrollment → Commission** flow كامل ومحسوم (مش `status='won'` نهاية القصة).
- **Sales lifecycle** (join/leave/transfer/terminate) كلها محسومة عبر RPCs.
- **Commission edge cases** (refund partial، upgrade، installments، multi-currency) كلها مغطاة بـ DB-enforced rules.
- **Call recording resilience** (crash recovery، multi-tab lock، training flag) جاهزة.
- **KPI integrity** بـ definitions موثقة + materialized views.
- **Spaghetti prevention:** Architecture Contract + Extension Rules + Permission Whitelist + PR Checklist + ADRs.
- أي feature جديد قدام → يدخل في الـ layer الصح، يكتب ADR، يضيف entries في الـ matrix، صفر refactor.

لما توافق على v2.3 → Phase 0: DDL كامل (83 جدول) + RLS + RPCs + triggers + cron + ADR-001 → ADR-017 + seed.

---

## 19. Pre-Phase-0 Additions (Master Review Outcome — v2.4)

اتعملت Master Review على البلان كله (Business flows + Schema + Anti-spaghetti contract). الـ foundation قوي. النقاط دي اتضافت للـ Phase 0 DDL عشان البلان يطلع 100% solid.

### 19.1 جداول جديدة (4)

| # | الجدول | الغرض | الأعمدة الأساسية |
|---|---|---|---|
| 1 | `level_determination_rules` | mapping من entry_test tags لـ levels (أدمن يعدّل من panel) | `id, question_tag, level_id, min_correct_count, age_group_id, created_by` |
| 2 | `package_content_access` | (package_tier × content_type) → allowed boolean | `package_tier, content_type, allowed, UNIQUE(package_tier, content_type)` |
| 3 | `trainer_unavailability` | فترات غياب المدرب المعتمدة | `id, trainer_id, starts_at, ends_at, reason, status, approved_by` |
| 4 | `pending_reassignment_queue` | سيشنات محتاجة استبدال مدرب | `id, session_id, original_trainer_id, reason, priority, assigned_to_reviewer, resolved_at` |

### 19.2 ALTERs على جداول قائمة (2)

```sql
ALTER TABLE compensation_sessions
  ADD COLUMN is_within_working_hours boolean NOT NULL DEFAULT true,
  ADD COLUMN trainer_extra_pay_amount numeric(12,2) DEFAULT 0;

CREATE TYPE failure_reason_type AS ENUM ('academy_fault','student_fault','pending_review');
ALTER TABLE student_progression
  ADD COLUMN failure_reason failure_reason_type,
  ADD COLUMN failure_decided_by uuid REFERENCES profiles(id),
  ADD COLUMN failure_decided_at timestamptz;
```

### 19.3 Views جديدة (1)

```sql
CREATE VIEW student_accessible_content AS
SELECT sc.*, s.id AS student_id
FROM session_content sc
JOIN group_sessions gs ON gs.id = sc.session_id
JOIN group_enrollments ge ON ge.group_id = gs.group_id
JOIN students s ON s.id = ge.student_id
JOIN subscriptions sub ON sub.id = ge.subscription_id AND sub.status IN ('active','active_waiting')
JOIN package_content_access pca
  ON pca.package_tier = sub.package_tier AND pca.content_type = sc.content_type
WHERE pca.allowed = true;
-- + RLS: student_id = current_student_id() OR parent_of(student_id)
```

### 19.4 FK & Constraint Fixes (3)

- `policy_snapshots.enrollment_id` → FK لـ `group_enrollments.id` (RESTRICT).
- `compensation_sessions` CHECK: `(is_within_working_hours AND trainer_extra_pay_amount=0) OR (NOT is_within_working_hours AND trainer_extra_pay_amount>0)`.
- `level_determination_rules` UNIQUE(question_tag, age_group_id).

### 19.5 RPCs جديدة (3 إضافية)

| RPC | الوظيفة |
|---|---|
| `fn_evaluate_entry_test(student_id, answers jsonb)` | يطبق `level_determination_rules` ويرجع level + breakdown |
| `fn_find_compensation_slot(student_id)` | يبحث عن سيشن نفس level+age_group+branch خلال أسبوع، يحسب is_within_working_hours، يرجع candidates |
| `fn_create_solo_compensation(student_id, trainer_id, slot_at)` | سيشن منفردة + يحسب extra_pay من `system_policies.compensation.extra_pay_outside_hours` |

### 19.6 Architecture Contract (مثبت رسمياً)

كل rules الـ Master Review = الـ contract الرسمي. مفعّل عبر:

- ESLint custom: `no-direct-supabase-in-components` (يمنع `supabase.from()` خارج `src/lib/api/`).
- ESLint custom: `no-business-logic-in-components` (يمنع if/switch على enums حساسة).
- PR template checklist: soft-delete، timestamptz، numeric للأموال، RoleGuard، RPC لأي money mutation.
- CI gate: أي migration بدون ADR → fail.
- File size: warn @ 250، error @ 300 لملفات `src/lib/api/*` (يتقسموا queries/mutations).

### 19.7 Folder Structure (canonical — مثبت)

```text
src/lib/api/{domain}.ts          ← supabase calls فقط
src/lib/auth/permissions.ts      ← single source of truth للـ RBAC
src/lib/validators/*.schema.ts   ← Zod (UX only؛ RPC = source of truth)
src/hooks/queries|mutations/     ← TanStack Query wrappers
src/components/features/{domain} ← presentation فقط
src/stores/                      ← Zustand للـ UI state بس
src/routes/_authenticated/       ← auth-gated routes
```

### 19.8 الخلاصة (v2.4 — Phase 0 Ready)

- **87 جدول** (83 + 4) على 8 layers.
- **28 RPC** (25 + 3).
- **17 triggers** + **10 cron jobs**.
- Architecture contract مفعّل في ESLint + PR template + CI.
- كل سيناريوهات Master Review (Parts 1, 5) = ✅ مغطاة.
- صفر spaghetti، صفر break points، صفر hardcoded logic.

**Phase 0 deliverables عند الموافقة:**
1. DDL كامل (87 جدول + ENUMs + views + constraints).
2. RLS policies (per role × per table، whitelist-based).
3. 28 RPC (idempotent للـ money/session).
4. 17 triggers + 10 cron jobs + helpers.
5. Seed (system_policies، lead_sources، package_content_access، kpi_definitions).
6. ADR-001 → ADR-017 في `docs/adr/`.
7. ESLint custom rules + PR template + CI gate.
8. `docs/architecture-contract.md` + `docs/kpi-definitions.md` + `docs/permissions-matrix.md`.
