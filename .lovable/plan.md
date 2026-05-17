# Kojo Academy — Master Architecture Plan (Final)

> هذه نسخة نهائية محسومة. كل القرارات اتقفلت. الهدف: نظام scalable، ممنوع السباجيتي، كل feature جديدة بتركب على ستراكتشر ثابت.

---

## 1. القواعد الذهبية (Architecture Contract — ثابتة طول عمر المشروع)

### 1.1 فصل المسؤوليات (Single Responsibility Layers)

```text
┌─────────────────────────────────────────────────────────┐
│  UI Layer (React Components)                            │
│  - Display + Forms + Navigation فقط                     │
│  - ممنوع: business logic, calculations, conditionals    │
│  - ممنوع: استدعاء supabase مباشرة                       │
└─────────────────────────────────────────────────────────┘
                           ↓ uses
┌─────────────────────────────────────────────────────────┐
│  Hooks Layer (src/hooks/) — TanStack Query فقط          │
│  - useXxxQuery / useXxxMutation                         │
│  - يلف الـ API layer ويدير cache + invalidation         │
└─────────────────────────────────────────────────────────┘
                           ↓ calls
┌─────────────────────────────────────────────────────────┐
│  API Layer (src/lib/api/)                               │
│  - الواجهة الوحيدة بين الـ frontend والـ Supabase        │
│  - كل ملف بيلف domain واحد (sessions, payments...)      │
│  - ممنوع أي business logic هنا — pass-through فقط        │
└─────────────────────────────────────────────────────────┘
                           ↓ invokes
┌─────────────────────────────────────────────────────────┐
│  Database Layer (Supabase — Single Source of Truth)     │
│  - Tables + RLS + Triggers + RPCs + Views + Cron        │
│  - كل business logic هنا فقط                            │
└─────────────────────────────────────────────────────────┘
```

### 1.2 قواعد ممنوع كسرها

| القاعدة | السبب |
|---|---|
| ممنوع `supabase.from()` في component | يكسر separation + يصعّب الـ testing |
| ممنوع optimistic update على أي عملية مالية/سيشن | inconsistency خطيرة |
| ممنوع conditional business logic في React | DB هو الـ source of truth |
| ممنوع تخزين role في profile | privilege escalation |
| كل money/session mutation = RPC فقط | atomicity + audit |
| كل RPC جوّاها transaction + audit_log insert | traceability |
| ممنوع DELETE فعلي — soft delete دايماً (`deleted_at`) | recovery + audit |
| كل foreign key = `ON DELETE RESTRICT` افتراضياً | يمنع corruption |
| كل money column = `numeric(12,2)` ممنوع float | precision |
| كل timestamp = `timestamptz` ممنوع `timestamp` | timezone safety |

### 1.3 ستراكتشر المشروع الثابت

```text
src/
├── routes/                    # TanStack file-based routing
│   ├── __root.tsx             # Providers + Outlet
│   ├── index.tsx              # Landing/redirect
│   ├── login.tsx
│   ├── unauthorized.tsx
│   └── _authenticated/        # Layout مع beforeLoad guard
│       ├── route.tsx          # auth check + role-based redirect
│       ├── dashboard.tsx      # smart redirect حسب الدور
│       ├── students.*.tsx
│       ├── groups.*.tsx
│       ├── sessions.*.tsx
│       ├── payments.*.tsx
│       ├── treasury.*.tsx
│       ├── staff.*.tsx
│       └── settings.*.tsx
│
├── lib/
│   ├── api/                   # Supabase wrappers (الوحيدة المسموحة)
│   │   ├── auth.ts
│   │   ├── students.ts
│   │   ├── groups.ts
│   │   ├── sessions.ts        # fn_open_session, fn_close_session...
│   │   ├── attendance.ts
│   │   ├── payments.ts        # fn_create_payment_with_installments...
│   │   ├── treasury.ts
│   │   ├── compensation.ts
│   │   ├── progression.ts
│   │   ├── transfers.ts       # fn_transfer_student, fn_apply_refund
│   │   ├── scheduling.ts      # fn_reassign_session
│   │   ├── notifications.ts
│   │   └── kpis.ts
│   ├── email-templates/       # React Email (in-app + email channel)
│   ├── email/send.ts          # sendTransactionalEmail helper
│   ├── auth/                  # useAuth, RoleGuard, permissions matrix
│   ├── validators/            # Zod schemas (form + API contracts)
│   └── utils/
│
├── hooks/                     # TanStack Query hooks فقط
│   ├── queries/
│   └── mutations/
│
├── components/
│   ├── ui/                    # shadcn
│   ├── shared/                # DataTable, FormField, ConflictDialog...
│   └── features/<domain>/     # presentational فقط
│
├── stores/                    # Zustand — UI state فقط (modals, filters)
│
└── integrations/supabase/     # client, client.server, auth-middleware, types
```

