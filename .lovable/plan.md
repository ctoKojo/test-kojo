# Kojo Academy — Final Architecture Audit & Master Plan (v5)

> هذا المستند هو **المرجع الوحيد** للمشروع.
> أي feature جديدة أو تعديل يرجع لهذا المستند أولاً.
> لا يوجد business logic في الـ Frontend — كل شيء في Supabase.

---

## PART A — AUDIT REPORT: المشاكل المكتشفة والحلول

### A.1 مشاكل حرجة كانت موجودة → محلولة في v5

| # | المشكلة | الأثر | الحل في v5 |
|---|---|---|---|
| 1 | `consecutive_absences` يُحدَّث في Edge Function مش في DB trigger | Race condition لو طلبين جاوا بالتوازي | نقلنا العداد لـ `trg_full_ban_on_threshold` في DB |
| 2 | `find-compensation-slot` بتبحث في نفس الأسبوع بس | لو مفيش slot في الأسبوع مش بتوسع البحث | RPC جديدة: `fn_calculate_compensation_options` بتوسع النطاق |
| 3 | `calculate-scores` بتجيب scores من كل المستويات مش المستوى الحالي بس | درجات غلط لو الطالب عدى أكثر من level | إضافة `group_enrollment_id` filter في كل query |
| 4 | `trg_restore_access_on_payment` كان على جدول `payments` | الطالب المقطوع access بسبب قسط (installment) مش payment | نقلنا الـ trigger لجدول `installments` |
| 5 | مفيش validation إن التعويضية لازم تتاخد قبل السيشن الجاية | الطالب يقدر يحجز compensation بعد ما السيشن التالية عدت | إضافة CHECK في `fn_calculate_compensation_options` |
| 6 | `trg_cascade_group_freeze` مش بيعمل compensation للسيشنات المجمدة | الطلاب بيتجمدوا من غير ما تتفتح لهم compensations | تعديل الـ trigger عشان يولّد compensation لكل session مجمدة |
| 7 | مفيش `level-progression` function | الطالب لو نجح مش بيتنقل أوتوماتيك | إضافة `fn_promote_student_to_next_level` |
| 8 | مفيش `restricted-recovery` flow | الطالب المحروم مش فيه طريقة رسمية للرجوع | إضافة `fn_request_recovery` + `reinstatement_fees` |
| 9 | مفيش auto-grade للكويز | الكويز MCQ لازم يتصحح يدوياً | إضافة `trg_auto_grade_quiz` |
| 10 | `commission_on_first_payment` مش موجودة | السيلز مش بياخد commission أوتوماتيك | إضافة `trg_commission_on_first_payment` |
| 11 | مفيش `treasury_transactions` ledger | مفيش audit trail مالي حقيقي | إضافة `trg_treasury_ledger` |
| 12 | مفيش `policy_snapshots` | الطالب بيتأثر بتغيير السياسات في نص الـ level | إضافة `trg_snapshot_policies_on_enrollment` |
| 13 | مفيش `trg_create_group_sessions` | لما الجروب يتعمل السيشنات بتتعمل يدوياً | إضافة `trg_create_group_sessions` |
| 14 | مفيش Sales role | السيلز = Receptionist مش صح | إضافة Sales role مستقل + `commission_rules` |

### A.2 Scenarios غير مغطاة → مضافة في v5

| السيناريو | كان في v4؟ | التغطية في v5 |
|---|---|---|
| طالب يغيب عن compensation → compensation جديدة | ⚠️ جزئي | `trg_auto_block_on_missed_compensation` يعمل compensation جديدة recursively مع حد أقصى |
| طالب دفع reinstatement ثم غاب فوراً | ❌ | counter reset في `fn_request_recovery` |
| Sales استقال في نص الشهر | ❌ | `commission_assignments` + monthly snapshot يحميان |
| مدرب غاب بدون إخطار | ⚠️ | `fn_suggest_substitute_trainers` + Admin override |
| مفيش substitute متاح | ❌ | السيشن تتأجل → `trg_cascade_group_freeze` للسيشن دي بس |
| Reception سجل مبلغ غلط | ❌ | Refund entry جديد في `treasury_transactions` (لا حذف) |
| طالب في awaiting_placement طال انتظاره | ❌ | `cron_warn_inactive_students` + escalation notification |
| Parent عنده أبناء في فروع مختلفة | ✅ | `parent_student_links` M2M |
| Race condition على آخر مكان في جروب | ✅ | `trg_validate_group_capacity` في DB |
| Admin override بعد قفل attendance | ❌ | `admin_attendance_overrides` table + audit log |

---

## PART B — THE STABLE ARCHITECTURE

### B.1 The Golden Rule
```
كل سطر business logic = في Supabase (DB trigger أو RPC أو Edge Function)
Frontend = Display + Forms + Navigation فقط
```

### B.2 Decision Tree: أكتب الكود فين؟

```
هل الـ logic محتاج يحصل بغض النظر عن الـ UI؟
    ↓ أيوه
    هل هو atomic ومحتاج يتنفذ في نفس الـ DB transaction؟
        ↓ أيوه → DB Trigger أو RPC Function
        ↓ لا  → هل محتاج external API أو secrets أو orchestration؟
                    ↓ أيوه → Edge Function
                    ↓ لا   → supabase.rpc() من الـ client
    ↓ لا
    هل هو UI state (modal مفتوح، tab محدد، ...)?
        ↓ أيوه → Zustand
        ↓ لا   → TanStack Query (server state)
```

### B.3 Layer Map الكامل

```
┌─────────────────────────────────────────────────────────┐
│  LAYER 5: UI (React Components)                          │
│  • يعرض data فقط                                        │
│  • يبعت actions للـ Query Layer                          │
│  • max 200 سطر/component                                 │
│  • لا business logic، لا direct DB calls                 │
├─────────────────────────────────────────────────────────┤
│  LAYER 4: State Management                               │
│  • TanStack Query → server state + caching              │
│  • Zustand → UI state فقط (modals, sidebar, filters)    │
│  • Query keys: factory pattern (entityKeys.list, .detail)│
├─────────────────────────────────────────────────────────┤
│  LAYER 3: API Layer (lib/api/*.api.ts)                   │
│  • الواجهة الوحيدة للـ Supabase في الـ Frontend          │
│  • supabase.from() للـ CRUD البسيط                       │
│  • supabase.rpc() للـ atomic operations                  │
│  • supabase.functions.invoke() للـ Edge Functions        │
│  • كل function بـ typed input/output                     │
├─────────────────────────────────────────────────────────┤
│  LAYER 2a: Edge Functions (Deno)                         │
│  • Email، PDF generation، external APIs                  │
│  • Orchestration متعدد الخطوات                           │
│  • كلها تبدأ بـ requireAuth()                            │
│  • كلها تستخدم Zod validation                            │
├─────────────────────────────────────────────────────────┤
│  LAYER 2b: RPC Functions (PostgreSQL)                    │
│  • Atomic business operations                            │
│  • Transfers، promotions، recovery                        │
│  • SECURITY DEFINER                                       │
│  • كلها بـ explicit error codes                          │
├─────────────────────────────────────────────────────────┤
│  LAYER 1: Triggers + Constraints (PostgreSQL)            │
│  • Invariants: capacity، blocks، commissions، ledger      │
│  • Cascades: group freeze، installment restore            │
│  • Validations: online link، age group، max students     │
│  • بتشتغل على أي عملية DB بغض النظر عن المصدر           │
├─────────────────────────────────────────────────────────┤
│  LAYER 0: RLS (Row Level Security)                       │
│  • خط الدفاع الأخير والأهم                               │
│  • بتشتغل على كل قراءة/كتابة                            │
│  • حتى لو الـ Frontend اتهكر مش يقدر يوصل لبيانات غيره  │
└─────────────────────────────────────────────────────────┘
```

---

## PART C — DB SCHEMA الكامل والنهائي (42 جدول)

### C.1 Layer 0 — Identity & Config

```sql
-- الفروع
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Africa/Cairo',
  address TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- بيانات المستخدمين (امتداد لـ auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  preferred_language TEXT DEFAULT 'ar',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- أدوار المستخدمين (user → branch → role)
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('super_admin','branch_admin','receptionist','sales','trainer','student','parent')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, branch_id, role)
);

-- ربط الأولياء بالأبناء (M2M)
CREATE TABLE parent_student_links (
  parent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  relationship TEXT DEFAULT 'parent',
  is_primary BOOL DEFAULT false,
  PRIMARY KEY (parent_id, student_id)
);

-- الفئات العمرية
CREATE TABLE age_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,       -- أطفال، ناشئين، مراهقين
  min_age INT NOT NULL,
  max_age INT NOT NULL,
  CONSTRAINT valid_age_range CHECK (min_age < max_age)
);

-- بيانات الطلاب
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id),
  age_group_id UUID REFERENCES age_groups(id),
  current_group_id UUID REFERENCES groups(id),
  dob DATE NOT NULL,
  gender TEXT CHECK (gender IN ('male','female')),
  subscription_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (subscription_status IN (
      'pending','active','active_waiting','payment_blocked',
      'restricted','fully_banned','completed','dropped','awaiting_placement'
    )),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- سياسات النظام (per branch، configurable)
CREATE TABLE system_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (branch_id, key)
);
-- Default policies seed:
-- consecutive_absence_limit: 2
-- total_absence_limit: 5
-- free_absences_per_level: 2
-- session_lock_minutes: 30
-- session_auto_close_hours: 24
-- compensation_deadline_days: 7
-- payment_overdue_block_days: 3
-- payment_reminder_days: 3
-- reinstatement_fee_type: 'fixed' | 'percentage'
-- reinstatement_fee_value: 500
-- siblings_discount_pct: 0.10
-- kpi_monthly_close_day: 1
-- quiz_deadline_hours: 48
-- assignment_deadline_hours: 24

-- snapshot السياسات وقت التسجيل
CREATE TABLE policy_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id),
  enrollment_id UUID NOT NULL REFERENCES group_enrollments(id),
  policies JSONB NOT NULL,
  snapped_at TIMESTAMPTZ DEFAULT NOW()
);

-- سجل التدقيق
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- الإشعارات
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- تفضيلات الإشعارات
CREATE TABLE notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  in_app BOOL DEFAULT true,
  email BOOL DEFAULT true,
  sms BOOL DEFAULT false
);
```

