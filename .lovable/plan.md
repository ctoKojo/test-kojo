# Kojo Academy — خطة البناء الشاملة (v4)

أكاديمية تعليمية متعددة الفروع، نظام هجين (أونلاين + أوفلاين).
**Stack:** Vite + React 18 + TypeScript (SPA خالص — client-side فقط، لا SSR) + Supabase (Postgres + Auth + Storage + Edge Functions + pg_cron).
الـ Business Logic كله في Supabase (Triggers + RPCs + Edge Functions) — الـ Frontend نظيف بدون أي business logic.

> **ملاحظة مهمة عن الـ Stack:** المشروع الحالي متبني على TanStack Start (SSR). هنحوّله لـ **Vite SPA خالص** (نشيل TanStack Start ونستخدم Vite + React Router DOM v6). ده يبسّط كل حاجة: لا createServerFn، لا server entry، لا concerns عن client/server boundary. الـ Auth والـ Data كلها مباشرة من المتصفح للـ Supabase.

---

## 1. القرارات النهائية المؤكدة

| البند | القرار |
|---|---|
| **Frontend** | Vite + React 18 + TypeScript (SPA خالص) |
| **Routing** | React Router DOM v6 (BrowserRouter + nested routes + loaders) |
| **Backend** | Supabase (Postgres + Auth + Storage + pg_cron) |
| **Server Logic المعقد** | Supabase Edge Functions (Email، PDF، orchestration، secrets) |
| **Server Logic البسيط** | مباشرة `supabase.from/rpc` من الـ client (RLS بتحمي) |
| **Auth Guard** | Supabase `auth.uid()` في RLS + `<ProtectedRoute>` في React Router |
| **DB Logic** | Triggers + RPC functions للـ atomic invariants |
| **State** | TanStack Query v5 (server state) + Zustand (UI state فقط) |
| **Forms** | react-hook-form + zod |
| **i18n** | react-i18next + RTL/LTR |
| **Payments** | يدوي (cash/visa/transfer) — Gateway لاحقاً |
| **Notifications** | In-app (جدول) + Email (Edge Function + Resend) |
| **Files** | فيديوهات = URLs خارجية. PDFs/Slides = Supabase Storage |
| **PDF Certificates** | `@react-pdf/renderer` في Edge Function |
| **Online vs Offline** | الاتنين بالتوازي |
| **Parent ↔ Students** | Many-to-many |
| **Currency** | EGP |
| **Sales** | Role منفصل — dashboard وعمولة مستقلة |
| **Transfer Fees** | مجاناً — لو فيه فرق سعر باقة، يدفع الفرق فقط |
| **Compensation** | مجاناً للطالب — الأكاديمية تدفع للمدرب من المصاريف |
| **Reinstatement Fee** | يحدده Super Admin من `system_policies` |
| **Group Capacity** | per package: Squad 6-8، Core 2-3، X = 1 (Super Admin يحدد القيمة) |
| **Soft Delete** | Students + Staff + Groups + Packages + Levels |
| **Hard Delete** | Logs + Attendance فقط |

---

## 2. الـ Architecture

### 2.1 Stack الكامل

```text
Frontend (Vite SPA):
  Vite + React 18 + TypeScript
  React Router DOM v6     ← routing (BrowserRouter + nested + loaders)
  TanStack Query v5       ← server state + caching
  Zustand                 ← UI state فقط (modals, sidebar)
  react-hook-form + zod   ← forms + validation
  react-i18next           ← i18n + RTL/LTR
  shadcn/ui + Tailwind    ← components + styling
  @react-pdf/renderer     ← certificate preview (client)

Backend (Supabase — لا server framework من جهتنا):
  PostgreSQL              ← database
  Supabase Auth           ← authentication + JWT (في المتصفح مباشرة)
  Supabase Storage        ← PDFs, slides
  Supabase Edge Functions ← business logic معقد، email، PDF، secrets
  pg_cron                 ← scheduled jobs
  Row Level Security      ← authorization layer (الحماية الأساسية)
```

