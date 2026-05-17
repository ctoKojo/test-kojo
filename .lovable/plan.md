# Lovable Prompt — Kojo Academy

---

## 🔴 الجزء الأول: المرجعية والقواعد (اقرأ أولاً قبل أي سطر كود)

أنت تبني **Kojo Academy** — سيستم إداري لأكاديمية تعليمية أونلاين وأوفلاين.

### القانون الذهبي (غير قابل للكسر أبداً)
```
كل business logic = في Supabase فقط (triggers + RPC + Edge Functions)
Frontend = Display + Forms + Navigation فقط
لا conditional، لا calculation، لا state change في أي React component
```

### قرار الـ architecture قبل أي component
```
Decision Tree:
هل الـ logic يحصل بغض النظر عن الـ UI؟
  ↓ أيوه
  هل هو atomic ومحتاج DB transaction؟
    ↓ أيوه → DB Trigger أو RPC (supabase.rpc())
    ↓ لا   → هل محتاج external API / secrets؟
                ↓ أيوه → Edge Function
                ↓ لا   → supabase.rpc() من الـ client
  ↓ لا
  هل هو UI state (modal، tab، filter)؟
    ↓ أيوه → Zustand
    ↓ لا   → TanStack Query
```

---

## 🗄️ الجزء الثاني: الـ Database (أنشئها أولاً — قبل أي UI)

### الـ Stack
- **Frontend:** React + TypeScript (Lovable)
- **Backend:** Supabase (PostgreSQL + Auth + Edge Functions + pg_cron)
- **Auth:** Supabase Auth — Google + Apple + Email/Password
- **Storage:** External links فقط (YouTube / Google Drive / Vimeo) — مش Supabase Storage للمحتوى

### الـ 42 جدول (مقسمة على 5 طبقات)

---

#### Layer 0 — Identity & Config

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

-- بيانات المستخدمين
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  preferred_language TEXT DEFAULT 'ar',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- أدوار المستخدمين
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
  name TEXT NOT NULL,
  min_age INT NOT NULL,
  max_age INT NOT NULL,
  CONSTRAINT valid_age_range CHECK (min_age < max_age)
);

-- Seed: INSERT INTO age_groups VALUES
-- (gen_random_uuid(), 'أطفال', 6, 9),
-- (gen_random_uuid(), 'ناشئين', 10, 13),
-- (gen_random_uuid(), 'مراهقين', 14, 18);

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
  consecutive_absences INT DEFAULT 0,
  total_absences INT DEFAULT 0,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- سياسات النظام (per branch، كلها configurable)
CREATE TABLE system_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (branch_id, key)
);
-- Seed للـ policies:
-- consecutive_absence_limit: {"value": 2}
-- total_absence_limit: {"value": 5}
-- free_absences_per_level: {"value": 2}
-- session_lock_minutes: {"value": 30}
-- session_auto_close_hours: {"value": 24}
-- compensation_deadline_days: {"value": 7}
-- payment_overdue_block_days: {"value": 3}
-- payment_reminder_days: {"value": 3}
-- reinstatement_fee_type: {"value": "fixed"}
-- reinstatement_fee_value: {"value": 500}
-- siblings_discount_pct: {"value": 0.10}
-- kpi_monthly_close_day: {"value": 1}
-- quiz_deadline_hours: {"value": 48}
-- assignment_deadline_hours: {"value": 24}
-- consecutive_hw_miss_limit: {"value": 2}
-- total_hw_miss_limit: {"value": 5}
-- trainer_leave_notice_hours: {"value": 48}
-- compensation_parent_response_hours: {"value": 48}
-- compensation_escalation_hours: {"value": 72}
-- attendance_threshold_pct: {"value": 70}
-- homework_threshold_pct: {"value": 70}
-- quiz_threshold_pct: {"value": 70}

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

CREATE TABLE audit_logs_2025 PARTITION OF audit_logs
  FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE audit_logs_2026 PARTITION OF audit_logs
  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

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

---

#### Layer 1 — Curriculum

```sql
-- الباقات
CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  min_capacity INT NOT NULL CHECK (min_capacity >= 1),
  max_capacity INT NOT NULL,
  price_full DECIMAL(10,2) NOT NULL CHECK (price_full >= 0),
  price_monthly DECIMAL(10,2) CHECK (price_monthly >= 0),
  online_price DECIMAL(10,2) CHECK (online_price >= 0),
  content_includes TEXT[],  -- ['slides', 'summary_video', 'full_video']
  deleted_at TIMESTAMPTZ,
  CONSTRAINT valid_capacity CHECK (min_capacity <= max_capacity)
);
-- Seed:
-- Kojo Squad: min=6, max=8, content=['slides']
-- Kojo Core: min=2, max=3, content=['slides','summary_video']
-- Kojo X: min=1, max=1, content=['slides','summary_video','full_video']

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

-- السيشنات في المستوى (المنهج الثابت)
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
  url TEXT,
  UNIQUE (level_session_id, package_id, content_type)
);

-- الواجبات (ثابتة per level_session)
CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level_session_id UUID NOT NULL REFERENCES level_sessions(id),
  title TEXT NOT NULL,
  description TEXT,
  max_score DECIMAL(5,2) DEFAULT 100,
  created_by UUID REFERENCES profiles(id)
);

-- الكويزات
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
  options JSONB,
  correct_answer TEXT NOT NULL,
  points DECIMAL(5,2) DEFAULT 1
);

-- أسئلة الـ Entry Test
CREATE TABLE entry_test_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  age_group_id UUID NOT NULL REFERENCES age_groups(id),
  question_text TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('mcq','true_false')),
  options JSONB,
  correct_answer TEXT NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('easy','medium','hard')),
  level_indicator INT
);
```

