# Kojo Academy — خطة البناء الشاملة

أكاديمية تعليمية متعددة الفروع (Multi-branch) بنظام هجين (أونلاين + أوفلاين)، مبنية على TanStack Start + Lovable Cloud (Supabase). الـ Schema يُبنى **كامل من البداية** للـ 4 طبقات، والـ UI يُبنى **تدريجياً** على Phases.

---

## 1. القرارات المتفق عليها

| البند | القرار |
|---|---|
| Scope | Schema كامل (4 طبقات) + UI تدريجي |
| Online vs Offline | الاتنين بالتوازي |
| Payments | يدوي الآن، Gateway لاحقاً |
| Notifications | In-app + Email فقط |
| Language | عربي + إنجليزي (i18n + RTL/LTR) |
| Parent ↔ Students | Many-to-many |
| Entry Test | بنك أسئلة يديره الأدمن (Adaptive MCQ) |
| Currency | EGP، أسعار مبدئية في seed قابلة للتعديل |

---

## 2. النقاط اللي محتاج نتفق عليها قبل البدء

### 2.1 نقاط جوهرية (لازم نحسمها)

1. **مفهوم "الفرع" (Branch):**
   - فرع جغرافي واحد له خزن وموظفين خاصين به فقط؟
   - أم Super Admin يقدر ينقل طالب بين فروع؟ (يفتح سيناريوهات معقدة في المالية)
   - **اقتراحي:** الطالب ينتمي لفرع واحد، النقل يحتاج "Transfer Request" منفصل.

2. **العمولة (Commission):**
   - الـ doc بيقول "عمولة مرة واحدة عند أول دفعة مؤكدة". مين بياخدها؟ Receptionist اللي سجّل؟ أم الكل؟
   - النسبة configurable لكل دور أم ثابتة؟

3. **السيشن التعويضية:**
   - الطالب الغايب يقدر يحضر مع جروب تاني نفس المستوى؟ أم Private session مع المدرب فقط؟
   - لو حضر مع جروب تاني، الـ attendance يتسجل في الجروبين أم في واحد بس؟
   - **اقتراحي:** الاتنين متاحين — الـ Receptionist يختار.

4. **منع الطالب من السيشن الجاية:**
   - "لو ما اخدش تعويضية → يُمنع من الجاية" — المنع automatic بـ trigger ولا الـ Receptionist يقرر؟
   - الطالب الممنوع لسه بيدفع؟ السيشن بتتعد عليه؟

5. **Trainer Substitution:**
   - لما المدرب يطلب إجازة، النظام بيقترح بديل أوتوماتيك (بناءً على availability + level) ولا الأدمن يختار يدوي؟

6. **KPIs:**
   - الحساب الشهري بـ pg_cron — لو الـ weights اتغيرت في نص الشهر، الـ KPI للشهر ده يتحسب بالقديمة ولا الجديدة؟
   - **اقتراحي:** snapshot للـ weights في `kpi_snapshots` عند بداية كل شهر.

7. **System Policies التاريخية:**
   - "السياسات الجديدة مالهاش تأثير رجعي" — يعني نخزن `valid_from`/`valid_to` لكل policy ونرجع للقديمة لو الحدث قديم؟
   - **اقتراحي:** `policy_versions` table + كل حدث مرتبط بـ `policy_version_id`.

### 2.2 نقاط تشغيلية

8. **حذف البيانات:** Soft delete (`deleted_at`) لكل الجداول الأساسية ولا Hard delete؟ **اقتراحي:** Soft للطلاب/الموظفين/الجروبات، Hard للـ logs.
9. **Audit Trail:** هل نسجل كل تعديل (مين عدّل/إمتى/إيه القيمة القديمة)؟ مهم للماليات. **اقتراحي:** نعم، جدول `audit_logs` عام.
10. **Files:** صور الطلاب، شهادات، فواتير PDF → Lovable Cloud Storage (buckets منفصلة بـ RLS).
11. **Certificates:** نولّدها PDF أوتوماتيك عند تخرج الطالب؟ Template موحد؟
12. **Online content (فيديوهات/سلايدات):** نرفعها على Storage مباشرة ولا CDN خارجي (Vimeo/Bunny)؟ **اقتراحي:** Storage + signed URLs مع expiry قصير لمنع التحميل.

---

## 3. الـ Architecture المقترح

### 3.1 الـ Stack

