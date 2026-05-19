
-- =====================================================
-- Phase 0 — Chunk 3: Financial Layer (main)
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- New enums only (payment_status & installment_status already extended in prior migration)
DO $$ BEGIN
  CREATE TYPE treasury_movement_type AS ENUM ('income','expense','transfer_in','transfer_out','adjustment','refund');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE transfer_type AS ENUM ('group_change','branch_change','level_change');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================
-- TABLES
-- =====================================================
CREATE TABLE public.subscriptions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id            uuid NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  enrollment_id         uuid NOT NULL REFERENCES group_enrollments(id) ON DELETE RESTRICT,
  branch_id             uuid NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  package_id            uuid NOT NULL REFERENCES packages(id) ON DELETE RESTRICT,
  status                subscription_status NOT NULL DEFAULT 'pending_payment',
  remaining_sessions    int NOT NULL DEFAULT 0 CHECK (remaining_sessions >= 0),
  subscription_end_date date,
  started_at            timestamptz,
  ends_at               timestamptz,
  paused_at             timestamptz,
  pause_reason          text,
  cancelled_at          timestamptz,
  cancel_reason         text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, enrollment_id)
);

CREATE TABLE public.fee_plans (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id          uuid NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  package_id         uuid NOT NULL REFERENCES packages(id) ON DELETE RESTRICT,
  name               text NOT NULL,
  installments_count int  NOT NULL DEFAULT 1 CHECK (installments_count > 0),
  discount_pct       numeric(5,2) NOT NULL DEFAULT 0 CHECK (discount_pct >= 0 AND discount_pct <= 100),
  is_active          boolean NOT NULL DEFAULT true,
  deleted_at         timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.payments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      uuid NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  subscription_id uuid NOT NULL REFERENCES subscriptions(id) ON DELETE RESTRICT,
  branch_id       uuid NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  fee_plan_id     uuid REFERENCES fee_plans(id) ON DELETE RESTRICT,
  idempotency_key uuid NOT NULL UNIQUE,
  amount_total    numeric(12,2) NOT NULL CHECK (amount_total > 0),
  amount_paid     numeric(12,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  discount_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  payment_method  text NOT NULL DEFAULT 'cash'
                  CHECK (payment_method IN ('cash','bank_transfer','wallet','card')),
  status          payment_status NOT NULL DEFAULT 'active',
  notes           text,
  created_by      uuid REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.installments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id     uuid NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
  student_id     uuid NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  branch_id      uuid NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  amount         numeric(12,2) NOT NULL CHECK (amount > 0),
  due_date       date NOT NULL,
  paid_at        timestamptz,
  paid_amount    numeric(12,2),
  status         installment_status NOT NULL DEFAULT 'pending',
  payment_method text CHECK (payment_method IN ('cash','bank_transfer','wallet','card')),
  received_by    uuid REFERENCES profiles(id) ON DELETE RESTRICT,
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.siblings_discounts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id       uuid NOT NULL REFERENCES parents(id) ON DELETE RESTRICT,
  student_id      uuid NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  installment_id  uuid NOT NULL REFERENCES installments(id) ON DELETE RESTRICT,
  discount_pct    numeric(5,2) NOT NULL,
  discount_amount numeric(12,2) NOT NULL,
  applied_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (installment_id, student_id)
);

CREATE TABLE public.refunds (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id      uuid NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
  student_id      uuid NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  branch_id       uuid NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  idempotency_key uuid NOT NULL UNIQUE,
  amount          numeric(12,2) NOT NULL CHECK (amount > 0),
  reason          text NOT NULL,
  policy_applied  jsonb,
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','approved','processed','rejected')),
  approved_by     uuid REFERENCES profiles(id) ON DELETE RESTRICT,
  processed_at    timestamptz,
  created_by      uuid REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.treasury_accounts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id    uuid NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  name         text NOT NULL,
  account_type text NOT NULL CHECK (account_type IN ('cash','bank','wallet')),
  balance      numeric(12,2) NOT NULL DEFAULT 0,
  currency     text NOT NULL DEFAULT 'EGP',
  is_active    boolean NOT NULL DEFAULT true,
  deleted_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (branch_id, name)
);

CREATE TABLE public.treasury_movements (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  treasury_id         uuid NOT NULL REFERENCES treasury_accounts(id) ON DELETE RESTRICT,
  branch_id           uuid NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  idempotency_key     uuid NOT NULL UNIQUE,
  movement_type       treasury_movement_type NOT NULL,
  amount              numeric(12,2) NOT NULL CHECK (amount > 0),
  direction           text NOT NULL CHECK (direction IN ('in','out')),
  balance_after       numeric(12,2) NOT NULL,
  related_entity_type text,
  related_entity_id   uuid,
  description         text,
  performed_by        uuid REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.expenses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id       uuid NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  treasury_id     uuid NOT NULL REFERENCES treasury_accounts(id) ON DELETE RESTRICT,
  idempotency_key uuid NOT NULL UNIQUE,
  category        text NOT NULL,
  amount          numeric(12,2) NOT NULL CHECK (amount > 0),
  description     text,
  receipt_url     text,
  expense_date    date NOT NULL DEFAULT CURRENT_DATE,
  created_by      uuid REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.student_transfers (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       uuid NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  branch_id        uuid NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  idempotency_key  uuid NOT NULL UNIQUE,
  transfer_type    transfer_type NOT NULL,
  from_group_id    uuid REFERENCES groups(id) ON DELETE RESTRICT,
  to_group_id      uuid REFERENCES groups(id) ON DELETE RESTRICT,
  from_branch_id   uuid REFERENCES branches(id) ON DELETE RESTRICT,
  to_branch_id     uuid REFERENCES branches(id) ON DELETE RESTRICT,
  sessions_carried int NOT NULL DEFAULT 0,
  financial_notes  text,
  transferred_by   uuid REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_subscriptions_student ON subscriptions(student_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_payments_student ON payments(student_id);
CREATE INDEX idx_payments_idempotency ON payments(idempotency_key);
CREATE INDEX idx_installments_due_date ON installments(due_date, status);
CREATE INDEX idx_installments_student ON installments(student_id);
CREATE INDEX idx_installments_payment ON installments(payment_id);
CREATE INDEX idx_treasury_movements_treasury ON treasury_movements(treasury_id);
CREATE INDEX idx_treasury_movements_entity ON treasury_movements(related_entity_type, related_entity_id);
CREATE INDEX idx_expenses_branch ON expenses(branch_id, expense_date);
CREATE INDEX idx_refunds_student ON refunds(student_id);
CREATE INDEX idx_transfers_student ON student_transfers(student_id);

-- =====================================================
-- TIMESTAMPS TRIGGERS
-- =====================================================
CREATE TRIGGER trg_subscriptions_updated      BEFORE UPDATE ON subscriptions      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_fee_plans_updated          BEFORE UPDATE ON fee_plans          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_payments_updated           BEFORE UPDATE ON payments           FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_installments_updated       BEFORE UPDATE ON installments       FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_refunds_updated            BEFORE UPDATE ON refunds            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_treasury_accounts_updated  BEFORE UPDATE ON treasury_accounts  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_expenses_updated           BEFORE UPDATE ON expenses           FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================
-- TRIGGER: treasury balance auto-update
-- =====================================================
CREATE OR REPLACE FUNCTION fn_update_treasury_balance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE v_new_balance numeric;
BEGIN
  IF NEW.direction = 'in' THEN
    UPDATE treasury_accounts SET balance = balance + NEW.amount, updated_at = now()
     WHERE id = NEW.treasury_id RETURNING balance INTO v_new_balance;
  ELSE
    UPDATE treasury_accounts SET balance = balance - NEW.amount, updated_at = now()
     WHERE id = NEW.treasury_id RETURNING balance INTO v_new_balance;
    IF v_new_balance < 0 THEN
      RAISE EXCEPTION 'INSUFFICIENT_BALANCE: treasury % would go negative', NEW.treasury_id;
    END IF;
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION fn_update_treasury_balance() FROM PUBLIC, authenticated, anon;
CREATE TRIGGER trg_treasury_balance AFTER INSERT ON treasury_movements
  FOR EACH ROW EXECUTE FUNCTION fn_update_treasury_balance();

-- =====================================================
-- TRIGGER: restore access on payment
-- =====================================================
CREATE OR REPLACE FUNCTION fn_restore_access_on_payment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE v_overdue_count int;
BEGIN
  IF NEW.status = 'paid' AND OLD.status IS DISTINCT FROM 'paid' THEN
    SELECT COUNT(*) INTO v_overdue_count FROM installments
     WHERE student_id = NEW.student_id AND id <> NEW.id AND status = 'overdue';
    IF v_overdue_count = 0 THEN
      UPDATE students SET subscription_status = 'active', updated_at = now()
       WHERE id = NEW.student_id AND subscription_status = 'restricted';
      UPDATE subscriptions SET status = 'active', updated_at = now()
       WHERE student_id = NEW.student_id AND status = 'restricted';
    END IF;
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION fn_restore_access_on_payment() FROM PUBLIC, authenticated, anon;
CREATE TRIGGER trg_restore_access_on_payment AFTER UPDATE ON installments
  FOR EACH ROW EXECUTE FUNCTION fn_restore_access_on_payment();

-- =====================================================
-- TRIGGER: siblings discount
-- =====================================================
CREATE OR REPLACE FUNCTION fn_recalculate_sibling_discounts(p_parent_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_siblings_count int;
  v_discount_pct   numeric(5,2);
  v_policy         jsonb;
BEGIN
  SELECT COUNT(DISTINCT psl.student_id) INTO v_siblings_count
    FROM parent_student_links psl
    JOIN students s ON s.id = psl.student_id
   WHERE psl.parent_id = p_parent_id
     AND s.subscription_status IN ('active','active_waiting');

  IF v_siblings_count >= 2 THEN
    v_policy := get_policy('siblings_discount_pct');
    v_discount_pct := COALESCE((v_policy->>'value')::numeric, 10);
  ELSE
    v_discount_pct := 0;
  END IF;

  IF v_discount_pct > 0 THEN
    INSERT INTO siblings_discounts (parent_id, student_id, installment_id, discount_pct, discount_amount)
    SELECT p_parent_id, i.student_id, i.id, v_discount_pct,
           ROUND(i.amount * (v_discount_pct / 100.0), 2)
      FROM installments i
     WHERE i.status = 'pending'
       AND i.student_id IN (SELECT psl.student_id FROM parent_student_links psl WHERE psl.parent_id = p_parent_id)
    ON CONFLICT (installment_id, student_id) DO UPDATE
      SET discount_pct = EXCLUDED.discount_pct,
          discount_amount = EXCLUDED.discount_amount,
          applied_at = now();
  END IF;
END; $$;
REVOKE EXECUTE ON FUNCTION fn_recalculate_sibling_discounts(uuid) FROM PUBLIC, authenticated, anon;

CREATE OR REPLACE FUNCTION fn_trigger_sibling_discount()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN PERFORM fn_recalculate_sibling_discounts(OLD.parent_id);
  ELSE PERFORM fn_recalculate_sibling_discounts(NEW.parent_id); END IF;
  RETURN COALESCE(NEW, OLD);
END; $$;
REVOKE EXECUTE ON FUNCTION fn_trigger_sibling_discount() FROM PUBLIC, authenticated, anon;

CREATE TRIGGER trg_siblings_discount AFTER INSERT OR UPDATE OR DELETE ON parent_student_links
  FOR EACH ROW EXECUTE FUNCTION fn_trigger_sibling_discount();

-- =====================================================
-- RPCs
-- =====================================================
CREATE OR REPLACE FUNCTION fn_create_payment_with_installments(
  p_student_id uuid, p_subscription_id uuid, p_fee_plan_id uuid,
  p_amount_total numeric, p_payment_method text, p_installments jsonb,
  p_idempotency_key uuid, p_notes text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_payment_id uuid;
  v_branch_id  uuid;
  v_installment jsonb;
BEGIN
  IF EXISTS (SELECT 1 FROM idempotency_keys WHERE key = p_idempotency_key::text AND operation = 'create_payment') THEN
    SELECT id INTO v_payment_id FROM payments WHERE idempotency_key = p_idempotency_key;
    RETURN v_payment_id;
  END IF;

  SELECT branch_id INTO v_branch_id FROM students WHERE id = p_student_id;

  INSERT INTO payments (student_id, subscription_id, branch_id, fee_plan_id,
                        idempotency_key, amount_total, payment_method, notes, created_by)
  VALUES (p_student_id, p_subscription_id, v_branch_id, p_fee_plan_id,
          p_idempotency_key, p_amount_total, p_payment_method, p_notes, auth.uid())
  RETURNING id INTO v_payment_id;

  FOR v_installment IN SELECT * FROM jsonb_array_elements(p_installments) LOOP
    INSERT INTO installments (payment_id, student_id, branch_id, amount, due_date)
    VALUES (v_payment_id, p_student_id, v_branch_id,
            (v_installment->>'amount')::numeric,
            (v_installment->>'due_date')::date);
  END LOOP;

  INSERT INTO idempotency_keys (key, operation, user_id, status, completed_at)
  VALUES (p_idempotency_key::text, 'create_payment', auth.uid(), 'completed', now());

  PERFORM log_audit('create'::audit_action, 'payment', v_payment_id, v_branch_id,
                    NULL, jsonb_build_object('amount', p_amount_total, 'method', p_payment_method), NULL);

  RETURN v_payment_id;
END; $$;
REVOKE EXECUTE ON FUNCTION fn_create_payment_with_installments(uuid, uuid, uuid, numeric, text, jsonb, uuid, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION fn_create_payment_with_installments(uuid, uuid, uuid, numeric, text, jsonb, uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION fn_record_income(
  p_treasury_id uuid, p_amount numeric, p_related_entity_type text,
  p_related_entity_id uuid, p_description text, p_idempotency_key uuid
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_movement_id uuid; v_branch_id uuid; v_balance_after numeric;
BEGIN
  IF EXISTS (SELECT 1 FROM idempotency_keys WHERE key = p_idempotency_key::text AND operation = 'treasury_income') THEN
    SELECT id INTO v_movement_id FROM treasury_movements WHERE idempotency_key = p_idempotency_key;
    RETURN v_movement_id;
  END IF;
  SELECT branch_id, balance + p_amount INTO v_branch_id, v_balance_after
    FROM treasury_accounts WHERE id = p_treasury_id;
  INSERT INTO treasury_movements
    (treasury_id, branch_id, idempotency_key, movement_type, amount, direction,
     balance_after, related_entity_type, related_entity_id, description, performed_by)
  VALUES
    (p_treasury_id, v_branch_id, p_idempotency_key, 'income', p_amount, 'in',
     v_balance_after, p_related_entity_type, p_related_entity_id, p_description, auth.uid())
  RETURNING id INTO v_movement_id;
  INSERT INTO idempotency_keys (key, operation, user_id, status, completed_at)
  VALUES (p_idempotency_key::text, 'treasury_income', auth.uid(), 'completed', now());
  RETURN v_movement_id;
END; $$;
REVOKE EXECUTE ON FUNCTION fn_record_income(uuid, numeric, text, uuid, text, uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION fn_record_income(uuid, numeric, text, uuid, text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION fn_record_expense(
  p_treasury_id uuid, p_category text, p_amount numeric,
  p_description text, p_expense_date date, p_idempotency_key uuid
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_expense_id uuid; v_branch_id uuid; v_balance_after numeric;
BEGIN
  IF EXISTS (SELECT 1 FROM idempotency_keys WHERE key = p_idempotency_key::text AND operation = 'expense') THEN
    SELECT id INTO v_expense_id FROM expenses WHERE idempotency_key = p_idempotency_key;
    RETURN v_expense_id;
  END IF;
  SELECT branch_id INTO v_branch_id FROM treasury_accounts WHERE id = p_treasury_id;
  INSERT INTO expenses (branch_id, treasury_id, idempotency_key, category, amount, description, expense_date, created_by)
  VALUES (v_branch_id, p_treasury_id, p_idempotency_key, p_category, p_amount, p_description, p_expense_date, auth.uid())
  RETURNING id INTO v_expense_id;
  SELECT balance - p_amount INTO v_balance_after FROM treasury_accounts WHERE id = p_treasury_id;
  INSERT INTO treasury_movements
    (treasury_id, branch_id, idempotency_key, movement_type, amount, direction,
     balance_after, related_entity_type, related_entity_id, description, performed_by)
  VALUES
    (p_treasury_id, v_branch_id, gen_random_uuid(), 'expense', p_amount, 'out',
     v_balance_after, 'expense', v_expense_id, p_description, auth.uid());
  INSERT INTO idempotency_keys (key, operation, user_id, status, completed_at)
  VALUES (p_idempotency_key::text, 'expense', auth.uid(), 'completed', now());
  PERFORM log_audit('create'::audit_action, 'expense', v_expense_id, v_branch_id,
                    NULL, jsonb_build_object('amount', p_amount, 'category', p_category), NULL);
  RETURN v_expense_id;
END; $$;
REVOKE EXECUTE ON FUNCTION fn_record_expense(uuid, text, numeric, text, date, uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION fn_record_expense(uuid, text, numeric, text, date, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION fn_transfer_between_accounts(
  p_from_treasury_id uuid, p_to_treasury_id uuid, p_amount numeric,
  p_description text, p_idempotency_key uuid
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_from_branch uuid; v_to_branch uuid;
  v_from_balance numeric; v_to_balance numeric;
BEGIN
  IF EXISTS (SELECT 1 FROM idempotency_keys WHERE key = p_idempotency_key::text AND operation = 'transfer') THEN
    RETURN;
  END IF;
  SELECT branch_id, balance INTO v_from_branch, v_from_balance
    FROM treasury_accounts WHERE id = p_from_treasury_id FOR UPDATE;
  IF v_from_balance < p_amount THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE: cannot transfer % from account %', p_amount, p_from_treasury_id;
  END IF;
  SELECT branch_id, balance INTO v_to_branch, v_to_balance
    FROM treasury_accounts WHERE id = p_to_treasury_id FOR UPDATE;
  INSERT INTO treasury_movements
    (treasury_id, branch_id, idempotency_key, movement_type, amount, direction,
     balance_after, related_entity_type, description, performed_by)
  VALUES
    (p_from_treasury_id, v_from_branch, p_idempotency_key, 'transfer_out', p_amount, 'out',
     v_from_balance - p_amount, 'transfer', p_description, auth.uid());
  INSERT INTO treasury_movements
    (treasury_id, branch_id, idempotency_key, movement_type, amount, direction,
     balance_after, related_entity_type, description, performed_by)
  VALUES
    (p_to_treasury_id, v_to_branch, gen_random_uuid(), 'transfer_in', p_amount, 'in',
     v_to_balance + p_amount, 'transfer', p_description, auth.uid());
  INSERT INTO idempotency_keys (key, operation, user_id, status, completed_at)
  VALUES (p_idempotency_key::text, 'transfer', auth.uid(), 'completed', now());
END; $$;
REVOKE EXECUTE ON FUNCTION fn_transfer_between_accounts(uuid, uuid, numeric, text, uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION fn_transfer_between_accounts(uuid, uuid, numeric, text, uuid) TO authenticated;

-- =====================================================
-- CRON JOBS
-- =====================================================
SELECT cron.schedule('cron_flag_overdue_installments', '30 0 * * *', $CRON$
  WITH g AS (SELECT COALESCE((get_policy('payment_block_grace_days')->>'value')::int, 7) AS days),
  flagged AS (
    UPDATE installments SET status = 'overdue', updated_at = now()
     WHERE status = 'pending' AND due_date < CURRENT_DATE AND paid_at IS NULL
    RETURNING student_id
  )
  UPDATE students s SET subscription_status = 'restricted', updated_at = now()
   WHERE s.subscription_status = 'active'
     AND EXISTS (SELECT 1 FROM installments i, g
                  WHERE i.student_id = s.id AND i.status = 'overdue'
                    AND i.due_date < CURRENT_DATE - g.days);
$CRON$);

SELECT cron.schedule('cron_recompute_subscription_end', '0 3 * * *', $CRON$
  UPDATE subscriptions s
     SET subscription_end_date = (SELECT MAX(i.due_date) FROM installments i
                                    JOIN payments p ON p.id = i.payment_id
                                   WHERE p.subscription_id = s.id),
         updated_at = now()
   WHERE status IN ('active','active_waiting','frozen');
$CRON$);

SELECT cron.schedule('cron_cleanup_idempotency_keys', '0 4 * * *', $CRON$
  DELETE FROM idempotency_keys WHERE expires_at < now();
$CRON$);

-- =====================================================
-- RLS
-- =====================================================
ALTER TABLE subscriptions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_plans           ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE installments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE siblings_discounts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds             ENABLE ROW LEVEL SECURITY;
ALTER TABLE treasury_accounts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE treasury_movements  ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses            ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_transfers   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_read" ON subscriptions FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()) OR branch_id = ANY(current_user_branch_ids())
    OR student_id IN (SELECT psl.student_id FROM parent_student_links psl
                       JOIN parents p ON p.id = psl.parent_id WHERE p.profile_id = auth.uid())
    OR student_id IN (SELECT id FROM students WHERE profile_id = auth.uid()));
CREATE POLICY "subscriptions_write_staff" ON subscriptions FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR (has_any_role(auth.uid(), ARRAY['branch_admin','reception']::app_role[]) AND branch_id = ANY(current_user_branch_ids())))
  WITH CHECK (is_super_admin(auth.uid()) OR (has_any_role(auth.uid(), ARRAY['branch_admin','reception']::app_role[]) AND branch_id = ANY(current_user_branch_ids())));

CREATE POLICY "fee_plans_read" ON fee_plans FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()) OR branch_id = ANY(current_user_branch_ids()));
CREATE POLICY "fee_plans_write_admin" ON fee_plans FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR (has_role(auth.uid(), 'branch_admin') AND branch_id = ANY(current_user_branch_ids())))
  WITH CHECK (is_super_admin(auth.uid()) OR (has_role(auth.uid(), 'branch_admin') AND branch_id = ANY(current_user_branch_ids())));

CREATE POLICY "payments_read_staff" ON payments FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()) OR (branch_id = ANY(current_user_branch_ids())
        AND has_any_role(auth.uid(), ARRAY['branch_admin','reception']::app_role[])));
CREATE POLICY "payments_read_parent_student" ON payments FOR SELECT TO authenticated
  USING (student_id IN (SELECT psl.student_id FROM parent_student_links psl
                         JOIN parents p ON p.id = psl.parent_id WHERE p.profile_id = auth.uid())
      OR student_id IN (SELECT id FROM students WHERE profile_id = auth.uid()));
CREATE POLICY "payments_write_staff" ON payments FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR (has_any_role(auth.uid(), ARRAY['branch_admin','reception']::app_role[]) AND branch_id = ANY(current_user_branch_ids())))
  WITH CHECK (is_super_admin(auth.uid()) OR (has_any_role(auth.uid(), ARRAY['branch_admin','reception']::app_role[]) AND branch_id = ANY(current_user_branch_ids())));

CREATE POLICY "installments_read_staff" ON installments FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()) OR (branch_id = ANY(current_user_branch_ids())
        AND has_any_role(auth.uid(), ARRAY['branch_admin','reception']::app_role[])));
CREATE POLICY "installments_read_parent_student" ON installments FOR SELECT TO authenticated
  USING (student_id IN (SELECT psl.student_id FROM parent_student_links psl
                         JOIN parents p ON p.id = psl.parent_id WHERE p.profile_id = auth.uid())
      OR student_id IN (SELECT id FROM students WHERE profile_id = auth.uid()));
CREATE POLICY "installments_write_staff" ON installments FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR (has_any_role(auth.uid(), ARRAY['branch_admin','reception']::app_role[]) AND branch_id = ANY(current_user_branch_ids())))
  WITH CHECK (is_super_admin(auth.uid()) OR (has_any_role(auth.uid(), ARRAY['branch_admin','reception']::app_role[]) AND branch_id = ANY(current_user_branch_ids())));

CREATE POLICY "siblings_discounts_read" ON siblings_discounts FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()) OR has_any_role(auth.uid(), ARRAY['branch_admin','reception']::app_role[])
      OR parent_id IN (SELECT id FROM parents WHERE profile_id = auth.uid()));
CREATE POLICY "siblings_discounts_write" ON siblings_discounts FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR has_role(auth.uid(), 'branch_admin'))
  WITH CHECK (is_super_admin(auth.uid()) OR has_role(auth.uid(), 'branch_admin'));

CREATE POLICY "treasury_accounts_admin" ON treasury_accounts FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR (has_role(auth.uid(), 'branch_admin') AND branch_id = ANY(current_user_branch_ids())))
  WITH CHECK (is_super_admin(auth.uid()) OR (has_role(auth.uid(), 'branch_admin') AND branch_id = ANY(current_user_branch_ids())));

CREATE POLICY "treasury_movements_admin" ON treasury_movements FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR (has_role(auth.uid(), 'branch_admin') AND branch_id = ANY(current_user_branch_ids())))
  WITH CHECK (is_super_admin(auth.uid()) OR (has_role(auth.uid(), 'branch_admin') AND branch_id = ANY(current_user_branch_ids())));

