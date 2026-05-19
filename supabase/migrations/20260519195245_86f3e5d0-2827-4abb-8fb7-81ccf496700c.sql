-- 1) trainer_kpis: drop CASCADE, allow NULL, switch to SET NULL, add snapshot
ALTER TABLE trainer_kpis DROP CONSTRAINT IF EXISTS fk_trainer_kpis_trainer;
ALTER TABLE trainer_kpis DROP CONSTRAINT IF EXISTS trainer_kpis_trainer_id_fkey;

ALTER TABLE trainer_kpis ALTER COLUMN trainer_id DROP NOT NULL;

ALTER TABLE trainer_kpis
  ADD COLUMN IF NOT EXISTS trainer_name_snapshot text;

-- Backfill existing rows
UPDATE trainer_kpis tk
SET trainer_name_snapshot = p.full_name
FROM profiles p
WHERE tk.trainer_id = p.id AND tk.trainer_name_snapshot IS NULL;

ALTER TABLE trainer_kpis
  ADD CONSTRAINT fk_trainer_kpis_trainer
  FOREIGN KEY (trainer_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- 2) feedback_responses: add snapshot column
ALTER TABLE feedback_responses
  ADD COLUMN IF NOT EXISTS trainer_name_snapshot text;

UPDATE feedback_responses fr
SET trainer_name_snapshot = p.full_name
FROM profiles p
WHERE fr.trainer_id = p.id AND fr.trainer_name_snapshot IS NULL;

-- 3) Trigger to auto-fill trainer_name_snapshot on insert/update
CREATE OR REPLACE FUNCTION public.fn_fill_trainer_name_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.trainer_id IS NOT NULL AND (NEW.trainer_name_snapshot IS NULL OR NEW.trainer_name_snapshot = '') THEN
    SELECT full_name INTO NEW.trainer_name_snapshot
    FROM profiles WHERE id = NEW.trainer_id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_fill_trainer_name_snapshot() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_fill_trainer_name_kpis ON trainer_kpis;
CREATE TRIGGER trg_fill_trainer_name_kpis
  BEFORE INSERT OR UPDATE OF trainer_id ON trainer_kpis
  FOR EACH ROW EXECUTE FUNCTION public.fn_fill_trainer_name_snapshot();

DROP TRIGGER IF EXISTS trg_fill_trainer_name_feedback ON feedback_responses;
CREATE TRIGGER trg_fill_trainer_name_feedback
  BEFORE INSERT OR UPDATE OF trainer_id ON feedback_responses
  FOR EACH ROW EXECUTE FUNCTION public.fn_fill_trainer_name_snapshot();