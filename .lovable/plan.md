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

## 10. مفتوح للنقاش
لو في scenarios إضافية (scholarships, multi-currency, corporate accounts) قولها دلوقتي عشان تتدمج في Phase 0.

لما توافق على v2 هبدأ Phase 0 فوراً.
