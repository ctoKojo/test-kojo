
-- =====================================================================
-- KOJO ACADEMY — PHASE 0 / CHUNK 1
-- Identity + Branches + Roles + Foundation
-- =====================================================================

-- ---------- EXTENSIONS ----------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- =====================================================================
-- ENUMS (all from 0001_enums.sql — defined once, used across all chunks)
-- =====================================================================

CREATE TYPE app_role AS ENUM (
  'super_admin', 'branch_admin', 'reception',
  'trainer', 'sales', 'moderator', 'parent', 'student'
);

CREATE TYPE subscription_status AS ENUM (
  'pending_payment', 'active_waiting', 'active',
  'paused', 'frozen', 'restricted', 'expired', 'cancelled'
);

CREATE TYPE payment_status AS ENUM (
  'pending', 'paid', 'partial', 'refunded', 'cancelled'
);

CREATE TYPE installment_status AS ENUM (
  'pending', 'paid', 'overdue', 'waived'
);

CREATE TYPE session_status AS ENUM (
  'scheduled', 'open', 'closed', 'cancelled', 'needs_admin_review'
);

CREATE TYPE attendance_status AS ENUM (
  'present', 'absent', 'late', 'excused'
);

CREATE TYPE approval_request_type AS ENUM (
  'absence_excuse', 'restricted_recovery', 'retake_exam',
  'refund', 'transfer_branch', 'transfer_group',
  'reinstatement', 'lead_reactivation', 'other'
);

CREATE TYPE approval_status AS ENUM (
  'pending', 'approved', 'rejected', 'expired', 'cancelled'
);

CREATE TYPE notification_channel AS ENUM (
  'in_app', 'email', 'sms', 'push', 'whatsapp'
);

CREATE TYPE notification_status AS ENUM (
  'pending', 'sent', 'failed', 'read', 'archived'
);

CREATE TYPE audit_action AS ENUM (
  'create', 'update', 'delete', 'login', 'logout',
  'role_change', 'policy_change', 'approval', 'export', 'other'
);

CREATE TYPE failure_reason_type AS ENUM (
  'academy_fault', 'student_fault', 'pending_review'
);

CREATE TYPE package_tier AS ENUM (
  'squad', 'core', 'x'
);

CREATE TYPE content_type AS ENUM (
  'slides', 'summary_video', 'full_video',
  'homework', 'quiz', 'final_exam', 'other'
);

CREATE TYPE lead_status AS ENUM (
  'new', 'assigned', 'contacted', 'qualified',
  'negotiation', 'won', 'lost', 'unreachable',
  'archived', 'converted'
);

CREATE TYPE call_recording_status AS ENUM (
  'recording', 'uploading', 'complete', 'failed', 'deleted'
);

CREATE TYPE commission_status AS ENUM (
  'pending_payment', 'pending_activation',
  'locked_for_payout', 'paid', 'clawed_back', 'cancelled'
);

CREATE TYPE treasury_account_type AS ENUM (
  'cash', 'wallet', 'bank'
);

CREATE TYPE preferred_language AS ENUM (
  'ar', 'en'
);

-- =====================================================================
-- HELPER: set_updated_at trigger function
-- =====================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =====================================================================
-- TABLE: branches
-- =====================================================================