**ليه SPA خالص؟**
- مفيش server من جهتنا = مفيش client/server boundary = مفيش `process.env` confusion
- كل secrets في Supabase Edge Functions فقط
- الـ RLS هي خط الدفاع الأول والأخير
- نشر أسهل (static hosting) + أرخص

### 2.2 Data Flow (طبقات صارمة)

```text
┌───────────────────────────────────────────┐
│ UI Component                               │  ← لا business logic، لا direct DB
│   └─ uses TanStack Query hook              │
└────────────────┬───────────────────────────┘
                 │ calls
┌────────────────▼───────────────────────────┐
│ Query Hook (features/x/queries/*.ts)       │  ← thin wrapper
│   useXxxQuery / useXxxMutation             │
└────────────────┬───────────────────────────┘
                 │ calls
┌────────────────▼───────────────────────────┐
│ API Layer (lib/api/*.api.ts)               │  ← الواجهة الوحيدة للـ Supabase
│   - supabase.from(...) للـ CRUD البسيط     │
│   - supabase.rpc('fn_xxx')  للـ atomic     │
│   - supabase.functions.invoke('edge-fn')   │
└────────────────┬───────────────────────────┘
                 │
┌────────────────▼───────────────────────────┐
│ Supabase Edge Functions (للـ logic المعقد) │
│   - auth check (Bearer token → getUser)    │
│   - Zod validation                          │
│   - orchestration (multiple DB calls)      │
│   - external APIs (Resend, etc.)           │
└────────────────┬───────────────────────────┘
                 │
┌────────────────▼───────────────────────────┐
│ Postgres (Tables + Triggers + RPCs + RLS)  │  ← invariants enforced هنا
└────────────────────────────────────────────┘
```

**متى تستخدم إيه:**
- `supabase.from()`: قراءات بسيطة، insert/update بدون cascade
- `supabase.rpc()`: atomic operations (transfers, payments, blocks, enrollments)
- `supabase.functions.invoke()`: email، PDF، external APIs، orchestration متعدد الخطوات

### 2.3 Folder Structure

```text
src/
  main.tsx                   ← Vite entry + BrowserRouter
  App.tsx                    ← Routes tree + Providers (QueryClient, i18n)
  pages/                     ← React Router page components
    LoginPage.tsx            ← public
    ResetPasswordPage.tsx    ← public
    IndexRedirect.tsx        ← / → redirect حسب الـ role
    admin/                   ← protected (Super Admin + Branch Admin)
      DashboardPage.tsx
      students/ groups/ financial/ staff/ settings/
    reception/
      DashboardPage.tsx
      students/ attendance/ compensation/ financial/
    sales/
      DashboardPage.tsx
      students/ commissions/
    trainer/
      DashboardPage.tsx
      sessions/ evaluations/
    student/
      DashboardPage.tsx
      sessions/ assignments/ quizzes/
    parent/
      DashboardPage.tsx
      children/
  features/                  ← business domains (معزولة)
    curriculum/ students/ operations/ financial/ staff/
    entry-test/ notifications/ certificates/
  lib/
    supabase.ts              ← client singleton
    api/                     ← *.api.ts (الواجهة الوحيدة للـ Supabase)
    rpc.ts                   ← typed wrappers للـ DB RPC functions
    auth.ts                  ← getUser(), getCurrentRole(), hasRole()
    utils/ (currency, dates, roles)
  components/
    ui/                      ← shadcn
    shared/                  ← Money, DateDisplay, StatusBadge, RoleGate,
                                BranchSelector, ConfirmDialog, MoneyInput,
                                DataTable, FileUpload, ProtectedRoute
    layouts/                 ← AdminLayout, TrainerLayout, StudentLayout, ParentLayout
  hooks/                     ← useCurrentUser, useCurrentBranch, useRole
  i18n/                      ← ar.json, en.json, index.ts
  types/                     ← database.types.ts (generated), app.types.ts
  router.tsx                 ← Routes tree definition
```

