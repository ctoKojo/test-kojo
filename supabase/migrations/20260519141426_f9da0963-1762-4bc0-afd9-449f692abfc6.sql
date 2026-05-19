-- Chunk 7 Migration A1: Add 'waiting' value to enrollment_status enum.
-- Must run alone (cannot be used in same transaction it's added).
ALTER TYPE public.enrollment_status ADD VALUE IF NOT EXISTS 'waiting';