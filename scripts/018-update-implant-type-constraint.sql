-- The office switched implant systems. New cases should only offer Neodent
-- Helix, Neodent Helix Narrow, and BSB NP going forward -- that's enforced in
-- the app's dropdown, not here. This migration only touches what the
-- DATABASE will accept.
--
-- IMPORTANT: this adds the new values to the allowed list, it does not
-- replace it. Existing cases using the old systems (BSB RP, Forte, Megagen)
-- keep their stored value untouched, and -- just as importantly -- stay
-- editable afterward: Postgres re-checks every CHECK constraint on a row
-- for ANY update to it, even one that doesn't touch implant_type at all. If
-- the old values were removed from the allowed list, saving any unrelated
-- change (advancing a workflow step, fixing a due date, etc.) on an old
-- implant case would fail with a constraint violation. Keeping the old
-- values in the list alongside the new ones avoids that entirely.
--
-- Safe to run more than once (DROP IF EXISTS + re-ADD is idempotent).

BEGIN;

ALTER TABLE cases DROP CONSTRAINT IF EXISTS cases_implant_type_check;

ALTER TABLE cases ADD CONSTRAINT cases_implant_type_check
CHECK (implant_type IS NULL OR implant_type IN (
  'Neodent Helix',
  'Neodent Helix Narrow',
  'BSB NP',
  'BSB RP',
  'Forte',
  'Megagen'
));

COMMIT;