### C.2 Layer 1 — Curriculum

```sql
-- الباقات
CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,       -- Kojo Squad, Kojo Core, Kojo X
  min_capacity INT NOT NULL CHECK (min_capacity >= 1),
  max_capacity INT NOT NULL,
  price_full DECIMAL(10,2) NOT NULL CHECK (price_full >= 0),
  price_monthly DECIMAL(10,2) CHECK (price_monthly >= 0),
  online_price DECIMAL(10,2) CHECK (online_price >= 0),
  content_includes TEXT[],  -- ['slides', 'summary_video', 'full_video']
  deleted_at TIMESTAMPTZ,
  CONSTRAINT valid_capacity CHECK (min_capacity <= max_capacity)
);

-- المستويات
CREATE TABLE levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  order_index INT NOT NULL UNIQUE,
  description TEXT,
  total_sessions INT NOT NULL DEFAULT 12,
  passing_score DECIMAL(5,2) NOT NULL DEFAULT 60.00,
  attendance_weight DECIMAL(5,2) DEFAULT 30.00,
  classwork_weight DECIMAL(5,2) DEFAULT 40.00,
  quiz_weight DECIMAL(5,2) DEFAULT 15.00,
  final_exam_weight DECIMAL(5,2) DEFAULT 15.00,
  deleted_at TIMESTAMPTZ
);

-- السيشنات في المستوى (المنهج)
CREATE TABLE level_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level_id UUID NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
  session_number INT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  UNIQUE (level_id, session_number)
);

-- المحتوى (per session per package)
CREATE TABLE session_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level_session_id UUID NOT NULL REFERENCES level_sessions(id),
  package_id UUID NOT NULL REFERENCES packages(id),
  content_type TEXT NOT NULL CHECK (content_type IN ('slides','summary_video','full_video','pdf')),
  url TEXT,               -- Vimeo/YouTube/Drive
  storage_path TEXT,      -- Supabase Storage
  UNIQUE (level_session_id, package_id, content_type)
);

-- الواجبات (per level_session، ثابتة لكل الجروبات)
CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level_session_id UUID NOT NULL REFERENCES level_sessions(id),
  title TEXT NOT NULL,
  description TEXT,
  max_score DECIMAL(5,2) DEFAULT 100,
  created_by UUID REFERENCES profiles(id)
);

-- الكويزات (per level_session)
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level_session_id UUID NOT NULL REFERENCES level_sessions(id),
  title TEXT NOT NULL,
  time_limit_minutes INT,
  deadline_hours_after_session INT DEFAULT 48
);

-- أسئلة الكويز
CREATE TABLE quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('mcq','true_false')),
  options JSONB,           -- ['A','B','C','D']
  correct_answer TEXT NOT NULL,
  points DECIMAL(5,2) DEFAULT 1
);

-- بنك أسئلة الـ Entry Test
CREATE TABLE entry_test_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  age_group_id UUID NOT NULL REFERENCES age_groups(id),
  question_text TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('mcq','true_false')),
  options JSONB,
  correct_answer TEXT NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('easy','medium','hard')),
  level_indicator INT   -- يدل على المستوى المناسب لو الإجابة صح
);
```

### C.3 Layer 2 — Operations

```sql
-- الجروبات
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  level_id UUID NOT NULL REFERENCES levels(id),
  package_id UUID NOT NULL REFERENCES packages(id),
  trainer_id UUID REFERENCES profiles(id),
  age_group_id UUID NOT NULL REFERENCES age_groups(id),
  name TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'offline' CHECK (mode IN ('online','offline')),
  online_link TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','frozen','completed','cancelled')),
  schedule JSONB NOT NULL,  -- [{day: 'saturday', time: '17:00'}, ...]
  starts_at DATE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- السيشنات الفعلية للجروبات
CREATE TABLE group_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id),
  level_session_id UUID NOT NULL REFERENCES level_sessions(id),
  session_number INT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','live','completed','frozen','cancelled')),
  opened_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  trainer_id UUID REFERENCES profiles(id),   -- قد يكون substitute
  notes TEXT
);

-- التسجيل في الجروبات
CREATE TABLE group_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id),
  group_id UUID NOT NULL REFERENCES groups(id),
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','transferred','completed','dropped')),
  transfer_reason TEXT,
  UNIQUE (student_id, group_id)
);

-- الحضور
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id),
  group_session_id UUID NOT NULL REFERENCES group_sessions(id),
  status TEXT NOT NULL CHECK (status IN ('present','absent','excused','late','compensation')),
  excuse_note TEXT,
  excuse_id UUID REFERENCES absence_excuses(id),
  is_locked BOOL DEFAULT false,
  recorded_by UUID REFERENCES profiles(id),
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (student_id, group_session_id)
);

-- أعذار الغياب
CREATE TABLE absence_excuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id),
  group_session_id UUID NOT NULL REFERENCES group_sessions(id),
  excuse_text TEXT NOT NULL,
  supporting_doc_url TEXT,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected'))
);

-- التقييمات (7 معايير)
CREATE TABLE evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id),
  group_session_id UUID NOT NULL REFERENCES group_sessions(id),
  trainer_id UUID REFERENCES profiles(id),
  participation INT CHECK (participation BETWEEN 1 AND 5),
  understanding INT CHECK (understanding BETWEEN 1 AND 5),
  behavior INT CHECK (behavior BETWEEN 1 AND 5),
  homework_completion INT CHECK (homework_completion BETWEEN 1 AND 5),
  progress INT CHECK (progress BETWEEN 1 AND 5),
  communication INT CHECK (communication BETWEEN 1 AND 5),
  overall_score DECIMAL(4,2),
  notes TEXT,
  UNIQUE (student_id, group_session_id)
);

-- الحجب والحرمان
CREATE TABLE student_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id),
  block_type TEXT NOT NULL CHECK (block_type IN ('payment','absence','hw','fully_banned')),
  reason TEXT,
  blocked_at TIMESTAMPTZ DEFAULT NOW(),
  lifted_at TIMESTAMPTZ,
  lifted_by UUID REFERENCES profiles(id)
);

-- طلبات التعويض
CREATE TABLE compensation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id),
  missed_session_id UUID NOT NULL REFERENCES group_sessions(id),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','scheduled','completed','expired','cancelled')),
  comp_type TEXT CHECK (comp_type IN ('group','private')),
  deadline TIMESTAMPTZ,     -- قبل السيشن التالية
  compensation_session_id UUID REFERENCES compensation_sessions(id),
  is_recursive BOOL DEFAULT false,      -- تعويضية ناتجة عن غياب في تعويضية
  recursion_depth INT DEFAULT 0,        -- حد أقصى 2
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- السيشنات التعويضية
CREATE TABLE compensation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_session_id UUID REFERENCES group_sessions(id),  -- NULL لو private
  trainer_id UUID NOT NULL REFERENCES profiles(id),
  student_id UUID NOT NULL REFERENCES students(id),
  scheduled_at TIMESTAMPTZ NOT NULL,
  comp_type TEXT NOT NULL CHECK (comp_type IN ('group','private')),
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','cancelled')),
  expense_id UUID REFERENCES expenses(id)  -- تكلفة التعويضية للأكاديمية
);

-- تسليم الواجبات
CREATE TABLE assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id),
  assignment_id UUID NOT NULL REFERENCES assignments(id),
  group_session_id UUID NOT NULL REFERENCES group_sessions(id),
  group_enrollment_id UUID NOT NULL REFERENCES group_enrollments(id),
  submitted_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,        -- يتحدد بـ trigger (24 ساعة بعد السيشن)
  file_url TEXT,
  grade DECIMAL(5,2),
  late_penalty DECIMAL(5,2) DEFAULT 0,
  feedback TEXT,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','submitted','late','graded','missed')),
  counted_as_missed BOOL DEFAULT false,   -- لمنع العد مرتين
  UNIQUE (student_id, assignment_id, group_enrollment_id)
);

-- محاولات الكويز
CREATE TABLE quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id),
  quiz_id UUID NOT NULL REFERENCES quizzes(id),
  group_session_id UUID NOT NULL REFERENCES group_sessions(id),
  group_enrollment_id UUID NOT NULL REFERENCES group_enrollments(id),
  started_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  deadline TIMESTAMPTZ,      -- يتحدد بـ trigger
  answers JSONB,
  score DECIMAL(5,2),
  status TEXT DEFAULT 'not_started'
    CHECK (status IN ('not_started','in_progress','submitted','graded')),
  UNIQUE (student_id, quiz_id, group_enrollment_id)
);

-- محاولات الـ Entry Test
CREATE TABLE entry_test_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id),
  age_group_id UUID NOT NULL REFERENCES age_groups(id),
  answers JSONB NOT NULL,
  score DECIMAL(5,2),
  suggested_level_id UUID REFERENCES levels(id),
  assigned_level_id UUID REFERENCES levels(id),   -- ما حدده الأدمن فعلاً
  completed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id)
);

-- طلبات النقل بين الفروع
CREATE TABLE transfer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id),
  from_branch_id UUID NOT NULL REFERENCES branches(id),
  to_branch_id UUID NOT NULL REFERENCES branches(id),
  to_group_id UUID REFERENCES groups(id),
  reason TEXT,
  requested_by UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','approved_by_from','approved','rejected')),
  approved_by_from UUID REFERENCES profiles(id),
  approved_by_to UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- استبدال المدربين
CREATE TABLE substitutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_session_id UUID NOT NULL REFERENCES group_sessions(id),
  original_trainer_id UUID NOT NULL REFERENCES profiles(id),
  substitute_trainer_id UUID NOT NULL REFERENCES profiles(id),
  reason TEXT,
  assigned_by UUID REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin overrides لـ attendance بعد القفل
CREATE TABLE admin_attendance_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_id UUID NOT NULL REFERENCES attendance(id),
  old_status TEXT,
  new_status TEXT,
  reason TEXT NOT NULL,
  overridden_by UUID NOT NULL REFERENCES profiles(id),
  overridden_at TIMESTAMPTZ DEFAULT NOW()
);
```