---

#### Layer 2 — Operations

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
    CHECK (status IN ('scheduled','live','completed','frozen','cancelled','auto_closed')),
  opened_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  trainer_id UUID REFERENCES profiles(id),
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
    CHECK (status IN ('pending','scheduled','completed','expired','cancelled','failed_scheduling')),
  comp_type TEXT CHECK (comp_type IN ('group','private')),
  deadline TIMESTAMPTZ,
  compensation_session_id UUID REFERENCES compensation_sessions(id),
  is_recursive BOOL DEFAULT false,
  recursion_depth INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- السيشنات التعويضية
CREATE TABLE compensation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_session_id UUID REFERENCES group_sessions(id),
  trainer_id UUID NOT NULL REFERENCES profiles(id),
  student_id UUID NOT NULL REFERENCES students(id),
  scheduled_at TIMESTAMPTZ NOT NULL,
  comp_type TEXT NOT NULL CHECK (comp_type IN ('group','private')),
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','cancelled')),
  expense_id UUID REFERENCES expenses(id)
);

-- تسليم الواجبات
CREATE TABLE assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id),
  assignment_id UUID NOT NULL REFERENCES assignments(id),
  group_session_id UUID NOT NULL REFERENCES group_sessions(id),
  group_enrollment_id UUID NOT NULL REFERENCES group_enrollments(id),
  submitted_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  file_url TEXT,
  grade DECIMAL(5,2),
  late_penalty DECIMAL(5,2) DEFAULT 0,
  feedback TEXT,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','submitted','late','graded','missed')),
  counted_as_missed BOOL DEFAULT false,
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
  deadline TIMESTAMPTZ,
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
  assigned_level_id UUID REFERENCES levels(id),
  is_borderline BOOL DEFAULT false,
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

-- Admin overrides للـ attendance بعد القفل
CREATE TABLE admin_attendance_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_id UUID NOT NULL REFERENCES attendance(id),
  old_status TEXT,
  new_status TEXT,
  reason TEXT NOT NULL,
  overridden_by UUID NOT NULL REFERENCES profiles(id),
  overridden_at TIMESTAMPTZ DEFAULT NOW()
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

#### Layer 3 — Financial

```sql
-- الخزن (3 لكل فرع: cash, wallet, bank)
CREATE TABLE treasuries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cash','wallet','bank')),
  balance DECIMAL(12,2) NOT NULL DEFAULT 0
    CONSTRAINT no_negative_balance CHECK (balance >= -0.01),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (branch_id, type)
);

-- سجل الحركات المالية (immutable ledger)
CREATE TABLE treasury_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  treasury_id UUID NOT NULL REFERENCES treasuries(id),
  type TEXT NOT NULL CHECK (type IN ('credit','debit')),
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  category TEXT NOT NULL,
  reference_id UUID,
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
  category TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  treasury_id UUID NOT NULL REFERENCES treasuries(id),
  description TEXT,
  receipt_url TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  paid_at TIMESTAMPTZ DEFAULT NOW()
);

-- قواعد العمولة
CREATE TABLE commission_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  package_id UUID REFERENCES packages(id),
  rate DECIMAL(5,4) NOT NULL CHECK (rate BETWEEN 0 AND 1),
  valid_from DATE NOT NULL,
  locked_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id)
);

-- تعيين السيلز للطالب
CREATE TABLE commission_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id),
  sales_id UUID NOT NULL REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES profiles(id),
  month_locked DATE,
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
  month DATE NOT NULL,
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

---

#### Layer 4 — Staff & KPIs

```sql
-- الموظفون
CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID UNIQUE NOT NULL REFERENCES profiles(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  role TEXT NOT NULL CHECK (role IN ('trainer','receptionist','sales','branch_admin')),
  specialization TEXT[],
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
  unit TEXT,
  UNIQUE (branch_id, role, metric_key)
);

-- أوزان KPI الشهرية (snapshot)
CREATE TABLE kpi_weights_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  role TEXT NOT NULL,
  month DATE NOT NULL,
  weights JSONB NOT NULL,
  locked_at TIMESTAMPTZ,
  UNIQUE (branch_id, role, month)
);

-- درجات KPI الشهرية
CREATE TABLE kpi_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id),
  month DATE NOT NULL,
  scores JSONB NOT NULL,
  total_score DECIMAL(5,2),
  grade TEXT,
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
  storage_path TEXT,
  template_version TEXT,
  UNIQUE (student_id, level_id)
);
```

---

### Indexes (أنشئها بعد الجداول)

```sql
CREATE INDEX idx_students_branch ON students(branch_id);
CREATE INDEX idx_students_status ON students(subscription_status);
CREATE INDEX idx_group_sessions_group ON group_sessions(group_id);
CREATE INDEX idx_group_sessions_scheduled ON group_sessions(scheduled_at);
CREATE INDEX idx_group_sessions_status ON group_sessions(status);
CREATE INDEX idx_attendance_student ON attendance(student_id);
CREATE INDEX idx_attendance_session ON attendance(group_session_id);
CREATE INDEX idx_installments_student ON installments(student_id);
CREATE INDEX idx_installments_due ON installments(due_date);
CREATE INDEX idx_installments_status ON installments(status);
CREATE INDEX idx_compensation_student ON compensation_requests(student_id);
CREATE INDEX idx_compensation_status ON compensation_requests(status);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX idx_notifications_read ON notifications(read_at) WHERE read_at IS NULL;
```

---

## ⚙️ الجزء الثالث: Triggers (14 trigger)

```sql
-- T1: حساب الفئة العمرية أوتوماتيك
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