CREATE TABLE public.branches (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text NOT NULL UNIQUE,
  name        text NOT NULL,
  city        text,
  address     text,
  phone       text,
  timezone    text NOT NULL DEFAULT 'Africa/Cairo',
  is_active   boolean NOT NULL DEFAULT true,
  archived_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_branches_active ON public.branches(is_active) WHERE archived_at IS NULL;

CREATE TRIGGER trg_branches_updated_at
  BEFORE UPDATE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================================
-- TABLE: profiles  (one row per auth.users — auto-created via trigger)
-- =====================================================================

CREATE TABLE public.profiles (
  id              uuid PRIMARY KEY,  -- = auth.users.id
  full_name       text,
  phone           text,
  email           text,
  avatar_url      text,
  preferred_lang  preferred_language NOT NULL DEFAULT 'ar',
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_user_fk FOREIGN KEY (id)
    REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX idx_profiles_phone ON public.profiles(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_profiles_email ON public.profiles(email) WHERE email IS NOT NULL;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- =====================================================================
-- TABLE: user_roles  (roles stored SEPARATELY — never on profiles)
-- =====================================================================

CREATE TABLE public.user_roles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        app_role NOT NULL,
  branch_id   uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  -- NULL branch_id = global scope (super_admin or cross-branch role)
  granted_by  uuid REFERENCES auth.users(id),
  granted_at  timestamptz NOT NULL DEFAULT now(),
  revoked_at  timestamptz,
  UNIQUE (user_id, role, branch_id)
);

CREATE INDEX idx_user_roles_user ON public.user_roles(user_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_user_roles_branch ON public.user_roles(branch_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_user_roles_role ON public.user_roles(role) WHERE revoked_at IS NULL;

-- =====================================================================
-- HELPER FUNCTIONS (SECURITY DEFINER — no RLS recursion)
-- =====================================================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND revoked_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = ANY(_roles)
      AND revoked_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'super_admin'
      AND revoked_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_branch_ids()
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    array_agg(DISTINCT branch_id) FILTER (WHERE branch_id IS NOT NULL),
    ARRAY[]::uuid[]
  )
  FROM public.user_roles
  WHERE user_id = auth.uid()
    AND revoked_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.user_has_branch_access(_user_id uuid, _branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin(_user_id) OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND branch_id = _branch_id
      AND revoked_at IS NULL
  );
$$;

-- =====================================================================
-- TABLE: rooms
-- =====================================================================

CREATE TABLE public.rooms (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id     uuid NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  code          text NOT NULL,
  name          text NOT NULL,
  capacity      integer NOT NULL DEFAULT 12 CHECK (capacity > 0),
  is_online     boolean NOT NULL DEFAULT false,
  is_active     boolean NOT NULL DEFAULT true,
  archived_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (branch_id, code)
);

CREATE INDEX idx_rooms_branch ON public.rooms(branch_id) WHERE archived_at IS NULL;

CREATE TRIGGER trg_rooms_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================================
-- TABLE: age_groups
-- =====================================================================

CREATE TABLE public.age_groups (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text NOT NULL UNIQUE,
  name        text NOT NULL,
  min_age     integer NOT NULL CHECK (min_age >= 0),
  max_age     integer NOT NULL CHECK (max_age >= min_age),
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- =====================================================================
-- TABLE: system_policies  (single source of truth for business rules)
-- =====================================================================

CREATE TABLE public.system_policies (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key           text NOT NULL UNIQUE,
  value         jsonb NOT NULL,
  description   text,
  category      text NOT NULL DEFAULT 'general',
  updated_by    uuid REFERENCES auth.users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_system_policies_category ON public.system_policies(category);

CREATE TRIGGER trg_system_policies_updated_at
  BEFORE UPDATE ON public.system_policies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.get_policy(_key text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT value FROM public.system_policies WHERE key = _key;
$$;

-- =====================================================================
-- TABLE: policy_snapshots  (captures policy state at enrollment)
-- =====================================================================

CREATE TABLE public.policy_snapshots (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_table     text NOT NULL,        -- e.g. 'group_enrollments'
  scope_id        uuid NOT NULL,        -- FK enforced later per scope
  policy_keys     text[] NOT NULL,
  snapshot        jsonb NOT NULL,
  snapshotted_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_policy_snapshots_scope ON public.policy_snapshots(scope_table, scope_id);

-- =====================================================================
-- TABLE: idempotency_keys  (gate for all money/session RPCs)
-- =====================================================================

CREATE TABLE public.idempotency_keys (
  key             text PRIMARY KEY,
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  operation       text NOT NULL,
  request_hash    text,
  response        jsonb,
  status          text NOT NULL DEFAULT 'in_progress'
                    CHECK (status IN ('in_progress','completed','failed')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz,
  expires_at      timestamptz NOT NULL DEFAULT (now() + interval '30 days')
);

CREATE INDEX idx_idempotency_expires ON public.idempotency_keys(expires_at);

-- =====================================================================
-- TABLE: academic_terms
-- =====================================================================

CREATE TABLE public.academic_terms (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id   uuid NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  code        text NOT NULL,
  name        text NOT NULL,
  starts_on   date NOT NULL,
  ends_on     date NOT NULL CHECK (ends_on > starts_on),
  is_active   boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (branch_id, code)
);

CREATE INDEX idx_academic_terms_branch ON public.academic_terms(branch_id);
CREATE INDEX idx_academic_terms_active ON public.academic_terms(branch_id, is_active) WHERE is_active = true;

CREATE TRIGGER trg_academic_terms_updated_at
  BEFORE UPDATE ON public.academic_terms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================================
-- TABLE: branch_holidays
-- =====================================================================

CREATE TABLE public.branch_holidays (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id    uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  holiday_date date NOT NULL,
  name         text NOT NULL,
  is_recurring boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (branch_id, holiday_date)
);

CREATE INDEX idx_branch_holidays_branch_date ON public.branch_holidays(branch_id, holiday_date);

-- =====================================================================
-- TABLE: audit_logs
-- =====================================================================

CREATE TABLE public.audit_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action        audit_action NOT NULL,
  resource_type text NOT NULL,
  resource_id   uuid,
  branch_id     uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  before_data   jsonb,
  after_data    jsonb,
  metadata      jsonb,
  ip_address    inet,
  user_agent    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_actor ON public.audit_logs(actor_id, created_at DESC);
CREATE INDEX idx_audit_logs_resource ON public.audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_branch_time ON public.audit_logs(branch_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.log_audit(
  _action        audit_action,
  _resource_type text,
  _resource_id   uuid,
  _branch_id     uuid DEFAULT NULL,
  _before        jsonb DEFAULT NULL,
  _after         jsonb DEFAULT NULL,
  _metadata      jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  INSERT INTO public.audit_logs (
    actor_id, action, resource_type, resource_id,
    branch_id, before_data, after_data, metadata
  )
  VALUES (
    auth.uid(), _action, _resource_type, _resource_id,
    _branch_id, _before, _after, _metadata
  )
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

-- =====================================================================
-- TABLE: notifications + archive + preferences
-- =====================================================================

CREATE TABLE public.notifications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  branch_id    uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  channel      notification_channel NOT NULL DEFAULT 'in_app',
  category     text NOT NULL,
  title        text NOT NULL,
  body         text,
  payload      jsonb,
  status       notification_status NOT NULL DEFAULT 'pending',
  read_at      timestamptz,
  sent_at      timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz
);

CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, created_at DESC)
  WHERE status != 'archived' AND read_at IS NULL;
CREATE INDEX idx_notifications_status ON public.notifications(status, created_at);

CREATE TABLE public.notifications_archive (
  LIKE public.notifications INCLUDING ALL
);

CREATE TABLE public.notification_preferences (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category    text NOT NULL,
  channels    notification_channel[] NOT NULL DEFAULT ARRAY['in_app']::notification_channel[],
  is_enabled  boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, category)
);

CREATE TRIGGER trg_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================================
-- TABLE: admin_approval_requests
-- =====================================================================

CREATE TABLE public.admin_approval_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type    approval_request_type NOT NULL,
  status          approval_status NOT NULL DEFAULT 'pending',
  branch_id       uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  requested_by    uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  subject_table   text NOT NULL,    -- e.g. 'students','payments','leads'
  subject_id      uuid NOT NULL,
  reason          text,
  payload         jsonb,             -- typed payload per request_type
  reviewed_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  review_notes    text,
  reviewed_at     timestamptz,
  expires_at      timestamptz NOT NULL DEFAULT (now() + interval '48 hours'),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_approvals_status ON public.admin_approval_requests(status, created_at DESC);
CREATE INDEX idx_approvals_branch_pending ON public.admin_approval_requests(branch_id, status)
  WHERE status = 'pending';
CREATE INDEX idx_approvals_subject ON public.admin_approval_requests(subject_table, subject_id);

CREATE TRIGGER trg_approvals_updated_at
  BEFORE UPDATE ON public.admin_approval_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================================
-- ROW LEVEL SECURITY (all tables enabled, whitelist policies)
-- =====================================================================

ALTER TABLE public.branches                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.age_groups                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_policies             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_snapshots            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotency_keys            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_terms              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_holidays             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications_archive       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_approval_requests     ENABLE ROW LEVEL SECURITY;

-- ----- branches -----
CREATE POLICY "branches: super_admin all"
  ON public.branches FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "branches: staff read own branches"
  ON public.branches FOR SELECT TO authenticated
  USING (id = ANY(public.current_user_branch_ids()));

-- ----- profiles -----
CREATE POLICY "profiles: own read"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles: own update"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles: super_admin all"
  ON public.profiles FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "profiles: branch_admin read in branch"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'branch_admin') AND
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = public.profiles.id
        AND ur.branch_id = ANY(public.current_user_branch_ids())
        AND ur.revoked_at IS NULL
    )
  );

-- ----- user_roles -----
CREATE POLICY "user_roles: own read"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_roles: super_admin all"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "user_roles: branch_admin manage branch roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'branch_admin') AND
    branch_id = ANY(public.current_user_branch_ids()) AND
    role NOT IN ('super_admin','branch_admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'branch_admin') AND
    branch_id = ANY(public.current_user_branch_ids()) AND
    role NOT IN ('super_admin','branch_admin')
  );

-- ----- rooms -----
CREATE POLICY "rooms: super_admin all"
  ON public.rooms FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "rooms: branch staff read"
  ON public.rooms FOR SELECT TO authenticated
  USING (branch_id = ANY(public.current_user_branch_ids()));

CREATE POLICY "rooms: branch_admin manage"
  ON public.rooms FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'branch_admin') AND
    branch_id = ANY(public.current_user_branch_ids())
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'branch_admin') AND
    branch_id = ANY(public.current_user_branch_ids())
  );

