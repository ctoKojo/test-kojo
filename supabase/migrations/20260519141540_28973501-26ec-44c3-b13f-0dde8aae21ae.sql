-- ============================================================
-- CHUNK 7 — Migration B
-- New enums, schema additions, 7 new tables, RLS, indexes
-- ============================================================

-- ============================================================
-- 1. NEW ENUMS
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.compensation_model AS ENUM (
    'fixed_monthly',
    'hourly_session',
    'paid_training',
    'unpaid_training',
    'fixed_plus_commission'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.billing_type AS ENUM ('monthly', 'full_level');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.discount_source AS ENUM (
    'sibling',
    'promo_code',
    'manual_admin',
    'full_level_price'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.payroll_status AS ENUM (
    'draft',
    'pending_approval',
    'approved',
    'paid',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.unavailability_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 2. ALTER EXISTING TABLES
-- ============================================================
ALTER TABLE public.group_enrollments
  ADD COLUMN IF NOT EXISTS billing_type public.billing_type NOT NULL DEFAULT 'monthly';

-- ============================================================
-- 3. NEW TABLE — trainer_unavailability
-- ============================================================
CREATE TABLE IF NOT EXISTS public.trainer_unavailability (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id    uuid NOT NULL,
  branch_id     uuid NOT NULL,
  starts_at     timestamptz NOT NULL,
  ends_at       timestamptz NOT NULL,
  reason        text NOT NULL,
  status        public.unavailability_status NOT NULL DEFAULT 'pending',
  reviewed_by   uuid,
  reviewed_at   timestamptz,
  review_notes  text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trainer_unavail_time_check CHECK (ends_at > starts_at)
);
-- Prevent overlapping approved windows per trainer
ALTER TABLE public.trainer_unavailability
  DROP CONSTRAINT IF EXISTS trainer_unavail_no_overlap;
ALTER TABLE public.trainer_unavailability
  ADD CONSTRAINT trainer_unavail_no_overlap
  EXCLUDE USING gist (
    trainer_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  ) WHERE (status = 'approved');

CREATE INDEX IF NOT EXISTS idx_trainer_unavail_trainer    ON public.trainer_unavailability(trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_unavail_branch     ON public.trainer_unavailability(branch_id);
CREATE INDEX IF NOT EXISTS idx_trainer_unavail_status     ON public.trainer_unavailability(status);
CREATE INDEX IF NOT EXISTS idx_trainer_unavail_range      ON public.trainer_unavailability USING gist (tstzrange(starts_at, ends_at));

ALTER TABLE public.trainer_unavailability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "unavail: trainer reads own"
  ON public.trainer_unavailability FOR SELECT TO authenticated
  USING (trainer_id = auth.uid());

CREATE POLICY "unavail: trainer inserts own"
  ON public.trainer_unavailability FOR INSERT TO authenticated
  WITH CHECK (trainer_id = auth.uid() AND has_role(auth.uid(), 'trainer'::app_role));

CREATE POLICY "unavail: trainer cancels own pending"
  ON public.trainer_unavailability FOR UPDATE TO authenticated
  USING (trainer_id = auth.uid() AND status = 'pending')
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "unavail: staff read branch"
  ON public.trainer_unavailability FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid())
         OR (has_any_role(auth.uid(), ARRAY['branch_admin','reception']::app_role[]) AND branch_id = ANY(current_user_branch_ids())));

CREATE POLICY "unavail: admin manage"
  ON public.trainer_unavailability FOR ALL TO authenticated
  USING (is_super_admin(auth.uid())
         OR (has_role(auth.uid(),'branch_admin'::app_role) AND branch_id = ANY(current_user_branch_ids())))
  WITH CHECK (is_super_admin(auth.uid())
         OR (has_role(auth.uid(),'branch_admin'::app_role) AND branch_id = ANY(current_user_branch_ids())));

CREATE TRIGGER trg_set_updated_at_trainer_unavailability
  BEFORE UPDATE ON public.trainer_unavailability
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 4. NEW TABLE — role_compensation_rules
-- (which compensation_models are allowed per role)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.role_compensation_rules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role            public.app_role NOT NULL UNIQUE,
  allowed_models  public.compensation_model[] NOT NULL,
  default_model   public.compensation_model NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.role_compensation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "role_comp_rules: authenticated read"
  ON public.role_compensation_rules FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "role_comp_rules: super_admin manage"
  ON public.role_compensation_rules FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE TRIGGER trg_set_updated_at_role_compensation_rules
  BEFORE UPDATE ON public.role_compensation_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed defaults
INSERT INTO public.role_compensation_rules (role, allowed_models, default_model) VALUES
  ('trainer',      ARRAY['fixed_monthly','hourly_session','paid_training','unpaid_training','fixed_plus_commission']::public.compensation_model[], 'fixed_monthly'),
  ('reception',    ARRAY['fixed_monthly','fixed_plus_commission']::public.compensation_model[], 'fixed_monthly'),
  ('sales',        ARRAY['fixed_monthly','fixed_plus_commission']::public.compensation_model[], 'fixed_plus_commission'),
  ('moderator',    ARRAY['fixed_monthly']::public.compensation_model[], 'fixed_monthly'),
  ('branch_admin', ARRAY['fixed_monthly']::public.compensation_model[], 'fixed_monthly')
ON CONFLICT (role) DO NOTHING;

-- ============================================================
-- 5. NEW TABLE — trainer_compensation_config (history)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.trainer_compensation_config (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id            uuid NOT NULL,
  branch_id             uuid NOT NULL,
  model                 public.compensation_model NOT NULL,
  base_monthly_amount   numeric(12,2) NOT NULL DEFAULT 0,
  hourly_rate           numeric(12,2) NOT NULL DEFAULT 0,
  per_session_rate      numeric(12,2) NOT NULL DEFAULT 0,
  commission_pct        numeric(5,2)  NOT NULL DEFAULT 0,
  training_session_pay  numeric(12,2) NOT NULL DEFAULT 0, -- 0 for unpaid_training
  effective_from        date NOT NULL DEFAULT CURRENT_DATE,
  effective_to          date,
  notes                 text,
  created_by            uuid,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trainer_comp_dates_check CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE INDEX IF NOT EXISTS idx_trainer_comp_trainer ON public.trainer_compensation_config(trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_comp_branch  ON public.trainer_compensation_config(branch_id);
CREATE INDEX IF NOT EXISTS idx_trainer_comp_active  ON public.trainer_compensation_config(trainer_id, effective_from, effective_to);

-- Only one active (effective_to IS NULL) config per trainer
CREATE UNIQUE INDEX IF NOT EXISTS uq_trainer_comp_active_per_trainer
  ON public.trainer_compensation_config(trainer_id)
  WHERE effective_to IS NULL;

ALTER TABLE public.trainer_compensation_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trainer_comp: own read"
  ON public.trainer_compensation_config FOR SELECT TO authenticated
  USING (trainer_id = auth.uid());

CREATE POLICY "trainer_comp: admin manage"
  ON public.trainer_compensation_config FOR ALL TO authenticated
  USING (is_super_admin(auth.uid())
         OR (has_role(auth.uid(),'branch_admin'::app_role) AND branch_id = ANY(current_user_branch_ids())))
  WITH CHECK (is_super_admin(auth.uid())
         OR (has_role(auth.uid(),'branch_admin'::app_role) AND branch_id = ANY(current_user_branch_ids())));

CREATE TRIGGER trg_set_updated_at_trainer_compensation_config
  BEFORE UPDATE ON public.trainer_compensation_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 6. NEW TABLE — role_kpi_bonus_rules
-- ============================================================
CREATE TABLE IF NOT EXISTS public.role_kpi_bonus_rules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role            public.app_role NOT NULL,
  kpi_code        text NOT NULL, -- e.g. 'attendance_pct', 'student_satisfaction', 'sessions_completed'
  branch_id       uuid, -- NULL = global
  min_threshold   numeric(12,2),
  max_threshold   numeric(12,2),
  bonus_amount    numeric(12,2) NOT NULL DEFAULT 0,
  penalty_amount  numeric(12,2) NOT NULL DEFAULT 0,
  is_active       boolean NOT NULL DEFAULT true,
  notes           text,
  created_by      uuid,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_role_kpi_role     ON public.role_kpi_bonus_rules(role);
CREATE INDEX IF NOT EXISTS idx_role_kpi_branch   ON public.role_kpi_bonus_rules(branch_id);
CREATE INDEX IF NOT EXISTS idx_role_kpi_active   ON public.role_kpi_bonus_rules(is_active) WHERE is_active = true;

ALTER TABLE public.role_kpi_bonus_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kpi_rules: staff read"
  ON public.role_kpi_bonus_rules FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid())
         OR has_any_role(auth.uid(), ARRAY['branch_admin','reception']::app_role[]));

CREATE POLICY "kpi_rules: admin manage"
  ON public.role_kpi_bonus_rules FOR ALL TO authenticated
  USING (is_super_admin(auth.uid())
         OR (has_role(auth.uid(),'branch_admin'::app_role) AND (branch_id IS NULL OR branch_id = ANY(current_user_branch_ids()))))
  WITH CHECK (is_super_admin(auth.uid())
         OR (has_role(auth.uid(),'branch_admin'::app_role) AND (branch_id IS NULL OR branch_id = ANY(current_user_branch_ids()))));

CREATE TRIGGER trg_set_updated_at_role_kpi_bonus_rules
  BEFORE UPDATE ON public.role_kpi_bonus_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 7. NEW TABLE — trainer_monthly_payroll
-- ============================================================
CREATE TABLE IF NOT EXISTS public.trainer_monthly_payroll (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id               uuid NOT NULL,
  branch_id                uuid NOT NULL,
  year                     integer NOT NULL,
  month                    integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  compensation_config_id   uuid, -- snapshot of which config was used
  model                    public.compensation_model NOT NULL,
  base_pay                 numeric(12,2) NOT NULL DEFAULT 0,
  session_pay              numeric(12,2) NOT NULL DEFAULT 0, -- hourly/per-session computed
  compensation_session_pay numeric(12,2) NOT NULL DEFAULT 0, -- compensation_sessions extra pay
  training_pay             numeric(12,2) NOT NULL DEFAULT 0,
  commission_pay           numeric(12,2) NOT NULL DEFAULT 0,
  kpi_bonus_pending        numeric(12,2) NOT NULL DEFAULT 0,
  kpi_bonus_approved       numeric(12,2) NOT NULL DEFAULT 0,
  kpi_bonus_approved_by    uuid,
  kpi_bonus_approved_at    timestamptz,
  penalty_amount           numeric(12,2) NOT NULL DEFAULT 0,
  net_pay                  numeric(12,2) GENERATED ALWAYS AS (
    base_pay + session_pay + compensation_session_pay + training_pay + commission_pay
    + kpi_bonus_approved - penalty_amount
  ) STORED,
  status                   public.payroll_status NOT NULL DEFAULT 'draft',
  computed_at              timestamptz NOT NULL DEFAULT now(),
  paid_at                  timestamptz,
  notes                    text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trainer_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_payroll_trainer ON public.trainer_monthly_payroll(trainer_id);
CREATE INDEX IF NOT EXISTS idx_payroll_branch  ON public.trainer_monthly_payroll(branch_id);
CREATE INDEX IF NOT EXISTS idx_payroll_period  ON public.trainer_monthly_payroll(year, month);
CREATE INDEX IF NOT EXISTS idx_payroll_status  ON public.trainer_monthly_payroll(status);

ALTER TABLE public.trainer_monthly_payroll ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payroll: own read"
  ON public.trainer_monthly_payroll FOR SELECT TO authenticated
  USING (trainer_id = auth.uid() AND status IN ('approved','paid'));

CREATE POLICY "payroll: admin manage"
  ON public.trainer_monthly_payroll FOR ALL TO authenticated
  USING (is_super_admin(auth.uid())
         OR (has_role(auth.uid(),'branch_admin'::app_role) AND branch_id = ANY(current_user_branch_ids())))
  WITH CHECK (is_super_admin(auth.uid())
         OR (has_role(auth.uid(),'branch_admin'::app_role) AND branch_id = ANY(current_user_branch_ids())));

CREATE TRIGGER trg_set_updated_at_trainer_monthly_payroll
  BEFORE UPDATE ON public.trainer_monthly_payroll
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 8. NEW TABLE — promo_codes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code              text NOT NULL UNIQUE,
  branch_id         uuid, -- NULL = global
  discount_pct      numeric(5,2),
  discount_amount   numeric(12,2),
  max_uses          integer,
  used_count        integer NOT NULL DEFAULT 0,
  valid_from        timestamptz NOT NULL DEFAULT now(),
  valid_until       timestamptz,
  is_active         boolean NOT NULL DEFAULT true,
  notes             text,
  created_by        uuid,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT promo_amount_or_pct CHECK (
    (discount_pct IS NOT NULL AND discount_amount IS NULL)
    OR (discount_pct IS NULL AND discount_amount IS NOT NULL)
  ),
  CONSTRAINT promo_dates_check CHECK (valid_until IS NULL OR valid_until > valid_from)
);

CREATE INDEX IF NOT EXISTS idx_promo_code_active ON public.promo_codes(code) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_promo_branch      ON public.promo_codes(branch_id);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "promo: staff read"
  ON public.promo_codes FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid())
         OR has_any_role(auth.uid(), ARRAY['branch_admin','reception','sales']::app_role[]));