-- T2: snapshot السياسات عند التسجيل
CREATE OR REPLACE FUNCTION fn_snapshot_policies_on_enrollment()
RETURNS TRIGGER AS $$
DECLARE
  v_branch_id UUID;
  v_policies JSONB;
BEGIN
  SELECT branch_id INTO v_branch_id FROM students WHERE id = NEW.student_id;
  SELECT jsonb_object_agg(key, value) INTO v_policies
  FROM system_policies WHERE branch_id = v_branch_id;
  INSERT INTO policy_snapshots (student_id, enrollment_id, policies)
  VALUES (NEW.student_id, NEW.id, v_policies);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_snapshot_policies_on_enrollment
  AFTER INSERT ON group_enrollments
  FOR EACH ROW EXECUTE FUNCTION fn_snapshot_policies_on_enrollment();

-- T3: التحقق من capacity الجروب
CREATE OR REPLACE FUNCTION fn_validate_group_capacity()
RETURNS TRIGGER AS $$
DECLARE
  v_current_count INT;
  v_max_capacity INT;
BEGIN
  SELECT COUNT(*) INTO v_current_count
  FROM group_enrollments WHERE group_id = NEW.group_id AND status = 'active';
  SELECT p.max_capacity INTO v_max_capacity
  FROM groups g JOIN packages p ON p.id = g.package_id WHERE g.id = NEW.group_id;
  IF v_current_count >= v_max_capacity THEN
    RAISE EXCEPTION 'GROUP_FULL: الجروب وصل الحد الأقصى (%) طالب', v_max_capacity;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_validate_group_capacity
  BEFORE INSERT ON group_enrollments
  FOR EACH ROW EXECUTE FUNCTION fn_validate_group_capacity();

-- T4: التحقق من online link
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

-- T5: الحرمان الكامل عند تخطي حد الغيابات (مع قراءة policy_snapshot)
CREATE OR REPLACE FUNCTION fn_full_ban_on_threshold()
RETURNS TRIGGER AS $$
DECLARE
  v_student RECORD;
  v_policy_consecutive INT;
  v_policy_total INT;
  v_branch_id UUID;
  v_reinstatement_amount DECIMAL;
BEGIN
  IF NEW.status NOT IN ('absent') THEN RETURN NEW; END IF;
  SELECT s.*, s.branch_id INTO v_student FROM students s WHERE s.id = NEW.student_id;
  v_branch_id := v_student.branch_id;
  -- قراءة السياسات من أحدث snapshot (fallback للـ system_policies)
  SELECT
    COALESCE((ps.policies->>'consecutive_absence_limit')::INT, 2),
    COALESCE((ps.policies->>'total_absence_limit')::INT, 5)
  INTO v_policy_consecutive, v_policy_total
  FROM policy_snapshots ps
  JOIN group_enrollments ge ON ge.id = ps.enrollment_id
  WHERE ge.student_id = NEW.student_id AND ge.status IN ('active','transferred')
  ORDER BY ps.snapped_at DESC LIMIT 1;
  v_policy_consecutive := COALESCE(v_policy_consecutive, 2);
  v_policy_total := COALESCE(v_policy_total, 5);
  -- حدّث العدادات
  UPDATE students SET
    consecutive_absences = consecutive_absences + 1,
    total_absences = total_absences + 1
  WHERE id = NEW.student_id
  RETURNING consecutive_absences, total_absences
  INTO v_student.consecutive_absences, v_student.total_absences;
  -- فحص الحرمان
  IF v_student.consecutive_absences >= v_policy_consecutive
  OR v_student.total_absences >= v_policy_total THEN
    SELECT COALESCE((value->>'value')::DECIMAL, 0) INTO v_reinstatement_amount
    FROM system_policies WHERE branch_id = v_branch_id AND key = 'reinstatement_fee_value';
    UPDATE students SET subscription_status = 'fully_banned' WHERE id = NEW.student_id;
    INSERT INTO student_blocks (student_id, block_type, reason)
    VALUES (NEW.student_id, 'fully_banned', 'تجاوز حد الغيابات المسموح به');
    IF v_reinstatement_amount > 0 THEN
      INSERT INTO reinstatement_fees (student_id, amount, reason)
      VALUES (NEW.student_id, v_reinstatement_amount, 'رسوم استرداد الحساب بعد الحرمان');
    END IF;
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

-- T6: إعادة الـ access عند دفع القسط
-- ⚠️ مهم: يفرق بين payment_blocked (يرجع active) و restricted (يفضل restricted)
CREATE OR REPLACE FUNCTION fn_restore_access_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
    IF NOT EXISTS (
      SELECT 1 FROM installments
      WHERE student_id = NEW.student_id AND status = 'overdue' AND id != NEW.id
    ) THEN
      -- يرجع access بس لو كان payment_blocked (مش restricted أو fully_banned)
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