-- ----- age_groups (reference data — read for all authenticated) -----
CREATE POLICY "age_groups: read all authenticated"
  ON public.age_groups FOR SELECT TO authenticated USING (true);

CREATE POLICY "age_groups: super_admin write"
  ON public.age_groups FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- ----- system_policies -----
CREATE POLICY "system_policies: read all authenticated"
  ON public.system_policies FOR SELECT TO authenticated USING (true);

CREATE POLICY "system_policies: super_admin write"
  ON public.system_policies FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- ----- policy_snapshots (read by branch staff; system writes) -----
CREATE POLICY "policy_snapshots: super_admin all"
  ON public.policy_snapshots FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- ----- idempotency_keys (admin read only; written by RPCs as definer) -----
CREATE POLICY "idempotency_keys: super_admin read"
  ON public.idempotency_keys FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- ----- academic_terms -----
CREATE POLICY "academic_terms: branch staff read"
  ON public.academic_terms FOR SELECT TO authenticated
  USING (branch_id = ANY(public.current_user_branch_ids()) OR public.is_super_admin(auth.uid()));

CREATE POLICY "academic_terms: branch_admin manage"
  ON public.academic_terms FOR ALL TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR (
      public.has_role(auth.uid(), 'branch_admin') AND
      branch_id = ANY(public.current_user_branch_ids())
    )
  )
  WITH CHECK (
    public.is_super_admin(auth.uid()) OR (
      public.has_role(auth.uid(), 'branch_admin') AND
      branch_id = ANY(public.current_user_branch_ids())
    )
  );

