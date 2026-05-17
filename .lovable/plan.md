# Kojo Academy — خطة البناء الشاملة (v3 - Final)

أكاديمية تعليمية متعددة الفروع، نظام هجين (أونلاين + أوفلاين)، مبنية على **TanStack Start + Lovable Cloud (Supabase)**. الـ Schema بالكامل من البداية، الـ UI تدريجياً على 7 Phases.

---

## 1. القرارات النهائية المؤكدة

| البند | القرار |
|---|---|
| Stack | TanStack Start (React 19 + TS + SSR) |
| Scope | DB Schema كامل (4 طبقات) + UI تدريجي |
| Online vs Offline | الاتنين بالتوازي |
| Payments | يدوي (cash/visa/transfer) — Gateway لاحقاً |
| Notifications | In-app + Email |
| Language | عربي + إنجليزي (i18n + RTL/LTR) |
| Parent ↔ Students | Many-to-many |
| Entry Test | بنك أسئلة Adaptive per age_group |
| Currency | EGP — أسعار seed قابلة للتعديل |
| **Sales** | **Role منفصل** — له dashboard وعمولة مستقلة عن Receptionist |
| نقل الطالب بين فروع | Transfer Request رسمي يوافق عليه Admin |
| **Transfer Fees** | **مجاناً** — لو فيه فرق سعر باقة، يدفع الفرق فقط |
| التعويضية | جروب تاني أو Private — Receptionist يختار |
| **Compensation Pricing** | **مجاناً للطالب** — الأكاديمية تدفع للمدرب من المصاريف |
| منع الطالب | Auto DB trigger، متسلسل، fee للرجوع بعد تخطي حد الغيابات |
| العمولة | Sales فقط — monthly snapshot — Admin/Reception يعينها |
| Sales Target | per package (عدد طلاب) — يدخل KPIs |
| KPI Weights | monthly snapshot |
| Policies | per-student snapshot عند بداية كل level |
| Soft Delete | Students + Staff + Groups + Packages + Levels. Hard delete للـ logs/attendance |
| Files | فيديوهات/سلايدات = URLs خارجية (Vimeo/YouTube unlisted/Drive). PDFs = Lovable Storage |
| Trainer Substitution | النظام يقترح + Admin/Reception يختار |
| Certificates | HTML template + PDF auto-gen عند Final Exam pass |
| **Group Capacity** | **per package**: Squad 6-8، Core 2-3، X = 1. الـ exact value يحدده Super Admin |
| **Reinstatement Fee** | يحدده Super Admin من system_policies (مبلغ ثابت أو نسبة من الباقة) |

---

## 2. الـ Architecture

### 2.1 Stack
- **Frontend:** TanStack Start + React 19 + Tailwind v4 + shadcn
- **Backend:** Lovable Cloud (Supabase Postgres + Auth + Storage + pg_cron)
- **Server Logic:** `createServerFn` + `requireSupabaseAuth` middleware
- **DB Logic:** Triggers + RPC functions للـ atomic invariants
- **i18n:** `react-i18next` + auto RTL/LTR
- **State:** TanStack Query + Zustand للـ global UI فقط
- **Forms:** react-hook-form + zod
- **PDF:** `@react-pdf/renderer` للشهادات

### 2.2 Folder Structure
```text
src/
  routes/
    _public/              login, signup, landing
    _authenticated/
      _admin/             super-admin + branch-admin
      _reception/
      _sales/             Sales dashboard مستقل
      _trainer/
      _student/
      _parent/
    api/public/           webhooks
  features/               business domains (معزولة)
    curriculum/           levels, sessions, content, packages
    students/             onboarding, profiles, transfers
    operations/           groups, attendance, evaluations, compensation, blocks
    financial/            treasuries, payments, installments, expenses, commissions
    staff/                employees, schedules, leaves, substitutions, kpis, warnings
    entry-test/           bank, attempts, adaptive logic
    notifications/        in-app + email
    certificates/         template + generation
  integrations/supabase/
  lib/
    *.functions.ts        server functions per domain
    *.server.ts           server-only helpers
    rpc.ts                typed wrappers للـ DB functions
  components/ui/          shadcn
  components/shared/      date-rtl, currency, money-input, status-badge
  hooks/
  i18n/                   ar.json + en.json
```

**قاعدة anti-spaghetti:** كل feature folder له `components/ hooks/ queries/ schemas.ts types.ts index.ts`. Cross-feature **فقط** عبر server functions أو `features/<x>/index.ts` exports.

