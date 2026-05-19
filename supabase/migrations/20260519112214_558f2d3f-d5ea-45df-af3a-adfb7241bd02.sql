
-- =====================================================
-- Chunk 3 (retry): extend existing enums first
-- =====================================================
ALTER TYPE payment_status      ADD VALUE IF NOT EXISTS 'active';
ALTER TYPE payment_status      ADD VALUE IF NOT EXISTS 'partially_refunded';
ALTER TYPE installment_status  ADD VALUE IF NOT EXISTS 'cancelled';
