-- Aligns existing cases' workflow / completed_steps / current_step with the
-- app's current step naming. Run this once, in the Supabase SQL Editor.
--
-- SAFE BY DESIGN:
--   - No rows are ever deleted.
--   - Every UPDATE is scoped to only the rows that still have the OLD shape
--     (guarded by `'impression' = ANY(workflow)`), so this script is
--     idempotent — running it twice is a no-op the second time.
--   - Wrapped in a transaction: if anything looks wrong, run ROLLBACK
--     instead of COMMIT and nothing is changed.
--
-- Recommended: take a manual backup/export of the `cases` table first
-- (Supabase Dashboard -> Table Editor -> cases -> Export), as you would
-- before any bulk update, even a safe one.

BEGIN;

-- ============================================================
-- OPTIONAL PREVIEW — run this SELECT by itself first to see exactly which
-- rows this script will touch, before running the UPDATEs below.
-- ============================================================
-- SELECT id, patient_name, procedure, workflow, completed_steps, current_step
-- FROM cases
-- WHERE 'impression' = ANY(workflow) OR 'impressions' = ANY(workflow)
-- ORDER BY procedure, created_at;

-- ============================================================
-- 1) Lossless rename: "impression" -> "new"
--
-- Applies to every procedure whose workflow *shape* is otherwise unchanged
-- (same number of steps, same order) — the milled-fabrication family, plus
-- Surgical Guide. This is a pure 1-for-1 label swap: array length and step
-- order are identical, so no progress is reinterpreted.
-- ============================================================
UPDATE cases
SET
  workflow = array_replace(workflow, 'impression', 'new'),
  completed_steps = array_replace(completed_steps, 'impression', 'new'),
  current_step = CASE WHEN current_step = 'impression' THEN 'new' ELSE current_step END
WHERE procedure IN ('Crown', 'Bridge', 'Inlay', 'Onlay', 'Implant Crown', 'Implant Bridge', 'Remake', 'Surgical Guide')
  AND 'impression' = ANY(workflow);

-- ============================================================
-- 2) Temp Crown / Temp Bridge: old 4-step 3D-printed-family workflow
--    -> new 5-step milled-family workflow.
--
-- These procedures now fabricate the same way Crowns/Bridges do (milled +
-- sintered) instead of being 3D-printed, so this isn't a rename — the step
-- count changes. Progress is translated by position, preserving "how far
-- along is this case" rather than literal step names:
--
--   old completed_steps            -> new completed_steps        -> new current_step
--   {}                             -> {}                         -> new
--   {impression}                   -> {new}                      -> designed
--   {impression,designed}          -> {new,designed}              -> milled
--   {impression,designed,3d_printed} -> {new,designed,milled,sintered} -> completed
--   (all 4, incl. "completed")     -> {new,designed,milled,sintered,completed} -> completed
-- ============================================================
UPDATE cases
SET
  workflow = ARRAY['new', 'designed', 'milled', 'sintered', 'completed'],
  completed_steps = CASE COALESCE(array_length(completed_steps, 1), 0)
    WHEN 0 THEN ARRAY[]::text[]
    WHEN 1 THEN ARRAY['new']
    WHEN 2 THEN ARRAY['new', 'designed']
    WHEN 3 THEN ARRAY['new', 'designed', 'milled', 'sintered']
    WHEN 4 THEN ARRAY['new', 'designed', 'milled', 'sintered', 'completed']
    ELSE completed_steps
  END,
  current_step = CASE COALESCE(array_length(completed_steps, 1), 0)
    WHEN 0 THEN 'new'
    WHEN 1 THEN 'designed'
    WHEN 2 THEN 'milled'
    WHEN 3 THEN 'completed'
    WHEN 4 THEN 'completed'
    ELSE current_step
  END
WHERE procedure IN ('Temp Crown', 'Temp Bridge')
  AND 'impression' = ANY(workflow);

-- ============================================================
-- 3) Dx Workup: old 4-step fabrication-style workflow -> new single-step
--    "reviewed" workflow (digital-only, no lab fabrication).
--
-- There's no partial-progress equivalent in a 1-step model, so this
-- collapses to a clean binary: fully done before -> done now; anything
-- else (including partial progress) -> not yet reviewed. This is the
-- most honest mapping available — it doesn't invent false precision
-- about "how reviewed" a case is.
-- ============================================================
UPDATE cases
SET
  workflow = ARRAY['reviewed'],
  completed_steps = CASE
    WHEN COALESCE(array_length(completed_steps, 1), 0) >= 4 THEN ARRAY['reviewed']
    ELSE ARRAY[]::text[]
  END,
  current_step = CASE
    WHEN COALESCE(array_length(completed_steps, 1), 0) >= 4 THEN 'completed'
    ELSE 'reviewed'
  END
WHERE procedure = 'Dx Workup'
  AND 'impression' = ANY(workflow);

-- ============================================================
-- NOT migrated on purpose: Aligners, Sent to Lab.
-- Both procedures were removed from the app entirely (no dropdown option,
-- no workflow template) — there's no "new code" shape to align them to.
-- Any existing rows with these procedure values are left exactly as they
-- are: fully viewable, just no longer creatable. If you want to manually
-- recategorize specific old cases under a current procedure, that's a
-- judgment call about the real case, not something to script.
-- ============================================================

-- ============================================================
-- VERIFICATION — after COMMIT, this should return zero rows.
-- ============================================================
-- SELECT id, patient_name, procedure, workflow
-- FROM cases
-- WHERE 'impression' = ANY(workflow)
--   AND procedure IN ('Crown','Bridge','Inlay','Onlay','Implant Crown',
--                      'Implant Bridge','Remake','Surgical Guide',
--                      'Temp Crown','Temp Bridge','Dx Workup');

COMMIT;