### C.4 Layer 3 — Financial

```sql
-- الخزن (3 لكل فرع)
CREATE TABLE treasuries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cash','wallet','bank')),
  balance DECIMAL(12,2) NOT NULL DEFAULT 0
    CONSTRAINT no_negative_balance CHECK (balance >= -0.01),  -- tolerance صغير للـ floating point
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (branch_id, type)
);

-- سجل الحركات المالية (double-entry ledger)
CREATE TABLE treasury_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  treasury_id UUID NOT NULL REFERENCES treasuries(id),
  type TEXT NOT NULL CHECK (type IN ('credit','debit')),
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  category TEXT NOT NULL,   -- 'payment', 'expense', 'commission', 'reinstatement', 'transfer', 'refund'
  reference_id UUID,        -- ID الـ payment أو expense أو commission
  reference_type TEXT,
  note TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- المدفوعات
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id),
  group_id UUID REFERENCES groups(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  payment_type TEXT NOT NULL CHECK (payment_type IN ('full','installment')),
  total_amount DECIMAL(12,2) NOT NULL CHECK (total_amount > 0),
  paid_amount DECIMAL(12,2) DEFAULT 0,
  payment_method TEXT CHECK (payment_method IN ('cash','visa','transfer')),
  treasury_id UUID REFERENCES treasuries(id),
  sales_id UUID REFERENCES profiles(id),
  created_by UUID NOT NULL REFERENCES profiles(id),
  paid_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- الأقساط
CREATE TABLE installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id),
  student_id UUID NOT NULL REFERENCES students(id),
  group_id UUID REFERENCES groups(id),
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','paid','overdue','frozen')),
  treasury_id UUID REFERENCES treasuries(id),
  frozen_at TIMESTAMPTZ,
  days_frozen INT DEFAULT 0
);

-- المصروفات
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  category TEXT NOT NULL,   -- 'trainer_compensation', 'rent', 'utilities', 'marketing', 'other'
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  treasury_id UUID NOT NULL REFERENCES treasuries(id),
  description TEXT,
  receipt_url TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  paid_at TIMESTAMPTZ DEFAULT NOW()
);

-- قواعد العمولة (monthly snapshot)
CREATE TABLE commission_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  package_id UUID REFERENCES packages(id),    -- NULL = كل الباقات
  rate DECIMAL(5,4) NOT NULL CHECK (rate BETWEEN 0 AND 1),
  valid_from DATE NOT NULL,
  locked_at TIMESTAMPTZ,   -- بعد قفل الشهر مش ينفع يتغير
  created_by UUID REFERENCES profiles(id)
);

-- تعيين السيلز للطالب
CREATE TABLE commission_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id),
  sales_id UUID NOT NULL REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES profiles(id),
  month_locked DATE,   -- أول الشهر اللي اتقفل فيه التعيين
  UNIQUE (student_id, month_locked)
);

-- العمولات
CREATE TABLE commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_id UUID NOT NULL REFERENCES profiles(id),
  student_id UUID NOT NULL REFERENCES students(id),
  payment_id UUID NOT NULL REFERENCES payments(id),
  amount DECIMAL(12,2) NOT NULL,
  rate_snapshot DECIMAL(5,4) NOT NULL,
  month DATE NOT NULL,     -- أول الشهر
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','paid','cancelled')),
  paid_at TIMESTAMPTZ
);

-- رسوم استرداد الحساب
CREATE TABLE reinstatement_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id),
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  reason TEXT,
  treasury_id UUID REFERENCES treasuries(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','paid','waived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);
```

### C.5 Layer 4 — Staff & KPIs

```sql
-- الموظفون
CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID UNIQUE NOT NULL REFERENCES profiles(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  role TEXT NOT NULL CHECK (role IN ('trainer','receptionist','sales','branch_admin')),
  specialization TEXT[],    -- مثلاً: ['robotics', 'programming']
  salary DECIMAL(12,2),
  hire_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','on_leave','resigned','terminated')),
  deleted_at TIMESTAMPTZ
);

-- جداول العمل
CREATE TABLE staff_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  day_of_week TEXT NOT NULL CHECK (day_of_week IN ('sunday','monday','tuesday','wednesday','thursday','friday','saturday')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  branch_id UUID NOT NULL REFERENCES branches(id)
);

-- طلبات الإجازة
CREATE TABLE leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id),
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  CONSTRAINT valid_dates CHECK (from_date <= to_date)
);

-- تعريفات KPI
CREATE TABLE kpi_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  role TEXT NOT NULL,
  metric_key TEXT NOT NULL,
  description TEXT,
  target_value DECIMAL(10,2),
  unit TEXT,              -- 'percentage', 'count', 'days'
  UNIQUE (branch_id, role, metric_key)
);

-- أوزان KPI الشهرية (snapshot)
CREATE TABLE kpi_weights_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  role TEXT NOT NULL,
  month DATE NOT NULL,    -- أول الشهر
  weights JSONB NOT NULL, -- {metric_key: weight, ...}
  locked_at TIMESTAMPTZ,
  UNIQUE (branch_id, role, month)
);

-- درجات KPI الشهرية
CREATE TABLE kpi_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id),
  month DATE NOT NULL,
  scores JSONB NOT NULL,  -- {metric_key: actual_value, ...}
  total_score DECIMAL(5,2),
  grade TEXT,             -- A, B, C, D
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (staff_id, month)
);

-- الإنذارات
CREATE TABLE warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  reason TEXT NOT NULL,
  severity TEXT DEFAULT 'minor' CHECK (severity IN ('minor','major','final')),
  issued_by UUID NOT NULL REFERENCES profiles(id),
  issued_at TIMESTAMPTZ DEFAULT NOW()
);

-- الشهادات
CREATE TABLE certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id),
  level_id UUID NOT NULL REFERENCES levels(id),
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  storage_path TEXT,     -- PDF في Supabase Storage
  template_version TEXT,
  UNIQUE (student_id, level_id)
);

-- تقدم الطالب في المستويات
CREATE TABLE level_progressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id),
  level_id UUID NOT NULL REFERENCES levels(id),
  group_enrollment_id UUID NOT NULL REFERENCES group_enrollments(id),
  classwork_score DECIMAL(5,2),
  final_exam_score DECIMAL(5,2),
  final_score DECIMAL(5,2),
  passed BOOL,
  failure_reason TEXT CHECK (failure_reason IN ('student_fault','academy_fault')),
  promoted_at TIMESTAMPTZ,
  UNIQUE (student_id, level_id, group_enrollment_id)
);
```

---

## PART D — TRIGGERS الكاملة (14 trigger)