### 2.3 DB Schema (~42 جدول، 4 طبقات)

**Layer 0 — Identity & Config:**
`branches`, `profiles`, `user_roles`, `parent_student_links`, `students`, `age_groups`, `system_policies`, `policy_snapshots`, `audit_logs`, `notifications`, `notification_preferences`

**Layer 1 — Curriculum:**
`packages` (مع `min_capacity`/`max_capacity`)، `levels`, `level_sessions` (12/level)، `session_content`، `assignments`، `quizzes`, `quiz_questions`, `entry_test_questions`

**Layer 2 — Operations:**
`groups`، `group_sessions`، `group_enrollments`، `attendance`، `evaluations` (7 معايير)، `student_blocks`، `compensation_requests`، `compensation_sessions`، `assignment_submissions`، `quiz_attempts`، `entry_test_attempts`، `transfer_requests`

**Layer 3 — Financial:**
`treasuries` (3/branch)، `treasury_transactions` (ledger)، `payments`، `installments`، `expenses`، `commission_rules` (monthly)، `commission_assignments`، `commissions`، `reinstatement_fees`

**Layer 4 — Staff & KPIs:**
`staff`، `staff_schedules`، `leave_requests`، `substitutions`، `kpi_definitions`، `kpi_weights_snapshots` (monthly)، `kpi_scores` (monthly)، `warnings`، `certificates`

### 2.4 الأمان (RLS)
- `user_roles` منفصل + `has_role(uid, role)` SECURITY DEFINER
- كل جدول له `branch_id` + RLS policy
- Super Admin: كل الفروع. Branch staff: فرعه فقط. Trainer: جروباته فقط. Student/Parent: بياناته فقط
- كل server function حساسة → `requireSupabaseAuth` + role check

---

## 3. DB Functions, Triggers, Validations & Cron Jobs

### 3.1 Triggers — Auto-enforcement (13 trigger)

**Lifecycle:**
| Trigger | الجدول | الوقت | الوظيفة |
|---|---|---|---|
| `trg_student_age_group` | `students` | BEFORE INSERT/UPDATE (DOB) | يحسب `age_group_id` تلقائي من تاريخ الميلاد |
| `trg_snapshot_policies_on_enrollment` | `group_enrollments` | AFTER INSERT | ينسخ السياسات السارية إلى `policy_snapshots` للطالب |
| `trg_create_group_sessions` | `groups` | AFTER INSERT | ينشئ 12 group_session على schedule الجروب |
| `trg_validate_group_capacity` | `group_enrollments` | BEFORE INSERT | يرفض الـ enrollment لو الجروب وصل max_capacity للباقة |
| `trg_validate_online_link` | `session_content` | BEFORE INSERT/UPDATE | يتحقق إن video_url شكل صحيح (Vimeo/YouTube/Drive whitelist) |

**Blocks & Access:**
| Trigger | الجدول | الوقت | الوظيفة |
|---|---|---|---|
| `trg_auto_block_on_missed_compensation` | `compensation_requests` | AFTER UPDATE (expired) | منع الطالب من السيشن التالية + يفتح compensation لها |
| `trg_full_ban_on_threshold` | `attendance` | AFTER INSERT | غيابات > حد السياسة → fully_banned + reinstatement_fee |
| `trg_restore_access_on_installment_paid` | `payments` | AFTER INSERT | لو payment_blocked → status = active |
| `trg_cascade_group_freeze` | `groups` | AFTER UPDATE (status=frozen) | يجمد كل group_sessions القادمة + ينشئ compensations لكل المسجلين + notification |

**Assignments & Quizzes:**
| Trigger | الجدول | الوقت | الوظيفة |
|---|---|---|---|
| `trg_set_quiz_deadline` | `quiz_attempts` | BEFORE INSERT | يحدد deadline من إعدادات الكويز (مثلاً 48 ساعة بعد السيشن) |
| `trg_auto_grade_quiz` | `quiz_attempts` | AFTER UPDATE (submitted) | يصحح الأسئلة auto (MCQ/True-False) ويحسب score |
| `trg_update_missed_hw_counters` | `assignment_submissions` | AFTER deadline (via cron) | يزود عداد الـ missed_homework للطالب → يدخل في KPI الطالب |