-- T7: تجميد الجروب cascade
CREATE OR REPLACE FUNCTION fn_cascade_group_freeze()
RETURNS TRIGGER AS $$
DECLARE v_session RECORD; v_student_id UUID;
BEGIN
  IF NEW.status = 'frozen' AND OLD.status != 'frozen' THEN
    UPDATE group_sessions SET status = 'frozen'
    WHERE group_id = NEW.id AND scheduled_at > NOW() AND status = 'scheduled';
    FOR v_session IN
      SELECT * FROM group_sessions
      WHERE group_id = NEW.id AND status = 'frozen' AND scheduled_at > NOW()
    LOOP
      FOR v_student_id IN
        SELECT student_id FROM group_enrollments
        WHERE group_id = NEW.id AND status = 'active'
      LOOP
        INSERT INTO compensation_requests (student_id, missed_session_id, status, deadline)
        VALUES (v_student_id, v_session.id, 'pending', v_session.scheduled_at + INTERVAL '14 days')
        ON CONFLICT DO NOTHING;
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

-- T8: deadline الكويز
CREATE OR REPLACE FUNCTION fn_set_quiz_deadline()
RETURNS TRIGGER AS $$
DECLARE v_deadline_hours INT; v_session_scheduled_at TIMESTAMPTZ;
BEGIN
  SELECT q.deadline_hours_after_session, gs.scheduled_at
  INTO v_deadline_hours, v_session_scheduled_at
  FROM quizzes q JOIN group_sessions gs ON gs.id = NEW.group_session_id
  WHERE q.id = NEW.quiz_id;
  NEW.deadline := v_session_scheduled_at + (v_deadline_hours || ' hours')::INTERVAL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_set_quiz_deadline
  BEFORE INSERT ON quiz_attempts
  FOR EACH ROW EXECUTE FUNCTION fn_set_quiz_deadline();

-- T9: تصحيح الكويز أوتوماتيك
CREATE OR REPLACE FUNCTION fn_auto_grade_quiz()
RETURNS TRIGGER AS $$
DECLARE v_question RECORD; v_total DECIMAL := 0; v_earned DECIMAL := 0;
BEGIN
  IF NEW.status = 'submitted' AND OLD.status != 'submitted' THEN
    FOR v_question IN SELECT * FROM quiz_questions WHERE quiz_id = NEW.quiz_id LOOP
      v_total := v_total + v_question.points;
      IF lower(trim(NEW.answers ->> v_question.id::TEXT)) = lower(trim(v_question.correct_answer)) THEN
        v_earned := v_earned + v_question.points;
      END IF;
    END LOOP;
    NEW.score := CASE WHEN v_total > 0 THEN (v_earned / v_total) * 100 ELSE 0 END;
    NEW.status := 'graded';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_auto_grade_quiz
  BEFORE UPDATE ON quiz_attempts
  FOR EACH ROW EXECUTE FUNCTION fn_auto_grade_quiz();

-- T10: commission على أول دفعة
CREATE OR REPLACE FUNCTION fn_commission_on_first_payment()
RETURNS TRIGGER AS $$
DECLARE v_sales_id UUID; v_rate DECIMAL; v_commission_amount DECIMAL;
BEGIN
  SELECT sales_id INTO v_sales_id FROM commission_assignments
  WHERE student_id = NEW.student_id
    AND (month_locked IS NULL OR month_locked <= date_trunc('month', NOW()))
  ORDER BY assigned_at DESC LIMIT 1;
  IF v_sales_id IS NULL THEN RETURN NEW; END IF;
  SELECT rate INTO v_rate FROM commission_rules
  WHERE branch_id = NEW.branch_id
    AND (package_id IS NULL OR package_id = (SELECT package_id FROM groups WHERE id = NEW.group_id))
    AND (locked_at IS NULL OR locked_at > NOW())
  ORDER BY valid_from DESC LIMIT 1;
  IF v_rate IS NULL THEN RETURN NEW; END IF;
  INSERT INTO commissions (sales_id, student_id, payment_id, amount, rate_snapshot, month)
  VALUES (v_sales_id, NEW.student_id, NEW.id, NEW.paid_amount * v_rate, v_rate, date_trunc('month', NOW()));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_commission_on_first_payment
  AFTER INSERT ON payments
  FOR EACH ROW EXECUTE FUNCTION fn_commission_on_first_payment();

-- T11: treasury ledger (double-entry)
CREATE OR REPLACE FUNCTION fn_treasury_ledger()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'payments' AND TG_OP = 'INSERT' THEN
    UPDATE treasuries SET balance = balance + NEW.paid_amount WHERE id = NEW.treasury_id;
    INSERT INTO treasury_transactions (treasury_id, type, amount, category, reference_id, reference_type)
    VALUES (NEW.treasury_id, 'credit', NEW.paid_amount, 'payment', NEW.id, 'payments');
  ELSIF TG_TABLE_NAME = 'expenses' AND TG_OP = 'INSERT' THEN
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
CREATE TRIGGER trg_treasury_ledger_payments
  AFTER INSERT ON payments FOR EACH ROW EXECUTE FUNCTION fn_treasury_ledger();