- **Frontend:** TanStack Start + React 19 + Tailwind v4 + shadcn
- **Backend:** Lovable Cloud (Supabase Postgres + Auth + Storage + pg_cron)
- **Server Logic:** TanStack `createServerFn` (للـ business logic) + `requireSupabaseAuth`
- **DB Logic:** Triggers + RPC functions (للـ enforcement اللي لازم يكون atomic على مستوى DB)
- **i18n:** `react-i18next` + dir auto-switch (RTL/LTR)
- **State:** TanStack Query + Zustand لو احتجنا global UI state
- **Forms:** react-hook-form + zod

### 3.2 الـ Folder Structure

```text
src/
  routes/
    _public/          (login, signup, landing)
    _authenticated/
      _admin/         (super-admin + branch-admin)
      _reception/
      _trainer/
      _student/
      _parent/
  features/           (business domain modules)
    curriculum/       (levels, sessions, content)
    operations/       (groups, attendance, evaluations, compensation)
    financial/        (treasuries, payments, installments, expenses, commissions)
    staff/            (employees, schedules, leaves, kpis)
    notifications/
    entry-test/
    certificates/
  integrations/supabase/
  lib/
    *.functions.ts    (server functions per domain)
    *.server.ts       (server-only helpers)
  components/ui/      (shadcn)
  components/shared/  (date-rtl, currency, etc.)
  hooks/
  i18n/
```

**قاعدة ذهبية لمنع الـ spaghetti:** كل feature = folder مستقل، له `components/`, `hooks/`, `queries/`, `types.ts`, `schemas.ts` (zod). الـ cross-feature imports ممنوعة إلا عبر `lib/` أو `features/<x>/index.ts` المُصدّر.

### 3.3 الـ DB Schema (نظرة عامة — ~37 جدول)

**Curriculum Layer (ثابت):**
- `branches`, `age_groups`, `packages`, `levels`, `level_sessions` (12 لكل مستوى)
- `session_content` (slides/video URLs حسب الباقة), `assignments`, `quizzes`, `quiz_questions`

**Operations Layer (متغير يومياً):**
- `groups` (level + age_group + package + trainer + branch)
- `group_sessions` (instance من level_session لجروب معين في تاريخ معين)
- `group_enrollments` (student ↔ group)
- `attendance` (student × group_session × status)
- `evaluations` (7 معايير لكل طالب لكل سيشن)
- `compensation_requests`, `compensation_sessions`
- `assignment_submissions`, `quiz_attempts`

**Financial Layer:**
- `treasuries` (3 لكل فرع: main, salaries, expenses)
- `payments` (دفعات الطلاب)
- `installments` (تقسيط)
- `expenses` (مصروفات الفرع)
- `commissions` (عمولات الموظفين)
- `treasury_transactions` (ledger لكل حركة)

**Staff Layer:**
- `staff` (موظفين/مدربين بمعلومات HR)
- `staff_schedules` (ساعات عمل المدرب)
- `leave_requests`, `substitutions`
- `kpi_definitions`, `kpi_snapshots` (شهري)
- `warnings` (إنذارات)

**Cross-cutting:**
- `profiles` (مرتبط بـ auth.users) + `user_roles` (separate table — أمان)
- `parent_student_links` (M2M)
- `students` (بيانات الطالب التفصيلية)
- `system_policies` + `policy_versions`
- `entry_test_questions` + `entry_test_attempts`
- `notifications` + `notification_preferences`
- `audit_logs`
- `certificates`

### 3.4 الأمان (RLS) — قاعدة صارمة

كل جدول له `branch_id` + RLS policy. الـ roles في جدول منفصل `user_roles` + `has_role()` security definer function (كما هو موضح في system prompt). 

- **Super Admin:** يقرأ/يكتب كل الفروع
- **Branch Admin/Reception/Trainer:** يقرأ/يكتب جدوله فقط داخل فرعه
- **Trainer:** يقرأ جروباته فقط
- **Student/Parent:** يقرأ بياناته/ابنه فقط

كل server function حساسة (مالية، تعديل سياسات، حذف) تمر بـ `requireSupabaseAuth` + role check إضافي.

### 3.5 الـ Background Jobs (pg_cron)

| Job | الوقت | الوظيفة |
|---|---|---|
| `daily-attendance-check` | كل يوم 23:00 | مين غاب → notification + check حظر |
| `compensation-deadline-check` | كل ساعة | الـ deadline للتعويضات |
| `monthly-kpis` | أول كل شهر | حساب KPIs لكل موظف |
| `installment-reminders` | يومياً | تذكير الأقساط المستحقة |
| `certificate-issuance` | عند تخرج الطالب | (trigger مش cron) |