**Financial & Audit:**
| Trigger | الجدول | الوقت | الوظيفة |
|---|---|---|---|
| `trg_commission_on_first_payment` | `payments` | AFTER INSERT | أول دفعة → commission للسيلز بالـ snapshot rate |
| `trg_treasury_ledger` | `payments`, `expenses`, `commissions`, `reinstatement_fees` | AFTER INSERT/UPDATE | entry في `treasury_transactions` (double-entry) |
| `trg_audit_log` | جداول حساسة | AFTER * | يكتب في `audit_logs` |

### 3.2 RPC Functions

| RPC | الوصف |
|---|---|
| `fn_promote_student_to_next_level(student_id)` | بعد نجاح Final Exam → enrollment تلقائي في level التالي |
| `fn_request_recovery(student_id)` | fully_banned → يولّد reinstatement_fee + ينتظر دفع |
| `fn_transfer_student_between_groups(student_id, from, to, reason)` | يحفظ progress + history |
| `fn_transfer_student_between_packages(student_id, new_package_id)` | يحسب الفرق + يفتح المحتوى الجديد |
| `fn_transfer_student_between_branches(student_id, target_branch, target_group)` | بعد موافقتين |
| `fn_suggest_substitute_trainers(group_session_id)` | list من المدربين المتاحين |
| `fn_assign_substitute(group_session_id, trainer_id)` | يطبق البديل + notification |
| `fn_calculate_compensation_options(student_id, missed_session_id)` | جروبات متاحة + slots للـ private (الاتنين مجاناً) |
| `fn_close_monthly_period(branch_id, month)` | snapshot rates + weights + يحسب KPIs |
| `fn_generate_certificate(student_id, level_id)` | PDF من template + يخزنه |

### 3.3 pg_cron Jobs (10)

| Job | الوقت | الوظيفة |
|---|---|---|
| `cron_lock_attendance` | كل 30 دقيقة | بعد بداية السيشن بـ 30 دقيقة → قفل تعديل الـ attendance (لمنع التلاعب) |
| `cron_auto_close_sessions` | كل ساعة | السيشنات اللي عدى عليها 24 ساعة بدون close → close تلقائي + كل من لم يسجل = absent |
| `cron_daily_attendance_check` | 23:00 يومياً | غيابات اليوم → compensation_requests |
| `cron_compensation_deadlines` | كل ساعة | expired compensations → fire block trigger |
| `cron_check_missed_assignments` | 23:00 يومياً | assignments بعد deadline → update counters + notification |
| `cron_payment_block` | 09:00 يومياً | الأقساط overdue > N أيام → student.status = payment_blocked |
| `cron_installment_reminders` | 09:00 يومياً | تذكير قبل due_date بـ 3 أيام |
| `cron_monthly_close` | 00:01 أول كل شهر | `fn_close_monthly_period` لكل فرع |
| `cron_kpi_calculation` | 02:00 أول كل شهر | حساب KPI scores للشهر السابق |
| `cron_warn_inactive_students` | weekly | الطلاب بدون نشاط أونلاين > 7 أيام |

### 3.4 DB Validations (CHECK + Triggers)

- **Group capacity:** `trg_validate_group_capacity` يقرأ `packages.max_capacity` ويرفض enrollments فوق الحد
- **Online link format:** `trg_validate_online_link` يتحقق URL matches whitelist (Vimeo/YouTube/Drive)
- **CHECK constraints:** prices ≥ 0، capacities ≥ 1، dates منطقية (start < end)، evaluation scores 1-5
- **Unique indexes:** (student_id, group_session_id) في attendance + evaluations لمنع تكرار
- **FK ON DELETE:** RESTRICT للـ entities المالية، CASCADE للـ ephemeral data

---

## 4. الـ Business Flows الكاملة

### Flow 1: تسجيل طالب جديد
1. Reception/Parent يدخل بيانات الطالب → `trg_student_age_group` يحسب age_group من DOB
2. الطالب ياخد Entry Test adaptive
3. النتيجة → level مقترح
4. Reception يعرض الجروبات المتاحة (level + branch + age_group + لها capacity)
5. اختيار جروب + باقة → Enrollment → `trg_validate_group_capacity` يتحقق
6. `trg_snapshot_policies_on_enrollment` ينسخ السياسات
7. Reception يسجل دفعة → `trg_commission_on_first_payment` + `trg_treasury_ledger`
8. Notifications: للطالب/الولي/Trainer

**أدوار:** Reception (تنفيذ) — Sales (يستلم commission) — Trainer (notification) — Parent (credentials)