CREATE POLICY "expenses_read_staff" ON expenses FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()) OR (branch_id = ANY(current_user_branch_ids())
        AND has_any_role(auth.uid(), ARRAY['branch_admin','reception']::app_role[])));
CREATE POLICY "expenses_write_admin" ON expenses FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR (has_role(auth.uid(), 'branch_admin') AND branch_id = ANY(current_user_branch_ids())))
  WITH CHECK (is_super_admin(auth.uid()) OR (has_role(auth.uid(), 'branch_admin') AND branch_id = ANY(current_user_branch_ids())));

CREATE POLICY "refunds_staff" ON refunds FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR (branch_id = ANY(current_user_branch_ids())
        AND has_any_role(auth.uid(), ARRAY['branch_admin','reception']::app_role[])))
  WITH CHECK (is_super_admin(auth.uid()) OR (branch_id = ANY(current_user_branch_ids())
        AND has_any_role(auth.uid(), ARRAY['branch_admin','reception']::app_role[])));

CREATE POLICY "transfers_admin" ON student_transfers FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR (has_role(auth.uid(), 'branch_admin') AND branch_id = ANY(current_user_branch_ids())))
  WITH CHECK (is_super_admin(auth.uid()) OR (has_role(auth.uid(), 'branch_admin') AND branch_id = ANY(current_user_branch_ids())));