**ملاحظة عن النشر:** لازم نضيف `public/_redirects` بـ `/* /index.html 200` (أو ما يعادله حسب الـ host) عشان الـ SPA يشتغل على deep links/refresh.

### 2.4 Feature Folder Contract (إجباري)

```text
features/<name>/
  index.ts             ← barrel export — الواجهة الوحيدة للـ cross-feature imports
  types.ts             ← types مشتقة من database.types.ts
  schemas.ts           ← Zod schemas
  queries/
    <entity>.queries.ts ← TanStack Query hooks
  components/
    <Entity>List.tsx   ← max 200 سطر
    <Entity>Form.tsx
  hooks/
    use-<entity>.ts    ← UI state فقط
```

**قواعد صارمة:**
- ممنوع: `features/a` يـ import من `features/b/components/` مباشرة
- مسموح: `import { X } from "@/features/b"` (من الـ barrel فقط)
- Business logic: في `lib/api/` + Supabase (triggers/RPCs/Edge Functions) فقط

---

## 3. DB Schema (~42 جدول، 4 طبقات)

### Layer 0 — Identity & Config
`branches`, `profiles`, `user_roles`, `parent_student_links`, `students`,
`age_groups`, `system_policies`, `policy_snapshots`, `audit_logs`,
`notifications`, `notification_preferences`

### Layer 1 — Curriculum
`packages` (مع min/max_capacity)، `levels`، `level_sessions`، `session_content`،
`assignments`، `quizzes`، `quiz_questions`، `entry_test_questions`

### Layer 2 — Operations
`groups`، `group_sessions`، `group_enrollments`، `attendance`، `evaluations`،
`student_blocks`، `compensation_requests`، `compensation_sessions`،
`assignment_submissions`، `quiz_attempts`، `entry_test_attempts`،
`transfer_requests`، `substitutions`

### Layer 3 — Financial
`treasuries`، `treasury_transactions`، `payments`، `installments`، `expenses`،
`commission_rules`، `commission_assignments`، `commissions`، `reinstatement_fees`

### Layer 4 — Staff & KPIs
`staff`، `staff_schedules`، `leave_requests`، `kpi_definitions`،
`kpi_weights_snapshots`، `kpi_scores`، `warnings`، `certificates`

تفاصيل الأعمدة الكاملة موجودة في رسائل المحادثة السابقة (مرجع).

---

## 4. Auth & RLS Pattern

### 4.1 Auth Helpers (SQL)
- `get_user_role(branch_id)` — `SECURITY DEFINER STABLE`
- `has_role(role, branch_id)`
- `is_super_admin()`
- `my_branch_id()`

### 4.2 RLS Layers (per table)
- **Super Admin** → كل حاجة
- **Branch Admin / Reception / Sales** → فرعهم فقط
- **Trainer** → طلاب جروباته فقط
- **Student** → نفسه فقط
- **Parent** → أبناؤه فقط (عبر `parent_student_links`)

### 4.3 Edge Functions Auth
`_shared/auth.ts` → `requireAuth(req, allowedRoles?)` يرجع `{ user, role, branch_id }`

### 4.4 Frontend Auth (`lib/auth.ts`)
- `getCurrentUser()`، `getCurrentRole()`
- `useCurrentUser()` TanStack Query hook
- Route guard في `_authenticated.tsx` عبر `beforeLoad`

---

## 5. DB Functions, Triggers & Cron Jobs

### 5.1 Triggers (14)
1. `trg_student_age_group` — يحسب age_group من DOB
2. `trg_snapshot_policies_on_enrollment` — ينسخ السياسات
3. `trg_create_group_sessions` — ينشئ 12 sessions
4. `trg_validate_group_capacity` — يرفض على DB level
5. `trg_validate_online_link` — يتحقق online_link موجود
6. `trg_auto_block_on_missed_compensation` — منع من السيشن التالية
7. `trg_full_ban_on_threshold` — fully_banned + reinstatement_fee
8. `trg_restore_access_on_payment` — يرفع payment_block
9. `trg_cascade_group_freeze` — يجمد sessions + ينشئ compensations
10. `trg_set_quiz_deadline` — من إعدادات الكويز
11. `trg_auto_grade_quiz` — يصحح MCQ/TrueFalse
12. `trg_commission_on_first_payment` — أول دفعة → commission
13. `trg_treasury_ledger` — entry في `treasury_transactions`
14. `trg_audit_log` — على الجداول الحساسة