### Flow 2: السيشن اليومية
1. `trg_create_group_sessions` (وقت إنشاء الجروب) أنشأ 12 sessions
2. Trainer يفتح السيشن → يسجل attendance + evaluations (7 معايير)
3. **`cron_lock_attendance`** بعد 30 دقيقة → قفل التعديل
4. **`cron_auto_close_sessions`** بعد 24 ساعة → close + اعتبر الباقي absent
5. Absent → compensation_requests (pending)
6. لو لم يحجز compensation خلال X أيام → `trg_auto_block_on_missed_compensation` → منع من التالية + compensation جديد
7. غيابات > حد السياسة → `trg_full_ban_on_threshold` → reinstatement_fee
8. Reception يحجز compensation عبر `fn_calculate_compensation_options` (جروب تاني أو private — الاتنين مجاناً)

### Flow 3: تعويضات متعددة (Cascade Scenario)
- الطالب غاب السيشن 5
- لم يحجز compensation → بعد deadline → ممنوع من السيشن 6 + compensation تاني لـ السيشن 6 (الـ 5 لسه مفتوحة كمان)
- يبقى عنده 2 compensations مفتوحين
- ممكن يحجزهم في نفس اليوم (جروب مختلف أو private)
- لو تخطى total absences الحد → fully_banned
- **التتبع:** كل compensation_request له status (pending/scheduled/completed/expired) + parent_session_id

### Flow 4: المالية والأقساط
1. Reception يسجل دفعة → treasury_transactions
2. Installment plan → N records في installments
3. **`cron_installment_reminders`** قبل 3 أيام
4. **`cron_payment_block`** بعد overdue N أيام → payment_blocked
5. عند الدفع → `trg_restore_access_on_installment_paid`
6. Admin يدخل expenses (منها تعويض المدرب لـ private compensations)
7. أول دفعة → `trg_commission_on_first_payment`

### Flow 5: ترقية الطالب (Level Progression)
1. الطالب يكمل 12 sessions + Final Exam + Classwork
2. نجح → `fn_promote_student_to_next_level`:
   - يبحث عن جروب مناسب (next level + same age_group + same branch + capacity متاحة + schedule matching)
   - موجود: enrollment تلقائي + snapshot جديد
   - مش موجود: `awaiting_placement` + notification Reception
3. `fn_generate_certificate` → PDF

**فشل في Final:** يعيد الـ level (Reception يقرر same/new group). لو رفض → drop.

### Flow 6: نقل الطالب (Transfers — كلهم مجاناً)
- **بين جروبات:** Reception → `fn_transfer_student_between_groups` (يحفظ attendance + evaluations history)
- **بين باقات:** Reception → `fn_transfer_student_between_packages` (يحسب فرق السعر فقط — لو الجديد أغلى يدفع الفرق، لو أرخص refund/credit)
- **بين فروع:** transfer_request → موافقة Admin الحالي → موافقة Admin الجديد + target_group → `fn_transfer_student_between_branches` (ينقل كل الـ records + treasury_transfer لو فيه رصيد)

### Flow 7: استبدال المدرب
1. Trainer leave_request أو غياب طارئ
2. Reception/Admin يفتح group_session → `fn_suggest_substitute_trainers`
3. اختيار → `fn_assign_substitute` + notifications

### Flow 8: تجميد جروب كامل (Group Freeze)
- Admin يجمد جروب (مدرب مستقيل، عطلة، ...)
- `trg_cascade_group_freeze`:
  - كل group_sessions القادمة → status=frozen
  - كل المسجلين → compensation_requests لكل سيشن مجمدة
  - notifications للكل
  - Reception يحجز compensations أو يـ transfer الطلاب لجروبات تانية

### Flow 9: Online Content & Portals
- Admin يرفع video_url (whitelist) + slides (Storage) per session per package
- Student portal: المحتوى المتاح فقط لباقته + sessions حتى تاريخه
- Quizzes: `trg_set_quiz_deadline` + `trg_auto_grade_quiz`
- Assignments: deadline + `cron_check_missed_assignments` + `trg_update_missed_hw_counters`
- Trainer يصحح assignments من portal
- Parent portal: read-only

### Flow 10: Staff & KPIs
- Admin يعرّف KPIs per role + weights
- أول كل شهر: snapshot weights
- نهاية الشهر: `cron_kpi_calculation` → kpi_scores
- 3 warnings → notification super_admin

---

## 5. Roles Matrix الكامل

