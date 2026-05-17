# Kojo Academy — خطة البناء الشاملة (v2)

أكاديمية تعليمية متعددة الفروع، نظام هجين (أونلاين + أوفلاين)، مبنية على **TanStack Start + Lovable Cloud (Supabase)**. الـ Schema بالكامل من البداية، الـ UI تدريجياً على 7 Phases.

---

## 1. القرارات النهائية المؤكدة

| البند | القرار |
|---|---|
| Stack | TanStack Start (React 19 + TS + SSR) — هو نفسه "React/TypeScript" في الوثيقة الأصلية، بس بـ server functions جاهزة |
| Scope | DB Schema كامل (4 طبقات) + UI تدريجي |
| Online vs Offline | الاتنين بالتوازي |
| Payments | يدوي (cash/visa/transfer) — Gateway في Phase لاحق |
| Notifications | In-app + Email |
| Language | عربي + إنجليزي (i18n + RTL/LTR) |
| Parent ↔ Students | Many-to-many |
| Entry Test | بنك أسئلة Adaptive يديره الأدمن per age_group |
| Currency | EGP — أسعار seed قابلة للتعديل |
| نقل الطالب بين فروع | Transfer Request رسمي يوافق عليه Admin (feature جديد) |
| التعويضية | جروب تاني أو Private — Receptionist يختار |
| منع الطالب | Auto DB trigger، متسلسل، fee للرجوع بعد تخطي حد الغيابات |
| العمولة | سيلز فقط — monthly snapshot — Admin/Reception يعينها |
| Sales Target | per package (عدد طلاب) — يدخل KPIs |
| KPI Weights | monthly snapshot |
| Policies | **per-student snapshot عند بداية كل level** — يكمل بالقواعد القديمة |
| Soft Delete | **Soft delete للـ Students + Staff + Groups + Packages + Levels** (للـ historical reports). Hard delete للـ logs/notifications/session attendance |
| Files | فيديوهات/سلايدات = URLs خارجية (Vimeo/YouTube unlisted/Drive). PDFs = Lovable Storage |
| Trainer Substitution | النظام يقترح + Admin/Reception يختار |
| Certificates | HTML template أساسي في Phase 4 + PDF auto-generation عند Final Exam pass |

---

## 2. الـ Architecture

### 2.1 Stack
- **Frontend:** TanStack Start + React 19 + Tailwind v4 + shadcn
- **Backend:** Lovable Cloud (Supabase Postgres + Auth + Storage + pg_cron)
- **Server Logic:** `createServerFn` + `requireSupabaseAuth` middleware
- **DB Logic:** Triggers + RPC functions للـ atomic invariants
- **i18n:** `react-i18next` + auto RTL/LTR
- **State:** TanStack Query + Zustand للـ global UI state فقط
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
      _trainer/
      _student/
      _parent/
    api/public/           webhooks (لو احتجنا)
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
    *.server.ts           server-only helpers (DB, internal)
    rpc.ts                typed RPC wrappers لـ supabase functions
  components/ui/          shadcn
  components/shared/      date-rtl, currency, money-input, status-badge
  hooks/
  i18n/                   ar.json + en.json