CREATE TRIGGER trg_treasury_ledger_expenses
  AFTER INSERT ON expenses FOR EACH ROW EXECUTE FUNCTION fn_treasury_ledger();
CREATE TRIGGER trg_treasury_ledger_reinstatement
  AFTER UPDATE ON reinstatement_fees FOR EACH ROW EXECUTE FUNCTION fn_treasury_ledger();

-- T12: audit log على الجداول الحساسة
CREATE OR REPLACE FUNCTION fn_audit_log()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (actor_id, action, table_name, record_id, old_data, new_data)
  VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_audit_payments AFTER INSERT OR UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
CREATE TRIGGER trg_audit_students AFTER UPDATE ON students FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
CREATE TRIGGER trg_audit_blocks AFTER INSERT OR UPDATE ON student_blocks FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
CREATE TRIGGER trg_audit_reinstatement AFTER INSERT OR UPDATE ON reinstatement_fees FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
CREATE TRIGGER trg_audit_attendance_override AFTER INSERT ON admin_attendance_overrides FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- T13: إنشاء group_sessions أوتوماتيك عند إنشاء جروب جديد
-- ⚠️ ملاحظة: التواريخ بـ null — يتم تحديدها يدوياً بعدين من الـ receptionist
CREATE OR REPLACE FUNCTION fn_create_group_sessions()
RETURNS TRIGGER AS $$
DECLARE v_session RECORD;
BEGIN
  FOR v_session IN
    SELECT * FROM level_sessions WHERE level_id = NEW.level_id ORDER BY session_number
  LOOP
    INSERT INTO group_sessions (group_id, level_session_id, session_number, scheduled_at, trainer_id)
    VALUES (NEW.id, v_session.id, v_session.session_number,
      COALESCE(NEW.starts_at::TIMESTAMPTZ, NOW() + INTERVAL '1 day'),  -- placeholder — يتم تعديله
      NEW.trainer_id);
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_create_group_sessions
  AFTER INSERT ON groups
  FOR EACH ROW EXECUTE FUNCTION fn_create_group_sessions();

-- T14: إعادة ضبط عداد الغيابات المتتالية عند الحضور
CREATE OR REPLACE FUNCTION fn_reset_consecutive_on_present()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('present','late','compensation') THEN
    UPDATE students SET consecutive_absences = 0 WHERE id = NEW.student_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_reset_consecutive_on_present
  AFTER INSERT ON attendance
  FOR EACH ROW EXECUTE FUNCTION fn_reset_consecutive_on_present();