CREATE POLICY "promo: admin manage"
  ON public.promo_codes FOR ALL TO authenticated
  USING (is_super_admin(auth.uid())
         OR (has_role(auth.uid(),'branch_admin'::app_role) AND (branch_id IS NULL OR branch_id = ANY(current_user_branch_ids()))))
  WITH CHECK (is_super_admin(auth.uid())
         OR (has_role(auth.uid(),'branch_admin'::app_role) AND (branch_id IS NULL OR branch_id = ANY(current_user_branch_ids()))));

CREATE TRIGGER trg_set_updated_at_promo_codes
  BEFORE UPDATE ON public.promo_codes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 9. NEW TABLE — enrollment_discounts (audit)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.enrollment_discounts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id   uuid NOT NULL,
  student_id      uuid NOT NULL,
  branch_id       uuid NOT NULL,
  source          public.discount_source NOT NULL,
  promo_code_id   uuid,
  discount_pct    numeric(5,2),
  discount_amount numeric(12,2) NOT NULL,
  approved_by     uuid,
  reason          text,
  applied_at      timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_enroll_disc_enrollment ON public.enrollment_discounts(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_enroll_disc_student    ON public.enrollment_discounts(student_id);
CREATE INDEX IF NOT EXISTS idx_enroll_disc_promo      ON public.enrollment_discounts(promo_code_id);

ALTER TABLE public.enrollment_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "enroll_disc: staff read"
  ON public.enrollment_discounts FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid())
         OR (has_any_role(auth.uid(), ARRAY['branch_admin','reception']::app_role[])
             AND branch_id = ANY(current_user_branch_ids())));

CREATE POLICY "enroll_disc: own student/parent read"
  ON public.enrollment_discounts FOR SELECT TO authenticated
  USING (
    student_id IN (SELECT id FROM public.students WHERE profile_id = auth.uid())
    OR student_id IN (
      SELECT psl.student_id FROM public.parent_student_links psl
      JOIN public.parents p ON p.id = psl.parent_id
      WHERE p.profile_id = auth.uid()
    )
  );

CREATE POLICY "enroll_disc: admin/reception write"
  ON public.enrollment_discounts FOR ALL TO authenticated
  USING (is_super_admin(auth.uid())
         OR (has_any_role(auth.uid(), ARRAY['branch_admin','reception']::app_role[])
             AND branch_id = ANY(current_user_branch_ids())))
  WITH CHECK (is_super_admin(auth.uid())
         OR (has_any_role(auth.uid(), ARRAY['branch_admin','reception']::app_role[])
             AND branch_id = ANY(current_user_branch_ids())));