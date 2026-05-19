-- Add missing foreign keys to close Phase 0 gaps

ALTER TABLE trainer_kpis
  ADD CONSTRAINT fk_trainer_kpis_trainer
  FOREIGN KEY (trainer_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE feedback_responses
  ADD CONSTRAINT fk_feedback_responses_trainer
  FOREIGN KEY (trainer_id) REFERENCES profiles(id) ON DELETE SET NULL;