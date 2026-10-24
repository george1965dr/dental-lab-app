-- Adds '3i C4.1' and '3i C5.0' to the implant types the database accepts.
-- Additive only: every value allowed by 018 (including the retired Forte and
-- Megagen) stays allowed, so existing cases remain editable -- Postgres
-- re-checks every CHECK constraint on any row update.
-- Safe to run more than once.

BEGIN;

ALTER TABLE cases DROP CONSTRAINT IF EXISTS cases_implant_type_check;

ALTER TABLE cases ADD CONSTRAINT cases_implant_type_check
CHECK (implant_type IS NULL OR implant_type IN (
  'Neodent Helix',
  'Neodent Helix Narrow',
  'BSB NP',
  'BSB RP',
  '3i C4.1',
  '3i C5.0',
  'Forte',
  'Megagen'
));

COMMIT;