---

## 4. خطة التنفيذ على Phases

### Phase 0 — Foundation (الأساس)
- Lovable Cloud + Auth (email/password + Google)
- i18n setup (ar/en + RTL)
- Design system (tokens في `styles.css` بطابع Kojo)
- Folder structure + routing skeleton (`_authenticated/_admin`, `_reception`, إلخ)
- جداول الأساس: `profiles`, `user_roles`, `branches`, `age_groups`, `system_policies`, `audit_logs`
- RLS + `has_role()` function
- Login/Logout + role-based redirect

### Phase 1 — Curriculum Layer (DB كامل + UI Admin بس)
- كل جداول الـ Curriculum + RLS
- Admin UI: Levels CRUD, Sessions CRUD, Content upload (slides/videos)
- Packages management
- Entry test question bank

### Phase 2 — Student Onboarding + Operations Core
- Students + Parents + many-to-many link
- Entry test (Adaptive flow)
- Groups + Enrollments
- Group Sessions scheduling
- Attendance (Trainer + Reception)
- Compensation flow
- Trainer portal (يشوف جروباته + يسجل حضور + يقيم)

### Phase 3 — Financial Layer
- Treasuries + Transactions ledger
- Payments (cash/visa/transfer manual)
- Installments + reminders
- Expenses
- Commissions (auto-trigger على أول دفعة)
- Reception portal للماليات
- Financial reports للأدمن

### Phase 4 — Evaluation & Online Content
- Per-session evaluations (7 criteria)
- Final Exam + Classwork weighted score
- Quizzes + Assignments + Submissions
- Student portal (يشوف محتوى الباقة + يقدم واجبات + يحل كويزات)
- Parent portal (يتابع)
- Certificates auto-generation

### Phase 5 — Staff & KPIs & Notifications
- Staff management + schedules
- Leave requests + Substitution flow
- KPI definitions + monthly snapshots (pg_cron)
- Warnings system
- In-app notifications + Email (عبر Lovable Email)
- جميع الـ pg_cron jobs

### Phase 6 — Polish
- Dashboards (Admin/Branch/Reception)
- Reports & exports
- Audit log viewer
- Mobile optimization
- Performance tuning

---

## 5. مبادئ لمنع الـ Spaghetti Code

1. **Server-first business logic:** أي قاعدة بزنس (validation, calculation, money) في `createServerFn` أو DB trigger — **مفيش** business logic في components.
2. **Single source of truth للسياسات:** كل rule مالي/تشغيلي في `system_policies` + helper functions، مش hardcoded.
3. **Zod everywhere:** كل input من user → zod schema. كل response من server → typed.
4. **DB constraints قوية:** FKs, CHECK constraints, unique indexes — مش بس application-level.
5. **Triggers للـ invariants:** أي قاعدة "لازم" تكون صحيحة دائماً → DB trigger (مش `useEffect`).
6. **No god-components:** أقصى 200 سطر للـ component. أي حاجة أكتر تتقسم.
7. **Feature isolation:** ممنوع `features/curriculum` يـ import من `features/financial` مباشرة. التواصل عبر server functions أو shared types.
8. **Versioning للقرارات الحساسة:** Policies + KPI weights + Prices → كلها versioned مع `valid_from`.

---

## 6. التقديرات الزمنية (تقريبية)

| Phase | المدة المقدّرة |
|---|---|
| Phase 0 | 2-3 أيام |
| Phase 1 | 4-5 أيام |
| Phase 2 | 7-10 أيام |
| Phase 3 | 5-7 أيام |
| Phase 4 | 5-7 أيام |
| Phase 5 | 5-7 أيام |
| Phase 6 | 3-5 أيام |

**الإجمالي:** ~5-7 أسابيع لو شغل مستمر بدون توقف.

---

## 7. الخطوة التالية

لو موافق على الـ plan ده، نبدأ بـ **Phase 0** فوراً:
1. تفعيل Lovable Cloud
2. Setup الـ Auth + i18n + Design system
3. إنشاء جداول الأساس (branches, profiles, user_roles, system_policies) مع RLS

لكن **قبل ما نبدأ**، محتاج إجاباتك على الـ 12 نقطة في القسم 2 (أو موافقة على اقتراحاتي فيها) عشان الـ schema يطلع صح من المرة الأولى.