-- ----- branch_holidays -----
CREATE POLICY "branch_holidays: branch staff read"
  ON public.branch_holidays FOR SELECT TO authenticated
  USING (branch_id = ANY(public.current_user_branch_ids()) OR public.is_super_admin(auth.uid()));

CREATE POLICY "branch_holidays: branch_admin manage"
  ON public.branch_holidays FOR ALL TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR (
      public.has_role(auth.uid(), 'branch_admin') AND
      branch_id = ANY(public.current_user_branch_ids())
    )
  )
  WITH CHECK (
    public.is_super_admin(auth.uid()) OR (
      public.has_role(auth.uid(), 'branch_admin') AND
      branch_id = ANY(public.current_user_branch_ids())
    )
  );

-- ----- audit_logs (super_admin + branch_admin read own branch) -----
CREATE POLICY "audit_logs: super_admin read"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "audit_logs: branch_admin read own branch"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'branch_admin') AND
    branch_id = ANY(public.current_user_branch_ids())
  );

-- ----- notifications -----
CREATE POLICY "notifications: own read"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications: own update read_at"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications: super_admin all"
  ON public.notifications FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- ----- notifications_archive -----
CREATE POLICY "notifications_archive: own read"
  ON public.notifications_archive FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_archive: super_admin all"
  ON public.notifications_archive FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- ----- notification_preferences -----