| Action | Super Admin | Branch Admin | Reception | Sales | Trainer | Student | Parent |
|---|---|---|---|---|---|---|---|
| إدارة فروع | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Packages/Levels/Content | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| System Policies + Capacities + Reinstatement Fee | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| إنشاء جروب | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| تجميد جروب | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Student Onboarding | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Entry Test (إدارة + حل) | ✅ | ✅ | ✅ | ❌ | ❌ | حل | ❌ |
| Enrollment | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| تسجيل دفعة | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Expenses | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Commission Rates (Admin يحدد، monthly lock) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| تعيين Sales لطالب | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Sales Dashboard (commissions/targets) | ✅ | ✅ | ❌ | ✅ (نفسه) | ❌ | ❌ | ❌ |
| Attendance | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Evaluation | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Compensation booking | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| اختيار Substitute | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Transfer (groups/packages) | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Transfer (branches — موافقة) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Final Exam + Quiz/Assignment grading | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Staff management + KPI | ✅ | ✅ (فرعه) | ❌ | ❌ | ❌ | ❌ | ❌ |
| Warnings | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| عرض المحتوى | — | — | — | — | — | ✅ (باقته) | ❌ |
| متابعة التقدم | ✅ | ✅ (فرعه) | ✅ (فرعه) | ✅ (طلابه) | ✅ (جروبه) | ✅ (نفسه) | ✅ (ابنه) |

---

## 6. Anti-Spaghetti Principles

1. كل business logic في server (createServerFn أو DB trigger) — never in components
2. DB triggers للـ invariants (blocks, commissions, ledger, capacity, age_group)
3. Policy snapshot per cycle — الطالب يكمل بقواعد بدايته
4. Monthly locks — commission rates + KPI weights مينفعش يتغيروا في نص الشهر
5. Audit log للحركات الحساسة
6. Feature isolation — cross-feature عبر server fn أو shared types فقط
7. Zod everywhere — كل input + output
8. No god-components (max 200 سطر)
9. RPC pattern — كل DB function لها typed wrapper في `lib/rpc.ts`
10. Soft delete للـ entities الأساسية، hard delete للـ ephemeral

---

## 7. خطة التنفيذ على Phases (5-7 أسابيع)

| Phase | المحتوى | المدة |
|---|---|---|
| **0 — Foundation** | Cloud + Auth + i18n + Design + Layer 0 + RLS + role-based routing | 2-3 أيام |
| **1 — Curriculum** | Layer 1 + Admin UI (Packages مع capacities، Levels، Content، Entry Test bank) | 4-5 أيام |
| **2 — Operations Core** | Layer 2 + كل lifecycle triggers + RPCs (transfers, substitutes) + Trainer/Reception portals + Compensation flow + Group freeze | 7-10 أيام |
| **3 — Financial** | Layer 3 + financial triggers + Payments + Installments + Expenses + Commissions + Reinstatement | 5-7 أيام |
| **4 — Evaluation & Portals** | Evaluations + Final Exam + Quiz/Assignment triggers + Student/Parent portals + Certificates PDF | 5-7 أيام |
| **5 — Staff, KPIs, Notifications, Cron** | Layer 4 + كل pg_cron jobs + Substitutions + Warnings + In-app + Email | 5-7 أيام |
| **6 — Dashboards & Polish** | Multi-role dashboards + Reports + Audit viewer + Mobile + Indexes | 3-5 أيام |

---

## 8. Architecture Contract — القواعد الإجبارية لأي Feature جديدة

دي العقد الثابت اللي **لازم** كل feature تتبعه. أي مخالفة = رفض في الـ code review. الهدف: أي مطور (أو AI) يقدر يضيف feature جديدة بدون ما يكسر اللي قبله.

### 8.1 The "Feature Folder Contract"
أي feature جديدة = folder تحت `src/features/<name>/` بالشكل ده **بالحرف**:

```text
features/<name>/
  index.ts              ← الواجهة الوحيدة المسموح بها للـ cross-feature imports (barrel export)
  types.ts              ← TypeScript types (مشتقة من DB types، لا تكرار)
  schemas.ts            ← Zod schemas (للـ inputs والـ outputs)
  queries/
    <entity>.queries.ts ← TanStack Query hooks (useXxxQuery, useXxxMutation)
  components/
    <Entity>List.tsx
    <Entity>Form.tsx
    <Entity>Card.tsx
  hooks/
    use-<entity>.ts     ← UI state hooks فقط، لا business logic
  routes/               ← (optional) لو الـ feature ليها صفحات خاصة
```