```

**قاعدة anti-spaghetti:** كل feature folder له `components/ hooks/ queries/ schemas.ts types.ts index.ts`. Cross-feature يحصل **فقط** عبر:
1. Server functions (RPC pattern)
2. Shared types في `features/<x>/index.ts`
3. ممنوع import مباشر من `features/a/internal/...` إلى `features/b/`

### 2.3 DB Schema (~40 جدول، 4 طبقات)

**Layer 0 — Identity & Config:**
`branches`, `profiles`, `user_roles`, `parent_student_links`, `students`, `age_groups`, `system_policies`, `policy_snapshots`, `audit_logs`, `notifications`, `notification_preferences`

**Layer 1 — Curriculum (ثابت يديره Admin):**
`packages`, `levels`, `level_sessions` (12 لكل level), `session_content`, `assignments`, `quizzes`, `quiz_questions`, `entry_test_questions`

**Layer 2 — Operations (متغير يومياً):**
`groups`, `group_sessions`, `group_enrollments`, `attendance`, `evaluations` (7 معايير), `student_blocks`, `compensation_requests`, `compensation_sessions`, `assignment_submissions`, `quiz_attempts`, `entry_test_attempts`, `transfer_requests` (branch + group + package)

**Layer 3 — Financial:**
`treasuries` (3/branch), `treasury_transactions` (ledger), `payments`, `installments`, `expenses`, `commission_rules` (monthly snapshot), `commission_assignments`, `commissions`, `reinstatement_fees`

**Layer 4 — Staff & KPIs:**
`staff`, `staff_schedules`, `leave_requests`, `substitutions`, `kpi_definitions`, `kpi_weights_snapshots` (monthly), `kpi_scores` (monthly), `warnings`, `certificates`

### 2.4 الأمان (RLS)
- `user_roles` منفصل + `has_role(uid, role)` SECURITY DEFINER
- كل جدول له `branch_id` + RLS policy
- Super Admin: كل الفروع. Branch staff: فرعه فقط. Trainer: جروباته فقط. Student/Parent: بياناته فقط
- كل server function حساسة (مالية، policies، حذف) → `requireSupabaseAuth` + explicit role check

---

## 3. DB Functions, Triggers & RPCs (الـ 7 gaps الحرجة + غيرها)

دي اللي بتضمن إن البزنس لوجيك atomic ومستحيل يتكسر من الـ UI.

### 3.1 Triggers (Auto-enforcement)

| Trigger | الجدول | الوقت | الوظيفة |
|---|---|---|---|
| `trg_snapshot_policies_on_enrollment` | `group_enrollments` | AFTER INSERT | ينسخ السياسات السارية إلى `policy_snapshots` للطالب لهذا الـ level |
| `trg_auto_block_on_missed_compensation` | `compensation_requests` | AFTER UPDATE (deadline expired) | يمنع الطالب من السيشن الجاية + يفتح compensation جديد لها |
| `trg_full_ban_on_threshold` | `attendance` | AFTER INSERT | لو غيابات تخطت حد السياسة → student.status = 'fully_banned' + ينشئ `reinstatement_fee` |
| `trg_restore_access_on_installment_paid` | `payments` | AFTER INSERT (installment) | لو الطالب كان `payment_blocked` → status = active |
| `trg_create_group_sessions` | `groups` | AFTER INSERT | ينشئ 12 `group_session` تلقائي على schedule الجروب |
| `trg_commission_on_first_payment` | `payments` | AFTER INSERT | لو أول دفعة للطالب → ينشئ `commission` للسيلز المخصص بالـ snapshot rate الحالي |
| `trg_treasury_ledger` | `payments`, `expenses`, `commissions` | AFTER INSERT/UPDATE | يضيف entry في `treasury_transactions` (double-entry) |
| `trg_audit_log` | جداول حساسة | AFTER * | يكتب في `audit_logs` |

### 3.2 RPC Functions (يستدعيها server functions)

| RPC | الوصف |
|---|---|
| `fn_promote_student_to_next_level(student_id, source_level_id)` | لو نجح في Final Exam → يبحث عن جروب مناسب في الـ level التالي ويعمل enrollment، ولا "pending placement" |
| `fn_request_recovery(student_id)` | الطالب fully_banned → يطلب رجوع → يولّد `reinstatement_fee` + ينتظر دفع |
| `fn_transfer_student_between_groups(student_id, from_group, to_group, reason)` | نقل بين جروبات نفس الـ level — يحفظ التقدم |
| `fn_transfer_student_between_packages(student_id, new_package_id, payment_diff)` | تغيير باقة — يعدل المحتوى المتاح + الفرق المالي |
| `fn_transfer_student_between_branches(student_id, target_branch, target_group)` | بعد موافقة Admin على `transfer_request` |
| `fn_suggest_substitute_trainers(group_session_id)` | يرجع list من المدربين المتاحين (نفس level + free in slot + same branch) |
| `fn_assign_substitute(group_session_id, substitute_trainer_id)` | يطبق البديل + notification |
| `fn_calculate_compensation_options(student_id, missed_session_id)` | يرجع: جروبات متاحة لنفس الـ level + slots متاحة للمدرب للـ private |
| `fn_close_monthly_period(branch_id, month)` | يـ snapshot الـ commission rates + KPI weights + يحسب KPI scores |
| `fn_generate_certificate(student_id, level_id)` | يولّد PDF من template + يخزنه في `certificates` |

### 3.3 pg_cron Jobs

| Job | الوقت | الوظيفة |
|---|---|---|
| `cron_daily_attendance_check` | 23:00 يومياً | check missed sessions → trigger compensation flow |
| `cron_compensation_deadlines` | كل ساعة | check expired compensations → fire block trigger |
| `cron_installment_reminders` | 09:00 يومياً | notification للأقساط المستحقة خلال 3 أيام |
| `cron_monthly_close` | 00:01 أول كل شهر | `fn_close_monthly_period` لكل فرع |
| `cron_kpi_calculation` | 02:00 أول كل شهر | حساب KPI scores للشهر السابق |
| `cron_warn_inactive_students` | weekly | الطلاب بدون نشاط أونلاين > 7 أيام |

---

## 4. الـ Business Flows الكاملة (audit)

### Flow 1: تسجيل طالب جديد (Onboarding)
1. **Reception/Parent** يدخل بيانات الطالب + يربطه بـ parent (لو موجود) أو ينشئ parent جديد
2. النظام يحدد `age_group` تلقائي من تاريخ الميلاد
3. الطالب ياخد **Entry Test** (adaptive من بنك الأسئلة per age_group)
4. النتيجة → يحدد الـ level المناسب
5. **Reception** يعرض الجروبات المتاحة في الـ level + الفرع + الـ age_group
6. اختيار جروب + باقة → **Enrollment**
7. **Trigger:** snapshot السياسات الحالية للطالب
8. Reception يسجل الدفعة (cash/visa/transfer/installment)
9. **Trigger:** أول دفعة → commission للسيلز
10. **Trigger:** treasury ledger entry
11. Notifications: للطالب/الولي/Trainer

**أدوار واضحة:** Reception (المنفذ) — Sales (للعمولة) — Trainer (يستلم notification) — Parent (يستلم credentials)

### Flow 2: السيشن اليومية
1. **Trigger مسبق** (عند إنشاء الجروب) أنشأ الـ 12 group_session
2. Trainer يفتح portal → يشوف جروب اليوم → يسجل attendance (present/absent/late)
3. لكل present → يدخل evaluation (7 معايير، scale 1-5)
4. **Auto:** الطلاب الـ absent → يدخلوا في `compensation_requests` (status: pending)
5. لو الطالب مفيش `compensation_session` خلال X أيام (من snapshot policy) → `trg_auto_block_on_missed_compensation` → منع من السيشن التالية + إنشاء compensation تانية لها
6. لو تخطى حد الغيابات في السياسة → `trg_full_ban_on_threshold` → status = fully_banned + reinstatement_fee
7. **Reception** يقدر يحجز compensation: يستدعي `fn_calculate_compensation_options` → يختار: جروب تاني (نفس level) أو Private (مع trainer متاح)

**أدوار واضحة:** Trainer (attendance + evaluation) — System (auto-blocks) — Reception (compensation booking)

### Flow 3: المالية والأقساط
1. Reception يسجل دفعة → `treasury_transactions` entry
2. لو installment plan: ينشئ N records في `installments` بـ due_dates
3. **Cron يومي:** تذكير قبل due_date بـ 3 أيام
4. **عند تخطي due_date:** student.status = `payment_blocked`
5. **عند دفع القسط:** `trg_restore_access_on_installment_paid` → status = active
6. **Branch Admin** يدخل expenses → treasury_transactions
7. **Auto:** أول دفعة للطالب → commission للسيلز (بالـ rate المسجل في `commission_assignments` للشهر الحالي — لو متغير بعد كده، الـ snapshot هو الحاكم)
8. **End of month:** `cron_monthly_close` → snapshot rates + weights للشهر القادم

**أدوار:** Reception (payments) — Admin (expenses + rates) — Sales (يستلم commission) — System (locks rates monthly)

### Flow 4: ترقية الطالب (Level Progression) 
1. الطالب يكمل 12 sessions في الـ level
2. ياخد Final Exam + Classwork score متراكم من evaluations
3. لو نجح: `fn_promote_student_to_next_level` →
   - يبحث عن جروب مناسب (next level + same age_group + same branch + has capacity + matching schedule preference)
   - لو موجود: enrollment تلقائي (snapshot policies جديد)
   - لو مش موجود: status = `awaiting_placement` → notification للـ Reception
4. **Trigger:** `fn_generate_certificate` → PDF تلقائي

**Edge cases مغطاة:**
- الطالب يفشل في Final → يعيد الـ level (Reception يقرر same group أو new group)
- مفيش جروب متاح → `awaiting_placement` queue للـ Reception
- الطالب عاوز يغير باقة عند الترقية → `fn_transfer_student_between_packages`

### Flow 5: نقل الطالب (Transfers)
**ثلاث أنواع، كلهم عبر RPC:**

**(أ) بين جروبات نفس الـ level:** Reception → `fn_transfer_student_between_groups` (يحفظ progress + attendance history)

**(ب) بين باقات:** Reception → `fn_transfer_student_between_packages` (يحسب الفرق + يفتح المحتوى الجديد)

**(ج) بين فروع:** 
1. Reception/Parent يفتح `transfer_request`
2. Admin (الفرع الحالي) يوافق
3. Admin (الفرع الجديد) يوافق + يحدد target_group
4. `fn_transfer_student_between_branches` → ينقل + يحدث branch_id في كل related records + treasury balance transfer (لو فيه)

### Flow 6: استبدال المدرب
1. Trainer يطلب leave_request أو يبلغ غياب طارئ
2. Reception/Admin يفتح group_session اللي محتاج بديل
3. `fn_suggest_substitute_trainers` → list (matched by: same level certified + free in slot + same branch)
4. Reception/Admin يختار → `fn_assign_substitute`
5. Notifications: للبديل + الطلاب + الولي

### Flow 7: الـ Online Content & Portals
1. Admin يرفع `session_content`: video_url (Vimeo/YouTube unlisted/Drive) + slides_url (PDF على Lovable Storage) + per package tier
2. الطالب في portal: يشوف بس المحتوى المتاح لباقته + level enrolled + sessions حتى تاريخه
3. Quizzes/Assignments: يحلها → `quiz_attempts` / `assignment_submissions`
4. Trainer يصحح assignments من portal
5. Parent portal: read-only للحضور + التقييمات + الدفعات

### Flow 8: Staff & KPIs
1. Admin يعرّف KPI definitions per role (مع weights)
2. **أول كل شهر:** snapshot weights → `kpi_weights_snapshots`
3. **خلال الشهر:** الـ source data بتتجمع (attendance rate، evaluations average، payments collected، ...)
4. **أول الشهر التالي:** `cron_kpi_calculation` → `kpi_scores` final
5. Admin يشوف dashboard + يقدر يدي warnings
6. 3 warnings → notification لـ super_admin

---

## 5. القرارات Anti-Spaghetti

1. **Business logic في الـ server فقط** — لا في components ولا في hooks
2. **DB triggers للـ invariants** اللي لازم تكون true دائماً (blocks, commissions, ledger)
3. **Policy snapshot per cycle** — أي طالب يكمل بالقواعد اللي ابتدا بيها
4. **Monthly locks** — commission rates + KPI weights مينفعش تتغير في نص شهر
5. **Audit log** للحركات الحساسة (مالية، تعديل سياسات، نقل، حذف)
6. **Feature isolation** — cross-feature عبر server functions أو shared types فقط
7. **Zod everywhere** — كل input + كل DB output
8. **No god-components** — max 200 سطر
9. **RPC pattern** — كل DB function لها typed wrapper في `lib/rpc.ts`
10. **Soft delete للـ entities الأساسية** (students, staff, groups, packages, levels) + hard delete للـ ephemeral data

---

## 6. خطة التنفيذ على Phases

### Phase 0 — Foundation (2-3 أيام)
- Lovable Cloud + Auth (email/password) + Google sign-in
- i18n (ar/en) + RTL/LTR + Design tokens بطابع Kojo
- Routing skeleton لكل الـ roles
- جداول Layer 0: branches, profiles, user_roles, age_groups, system_policies, policy_snapshots, audit_logs
- `has_role()` + RLS templates
- Login/Logout + role-based redirect
- Audit log trigger generic

### Phase 1 — Curriculum (4-5 أيام)
- جداول Layer 1 كاملة + RLS
- Admin UI: Branches CRUD، Packages CRUD، Levels CRUD، Level Sessions CRUD، Content management، Entry Test bank
- `system_policies` UI (للأدمن يعدل القواعد)

### Phase 2 — Operations Core (7-10 أيام)
- جداول Layer 2 كاملة
- **Triggers:** snapshot_policies, create_group_sessions, audit_log
- **RPCs:** transfer between groups/packages/branches، suggest_substitutes
- Student onboarding + Entry Test adaptive flow
- Groups + Enrollments UI
- Attendance + Evaluations (Trainer portal)
- Compensation flow كامل
- Auto-block triggers
- Transfer requests UI

### Phase 3 — Financial (5-7 أيام)
- جداول Layer 3 كاملة
- **Triggers:** treasury_ledger, commission_on_first_payment, restore_access
- **RPCs:** close_monthly_period
- Payments UI (manual cash/visa/transfer)
- Installments + reminders
- Expenses
- Commissions (auto + monthly lock)
- Treasury reports
- Reinstatement fees flow

### Phase 4 — Evaluation, Content & Portals (5-7 أيام)
- Per-session evaluations (7 criteria) UI
- Final Exam + Classwork weighted score
- **RPC:** promote_to_next_level
- Quizzes + Assignments UI (Admin authoring + Student attempting + Trainer grading)
- Student portal كامل (content + submissions)
- Parent portal (read-only)
- **Certificate template HTML + RPC:** generate_certificate (PDF)

### Phase 5 — Staff, KPIs & Notifications (5-7 أيام)
- جداول Layer 4 كاملة
- Staff management + schedules + leaves
- Substitution flow UI
- KPI definitions + weights UI
- **All pg_cron jobs setup**
- Warnings system
- In-app notifications center
- Email notifications (Lovable Email)

### Phase 6 — Dashboards & Polish (3-5 أيام)
- Super Admin dashboard (multi-branch)
- Branch Admin dashboard
- Reception dashboard
- Trainer dashboard
- Reports & CSV exports
- Audit log viewer
- Mobile optimization
- Performance tuning + indexes

**الإجمالي:** ~5-7 أسابيع.

---

## 7. الـ Roles Matrix (مين يعمل إيه)

| Action | Super Admin | Branch Admin | Reception | Sales | Trainer | Student | Parent |
|---|---|---|---|---|---|---|---|
| إدارة فروع | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Packages/Levels/Content | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| System Policies | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| إنشاء جروب | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Student Onboarding | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Entry Test | ✅ | ✅ | ✅ | ❌ | ❌ | يحلها | ❌ |
| Enrollment | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| تسجيل دفعة | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Expenses | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Commission Rates | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| تعيين Sales لطالب | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Attendance | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Evaluation | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Compensation booking | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| اختيار Substitute | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Transfer (groups/packages) | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Transfer (branches — موافقة) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Final Exam grading | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Quiz/Assignment grading | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Staff management + KPI | ✅ | ✅ (فرعه) | ❌ | ❌ | ❌ | ❌ | ❌ |
| Warnings | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| عرض محتوى الباقة | — | — | — | — | — | ✅ | ❌ |
| عرض تقدم الطالب | ✅ | ✅ (فرعه) | ✅ (فرعه) | ❌ | ✅ (جروبه) | ✅ (نفسه) | ✅ (ابنه) |

---

## 8. الخطوة التالية

موافق على الـ plan ده → نبدأ **Phase 0** فوراً.