```sql
-- D.1: حساب الفئة العمرية أوتوماتيك
CREATE OR REPLACE FUNCTION fn_student_age_group()
RETURNS TRIGGER AS $$
BEGIN
  SELECT id INTO NEW.age_group_id
  FROM age_groups
  WHERE EXTRACT(YEAR FROM AGE(NEW.dob)) BETWEEN min_age AND max_age
  LIMIT 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_student_age_group
  BEFORE INSERT OR UPDATE OF dob ON students
  FOR EACH ROW EXECUTE FUNCTION fn_student_age_group();

-- D.2: snapshot السياسات عند التسجيل
CREATE OR REPLACE FUNCTION fn_snapshot_policies_on_enrollment()
RETURNS TRIGGER AS $$
DECLARE
  v_branch_id UUID;
  v_policies JSONB;
BEGIN
  SELECT branch_id INTO v_branch_id FROM students WHERE id = NEW.student_id;

  SELECT jsonb_object_agg(key, value)
  INTO v_policies
  FROM system_policies
  WHERE branch_id = v_branch_id;

  INSERT INTO policy_snapshots (student_id, enrollment_id, policies)
  VALUES (NEW.student_id, NEW.id, v_policies);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_snapshot_policies_on_enrollment
  AFTER INSERT ON group_enrollments
  FOR EACH ROW EXECUTE FUNCTION fn_snapshot_policies_on_enrollment();

-- D.3: إنشاء sessions الجروب أوتوماتيك
CREATE OR REPLACE FUNCTION fn_create_group_sessions()
RETURNS TRIGGER AS $$
DECLARE
  v_session RECORD;
  v_scheduled_at TIMESTAMPTZ;
  v_session_num INT := 1;
  v_schedule JSONB;
  v_first_day DATE;
BEGIN
  -- استخراج أول يوم من الـ schedule
  v_first_day := COALESCE(NEW.starts_at, CURRENT_DATE + 1);

  FOR v_session IN
    SELECT * FROM level_sessions
    WHERE level_id = NEW.level_id
    ORDER BY session_number
  LOOP
    INSERT INTO group_sessions (
      group_id, level_session_id, session_number, scheduled_at, trainer_id
    ) VALUES (
      NEW.id,
      v_session.id,
      v_session.session_number,
      (v_first_day + ((v_session_num - 1) * 7))::TIMESTAMPTZ,  -- أسبوعياً كافتراض
      NEW.trainer_id
    );
    v_session_num := v_session_num + 1;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_create_group_sessions
  AFTER INSERT ON groups
  FOR EACH ROW EXECUTE FUNCTION fn_create_group_sessions();

-- D.4: التحقق من capacity الجروب
CREATE OR REPLACE FUNCTION fn_validate_group_capacity()
RETURNS TRIGGER AS $$
DECLARE
  v_current_count INT;
  v_max_capacity INT;
BEGIN
  SELECT COUNT(*) INTO v_current_count
  FROM group_enrollments
  WHERE group_id = NEW.group_id AND status = 'active';

  SELECT p.max_capacity INTO v_max_capacity
  FROM groups g JOIN packages p ON p.id = g.package_id
  WHERE g.id = NEW.group_id;

  IF v_current_count >= v_max_capacity THEN
    RAISE EXCEPTION 'GROUP_FULL: الجروب وصل الحد الأقصى (%) طالب', v_max_capacity;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_group_capacity
  BEFORE INSERT ON group_enrollments
  FOR EACH ROW EXECUTE FUNCTION fn_validate_group_capacity();

-- D.5: التحقق من online link
CREATE OR REPLACE FUNCTION fn_validate_online_link()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.mode = 'online' AND (NEW.online_link IS NULL OR NEW.online_link = '') THEN
    RAISE EXCEPTION 'ONLINE_LINK_REQUIRED: الجروب الأونلاين يحتاج رابط';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_online_link
  BEFORE INSERT OR UPDATE ON groups
  FOR EACH ROW EXECUTE FUNCTION fn_validate_online_link();

-- D.6: الحرمان الكامل عند تخطي حد الغيابات
CREATE OR REPLACE FUNCTION fn_full_ban_on_threshold()
RETURNS TRIGGER AS $$
DECLARE
  v_student RECORD;
  v_policy_consecutive INT;
  v_policy_total INT;
  v_branch_id UUID;
  v_reinstatement_amount DECIMAL;
BEGIN
  IF NEW.status != 'absent' THEN RETURN NEW; END IF;

  SELECT s.*, s.branch_id INTO v_student
  FROM students s WHERE s.id = NEW.student_id;

  v_branch_id := v_student.branch_id;

  -- قراءة السياسات من الـ snapshot (مش من system_policies مباشرة)
  SELECT
    (ps.policies->>'consecutive_absence_limit')::INT,
    (ps.policies->>'total_absence_limit')::INT
  INTO v_policy_consecutive, v_policy_total
  FROM policy_snapshots ps
  JOIN group_enrollments ge ON ge.id = ps.enrollment_id
  WHERE ge.student_id = NEW.student_id AND ge.status = 'active'
  ORDER BY ps.snapped_at DESC LIMIT 1;

  -- fallback لو مفيش snapshot
  v_policy_consecutive := COALESCE(v_policy_consecutive, 2);
  v_policy_total := COALESCE(v_policy_total, 5);

  -- حدث عدادات الغياب
  UPDATE students SET
    consecutive_absences = CASE
      WHEN NEW.status = 'absent' THEN consecutive_absences + 1
      ELSE 0
    END,
    total_absences = total_absences + 1
  WHERE id = NEW.student_id
  RETURNING consecutive_absences, total_absences
  INTO v_student.consecutive_absences, v_student.total_absences;

  -- فحص الحرمان
  IF v_student.consecutive_absences >= v_policy_consecutive
  OR v_student.total_absences >= v_policy_total THEN

    -- حساب رسوم الاسترداد
    SELECT
      CASE
        WHEN value->>'type' = 'fixed' THEN (value->>'amount')::DECIMAL
        ELSE 0
      END
    INTO v_reinstatement_amount
    FROM system_policies
    WHERE branch_id = v_branch_id AND key = 'reinstatement_fee';

    UPDATE students SET subscription_status = 'fully_banned'
    WHERE id = NEW.student_id;

    INSERT INTO student_blocks (student_id, block_type, reason)
    VALUES (NEW.student_id, 'fully_banned', 'تجاوز حد الغيابات المسموح به');

    IF v_reinstatement_amount > 0 THEN
      INSERT INTO reinstatement_fees (student_id, amount, reason)
      VALUES (NEW.student_id, v_reinstatement_amount, 'رسوم استرداد الحساب بعد الحرمان');
    END IF;

    -- إشعارات
    INSERT INTO notifications (recipient_id, type, title, body)
    SELECT p.parent_id, 'full_ban', 'تم حرمان الطالب', 'تجاوز ابنك حد الغيابات المسموح به'
    FROM parent_student_links p WHERE p.student_id = NEW.student_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_full_ban_on_threshold
  AFTER INSERT ON attendance
  FOR EACH ROW EXECUTE FUNCTION fn_full_ban_on_threshold();

-- D.7: رفع الحجب أوتوماتيك عند دفع القسط
CREATE OR REPLACE FUNCTION fn_restore_access_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
    -- تحقق إن مفيش أقساط overdue تانية
    IF NOT EXISTS (
      SELECT 1 FROM installments
      WHERE student_id = NEW.student_id
        AND status = 'overdue'
        AND id != NEW.id
    ) THEN
      UPDATE students SET subscription_status = 'active'
      WHERE id = NEW.student_id AND subscription_status = 'payment_blocked';

      UPDATE student_blocks SET lifted_at = NOW()
      WHERE student_id = NEW.student_id AND block_type = 'payment' AND lifted_at IS NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_restore_access_on_payment
  AFTER UPDATE ON installments
  FOR EACH ROW EXECUTE FUNCTION fn_restore_access_on_payment();

-- D.8: تجميد الجروب cascade
CREATE OR REPLACE FUNCTION fn_cascade_group_freeze()
RETURNS TRIGGER AS $$
DECLARE
  v_session RECORD;
  v_student_id UUID;
BEGIN
  IF NEW.status = 'frozen' AND OLD.status != 'frozen' THEN
    -- تجميد السيشنات القادمة
    UPDATE group_sessions
    SET status = 'frozen'
    WHERE group_id = NEW.id AND scheduled_at > NOW() AND status = 'scheduled';

    -- إنشاء compensation requests للطلاب المسجلين
    FOR v_session IN
      SELECT * FROM group_sessions
      WHERE group_id = NEW.id AND status = 'frozen' AND scheduled_at > NOW()
    LOOP
      FOR v_student_id IN
        SELECT student_id FROM group_enrollments
        WHERE group_id = NEW.id AND status = 'active'
      LOOP
        INSERT INTO compensation_requests (student_id, missed_session_id, status, deadline)
        VALUES (
          v_student_id,
          v_session.id,
          'pending',
          v_session.scheduled_at + INTERVAL '14 days'  -- deadline مرن لأن الجروب مجمد
        )
        ON CONFLICT DO NOTHING;

        -- إشعار
        INSERT INTO notifications (recipient_id, type, title, body)
        VALUES (v_student_id, 'group_frozen', 'تم تجميد جروبك', 'سيتم التواصل معك لترتيب التعويض');
      END LOOP;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cascade_group_freeze
  AFTER UPDATE ON groups
  FOR EACH ROW EXECUTE FUNCTION fn_cascade_group_freeze();

-- D.9: deadline الكويز
CREATE OR REPLACE FUNCTION fn_set_quiz_deadline()
RETURNS TRIGGER AS $$
DECLARE
  v_deadline_hours INT;
  v_session_scheduled_at TIMESTAMPTZ;
BEGIN
  SELECT q.deadline_hours_after_session, gs.scheduled_at
  INTO v_deadline_hours, v_session_scheduled_at
  FROM quizzes q
  JOIN group_sessions gs ON gs.id = NEW.group_session_id
  WHERE q.id = NEW.quiz_id;

  NEW.deadline := v_session_scheduled_at + (v_deadline_hours || ' hours')::INTERVAL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_quiz_deadline
  BEFORE INSERT ON quiz_attempts
  FOR EACH ROW EXECUTE FUNCTION fn_set_quiz_deadline();

-- D.10: تصحيح الكويز أوتوماتيك
CREATE OR REPLACE FUNCTION fn_auto_grade_quiz()
RETURNS TRIGGER AS $$
DECLARE
  v_question RECORD;
  v_total_points DECIMAL := 0;
  v_earned_points DECIMAL := 0;
  v_student_answer TEXT;
BEGIN
  IF NEW.status = 'submitted' AND OLD.status != 'submitted' THEN
    FOR v_question IN
      SELECT * FROM quiz_questions WHERE quiz_id = NEW.quiz_id
    LOOP
      v_total_points := v_total_points + v_question.points;
      v_student_answer := NEW.answers ->> v_question.id::TEXT;

      IF lower(trim(v_student_answer)) = lower(trim(v_question.correct_answer)) THEN
        v_earned_points := v_earned_points + v_question.points;
      END IF;
    END LOOP;

    NEW.score := CASE WHEN v_total_points > 0
      THEN (v_earned_points / v_total_points) * 100
      ELSE 0 END;
    NEW.status := 'graded';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_grade_quiz
  BEFORE UPDATE ON quiz_attempts
  FOR EACH ROW EXECUTE FUNCTION fn_auto_grade_quiz();

-- D.11: commission على أول دفعة
CREATE OR REPLACE FUNCTION fn_commission_on_first_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_sales_id UUID;
  v_rate DECIMAL;
  v_commission_amount DECIMAL;
BEGIN
  -- جيب السيلز المعين للطالب لهذا الشهر
  SELECT sales_id INTO v_sales_id
  FROM commission_assignments
  WHERE student_id = NEW.student_id
    AND (month_locked IS NULL OR month_locked <= date_trunc('month', NOW()))
  ORDER BY assigned_at DESC LIMIT 1;

  IF v_sales_id IS NULL THEN RETURN NEW; END IF;

  -- جيب الـ rate من أحدث rule غير مقفولة
  SELECT rate INTO v_rate
  FROM commission_rules
  WHERE branch_id = NEW.branch_id
    AND (package_id IS NULL OR package_id = (
      SELECT package_id FROM groups WHERE id = NEW.group_id
    ))
    AND (locked_at IS NULL OR locked_at > NOW())
  ORDER BY valid_from DESC LIMIT 1;

  IF v_rate IS NULL THEN RETURN NEW; END IF;

  v_commission_amount := NEW.paid_amount * v_rate;

  INSERT INTO commissions (sales_id, student_id, payment_id, amount, rate_snapshot, month)
  VALUES (
    v_sales_id, NEW.student_id, NEW.id, v_commission_amount, v_rate,
    date_trunc('month', NOW())
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_commission_on_first_payment
  AFTER INSERT ON payments
  FOR EACH ROW EXECUTE FUNCTION fn_commission_on_first_payment();

-- D.12: treasury ledger (double-entry)
CREATE OR REPLACE FUNCTION fn_treasury_ledger()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'payments' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE treasuries SET balance = balance + NEW.paid_amount
      WHERE id = NEW.treasury_id;

      INSERT INTO treasury_transactions (treasury_id, type, amount, category, reference_id, reference_type)
      VALUES (NEW.treasury_id, 'credit', NEW.paid_amount, 'payment', NEW.id, 'payments');
    END IF;

  ELSIF TG_TABLE_NAME = 'expenses' THEN
    UPDATE treasuries SET balance = balance - NEW.amount WHERE id = NEW.treasury_id;
    INSERT INTO treasury_transactions (treasury_id, type, amount, category, reference_id, reference_type)
    VALUES (NEW.treasury_id, 'debit', NEW.amount, 'expense', NEW.id, 'expenses');

  ELSIF TG_TABLE_NAME = 'reinstatement_fees' AND NEW.status = 'paid' AND OLD.status != 'paid' THEN
    UPDATE treasuries SET balance = balance + NEW.amount WHERE id = NEW.treasury_id;
    INSERT INTO treasury_transactions (treasury_id, type, amount, category, reference_id, reference_type)
    VALUES (NEW.treasury_id, 'credit', NEW.amount, 'reinstatement', NEW.id, 'reinstatement_fees');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ربط الـ trigger بالجداول المختلفة
CREATE TRIGGER trg_treasury_ledger_payments
  AFTER INSERT ON payments FOR EACH ROW EXECUTE FUNCTION fn_treasury_ledger();
CREATE TRIGGER trg_treasury_ledger_expenses
  AFTER INSERT ON expenses FOR EACH ROW EXECUTE FUNCTION fn_treasury_ledger();
CREATE TRIGGER trg_treasury_ledger_reinstatement
  AFTER UPDATE ON reinstatement_fees FOR EACH ROW EXECUTE FUNCTION fn_treasury_ledger();

-- D.13: منع التعويضية بعد السيشن التالية (CHECK في RPC مش trigger)
-- هيتعمل في fn_calculate_compensation_options

-- D.14: audit log على الجداول الحساسة
CREATE OR REPLACE FUNCTION fn_audit_log()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (actor_id, action, table_name, record_id, old_data, new_data)
  VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ربطه بالجداول الحساسة
CREATE TRIGGER trg_audit_payments AFTER INSERT OR UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
CREATE TRIGGER trg_audit_students AFTER UPDATE ON students FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
CREATE TRIGGER trg_audit_blocks AFTER INSERT OR UPDATE ON student_blocks FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
CREATE TRIGGER trg_audit_reinstatement AFTER INSERT OR UPDATE ON reinstatement_fees FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
CREATE TRIGGER trg_audit_attendance_override AFTER INSERT ON admin_attendance_overrides FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
```