### 1.4 Permissions Matrix (Single Source — `src/lib/auth/permissions.ts`)

ملف واحد يربط `role × action × resource`. كل `<RoleGuard>` و كل `beforeLoad` بيقرأ منه. لو حبيت تضيف role جديد = ملف واحد بيتعدل.

```ts
// مثال
export const PERMISSIONS = {
  super_admin: { '*': ['*'] },
  branch_admin: { students: ['*'], payments: ['*'], staff: ['read','update'], ... },
  reception: { students: ['create','read','update'], payments: ['create','read'], ... },
  trainer: { sessions: ['read','open','close'], attendance: ['*'], ... },
  parent: { children_sessions: ['read'], children_payments: ['read'], ... },
  student: { own_profile: ['read'], own_progress: ['read'], ... },
};
```

---

## 2. الأدوار (Roles) — مقفولة

`super_admin` | `branch_admin` | `reception` | `trainer` | `parent` | `student`

- مخزّنين في `user_roles(user_id, role, branch_id)` — M2M.
- `useAuth()` بيرجع `{ user, roles: [{role, branch_id}], activeRole, switchRole() }`.
- بعد اللوجين: `/dashboard` بيقرر redirect حسب `activeRole` (highest precedence).
- Multi-branch super_admin يقدر يبدّل branch من header dropdown.

---

## 3. Database Schema (42 جدول / 5 طبقات)

### Layer 0 — Identity & Config
`profiles`, `user_roles`, `branches`, `rooms`, `system_policies` (refund rules, late fees, session_duration, grace_period — JSONB per branch), `audit_log`, `notifications`.

### Layer 1 — Curriculum
`stages`, `levels`, `level_prerequisites`, `lesson_packages`, `lessons`, `quizzes`, `quiz_questions`, `final_exams` (جدول منفصل: `level_id`, `group_session_id`, `proctoring_rules`, `grading_rules`, `weight_in_gpa`).

### Layer 2 — Operations
`students`, `parents`, `parent_student_links`, `waiting_list`, `entry_tests`, `groups` (`schedule_meta jsonb` — multi-slot engine), `group_enrollments`, `group_sessions`, `session_attendance`, `session_content` (lesson_package_id mandatory), `substitutions`, `compensations`, `student_progression`, `quiz_attempts`, `final_exam_attempts`.

### Layer 3 — Financial
`fee_plans`, `subscriptions` (`remaining_sessions` = source of truth, `subscription_end_date` = derived cache), `payments`, `installments`, `siblings_discounts`, `refunds`, `treasury_accounts`, `treasury_movements`, `expenses`.

### Layer 4 — Staff & KPIs
`staff_profiles`, `trainer_assignments`, `trainer_payouts`, `staff_kpis`, `branch_kpis`.

### Constraints الحرجة

```sql
-- يمنع double-booking المدرب
ALTER TABLE group_sessions ADD CONSTRAINT no_trainer_overlap
  EXCLUDE USING gist (
    trainer_id WITH =,
    tstzrange(scheduled_at, scheduled_end_at) WITH &&
  ) WHERE (status <> 'cancelled');

-- يمنع double-booking القاعة
ALTER TABLE group_sessions ADD CONSTRAINT no_room_overlap
  EXCLUDE USING gist (
    room_id WITH =,
    tstzrange(scheduled_at, scheduled_end_at) WITH &&
  ) WHERE (status <> 'cancelled');

-- attendance مقفول بعد session.closed_at
CREATE TRIGGER trg_attendance_lock BEFORE INSERT OR UPDATE ON session_attendance ...

-- session_content مطلوب قبل open
CREATE TRIGGER trg_session_must_have_content BEFORE UPDATE ON group_sessions ...
```

