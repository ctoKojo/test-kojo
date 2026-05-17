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

## 8. الخطوة التالية

موافق على الـ plan v3؟ → نبدأ **Phase 0** فوراً (تفعيل Cloud + بناء Layer 0).