```

---

## 🔧 الجزء الرابع: RPC Functions

```sql
-- RPC 1: ترقية الطالب للمستوى التالي
CREATE OR REPLACE FUNCTION fn_promote_student_to_next_level(p_student_id UUID, p_level_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_next_level RECORD; v_available_group RECORD; v_student RECORD;
BEGIN
  SELECT * INTO v_student FROM students WHERE id = p_student_id;
  SELECT l.* INTO v_next_level FROM levels l
  WHERE l.order_index > (SELECT order_index FROM levels WHERE id = p_level_id)
  ORDER BY l.order_index ASC LIMIT 1;
  IF v_next_level IS NULL THEN
    UPDATE students SET subscription_status = 'completed' WHERE id = p_student_id;
    RETURN jsonb_build_object('status', 'all_levels_completed');
  END IF;
  SELECT g.* INTO v_available_group FROM groups g
  WHERE g.level_id = v_next_level.id AND g.age_group_id = v_student.age_group_id
    AND g.branch_id = v_student.branch_id AND g.status = 'active'
    AND (SELECT COUNT(*) FROM group_enrollments WHERE group_id = g.id AND status = 'active')
        < (SELECT max_capacity FROM packages WHERE id = g.package_id)
  ORDER BY g.created_at ASC LIMIT 1;
  IF v_available_group IS NOT NULL THEN
    INSERT INTO group_enrollments (student_id, group_id) VALUES (p_student_id, v_available_group.id);
    UPDATE students SET current_group_id = v_available_group.id WHERE id = p_student_id;
    INSERT INTO certificates (student_id, level_id) VALUES (p_student_id, p_level_id) ON CONFLICT DO NOTHING;
    RETURN jsonb_build_object('status', 'enrolled', 'group_id', v_available_group.id);
  ELSE
    UPDATE students SET subscription_status = 'awaiting_placement' WHERE id = p_student_id;
    INSERT INTO certificates (student_id, level_id) VALUES (p_student_id, p_level_id) ON CONFLICT DO NOTHING;
    RETURN jsonb_build_object('status', 'awaiting_placement', 'next_level', v_next_level.name);
  END IF;
END; $$;

-- RPC 2: طلب استرداد الحساب بعد الحرمان
CREATE OR REPLACE FUNCTION fn_request_recovery(p_student_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_student RECORD; v_fee_pending BOOL;
BEGIN
  SELECT * INTO v_student FROM students WHERE id = p_student_id;
  IF v_student.subscription_status != 'fully_banned' THEN
    RAISE EXCEPTION 'STUDENT_NOT_BANNED';
  END IF;
  SELECT EXISTS(SELECT 1 FROM reinstatement_fees WHERE student_id = p_student_id AND status = 'pending')
  INTO v_fee_pending;
  IF v_fee_pending THEN
    RETURN jsonb_build_object('status', 'fee_pending', 'message', 'يجب دفع رسوم استرداد الحساب أولاً');
  END IF;
  UPDATE students SET subscription_status = 'active',
    consecutive_absences = 0, total_absences = 0
  WHERE id = p_student_id;
  UPDATE student_blocks SET lifted_at = NOW()
  WHERE student_id = p_student_id AND block_type = 'fully_banned' AND lifted_at IS NULL;
  RETURN jsonb_build_object('status', 'recovered');
END; $$;

-- RPC 3: نقل طالب بين جروبات
CREATE OR REPLACE FUNCTION fn_transfer_student_between_groups(
  p_student_id UUID, p_from_group_id UUID, p_to_group_id UUID, p_reason TEXT
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_to_group RECORD;
BEGIN
  SELECT * INTO v_to_group FROM groups WHERE id = p_to_group_id AND status = 'active';
  IF v_to_group IS NULL THEN RAISE EXCEPTION 'GROUP_NOT_FOUND'; END IF;
  IF (SELECT COUNT(*) FROM group_enrollments WHERE group_id = p_to_group_id AND status = 'active')
    >= (SELECT max_capacity FROM packages WHERE id = v_to_group.package_id) THEN
    RAISE EXCEPTION 'GROUP_FULL';
  END IF;
  UPDATE group_enrollments SET status = 'transferred', transfer_reason = p_reason
  WHERE student_id = p_student_id AND group_id = p_from_group_id AND status = 'active';
  INSERT INTO group_enrollments (student_id, group_id) VALUES (p_student_id, p_to_group_id);
  UPDATE students SET current_group_id = p_to_group_id WHERE id = p_student_id;
  RETURN jsonb_build_object('status', 'transferred');
END; $$;

-- RPC 4: حساب خيارات التعويض
CREATE OR REPLACE FUNCTION fn_calculate_compensation_options(
  p_student_id UUID, p_missed_session_id UUID
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_student RECORD; v_missed_session RECORD;
  v_next_session_date TIMESTAMPTZ;
  v_group_options JSONB; v_trainer_options JSONB;
BEGIN
  SELECT s.*, s.branch_id INTO v_student FROM students s WHERE s.id = p_student_id;
  SELECT gs.*, g.level_id, g.age_group_id INTO v_missed_session
  FROM group_sessions gs JOIN groups g ON g.id = gs.group_id WHERE gs.id = p_missed_session_id;
  SELECT gs.scheduled_at INTO v_next_session_date
  FROM group_sessions gs JOIN group_enrollments ge ON ge.group_id = gs.group_id
  WHERE ge.student_id = p_student_id AND ge.status = 'active'
    AND gs.scheduled_at > v_missed_session.scheduled_at
  ORDER BY gs.scheduled_at ASC LIMIT 1;
  SELECT jsonb_agg(jsonb_build_object(
    'group_session_id', gs.id, 'group_name', g.name, 'scheduled_at', gs.scheduled_at, 'comp_type', 'group'
  )) INTO v_group_options
  FROM group_sessions gs JOIN groups g ON g.id = gs.group_id
  WHERE g.level_id = v_missed_session.level_id AND g.age_group_id = v_missed_session.age_group_id
    AND g.branch_id = v_student.branch_id AND g.id != (SELECT group_id FROM group_sessions WHERE id = p_missed_session_id)
    AND g.status = 'active' AND gs.status = 'scheduled'
    AND gs.session_number = v_missed_session.session_number AND gs.scheduled_at > NOW()
    AND (v_next_session_date IS NULL OR gs.scheduled_at < v_next_session_date);
  SELECT jsonb_agg(jsonb_build_object(
    'trainer_id', s.id, 'trainer_name', p.full_name, 'comp_type', 'private'
  )) INTO v_trainer_options
  FROM staff s JOIN profiles p ON p.id = s.profile_id
  WHERE s.branch_id = v_student.branch_id AND s.status = 'active' AND s.role = 'trainer';
  RETURN jsonb_build_object(
    'group_options', COALESCE(v_group_options, '[]'),
    'private_options', COALESCE(v_trainer_options, '[]'),
    'deadline', v_next_session_date
  );
END; $$;

-- RPC 5: اقتراح المدربين البدلاء
CREATE OR REPLACE FUNCTION fn_suggest_substitute_trainers(p_group_session_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_session RECORD; v_suggestions JSONB;
BEGIN
  SELECT gs.*, g.branch_id INTO v_session
  FROM group_sessions gs JOIN groups g ON g.id = gs.group_id WHERE gs.id = p_group_session_id;
  SELECT jsonb_agg(jsonb_build_object(
    'trainer_id', s.id, 'name', p.full_name, 'specialization', s.specialization,
    'has_conflict', EXISTS(
      SELECT 1 FROM group_sessions gs2
      WHERE gs2.trainer_id = s.profile_id AND gs2.scheduled_at = v_session.scheduled_at AND gs2.id != p_group_session_id
    )
  )) INTO v_suggestions
  FROM staff s JOIN profiles p ON p.id = s.profile_id
  WHERE s.branch_id = v_session.branch_id AND s.role = 'trainer'
    AND s.status = 'active' AND s.profile_id != v_session.trainer_id;
  RETURN COALESCE(v_suggestions, '[]');
END; $$;

-- RPC 6: تعيين مدرب بديل
CREATE OR REPLACE FUNCTION fn_assign_substitute(
  p_group_session_id UUID, p_substitute_trainer_id UUID, p_reason TEXT
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_original_trainer UUID;
BEGIN
  SELECT trainer_id INTO v_original_trainer FROM group_sessions WHERE id = p_group_session_id;
  INSERT INTO substitutions (group_session_id, original_trainer_id, substitute_trainer_id, reason, assigned_by)
  VALUES (p_group_session_id, v_original_trainer, p_substitute_trainer_id, p_reason, auth.uid());
  UPDATE group_sessions SET trainer_id = p_substitute_trainer_id WHERE id = p_group_session_id;
  INSERT INTO notifications (recipient_id, type, title, body)
  VALUES (p_substitute_trainer_id, 'substitution', 'طُلب منك تدريس سيشن', p_reason);
  RETURN jsonb_build_object('status', 'assigned');
END; $$;
```

---

## ⏰ الجزء الخامس: pg_cron Jobs (8 jobs)

```sql
SELECT cron.schedule('cron_lock_attendance', '*/30 * * * *', $$
  UPDATE attendance SET is_locked = true
  WHERE is_locked = false AND group_session_id IN (
    SELECT gs.id FROM group_sessions gs JOIN groups g ON g.id = gs.group_id JOIN branches b ON b.id = g.branch_id
    WHERE gs.status = 'live'
      AND (NOW() AT TIME ZONE b.timezone) >= (gs.scheduled_at AT TIME ZONE b.timezone + INTERVAL '30 minutes')
  );
$$);

SELECT cron.schedule('cron_auto_close_sessions', '0 * * * *', $$
  UPDATE group_sessions SET status = 'auto_closed', closed_at = NOW()
  WHERE status IN ('live','scheduled') AND scheduled_at < NOW() - INTERVAL '24 hours';
  INSERT INTO attendance (student_id, group_session_id, status)
  SELECT ge.student_id, gs.id, 'absent'
  FROM group_sessions gs
  JOIN group_enrollments ge ON ge.group_id = gs.group_id AND ge.status = 'active'
  JOIN students s ON s.id = ge.student_id AND s.subscription_status = 'active'
  WHERE gs.status = 'auto_closed' AND gs.closed_at > NOW() - INTERVAL '1 hour'
  ON CONFLICT (student_id, group_session_id) DO NOTHING;
$$);

SELECT cron.schedule('cron_installment_reminders', '0 9 * * *', $$
  INSERT INTO notifications (recipient_id, type, title, body)
  SELECT s.profile_id, 'payment_reminder', 'تذكير: قسط يستحق قريباً',
         'القسط بتاعك بقيمة ' || i.amount || ' جنيه يستحق في ' || i.due_date
  FROM installments i JOIN students s ON s.id = i.student_id
  JOIN system_policies sp ON sp.branch_id = s.branch_id AND sp.key = 'payment_reminder_days'
  WHERE i.status = 'pending' AND i.due_date = CURRENT_DATE + (sp.value->>'value')::INT;
$$);

SELECT cron.schedule('cron_payment_block', '0 9 * * *', $$
  UPDATE students SET subscription_status = 'payment_blocked'
  WHERE id IN (
    SELECT DISTINCT i.student_id FROM installments i
    JOIN students s ON s.id = i.student_id
    JOIN system_policies sp ON sp.branch_id = s.branch_id AND sp.key = 'payment_overdue_block_days'
    WHERE i.status = 'pending' AND i.due_date < CURRENT_DATE - (sp.value->>'value')::INT
  ) AND subscription_status = 'active';
  UPDATE installments SET status = 'overdue'
  WHERE status = 'pending' AND due_date < CURRENT_DATE;
$$);

SELECT cron.schedule('cron_check_missed_assignments', '0 23 * * *', $$
  UPDATE assignment_submissions SET status = 'missed', counted_as_missed = true
  WHERE status = 'pending' AND due_at < NOW() AND counted_as_missed = false;
$$);

SELECT cron.schedule('cron_compensation_deadlines', '0 * * * *', $$
  UPDATE compensation_requests SET status = 'expired'
  WHERE status = 'pending' AND deadline < NOW();
$$);

SELECT cron.schedule('cron_monthly_close', '1 0 1 * *', $$
  SELECT net.http_post(
    url := current_setting('supabase.url') || '/functions/v1/monthly-commission-close',
    headers := '{"Authorization": "Bearer ' || current_setting('supabase.service_role_key') || '"}'::jsonb,
    body := '{}'::jsonb
  );
$$);

SELECT cron.schedule('cron_compensation_reminder', '0 10 * * *', $$
  INSERT INTO notifications (recipient_id, type, title, body)
  SELECT s.profile_id, 'compensation_deadline_warning', 'تذكير: تعويضية تنتهي غداً', 'لديك سيشن تعويضية يجب ترتيبها قبل موعد مجموعتك'
  FROM compensation_requests cr
  JOIN students s ON s.id = cr.student_id
  WHERE cr.status = 'pending' AND cr.deadline BETWEEN NOW() AND NOW() + INTERVAL '24 hours';
$$);
```

---

## 🏗️ الجزء السادس: Frontend Architecture

### هيكل المشروع (لا تحيد عنه)

```
src/
├── types/
│   └── database.types.ts          ← supabase gen types typescript
├── lib/
│   ├── supabase.ts                ← createClient (instance واحدة)
│   └── api/
│       ├── students.api.ts
│       ├── groups.api.ts
│       ├── sessions.api.ts
│       ├── payments.api.ts
│       ├── compensation.api.ts
│       └── staff.api.ts
├── stores/
│   └── ui.store.ts                ← Zustand: modals, sidebar, filters فقط
├── hooks/
│   └── useAuth.ts                 ← role + branch_id من useSession
├── features/
│   ├── students/
│   │   ├── index.ts
│   │   ├── types.ts
│   │   ├── schemas.ts
│   │   ├── queries/
│   │   ├── components/
│   │   └── hooks/
│   ├── groups/
│   ├── sessions/
│   ├── payments/
│   ├── compensation/
│   └── staff/
└── pages/
    ├── super-admin/
    ├── branch-admin/
    ├── receptionist/
    ├── trainer/
    ├── student/
    └── parent/
```

### قاعدة كل API file

```typescript
// lib/api/students.api.ts
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

type Student = Database['public']['Tables']['students']['Row'];

export const studentsApi = {
  async getAll(branchId: string) {
    const { data, error } = await supabase
      .from('students')
      .select('*, profiles(*), age_groups(*)')
      .eq('branch_id', branchId)
      .is('deleted_at', null);
    if (error) throw error;
    return data;
  },

  async promoteToNextLevel(studentId: string, levelId: string) {
    const { data, error } = await supabase
      .rpc('fn_promote_student_to_next_level', {
        p_student_id: studentId,
        p_level_id: levelId
      });
    if (error) throw error;
    return data;
  }
};
```

### قاعدة كل Query Hook

```typescript
// features/students/queries/students.queries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentsApi } from '@/lib/api/students.api';

export const studentKeys = {
  all: ['students'] as const,
  byBranch: (branchId: string) => [...studentKeys.all, branchId] as const,
};

export function useStudentsQuery(branchId: string) {
  return useQuery({
    queryKey: studentKeys.byBranch(branchId),
    queryFn: () => studentsApi.getAll(branchId),
    enabled: !!branchId,
  });
}

export function usePromoteStudentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, levelId }: { studentId: string; levelId: string }) =>
      studentsApi.promoteToNextLevel(studentId, levelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentKeys.all });
    },
  });
}
```

---

## 🚦 الجزء السابع: ترتيب التنفيذ

### Phase 0 — Database (اعملها كلها قبل أي component)
1. الـ 42 جدول كاملة
2. Seed data: branches + age_groups + system_policies + packages + levels
3. الـ 8 indexes
4. الـ 14 triggers
5. الـ 6 RPC functions
6. الـ 8 cron jobs
7. `supabase gen types typescript`

### Phase 1 — Authentication
- Login page (Email + Google + Apple)
- Route guards حسب الـ role
- `useAuth` hook يجيب role + branch_id

### Phase 2 — Student Onboarding
- صفحة تسجيل طالب جديد (Receptionist/Sales)
- Entry Test flow (الطالب)
- Waiting List dashboard (Receptionist)
- تسكين في جروب

### Phase 3 — Sessions
- Sessions dashboard للمدرب
- تسجيل الحضور
- التقييم والكويز والواجب
- Session timeline للطالب

### Phase 4 — Financial
- تسجيل الدفع (Full / Installments)
- تتبع الأقساط
- Treasury dashboard (Admin)

### Phase 5 — Compensation
- تنبيهات الغياب للريسيبشن
- fn_calculate_compensation_options
- جدولة التعويضيات
- موافقة ولي الأمر

### Phase 6 — Remaining Flows
- Level Progression + Certificates
- Trainer Substitution
- Restricted Recovery
- KPIs Dashboard
- Reports

---

## 🚫 الجزء الثامن: ممنوع منعاً باتاً

```typescript
// ❌ ممنوع: business logic في component
if (student.absences >= 2) setStatus('banned');