---

## PART E — RPC FUNCTIONS الكاملة

```sql
-- E.1: ترقية الطالب للمستوى التالي
CREATE OR REPLACE FUNCTION fn_promote_student_to_next_level(p_student_id UUID, p_level_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_next_level RECORD;
  v_available_group RECORD;
  v_student RECORD;
BEGIN
  SELECT * INTO v_student FROM students WHERE id = p_student_id;

  -- جيب المستوى التالي
  SELECT l.* INTO v_next_level
  FROM levels l
  WHERE l.order_index > (SELECT order_index FROM levels WHERE id = p_level_id)
  ORDER BY l.order_index ASC LIMIT 1;

  IF v_next_level IS NULL THEN
    RETURN jsonb_build_object('status', 'completed', 'message', 'أكمل الطالب جميع المستويات');
  END IF;

  -- دور على جروب متاح في نفس الـ level + age_group + branch + فيه مكان
  SELECT g.* INTO v_available_group
  FROM groups g
  WHERE g.level_id = v_next_level.id
    AND g.age_group_id = v_student.age_group_id
    AND g.branch_id = v_student.branch_id
    AND g.status = 'active'
    AND (SELECT COUNT(*) FROM group_enrollments WHERE group_id = g.id AND status = 'active')
        < (SELECT max_capacity FROM packages WHERE id = g.package_id)
  ORDER BY g.created_at ASC LIMIT 1;

  IF v_available_group IS NOT NULL THEN
    -- Enrollment مباشر
    INSERT INTO group_enrollments (student_id, group_id, status)
    VALUES (p_student_id, v_available_group.id, 'active');

    UPDATE students SET current_group_id = v_available_group.id WHERE id = p_student_id;

    -- إشعار الطالب والمدرب
    INSERT INTO notifications (recipient_id, type, title, body)
    VALUES
      (v_student.profile_id, 'level_promoted', 'تهانينا! انتقلت للمستوى التالي', v_next_level.name),
      (v_available_group.trainer_id, 'new_student', 'طالب جديد انضم لجروبك', '');

    RETURN jsonb_build_object('status', 'enrolled', 'group_id', v_available_group.id, 'level', v_next_level.name);
  ELSE
    -- مفيش جروب متاح
    UPDATE students SET subscription_status = 'awaiting_placement' WHERE id = p_student_id;

    INSERT INTO notifications (recipient_id, type, title, body)
    SELECT ur.user_id, 'awaiting_placement', 'طالب في قائمة الانتظار', 'الطالب اجتاز المستوى ويحتاج تسكين'
    FROM user_roles ur
    WHERE ur.branch_id = v_student.branch_id
      AND ur.role IN ('branch_admin', 'receptionist');

    RETURN jsonb_build_object('status', 'awaiting_placement', 'next_level', v_next_level.name);
  END IF;
END;
$$;

-- E.2: طلب استرداد الحساب (بعد الحرمان)
CREATE OR REPLACE FUNCTION fn_request_recovery(p_student_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_student RECORD;
  v_fee_pending BOOL;
BEGIN
  SELECT * INTO v_student FROM students WHERE id = p_student_id;

  IF v_student.subscription_status != 'fully_banned' THEN
    RAISE EXCEPTION 'STUDENT_NOT_BANNED: الطالب غير محروم';
  END IF;

  -- تحقق من وجود رسوم معلقة
  SELECT EXISTS (
    SELECT 1 FROM reinstatement_fees
    WHERE student_id = p_student_id AND status = 'pending'
  ) INTO v_fee_pending;

  IF v_fee_pending THEN
    RETURN jsonb_build_object('status', 'fee_pending', 'message', 'يجب دفع رسوم استرداد الحساب أولاً');
  END IF;

  -- رفع الحرمان وإعادة التفعيل
  UPDATE students SET
    subscription_status = 'active',
    consecutive_absences = 0,
    total_absences = 0
  WHERE id = p_student_id;

  UPDATE student_blocks SET lifted_at = NOW()
  WHERE student_id = p_student_id AND block_type = 'fully_banned' AND lifted_at IS NULL;

  RETURN jsonb_build_object('status', 'recovered', 'message', 'تم استرداد الحساب بنجاح');
END;
$$;

-- E.3: نقل طالب بين جروبات
CREATE OR REPLACE FUNCTION fn_transfer_student_between_groups(
  p_student_id UUID,
  p_from_group_id UUID,
  p_to_group_id UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_to_group RECORD;
BEGIN
  -- تحقق من الجروب الجديد
  SELECT * INTO v_to_group FROM groups WHERE id = p_to_group_id AND status = 'active';
  IF v_to_group IS NULL THEN
    RAISE EXCEPTION 'GROUP_NOT_FOUND: الجروب الجديد غير موجود أو غير نشط';
  END IF;

  -- تحقق من capacity
  IF (SELECT COUNT(*) FROM group_enrollments WHERE group_id = p_to_group_id AND status = 'active')
    >= (SELECT max_capacity FROM packages WHERE id = v_to_group.package_id) THEN
    RAISE EXCEPTION 'GROUP_FULL: الجروب الجديد ممتلئ';
  END IF;

  -- أغلق التسجيل القديم
  UPDATE group_enrollments SET status = 'transferred', transfer_reason = p_reason
  WHERE student_id = p_student_id AND group_id = p_from_group_id AND status = 'active';

  -- سجل في الجروب الجديد
  INSERT INTO group_enrollments (student_id, group_id, status)
  VALUES (p_student_id, p_to_group_id, 'active');

  -- حدث current_group_id
  UPDATE students SET current_group_id = p_to_group_id WHERE id = p_student_id;

  RETURN jsonb_build_object('status', 'transferred', 'to_group', p_to_group_id);
END;
$$;

-- E.4: نقل طالب بين باقات
CREATE OR REPLACE FUNCTION fn_transfer_student_between_packages(
  p_student_id UUID,
  p_new_package_id UUID,
  p_treasury_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_current_group RECORD;
  v_old_package RECORD;
  v_new_package RECORD;
  v_price_diff DECIMAL;
BEGIN
  SELECT g.*, ge.id AS enrollment_id INTO v_current_group
  FROM groups g
  JOIN group_enrollments ge ON ge.group_id = g.id
  WHERE ge.student_id = p_student_id AND ge.status = 'active';

  SELECT * INTO v_old_package FROM packages WHERE id = v_current_group.package_id;
  SELECT * INTO v_new_package FROM packages WHERE id = p_new_package_id;

  IF v_new_package IS NULL THEN
    RAISE EXCEPTION 'PACKAGE_NOT_FOUND: الباقة الجديدة غير موجودة';
  END IF;

  -- حساب الفرق
  v_price_diff := v_new_package.price_full - v_old_package.price_full;

  -- تحديث الجروب
  UPDATE groups SET package_id = p_new_package_id WHERE id = v_current_group.id;

  -- لو أغلى → سجل دفعة بالفرق
  IF v_price_diff > 0 THEN
    INSERT INTO payments (student_id, group_id, branch_id, payment_type, total_amount, paid_amount, treasury_id, created_by)
    SELECT p_student_id, v_current_group.id, v_current_group.branch_id, 'full', v_price_diff, v_price_diff, p_treasury_id, auth.uid();
  END IF;

  -- لو أرخص → credit (مش refund فعلي، يتسجل كـ credit note)
  IF v_price_diff < 0 THEN
    -- سجل ملاحظة في audit
    INSERT INTO audit_logs (actor_id, action, table_name, record_id, note)
    VALUES (auth.uid(), 'PACKAGE_DOWNGRADE_CREDIT', 'students', p_student_id,
      'فرق السعر: ' || ABS(v_price_diff) || ' جنيه كـ credit للطالب');
  END IF;

  RETURN jsonb_build_object('status', 'transferred', 'price_diff', v_price_diff);
END;
$$;

-- E.5: حساب خيارات التعويض
CREATE OR REPLACE FUNCTION fn_calculate_compensation_options(
  p_student_id UUID,
  p_missed_session_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_student RECORD;
  v_missed_session RECORD;
  v_next_session RECORD;
  v_available_slots JSONB;
  v_available_trainers JSONB;
BEGIN
  SELECT s.*, s.branch_id INTO v_student FROM students s WHERE s.id = p_student_id;

  SELECT gs.*, g.level_id, g.age_group_id, g.branch_id INTO v_missed_session
  FROM group_sessions gs JOIN groups g ON g.id = gs.group_id
  WHERE gs.id = p_missed_session_id;

  -- جيب السيشن التالية للطالب (deadline للتعويضية)
  SELECT gs.scheduled_at INTO v_next_session
  FROM group_sessions gs
  JOIN groups g ON g.id = gs.group_id
  JOIN group_enrollments ge ON ge.group_id = g.id
  WHERE ge.student_id = p_student_id AND ge.status = 'active'
    AND gs.scheduled_at > v_missed_session.scheduled_at
  ORDER BY gs.scheduled_at ASC LIMIT 1;

  -- ابحث عن جروبات متاحة في نفس الـ level + age_group + branch
  -- وقبل السيشن التالية
  SELECT jsonb_agg(jsonb_build_object(
    'group_session_id', gs.id,
    'group_id', g.id,
    'group_name', g.name,
    'scheduled_at', gs.scheduled_at,
    'trainer_id', g.trainer_id,
    'comp_type', 'group'
  ))
  INTO v_available_slots
  FROM group_sessions gs
  JOIN groups g ON g.id = gs.group_id
  WHERE g.level_id = v_missed_session.level_id
    AND g.age_group_id = v_missed_session.age_group_id
    AND g.branch_id = v_student.branch_id
    AND g.id != (SELECT group_id FROM group_sessions WHERE id = p_missed_session_id)
    AND g.status = 'active'
    AND gs.status = 'scheduled'
    AND gs.session_number = v_missed_session.session_number
    AND gs.scheduled_at > NOW()
    AND (v_next_session.scheduled_at IS NULL OR gs.scheduled_at < v_next_session.scheduled_at);

  -- جيب المدربين المتاحين للـ private session
  SELECT jsonb_agg(jsonb_build_object(
    'trainer_id', s.id,
    'trainer_name', p.full_name,
    'comp_type', 'private'
  ))
  INTO v_available_trainers
  FROM staff s JOIN profiles p ON p.id = s.profile_id
  WHERE s.branch_id = v_student.branch_id AND s.status = 'active' AND s.role = 'trainer';

  RETURN jsonb_build_object(
    'group_options', COALESCE(v_available_slots, '[]'),
    'private_options', COALESCE(v_available_trainers, '[]'),
    'deadline', v_next_session.scheduled_at,
    'note', 'كل خيارات التعويض مجانية للطالب'
  );
END;
$$;

-- E.6: اقتراح المدربين البدلاء
CREATE OR REPLACE FUNCTION fn_suggest_substitute_trainers(p_group_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_session RECORD;
  v_suggestions JSONB;
BEGIN
  SELECT gs.*, g.branch_id, g.level_id, g.age_group_id
  INTO v_session
  FROM group_sessions gs JOIN groups g ON g.id = gs.group_id
  WHERE gs.id = p_group_session_id;

  SELECT jsonb_agg(jsonb_build_object(
    'trainer_id', s.id,
    'name', p.full_name,
    'specialization', s.specialization,
    'has_conflict', EXISTS (
      SELECT 1 FROM group_sessions gs2
      WHERE gs2.trainer_id = s.profile_id
        AND gs2.scheduled_at = v_session.scheduled_at
        AND gs2.id != p_group_session_id
    )
  ))
  INTO v_suggestions
  FROM staff s JOIN profiles p ON p.id = s.profile_id
  WHERE s.branch_id = v_session.branch_id
    AND s.role = 'trainer'
    AND s.status = 'active'
    AND s.profile_id != v_session.trainer_id;

  RETURN COALESCE(v_suggestions, '[]');
END;
$$;

-- E.7: تعيين مدرب بديل
CREATE OR REPLACE FUNCTION fn_assign_substitute(
  p_group_session_id UUID,
  p_substitute_trainer_id UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_original_trainer UUID;
BEGIN
  SELECT trainer_id INTO v_original_trainer
  FROM group_sessions WHERE id = p_group_session_id;

  INSERT INTO substitutions (group_session_id, original_trainer_id, substitute_trainer_id, reason, assigned_by)
  VALUES (p_group_session_id, v_original_trainer, p_substitute_trainer_id, p_reason, auth.uid());

  UPDATE group_sessions SET trainer_id = p_substitute_trainer_id WHERE id = p_group_session_id;

  -- إشعار للمدرب البديل
  INSERT INTO notifications (recipient_id, type, title, body)
  VALUES (p_substitute_trainer_id, 'substitution', 'طُلب منك تدريس سيشن بدلاً عن زميلك', p_reason);

  RETURN jsonb_build_object('status', 'assigned');
END;
$$;
```