**ممنوع:**
- `features/a/` يـ import من `features/b/components/` أو `features/b/hooks/` مباشرة
- مسموح بس: `import { X } from "@/features/b"` (من الـ barrel)
- `features/<x>/index.ts` يصدر بس الـ types + الـ public components + الـ public hooks (مش الـ queries أو الـ schemas الداخلية)

### 8.2 The Data Flow Pattern (طبقات صارمة)

```text
┌─────────────────────────────────────────────┐
│ UI Component                                 │  ← لا business logic، لا direct DB
│   └─ uses TanStack Query hook                │
└─────────────────┬───────────────────────────┘
                  │ calls
┌─────────────────▼───────────────────────────┐
│ Query Hook (features/x/queries/...)          │  ← thin wrapper حول server function
│   useXxxQuery / useXxxMutation               │
└─────────────────┬───────────────────────────┘
                  │ calls via useServerFn
┌─────────────────▼───────────────────────────┐
│ Server Function (lib/x.functions.ts)         │  ← validation + authorization + business
│   .middleware([requireSupabaseAuth])         │
│   .inputValidator(zod)                       │
│   .handler(...)                              │
└─────────────────┬───────────────────────────┘
                  │ calls
┌─────────────────▼───────────────────────────┐
│ Server Helper (lib/x.server.ts) أو RPC       │  ← DB interaction، complex queries
│   - Supabase queries                         │
│   - rpc('fn_xxx', ...) للـ DB functions      │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│ Postgres (Tables + Triggers + RPCs)          │  ← invariants enforced هنا (last line)
│   - RLS policies                             │
│   - Triggers للقواعد الـ atomic               │
│   - SECURITY DEFINER functions               │
└─────────────────────────────────────────────┘
```

**القاعدة:** أي طبقة تتكلم **بس** مع اللي تحتها مباشرة. لا UI يكلم Supabase. لا hook يحط business logic.

### 8.3 The "Add New Feature" Checklist (7 خطوات ثابتة)

أي feature جديدة تتبني بالترتيب ده **بدون تخطي**:

1. **DB First:** أكتب migration → tables + constraints + RLS + triggers + RPCs (لو فيه atomic logic)
2. **Types:** ولّد types من Supabase + ضيف الـ domain types في `features/<x>/types.ts`
3. **Schemas:** Zod schemas في `features/<x>/schemas.ts` (input + output validation)
4. **Server functions:** في `lib/<x>.functions.ts` مع `requireSupabaseAuth` + role check
5. **Query hooks:** في `features/<x>/queries/` (useQuery للقراءة، useMutation للكتابة + invalidation)
6. **Components:** في `features/<x>/components/` (max 200 سطر/component)
7. **Route + RLS test:** أضف الـ route تحت الـ role layer الصحيح + اختبر RLS من 3 roles مختلفة

### 8.4 Naming Conventions (إجبارية)

| النوع | النمط | مثال |
|---|---|---|
| DB table | snake_case plural | `group_enrollments` |
| DB column | snake_case | `enrolled_at` |
| DB trigger | `trg_<verb>_<subject>` | `trg_snapshot_policies_on_enrollment` |
| DB function (RPC) | `fn_<verb>_<subject>` | `fn_promote_student_to_next_level` |
| pg_cron job | `cron_<purpose>` | `cron_lock_attendance` |
| Server function | camelCase verb | `enrollStudent`, `transferStudent` |
| Server fn file | `<domain>.functions.ts` | `enrollment.functions.ts` |
| Query hook | `use<Entity><Action>` | `useEnrollmentsQuery` |
| Component | PascalCase | `EnrollmentForm` |
| Zod schema | `<entity><Action>Schema` | `enrollmentCreateSchema` |
| Type | PascalCase | `Enrollment`, `EnrollmentInput` |

### 8.5 Shared Building Blocks (مكان واحد، استخدام كل مكان)