---

## 4. Business Flows (كل سيناريو محسوم)

### 4.1 Parent Onboarding (Magic Link من الريسيبشن)
1. Reception → `fn_register_student_with_parent(student_data, parent_email)`
2. RPC: insert student + parent profile + parent_student_link + `auth.admin.inviteUserByEmail`
3. Magic link → parent يفتح، يحط password → redirect `/dashboard` (parent role).

### 4.2 Entry Test → Placement
`fn_evaluate_entry_test(attempt_id)` → يحدد `recommended_level_id` → reception يأكد → `fn_enroll_student_in_group`.

### 4.3 Multi-Slot Group Scheduling Engine
```json
"schedule_meta": {
  "pattern": "weekly",
  "sessions_per_week": 2,
  "slots": [
    {"day": "sun", "time": "16:00", "duration_min": 90, "room_id": "..."},
    {"day": "wed", "time": "16:00", "duration_min": 90, "room_id": "..."}
  ]
}
```
- `trg_create_group_sessions` after insert/update → يولّد N sessions حسب `total_sessions_in_level` بـ round-robin على الـ slots.
- يدعم: 1-7 days/week, intensive bootcamps, biweekly.
- Holidays: جدول `branch_holidays` → engine يتخطاها تلقائياً ويمدّ آخر سيشن.

### 4.4 Session Lifecycle (Hybrid Closing)
```text
scheduled → open (trainer/admin via fn_open_session — يتحقق من session_content)
         → closed (trainer via fn_close_session أو cron بعد duration+30min)
         → cancelled (admin only)
```
- `fn_close_session` = single source: يحدّث attendance، ينقّص `remaining_sessions`، يحدّث `subscription_end_date`، ينشئ compensations للغايبين، يحدّث KPIs، ينشئ trainer_payout entry.
- Cron `cron_auto_close_sessions` كل 15 دقيقة = safety net.

### 4.5 Trainer Substitution & Conflicts
- DB constraints بتمنع double-booking تلقائياً.
- لو insert/update فشل: frontend يستقبل error code، يفتح `<ConflictDialog>` بـ 3 options: reassign trainer / reassign room / reschedule.
- `fn_reassign_session(session_id, new_trainer_id, reason)` → update + insert substitutions + audit + notify (in-app + email).
- Optional: `fn_suggest_available_trainers(level_id, time_range)` للـ UX.

### 4.6 Attendance & Compensation
- `trg_handle_attendance` after update: لو `status='absent'` → ينشئ compensation pending.
- Compensation = سيشن إضافية جوّا نفس الجروب أو makeup group.
- لو الطالب غاب أكتر من X (policy) → ينحظر من homework upload.

### 4.7 Payments & Installments
- `fn_create_payment_with_installments(student_id, fee_plan_id, installments_count, first_due)` → atomic.
- `trg_restore_access_on_payment` after installment paid → يفك أي حظر.
- Overdue: `cron_flag_overdue_installments` يومياً → ينشئ notification + يحظر homework.
- Siblings discount: `trg_siblings_discount` after insert على `parent_student_links`.

### 4.8 Treasury (3 funcs)
`fn_record_income`, `fn_record_expense`, `fn_transfer_between_accounts` — كلها بتعمل insert في `treasury_movements` + تحدّث `treasury_accounts.balance` atomically.

### 4.9 Transfers & Refunds
- `fn_transfer_student(student_id, new_group_id)` — مجاني، ينقل `remaining_sessions` + history، audit.
- `fn_apply_refund(student_id, reason)` — يقرأ `system_policies.refund_policy` JSONB (مرن لكل فرع) ويحسب pro-rated.

### 4.10 Level Progression & Final Exam
- `final_exams` table منفصل — مربوط بـ `group_session_id` + `level_id`.
- `fn_calculate_level_result(student_id, level_id)` = weighted(quizzes, attendance, final_exam) → pass/fail.
- لو pass: `fn_advance_student_to_next_level` → enroll في الجروب التالي أو waiting_list.

### 4.11 Notifications (In-app + Email فقط)
- جدول `notifications` (in-app feed) + Lovable Emails للـ email channel.
- كل event حرج (magic link, session reassign, payment due, overdue, results, refund) = trigger يـ insert في `notifications` + (لو email channel) ينادي edge function `send-transactional-email`.