### 5.2 RPC Functions (10)
`fn_promote_student_to_next_level`, `fn_request_recovery`,
`fn_transfer_student_between_groups`, `fn_transfer_student_between_packages`,
`fn_transfer_student_between_branches`, `fn_suggest_substitute_trainers`,
`fn_assign_substitute`, `fn_calculate_compensation_options`,
`fn_close_monthly_period`, `fn_generate_certificate`

### 5.3 Edge Functions (6)
`send-notification`, `generate-certificate-pdf`, `process-entry-test`,
`handle-complex-transfer`, `monthly-commission-calc`, `export-report`

### 5.4 pg_cron Jobs (10)
`cron_lock_attendance` (30m), `cron_auto_close_sessions` (1h),
`cron_daily_attendance_check` (23:00), `cron_compensation_deadlines` (1h),
`cron_check_missed_assignments` (23:00), `cron_payment_block` (09:00),
`cron_installment_reminders` (09:00), `cron_monthly_close` (شهري),
`cron_kpi_calculation` (شهري), `cron_warn_inactive_students` (أسبوعي)

---

## 6. Business Flows (مختصرة)

1. **تسجيل طالب** → age_group → Entry Test → اختيار جروب → enrollment + capacity check + policy snapshot → دفعة + commission + ledger → notifications
2. **السيشن اليومية** → فتح → attendance + evaluations → قفل بعد 30د → close بعد 24س → compensations للغائبين → block عند انتهاء deadline
3. **المالية** → دفعة → ledger → installments → reminders → block → دفع → restore access
4. **ترقية** → إكمال 12 + Final Exam → promote → certificate PDF → next level أو awaiting_placement
5. **نقل الطالب** → groups / packages / branches (الأخير بموافقتين + Edge Function)
6. **تجميد جروب** → cascade → sessions frozen → compensations للكل

---

## 7. Frontend Patterns (نماذج جاهزة)

- **Route Guard:** `_authenticated.tsx` يستخدم `beforeLoad` لقراءة الـ role والـ branch
- **Query Pattern:** factory للـ keys + `useQuery` + `useMutation` + `invalidateQueries`
- **API Layer:** كل domain له `*.api.ts` يجمع supabase calls + rpc
- **Edge Function Call:** `supabase.functions.invoke(name, { body })`

---

## 8. Naming Conventions (إجبارية)

| النوع | النمط | مثال |
|---|---|---|
| DB table | snake_case plural | `group_enrollments` |
| DB column | snake_case | `enrolled_at` |
| Trigger | `trg_<verb>_<subject>` | `trg_snapshot_policies_on_enrollment` |
| RPC | `fn_<verb>_<subject>` | `fn_promote_student_to_next_level` |
| Cron | `cron_<purpose>` | `cron_lock_attendance` |
| Edge Function | kebab-case | `generate-certificate-pdf` |
| API file | `<domain>.api.ts` | `students.api.ts` |
| Query hook | `use<Entity><Action>` | `useStudentsQuery` |
| Mutation | `use<Action><Entity>Mutation` | `useEnrollStudentMutation` |
| Component | PascalCase | `StudentEnrollmentForm` |
| Schema | `<entity><Action>Schema` | `enrollmentCreateSchema` |
| Route | kebab-case | `student-profile.tsx` |
| Query key factory | `<entity>Keys` | `studentKeys` |

---

## 9. Anti-Spaghetti Rules (إجبارية)