CREATE POLICY "notification_preferences: own all"
  ON public.notification_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ----- admin_approval_requests -----
CREATE POLICY "approvals: requester read own"
  ON public.admin_approval_requests FOR SELECT TO authenticated
  USING (requested_by = auth.uid());

CREATE POLICY "approvals: any staff create"
  ON public.admin_approval_requests FOR INSERT TO authenticated
  WITH CHECK (
    requested_by = auth.uid() AND
    public.has_any_role(auth.uid(),
      ARRAY['reception','trainer','sales','moderator','branch_admin','super_admin']::app_role[])
  );

CREATE POLICY "approvals: branch_admin read & decide branch"
  ON public.admin_approval_requests FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'branch_admin') AND
    (branch_id IS NULL OR branch_id = ANY(public.current_user_branch_ids()))
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'branch_admin') AND
    (branch_id IS NULL OR branch_id = ANY(public.current_user_branch_ids()))
  );

CREATE POLICY "approvals: super_admin all"
  ON public.admin_approval_requests FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- =====================================================================
-- SEED — age_groups (3)
-- =====================================================================

INSERT INTO public.age_groups (code, name, min_age, max_age, sort_order) VALUES
  ('KG',      'KG (4-5)',         4,  5,  1),
  ('PRIMARY', 'Primary (6-12)',   6,  12, 2),
  ('TEEN',    'Teen+ (13+)',      13, 99, 3)
ON CONFLICT (code) DO NOTHING;

-- =====================================================================
-- SEED — system_policies (15 defaults — all editable by super_admin)
-- =====================================================================

INSERT INTO public.system_policies (key, value, description, category) VALUES
  ('attendance.consecutive_absences_for_restriction',
     '2'::jsonb,
     'Number of consecutive absences before student is restricted',
     'attendance'),
  ('attendance.total_absences_for_restriction',
     '5'::jsonb,
     'Cumulative absences in subscription before restriction',
     'attendance'),
  ('attendance.free_absences_per_subscription',
     '2'::jsonb,
     'Free absences allowed without financial consequence',
     'attendance'),
  ('attendance.lock_minutes_after_session_start',
     '30'::jsonb,
     'Minutes after session start when attendance becomes read-only',
     'attendance'),
  ('session.auto_close_after_hours',
     '24'::jsonb,
     'Hours after session end when cron auto-closes (needs_admin_review if no attendance)',
     'session'),
  ('compensation.must_complete_before_next_session',
     'true'::jsonb,
     'Block student from next session if compensation not done',
     'compensation'),
  ('compensation.extra_pay_outside_hours',
     '{"amount":150,"currency":"EGP"}'::jsonb,
     'Extra trainer payment for compensation outside working hours',
     'compensation'),
  ('payment.overdue_grace_days',
     '3'::jsonb,
     'Days after installment due before access is blocked',
     'payment'),
  ('payment.reinstatement_fee',
     '{"amount":500,"currency":"EGP"}'::jsonb,
     'Fee required to lift a restriction',
     'payment'),
  ('approval.default_expiry_hours',
     '48'::jsonb,
     'Hours after which a pending approval request expires',
     'approval'),
  ('notifications.archive_after_days',
     '90'::jsonb,
     'Days after which notifications move to archive table',
     'notifications'),
  ('idempotency.key_retention_days',
     '30'::jsonb,
     'Days to retain completed idempotency keys',
     'system'),
  ('homework.consecutive_missed_for_restriction',
     '2'::jsonb,
     'Consecutive missed homework before restriction',
     'homework'),
  ('homework.total_missed_for_restriction',
     '5'::jsonb,
     'Cumulative missed homework before restriction',
     'homework'),
  ('progression.classwork_weight',
     '0.4'::jsonb,
     'Weight of classwork average in final level score (final_exam = 1 - this)',
     'progression')
ON CONFLICT (key) DO NOTHING;