### 4.12 Cron Jobs
| Cron | Schedule | الغرض |
|---|---|---|
| `cron_auto_close_sessions` | كل 15 دقيقة | safety net للسيشن |
| `cron_flag_overdue_installments` | يومياً 00:30 | يحظر + ينوتيفاي |
| `cron_calculate_daily_kpis` | يومياً 02:00 | staff + branch KPIs |
| `cron_recompute_subscription_end` | يومياً 03:00 | يصلح أي drift |

---

## 5. Frontend Patterns الثابتة

### 5.1 كل صفحة Data
```tsx
function PageX() {
  const { data, isLoading, error } = useXxxQuery(filters);
  if (isLoading) return <PageSkeleton />;
  if (error) return <ErrorState error={error} onRetry={...} />;
  return <XxxView data={data} />;  // pure presentational
}
```

### 5.2 كل Mutation حرج
```tsx
const mutation = useXxxMutation();  // wraps lib/api/ — no optimistic
<Button disabled={mutation.isPending} onClick={() => mutation.mutate(payload)}>
  {mutation.isPending ? <Spinner/> : 'Confirm'}
</Button>
```
- على success: invalidate الـ relevant queries + toast.
- على error: `<ConflictDialog>` لو error code = `CONFLICT`، toast غير كده.

### 5.3 RoleGuard موحّد
```tsx
<RoleGuard resource="payments" action="create" fallback={<Forbidden/>}>
  <CreatePaymentForm />
</RoleGuard>
```

---

## 6. Storage Buckets
- `student-documents` (private, RLS: parent + admin + reception للطالب بتاعهم)
- `homework-uploads` (private, RLS: student own + trainer + admin)
- `branch-assets` (public-read)
- `staff-documents` (private, admin only)

---

## 7. خطة التنفيذ (Phases)

| Phase | المحتوى |
|---|---|
| 0 | DB Foundation: 42 tables + RLS + 14 triggers + 20 RPCs + 4 cron + 5 views + buckets + types gen |
| 1 | Auth shell: useAuth + RoleGuard + permissions matrix + /login + /_authenticated + smart redirect |
| 2 | Students + Parents + Waiting List + Entry Tests + Magic Link Onboarding |
| 3 | Groups + Multi-slot Scheduling Engine + Sessions CRUD + Conflict UI |
| 4 | Attendance + Compensations + Trainer dashboard + Session open/close |
| 5 | Financial: Payments + Installments + Treasury + Siblings + Refunds + Transfers |
| 6 | Curriculum runtime: Lessons + Quizzes + Final Exams + Progression |
| 7 | KPIs + Reports + Notifications feed + Email templates |
| 8 | Polish: Empty states, skeletons, error boundaries, i18n RTL |

كل phase = PR مستقل، migration واحدة على الأقل، types regenerated، tests للـ RPCs الحرجة.

---

## 8. الضمانات ضد السباجيتي

1. **ملف واحد لكل دومين** في `lib/api/` — لو الملف عدّى 300 سطر، يتقسم.
2. **ممنوع cross-domain imports** بين features (groups مايستوردش من payments مباشرة — يعدي على hook).
3. **كل RPC له Zod schema** في `lib/validators/` — type-safe من الـ DB للـ form.
4. **Permissions Matrix ملف واحد** — لو عدلت، اتغيّر في كل مكان.
5. **Notifications kind enum** ثابت — أي event جديد = سطر واحد في الـ enum + template.
6. **Cron + Triggers موثّقين** في `docs/db-events.md` — أي مطور جديد يفهم الـ flow في 5 دقايق.
7. **Audit log إجباري** على كل RPC مالية/سيشن — `audit_log(actor, action, entity, before, after, reason)`.

---

## 9. النقاط المفتوحة (محتاجة تأكيد قبل Phase 0)

كل القرارات الكبيرة محسومة. لو فيه أي سيناريو خاص بالأكاديمية مش مذكور هنا (مثلاً: scholarships, corporate accounts, multi-currency) قوله دلوقتي عشان يتدمج في الـ schema من البداية بدل migration لاحق.

لما توافق على الخطة هبدأ Phase 0 فوراً.