---

## PART F — EDGE FUNCTIONS

### F.1 `_shared/auth.ts` (مشترك بين كل Edge Functions)
```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function requireAuth(req: Request, allowedRoles?: string[]) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer "))
    throw new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: { user }, error } = await supabase.auth.getUser(
    authHeader.replace("Bearer ", "")
  );
  if (error || !user)
    throw new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  if (allowedRoles?.length) {
    const { data: roleData } = await supabase
      .from("user_roles").select("role, branch_id")
      .eq("user_id", user.id).single();

    if (!roleData || !allowedRoles.includes(roleData.role))
      throw new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });

    return { user, role: roleData.role, branch_id: roleData.branch_id };
  }

  return { user };
}
```

### F.2 Edge Functions المطلوبة (6)

| Function | المسؤولية | يستدعيها |
|---|---|---|
| `send-notification` | إرسال email عبر Resend | cron jobs + triggers |
| `generate-certificate-pdf` | PDF بـ @react-pdf/renderer → Storage | بعد الترقية |
| `process-entry-test` | تصحيح + تحديد level مقترح | بعد إنهاء الـ test |
| `handle-complex-transfer` | نقل بين الفروع (موافقتين + treasury) | بعد الموافقتين |
| `export-report` | تصدير CSV/PDF للتقارير | Admin |
| `monthly-commission-close` | قفل الشهر + حساب KPIs + snapshot | cron_monthly_close |