1. Business logic في DB أو Edge Functions فقط
2. DB triggers للـ invariants الـ atomic
3. Policy snapshot per enrollment
4. Monthly locks للـ commission rates + KPI weights
5. Audit log أوتوماتيك (trigger)
6. Feature isolation عبر barrel فقط
7. Zod everywhere (input + output)
8. Max 200 سطر/component
9. Typed RPC wrappers في `lib/rpc.ts`
10. Soft delete (`deleted_at` + RLS filter)
11. ممنوع localStorage للـ business state
12. ممنوع optimistic updates للحركات المالية
13. ممنوع direct Supabase query من component
14. ممنوع hardcoded prices/limits → كلها في `system_policies`
15. ممنوع hardcoded strings → كلها i18n keys

---

## 10. Add New Feature Checklist (7 خطوات)

1. **DB First** — migration: tables + constraints + RLS + triggers + RPCs
2. **Types** — generate من Supabase + add to `features/<x>/types.ts`
3. **Schemas** — Zod في `features/<x>/schemas.ts`
4. **API Layer** — `lib/api/<x>.api.ts`
5. **Query Hooks** — `features/<x>/queries/`
6. **Components** — `features/<x>/components/` (max 200 سطر)
7. **Route + RLS Test** — أضف route + اختبر RLS من 3 roles مختلفة

---

## 11. Edge Cases Coverage (مغطاة)

### Student Lifecycle
- fully_banned + دفع reinstatement → counter reset
- تحويل لباقة أرخص/أغلى → refund أو فرق + snapshot
- نقل بين فروع + قسط مفتوح → treasury_transfer
- فشل Final Exam → إعادة بنفس snapshot
- نجاح بدون جروب next level → awaiting_placement
- compensations متعددة بـ deadlines منفصلة
- غياب عن compensation → جديدة (recursion محدودة)
- تغيير age_group بالعمر → enrollment الحالي يكمل

### Group & Session
- max capacity → DB-level rejection
- غياب المدرب → substitute flow
- مفيش substitute → السيشن تتأجل + compensations للكل
- Admin override بعد قفل attendance → audit log
- مرور 24س → auto close + absent

### Financial
- مبلغ غلط → refund entry (لا حذف) + audit
- Sales غير في نص الشهر → snapshot يحمي
- Sales استقال → عمولاته تتدفع + assignments تنقل الشهر الجاي
- Installment + نقل فرع → ينتقل مع الطالب
- Treasury سالب → CHECK constraint

### Access & Security
- Reception يحاول فرع تاني → RLS
- Trainer يحاول طالب مش في جروبه → RLS
- Student يحاول محتوى أعلى → RLS
- Race condition على آخر مكان → DB capacity check

---

## 12. Phase Plan

| Phase | المحتوى | المدة |
|---|---|---|
| **0** Foundation | Lovable Cloud + Auth + i18n + RTL + Layer 0 + RLS + 7-role routing | 2-3 أيام |
| **1** Curriculum | Layer 1 + Admin UI (packages, levels, sessions, content, entry test) | 4-5 أيام |
| **2** Operations | Layer 2 + lifecycle triggers + RPCs + Trainer/Reception portals + Compensation + Group freeze | 7-10 أيام |
| **3** Financial | Layer 3 + financial triggers + Payments + Installments + Expenses + Commissions + Sales dashboard | 5-7 أيام |
| **4** Evaluation & Portals | Evaluations + Final Exam + Quiz/Assignment + Student/Parent + Certificates | 5-7 أيام |
| **5** Staff & KPIs | Layer 4 + cron jobs + Substitutions + Warnings + Notifications + Email | 5-7 أيام |
| **6** Dashboards & Polish | Multi-role dashboards + Reports + Audit viewer + Mobile + Indexes | 3-5 أيام |

---

## 13. الخطوة التالية

**Phase 0 — Foundation:**
1. تفعيل Lovable Cloud (Supabase)
2. شغّل migration: Layer 0 tables + RLS + auth helpers
3. Setup i18n (ar/en) + RTL
4. Login + role-based redirect للـ 7 roles

موافق نبدأ Phase 0؟