// ✅ صح
await supabase.rpc('fn_record_attendance', { student_id, status: 'absent' });

// ❌ ممنوع: supabase مباشر في component
const { data } = await supabase.from('students').select('*');

// ✅ صح
const { data } = useStudentsQuery(branchId);

// ❌ ممنوع: magic numbers
if (absences >= 2) { ... }

// ✅ صح
const limit = await getPolicyValue(branchId, 'consecutive_absence_limit');

// ❌ ممنوع: optimistic update على عملية مالية
queryClient.setQueryData(['payments'], (old) => [...old, newPayment]);

// ✅ صح: انتظر الـ server دايماً
await paymentsApi.create(data);
queryClient.invalidateQueries({ queryKey: ['payments'] });

// ❌ ممنوع: cross-feature import
import { StudentCard } from '@/features/students/components/StudentCard';

// ✅ صح: من الـ barrel
import { StudentCard } from '@/features/students';
```

---

## 📋 Checklist قبل أي Feature جديدة

```
1. [ ] عملت DB migration (table + RLS + indexes)
2. [ ] شغّلت supabase gen types
3. [ ] عملت Zod schemas
4. [ ] عملت API function في lib/api/
5. [ ] عملت Query Hook في features/.../queries/
6. [ ] عملت Components (max 200 سطر كل واحد)
7. [ ] اختبرت من 3 roles مختلفة
8. [ ] تأكدت إن RLS بتمنع الوصول غير المصرح
```