---

## PART G — pg_cron JOBS الكاملة

```sql
-- G.1: قفل الـ attendance بعد 30 دقيقة
SELECT cron.schedule('cron_lock_attendance', '*/30 * * * *', $$
  UPDATE attendance SET is_locked = true
  WHERE is_locked = false
    AND group_session_id IN (
      SELECT gs.id FROM group_sessions gs
      JOIN groups g ON g.id = gs.group_id
      JOIN branches b ON b.id = g.branch_id
      WHERE gs.status = 'live'
        AND (NOW() AT TIME ZONE b.timezone) >= (gs.scheduled_at AT TIME ZONE b.timezone + INTERVAL '30 minutes')
    );
$$);

-- G.2: إغلاق السيشنات بعد 24 ساعة
SELECT cron.schedule('cron_auto_close_sessions', '0 * * * *', $$
  UPDATE group_sessions SET status = 'completed', closed_at = NOW()
  WHERE status IN ('live', 'scheduled')
    AND scheduled_at < NOW() - INTERVAL '24 hours';
  -- الطلاب اللي مسجلوش = absent
  INSERT INTO attendance (student_id, group_session_id, status, recorded_by)
  SELECT ge.student_id, gs.id, 'absent', NULL
  FROM group_sessions gs
  JOIN group_enrollments ge ON ge.group_id = gs.group_id AND ge.status = 'active'
  WHERE gs.status = 'completed' AND gs.closed_at > NOW() - INTERVAL '1 hour'
  ON CONFLICT (student_id, group_session_id) DO NOTHING;
$$);

-- G.3: تذكير الأقساط (3 أيام قبل)
SELECT cron.schedule('cron_installment_reminders', '0 9 * * *', $$
  INSERT INTO notifications (recipient_id, type, title, body)
  SELECT s.profile_id, 'payment_reminder', 'تذكير: قسط يستحق قريباً',
         'القسط بتاعك بقيمة ' || i.amount || ' جنيه يستحق في ' || i.due_date
  FROM installments i
  JOIN students s ON s.id = i.student_id
  JOIN system_policies sp ON sp.branch_id = s.branch_id AND sp.key = 'payment_reminder_days'
  WHERE i.status = 'pending'
    AND i.due_date = CURRENT_DATE + ((sp.value->>'value')::INT);
$$);

-- G.4: حجب الطلاب المتأخرين في الدفع
SELECT cron.schedule('cron_payment_block', '0 9 * * *', $$
  UPDATE students SET subscription_status = 'payment_blocked'
  WHERE id IN (
    SELECT DISTINCT i.student_id FROM installments i
    JOIN students s ON s.id = i.student_id
    JOIN system_policies sp ON sp.branch_id = s.branch_id AND sp.key = 'payment_overdue_block_days'
    WHERE i.status = 'pending'
      AND i.due_date < CURRENT_DATE - ((sp.value->>'value')::INT)
  )
  AND subscription_status = 'active';
$$);

-- G.5: تحديث عداد الواجبات المتأخرة
SELECT cron.schedule('cron_check_missed_assignments', '0 23 * * *', $$
  UPDATE assignment_submissions SET status = 'missed', counted_as_missed = true
  WHERE status = 'pending' AND due_at < NOW() AND counted_as_missed = false;
$$);

-- G.6: إغلاق compensation requests المنتهية
SELECT cron.schedule('cron_compensation_deadlines', '0 * * * *', $$
  UPDATE compensation_requests SET status = 'expired'
  WHERE status = 'pending' AND deadline < NOW();
$$);

-- G.7: إغلاق الشهر + KPIs (أول الشهر)
SELECT cron.schedule('cron_monthly_close', '1 0 1 * *', $$
  SELECT net.http_post(
    url := current_setting('supabase.url') || '/functions/v1/monthly-commission-close',
    headers := '{"Authorization": "Bearer ' || current_setting('supabase.service_role_key') || '"}'::jsonb,
    body := '{}'::jsonb
  );
$$);

-- G.8: تنبيه الطلاب الغير نشطين
SELECT cron.schedule('cron_warn_inactive_students', '0 10 * * 0', $$
  INSERT INTO notifications (recipient_id, type, title, body)
  SELECT s.profile_id, 'inactivity_warning', 'لم نرك منذ فترة', 'لم تسجل دخول للأكاديمية منذ 7 أيام'
  FROM students s
  WHERE s.subscription_status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM attendance a
      WHERE a.student_id = s.id AND a.recorded_at > NOW() - INTERVAL '7 days'
    );
$$);
```

---

## PART H — BUSINESS FLOWS الكاملة والمتحققة

### H.1 تسجيل طالب جديد (من A لـ Z)

```
المسؤول: Reception / Sales

1. Reception يدخل بيانات الطالب + ولي الأمر
   → trg_student_age_group يحسب age_group من DOB أوتوماتيك

2. الطالب يعمل Entry Test
   → Edge Function: process-entry-test → يصحح + يقترح level

3. Reception يراجع النتيجة ويحدد الـ level
   → entry_test_attempts.assigned_level_id يُحدَّث

4. Reception يعرض الجروبات المتاحة
   → (نفس level + branch + age_group + فيه مكان)
   → الطالب/الولي يختار

5. Reception يسجل enrollment
   → trg_validate_group_capacity → يرفض لو ممتلئ
   → trg_snapshot_policies_on_enrollment → ينسخ السياسات

6. Reception يسجل الدفعة
   → trg_treasury_ledger → يحدث رصيد الخزنة
   → trg_commission_on_first_payment → عمولة للسيلز

7. Notifications للطالب + الولي + المدرب

الـ Status النهائي: subscription_status = 'active'
```

### H.2 السيشن اليومية (من البداية للنهاية)

```
المسؤول: Trainer (أساسي) + cron jobs (تلقائي)

1. [تلقائي] trg_create_group_sessions أنشأ 12 sessions وقت إنشاء الجروب

2. Trainer يفتح السيشن
   → group_sessions.status = 'live', opened_at = NOW()

3. Trainer يسجل attendance لكل طالب
   → present / absent / excused / late

4. Trainer يسجل evaluations (7 معايير) لكل طالب

5. [تلقائي - cron_lock_attendance كل 30 دقيقة]
   → attendance.is_locked = true بعد 30 دقيقة

6. Trainer يسند assignment + quiz للسيشن
   → trg_set_quiz_deadline يحدد deadline الكويز أوتوماتيك

7. Trainer يغلق السيشن
   → group_sessions.status = 'completed'
   → لو مفعلناش: cron_auto_close_sessions بيعمله بعد 24 ساعة

8. [تلقائي - cron_daily_attendance_check 23:00]
   → كل absent → compensation_requests مع deadline = قبل السيشن الجاية

9. لو الطالب مش حجز compensation قبل الـ deadline
   → cron_compensation_deadlines → status = 'expired'
   → trg_auto_block_on_missed_compensation → منع من السيشن التالية + compensation جديدة

10. لو تخطى حد الغيابات
    → trg_full_ban_on_threshold → fully_banned + reinstatement_fee

للـ Admin override (لو attendance اتقفل بالغلط):
   → admin_attendance_overrides جدول + audit log
```

### H.3 المالية والأقساط

```
المسؤول: Reception

دفع كامل:
1. Reception يسجل payment (full) → treasury_ledger ← بالحساب
2. trg_commission_on_first_payment → commission للسيلز
3. subscription_status = 'active'

دفع بالأقساط:
1. Reception يسجل payment (installment) + N installments
2. كل قسط له due_date

الـ Reminders:
- cron_installment_reminders (كل يوم 9 صباحاً)
- إشعار للطالب 3 أيام قبل كل قسط

التأخر:
- cron_payment_block → subscription_status = 'payment_blocked'

عند الدفع:
- Reception يسجل الدفعة
- trg_restore_access_on_payment → status = 'active' أوتوماتيك
  (بس لو مفيش أقساط overdue تانية)

الخطأ:
- مبلغ غلط → refund entry جديد في treasury_transactions (مش حذف)
- audit log بالـ reason
```

### H.4 ترقية الطالب

```
المسؤول: Trainer (يدخل Final Exam) + System (يحسب + يرقي)

1. Trainer يدخل درجة Final Exam
   → level_progressions.final_exam_score

2. Admin/Reception يستدعي calculate-scores Edge Function
   → يحسب classwork + quiz + assignment + final exam
   → يحدد passed/failed + failure_reason

3. لو نجح:
   → fn_promote_student_to_next_level
   → جيب جروب next level + age_group + branch + مكان
   → enrollment تلقائي
   → trg_snapshot_policies_on_enrollment (سياسات جديدة)
   → generate-certificate-pdf Edge Function → PDF في Storage

4. لو ما لقاش جروب:
   → subscription_status = 'awaiting_placement'
   → notification للـ Reception

5. لو رسب:
   → Reception يقرر: يعيد الـ level ولا drop
   → لو إعادة: enrollment في نفس الجروب (أو جروب تاني) بنفس الـ snapshot
```