| الحاجة | المكان | الاستخدام |
|---|---|---|
| Money formatting | `components/shared/Money.tsx` | كل عرض لمبلغ EGP |
| Date display (RTL/LTR) | `components/shared/DateDisplay.tsx` | كل تاريخ |
| Status badge | `components/shared/StatusBadge.tsx` | enum statuses (active, blocked, ...) |
| Role guard | `components/shared/RoleGate.tsx` | إخفاء UI حسب الـ role |
| Branch selector | `components/shared/BranchSelector.tsx` | Super Admin بس |
| Confirm dialog | `components/shared/ConfirmDialog.tsx` | كل destructive action |
| i18n key resolver | `lib/i18n.ts` + `i18n/{ar,en}.json` | لا hardcoded strings في components |
| Currency input | `components/shared/MoneyInput.tsx` | كل form فيه مبلغ |
| Audit log writer | DB trigger (مش manual) | أوتوماتيك |

### 8.6 Forbidden Patterns (مرفوض كلياً)

- ❌ Business logic في `useEffect` (استخدم server function + mutation)
- ❌ `localStorage` للـ business state (Supabase أو TanStack Query فقط)
- ❌ Direct Supabase query من component (لازم تمر بـ server function)
- ❌ Hardcoded prices/limits/policies (كلها في `system_policies` table)
- ❌ Hardcoded strings (كلها i18n keys)
- ❌ `any` في TypeScript (use `unknown` + zod parse)
- ❌ Duplicate types (مشتق من Supabase generated types)
- ❌ Cross-feature import من غير الـ barrel
- ❌ Optimistic updates للحركات المالية
- ❌ تعديل state بدون audit log في الجداول الحساسة

### 8.7 Versioning & Migrations Discipline

- كل DB change = migration جديدة (مفيش تعديل migration قديمة)
- كل migration واضحة: `YYYYMMDDHHMMSS_<verb>_<subject>.sql`
- Schema changes كبيرة → script للـ data backfill في نفس migration
- إضافة عمود جديد → default value + NOT NULL في خطوتين (لو فيه data)

---

## 9. Edge Cases & Scenarios Coverage Audit

كل سيناريو نادر اتفكر فيه وله handling واضح في الـ schema/triggers/UI:

### 9.1 Student Lifecycle Edge Cases
| سيناريو | الـ Handling |
|---|---|
| طالب فقد كل compensation الـ pending وعدّى limit الغيابات | `trg_full_ban_on_threshold` → fully_banned + reinstatement_fee مطلوب |
| طالب fully_banned ودفع الـ reinstatement | status → active + الـ ban counter reset للسياسة الجديدة |
| طالب fully_banned ورفض يدفع | يفضل في الـ status ده، الجروب يكمل بدونه، Reception يقدر يـ drop |
| طالب حول لباقة أرخص في نص الـ level | Refund/credit للفرق، المحتوى المتاح يتعدل، الـ snapshot يفضل زي ما هو لباقي الـ level |
| طالب حول لباقة أغلى | يدفع الفرق فوراً قبل ما يفتح المحتوى الجديد |
| طالب نقل بين فروع وعليه قسط في الفرع القديم | `treasury_transfer` ينقل الرصيد + الـ installments المتبقية تتحول للفرع الجديد |
| طالب فشل في Final Exam | يعيد الـ level بنفس السياسة (snapshot موجود) أو drop |
| طالب نجح بس مفيش جروب next level متاح | `awaiting_placement` queue + notification + يقدر يستفاد من online content للـ level التالي بمجرد الـ enroll |
| طالب عنده 2 compensations مفتوحة في نفس الوقت | كل واحدة لها deadline منفصل، يقدر يحجز الاتنين في يومين مختلفين |
| Compensation حصلت ثم الطالب غاب عنها برضو | تتحسب absent تاني + compensation جديدة (recursion محدودة بحد الغيابات) |
| طالب سن انتقل لـ age_group جديد | `trg_student_age_group` يحدث الـ age_group، بس enrollment الحالي يكمل (snapshot يحمي)؛ next enrollment يتم في الـ age_group الجديد |
| Parent عنده 3 أبناء، كل واحد في فرع مختلف | parent_student_links M2M يدعم، Parent portal يعرض الـ 3 بفلاتر |

