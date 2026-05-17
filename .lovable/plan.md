# Kojo Academy — خطة البناء الشاملة

أكاديمية تعليمية متعددة الفروع (Multi-branch) بنظام هجين (أونلاين + أوفلاين)، مبنية على TanStack Start + Lovable Cloud (Supabase). الـ Schema يُبنى **كامل من البداية** للـ 4 طبقات، والـ UI يُبنى **تدريجياً** على Phases.

---

## 1. القرارات المؤكدة

| البند | القرار |
|---|---|
| Scope | Schema كامل (4 طبقات) + UI تدريجي على Phases |
| Online vs Offline | الاتنين بالتوازي |
| Payments | يدوي الآن (cash/visa/transfer)، Gateway لاحقاً |
| Notifications | In-app + Email فقط |
| Language | عربي + إنجليزي (i18n + RTL/LTR auto-switch) |
| Parent ↔ Students | Many-to-many |
| Entry Test | بنك أسئلة Adaptive يديره الأدمن، per age_group |
| Currency | EGP، أسعار مبدئية في seed قابلة للتعديل من Dashboard |
| **نقل الطالب بين فروع** | Transfer Request رسمي يوافق عليه Admin |
| **التعويضية** | جروب تاني (نفس level) أو Private — الـ Receptionist يختار |
| **منع الطالب** | Automatic بـ DB trigger. متسلسل: مش متعوض → منع من اللي بعدها، واللي اتمنع منها تتحسب تعويضية كمان. لو تخطى حد الغيابات → حرمان كامل (يحتاج fee للرجوع) |
| **العمولة** | للسيلز فقط. نسبة واحدة للفرع يحددها Admin. الـ Receptionist/Admin يعينها على شخص. **مقفولة في نص الشهر** (snapshot شهري) |
| **Sales Target** | لكل باقة (عدد طلاب) — يدخل في KPIs السيلز |
| **KPI Weights** | snapshot أول كل شهر — مينفعش تتغير في نص الشهر |
| **Policies** | snapshot لكل طالب عند بداية دورته (level enrollment). الطالب يكمل بالقواعد القديمة، التغييرات تطبق على الدورات الجديدة |
| **Soft delete** | مش أولوية → Hard delete + `audit_logs` للحركات المالية والتعديلات المهمة |
| **Files** | فيديوهات + سلايدات = URLs خارجية، PDFs على Lovable Storage |
| **Trainer Substitution** | النظام يقترح بدلاء (نفس level + متاح في الـ slot)، Admin أو Reception يختار |
| **Certificates** | PDF يتولد أوتوماتيك من template موحد عند نجاح الطالب في Final Exam |

---

## 2. الـ Architecture المقترح

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

## 4. مبادئ لمنع الـ Spaghetti Code

1. **Server-first business logic:** أي قاعدة بزنس (validation, calculation, money) في `createServerFn` أو DB trigger — **مفيش** business logic في components.
2. **Single source of truth للسياسات:** كل rule مالي/تشغيلي في `system_policies` + helper functions، مش hardcoded.
3. **Policy snapshot per cycle:** كل طالب عند بداية level بياخد snapshot من السياسات السارية. التغييرات الجديدة تطبق على enrollments جديدة فقط.
4. **Zod everywhere:** كل input من user → zod schema. كل response من server → typed.
5. **DB constraints قوية:** FKs, CHECK constraints, unique indexes — مش بس application-level.
6. **Triggers للـ invariants:** أي قاعدة "لازم" تكون صحيحة دائماً (منع الطالب، عمولة، خزن) → DB trigger.
7. **No god-components:** أقصى 200 سطر للـ component. أي حاجة أكتر تتقسم.
8. **Feature isolation:** ممنوع `features/curriculum` يـ import من `features/financial` مباشرة. التواصل عبر server functions أو shared types.
9. **Monthly locks:** Commission rates + KPI weights → snapshot شهري، مينفعش تتغير في نص الشهر.

---

## 5. التقديرات الزمنية (تقريبية)

| Phase | المحتوى | المدة |
|---|---|---|
| Phase 0 | Foundation (Auth, i18n, Design, جداول الأساس، RLS) | 2-3 أيام |
| Phase 1 | Curriculum Layer (DB كامل + Admin UI) | 4-5 أيام |
| Phase 2 | Students + Operations + Attendance + Compensation + Trainer Portal | 7-10 أيام |
| Phase 3 | Financial Layer (Treasuries, Payments, Installments, Commissions) | 5-7 أيام |
| Phase 4 | Evaluation + Online Content + Student/Parent Portals + Certificates | 5-7 أيام |
| Phase 5 | Staff + KPIs + Notifications + pg_cron Jobs | 5-7 أيام |
| Phase 6 | Dashboards + Reports + Polish | 3-5 أيام |

**الإجمالي:** ~5-7 أسابيع لو شغل مستمر.

---

## 6. الخطوة التالية

**Phase 0 — Foundation:**
1. تفعيل Lovable Cloud (Supabase + Auth + Storage)
2. Setup i18n (ar/en) + RTL/LTR auto-switch + Design tokens بطابع Kojo
3. Folder structure + Routing skeleton لكل الـ roles
4. إنشاء جداول الأساس: `branches`, `profiles`, `user_roles`, `age_groups`, `system_policies`, `policy_snapshots`, `audit_logs`
5. RLS + `has_role()` security definer function
6. صفحات Login/Logout + role-based redirect لكل dashboard

بعد ما تعتمد الـ plan، نبدأ Phase 0 على طول.