### H.5 نقل الطالب

```
بين جروبات (نفس الفرع):
- Reception → fn_transfer_student_between_groups
- يحفظ history (enrollment القديم status = 'transferred')
- يعمل enrollment جديد + snapshot جديد
- مجاناً

بين باقات:
- Reception → fn_transfer_student_between_packages
- يحسب الفرق:
  * أغلى: يدفع الفرق فوراً (payment جديد)
  * أرخص: credit note في audit_log
- المحتوى يتفتح/يتقل حسب الباقة الجديدة (RLS بتتحكم)

بين فروع:
1. Reception (فرع A) يفتح transfer_request
2. Branch Admin (فرع A) يوافق → status = 'approved_by_from'
3. Branch Admin (فرع B) يوافق + يحدد الجروب → status = 'approved'
4. handle-complex-transfer Edge Function:
   - ينقل كل الـ records
   - treasury_transfer لو فيه رصيد
   - enrollment في الجروب الجديد
   - notifications للكل
```

### H.6 تجميد جروب

```
المسؤول: Branch Admin / Super Admin

1. Admin يجمد الجروب (group.status = 'frozen')

2. trg_cascade_group_freeze:
   - كل group_sessions القادمة → status = 'frozen'
   - لكل سيشن مجمدة × لكل طالب مسجل:
     → compensation_request مع deadline مرن (14 يوم)
   - Notifications للطلاب والأولياء

3. Reception خيارات:
   أ) يحجز compensation (جروب تاني أو private) لكل طالب
   ب) ينقل الطلاب لجروبات تانية (fn_transfer_student_between_groups)

الـ private compensations:
- Reception يجدول مع مدرب
- تكلفة المدرب تتسجل كـ expense من الأكاديمية
```

### H.7 KPIs والموظفين

```
أول الشهر (cron_monthly_close):
1. monthly-commission-close Edge Function:
   - يقفل commission_rules الشهر الحالي (locked_at = NOW())
   - يقفل commission_assignments (month_locked = first of month)
   - يحسب commissions لكل سيلز
   - يحفظ kpi_weights_snapshots

نهاية الشهر (cron_kpi_calculation 2am):
2. يحسب kpi_scores لكل موظف:
   - Trainer: % فتح السيشن، % تسجيل الحضور في وقته، تصحيح الواجبات
   - Reception: % تنظيم التعويضيات، % متابعة الأقساط، % تسجيل المدفوعات

3 warnings → notification للـ Super Admin
```

---

## PART I — ROLES MATRIX الكامل

| Action | Super Admin | Branch Admin | Reception | Sales | Trainer | Student | Parent |
|---|---|---|---|---|---|---|---|
| إدارة فروع | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Packages/Levels/Content | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| System Policies | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| إنشاء/تجميد جروب | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Student Onboarding | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| تسجيل دفعة | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Expenses | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Commission Rates | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Commission Dashboard | ✅ | ✅ | ❌ | ✅ (نفسه) | ❌ | ❌ | ❌ |
| Attendance | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Admin Override Attendance | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Evaluation | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Compensation Booking | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| اختيار Substitute | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Transfer (groups/packages) | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Transfer (branches) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Final Exam + Grading | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Staff Management + KPI | ✅ | ✅ (فرعه) | ❌ | ❌ | ❌ | ❌ | ❌ |
| Entry Test (إدارة) | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Entry Test (حل) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| محتوى (عرض) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ (باقته) | ❌ |
| واجبات + كويزات | ❌ | ❌ | ❌ | ❌ | ✅ (تسند+تصحح) | ✅ (يسلم) | ❌ |
| متابعة ابنه | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| ماليات ابنه | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ (قراءة) |

---

## PART J — ANTI-SPAGHETTI CONTRACT (إجباري للأبد)

### J.1 The 5 Laws (مش قواعد — قوانين)

```
LAW 1: Business Logic → Supabase فقط
  أي conditional، calculation، أو state change = في trigger/RPC/Edge Function
  الـ Frontend بيعرض نتائج فقط

LAW 2: One Way Down
  UI → Query Hook → API Layer → Supabase
  مش مسموح بـ skip أي طبقة

LAW 3: Feature Isolation
  features/a لا يعرف شيئاً عن features/b إلا من الـ barrel (index.ts)

LAW 4: No Magic Numbers
  كل حد أو سعر أو نسبة = في system_policies أو policy_snapshots
  مش في الكود

LAW 5: Audit Everything Financial
  أي حركة مالية = treasury_transactions entry
  مش مسموح بحذف أو تعديل في payments/expenses/commissions
```

### J.2 Feature Folder Template (للنسخ والتطبيق)

```
features/<name>/
  index.ts            ← export { ComponentName, hookName, TypeName }
  types.ts            ← import from '@/types/database.types' + extend
  schemas.ts          ← z.object({ ... }) للـ forms والـ API calls
  queries/
    <entity>.queries.ts
  components/
    <Entity>List.tsx  ← max 200 lines
    <Entity>Form.tsx  ← max 200 lines
    <Entity>Card.tsx  ← max 200 lines
  hooks/
    use-<entity>.ts   ← UI state only (selected item, open modal, etc.)
```

### J.3 Adding New Feature — 7 Steps (لا تتخطى خطوة)

```
Step 1: DB Migration
  - tables + columns + constraints + CHECK
  - RLS policies (على الأقل super_admin + owner)
  - triggers (لو فيه cascade logic)
  - RPCs (لو فيه atomic multi-step)

Step 2: Types
  - شغّل: supabase gen types typescript --project-id <id> > src/types/database.types.ts
  - ضيف domain types في features/<name>/types.ts

Step 3: Zod Schemas
  - في features/<name>/schemas.ts
  - واحد للـ create، واحد للـ update، واحد للـ API response

Step 4: API Layer
  - في lib/api/<name>.api.ts
  - كل function: typed input + typed output + error handling

Step 5: Query Hooks
  - في features/<name>/queries/<name>.queries.ts
  - useXxxQuery (read) + useXxxMutation (write + invalidate)

Step 6: Components
  - في features/<name>/components/
  - List + Form + Card
  - max 200 lines each

Step 7: Route + RLS Test
  - أضف الـ page في src/pages/<role>/
  - اختبر من 3 users بـ roles مختلفة
  - تأكد إن RLS بتمنع الوصول غير المصرح
```

### J.4 Forbidden Patterns (المخالفة = رفض الـ code)

```typescript
// ❌ ممنوع: business logic في component
const handleAbsence = () => {
  if (student.absences > 2) { // ← هذا في DB trigger
    setStudentStatus('banned');
  }
};

// ✅ صح: call RPC وخلي DB يعمل الـ logic
const handleAbsence = () => {
  supabase.rpc('fn_record_attendance', { student_id, status: 'absent' });
};

// ❌ ممنوع: direct Supabase في component
const { data } = await supabase.from('students').select('*');

// ✅ صح: من خلال API Layer
const { data } = await studentsApi.getAll(branchId);

// ❌ ممنوع: hardcoded policy
if (absences >= 2) { ... }

// ✅ صح: من system_policies
const limit = await getPolicyValue(branchId, 'consecutive_absence_limit');
if (absences >= limit) { ... }

// ❌ ممنوع: cross-feature import
import { StudentCard } from '@/features/students/components/StudentCard';

// ✅ صح: من الـ barrel
import { StudentCard } from '@/features/students';

// ❌ ممنوع: optimistic update على عملية مالية
queryClient.setQueryData(['payments'], (old) => [...old, newPayment]);

// ✅ صح: انتظر الـ server confirmation
await paymentsApi.create(data);
await queryClient.invalidateQueries({ queryKey: ['payments'] });
```

---

## PART K — SCALABILITY CHECKLIST

### الآن (MVP):
- ✅ DB indexes على: `branch_id`, `student_id`, `group_id`, `status`, `scheduled_at`
- ✅ `audit_logs` PARTITION BY RANGE (شهري)
- ✅ Soft delete على الـ entities الأساسية
- ✅ policy_snapshots يحمي من تغيير السياسات بأثر رجعي

### لاحقاً (Phase 2+):
- 📋 `group_sessions` PARTITION BY RANGE (سنوي) لو البيانات كبرت
- 📋 Supabase Read Replicas لو الـ queries كثرت
- 📋 Redis/Upstash cache للـ system_policies (متغيرة ببطء)
- 📋 Payment Gateway (Stripe/Paymob) بـ Edge Function wrapper
- 📋 Multi-branch reporting dashboard
- 📋 Mobile app (نفس Supabase backend، React Native frontend)

---

## نقاط التفتيش قبل Phase 0

- [ ] Supabase project موجود ومتصل بـ Lovable
- [ ] `supabase gen types` شغّال وبيولّد `database.types.ts`
- [ ] Seed data: branches + age_groups + system_policies + packages + levels
- [ ] Super Admin user موجود في `auth.users` + `user_roles`
- [ ] Login page بيعمل redirect حسب الـ role
- [ ] RLS مختبر من 3 roles مختلفة على جدول `students`