### 9.2 Group & Session Edge Cases
| سيناريو | الـ Handling |
|---|---|
| جروب وصل max capacity والـ Reception لسه بيحاول يسجل | `trg_validate_group_capacity` يرفض على مستوى DB (race-condition safe) |
| المدرب غاب يوم السيشن بدون إخطار | Admin/Reception يفتح substitute flow → `fn_assign_substitute` |
| Substitute مفيش (مفيش مدرب متاح) | السيشن تتأجل → Admin يجمد السيشن دي → كل المسجلين compensation_requests |
| المدرب استقال في نص الـ level | كل جروباته تتجمد → `trg_cascade_group_freeze` → compensations للكل + Reception يحجز بدلاء |
| الجروب اتجمد بالكامل | الطلاب يقدروا يـ transfer لجروبات تانية في نفس الـ level (مجاناً) |
| السيشن online والـ link مكسور | `trg_validate_online_link` يمنع save في الأساس + Trainer يقدر يحدثه قبل السيشن |
| Trainer سجل attendance ثم اكتشف غلط بعد قفل التعديل (30 دقيقة) | يطلب من Admin → Admin يفتح override (audit log) |
| السيشن مرت 24 ساعة بدون close | `cron_auto_close_sessions` يقفلها + يعتبر الباقي absent |

### 9.3 Financial Edge Cases
| سيناريو | الـ Handling |
|---|---|
| Reception سجل دفعة بمبلغ غلط | يقدر يـ refund/adjust → entry جديد في treasury_transactions (لا حذف، لا تعديل) + audit log |
| طالب دفع cash والـ Reception نسي يسجل | لما يسجل بعدين، يحط التاريخ الصحيح، الـ trigger يعمل compensation/commission على أساسه |
| Sales غير في نص الشهر للطالب | `commission_assignments` بيقفل أول الشهر — العمولة بتروح للسيلز الأصلي للشهر الحالي، الجديد ياخدها من الشهر اللي بعده |
| Sales استقال في نص الشهر | عمولاته للشهر الحالي تتحسب وتدفع له، الـ assignments تتنقل لسيلز تاني للشهر الجاي |
| الـ commission rate اتغير في نص الشهر | الـ snapshot الشهري بيحمي — التغيير يطبق الشهر الجاي |
| طالب دفع الـ reinstatement ثم غاب تاني فوراً | الـ counter reset، بيبدأ من الصفر بالسياسة الحالية |
| Installment overdue ثم الطالب نقل لفرع تاني | الـ installment ينتقل، payment_blocked status ينتقل |
| Expense ليه أكثر من category | كل expense واحد له category واحد، نقسمه لـ 2 expenses لو لازم |
| Treasury عنده balance سالب | لا يحصل، DB CHECK constraint يمنع |

### 9.4 Policy & KPI Edge Cases
| سيناريو | الـ Handling |
|---|---|
| Admin غير سياسة الغيابات من 3 لـ 5 في نص العام | الطلاب القدام يفضلوا على 3 (snapshot)، الجداد ياخدوا 5 |
| KPI weight اتغير في نص الشهر | snapshot الشهري بيحمي، يطبق الشهر الجاي |
| Branch Admin عاوز يخالف سياسة super admin | الـ system_policies على مستوى super_admin فقط، Branch Admin يقدر يقترح بس |
| سياسة محذوفة ولها snapshots قديمة | الـ snapshots بتفضل (FK ON DELETE RESTRICT) |

### 9.5 Access & Security Edge Cases
| سيناريو | الـ Handling |
|---|---|
| Reception حاول يشوف فرع تاني | RLS يرفض، UI يخفي |
| Trainer حاول يعدل evaluation لطالب مش في جروبه | RLS يرفض |
| Student حاول يشوف محتوى باقة أعلى | RLS يفلتر بالـ enrollment + package |
| Parent حاول يشوف ابن مش لينك بيه | parent_student_links يفلتر |
| User حذف الـ role بتاعه بطريق الخطأ | super admin بس يقدر يعدل user_roles، Branch Admin محدود |
| Race condition: 2 receptions يحجزوا آخر مكان في جروب | DB-level capacity check + unique constraint يمنع |

### 9.6 Data Integrity Edge Cases
| سيناريو | الـ Handling |
|---|---|
| Soft-deleted student له دفعات | تفضل في treasury_transactions، historical reports تشتغل |
| Soft-deleted package وله enrollments active | الـ enrollments تكمل عادي، مفيش enrollments جديدة |
| Level محذوف soft وله certificates | الشهادات تفضل سارية |
| Audit log طول جداً | partitioning شهري + retention policy (سنة كاملة minimum) |

---

## 10. الخطوة التالية

موافق على الـ plan v3 + الـ Architecture Contract؟ نبدأ **Phase 0** فوراً:
1. تفعيل Lovable Cloud
2. Setup design tokens + i18n + RTL
3. بناء Layer 0 (branches, profiles, user_roles, age_groups, system_policies, audit_logs)
4. Login/Logout + role-based routing لكل الـ 7 roles

