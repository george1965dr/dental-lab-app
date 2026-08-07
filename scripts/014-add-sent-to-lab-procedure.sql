-- Add "Sent to Lab" to the procedure constraint
-- This procedure tracks cases sent to external labs with workflow: sent -> received -> completed

ALTER TABLE cases DROP CONSTRAINT IF EXISTS cases_procedure_check;

ALTER TABLE cases ADD CONSTRAINT cases_procedure_check CHECK (
  procedure IN (
    'Crown',
    'Bridge',
    'Inlay',
    'Onlay',
    'Implant Crown',
    'Implant Bridge',
    'Surgical Guide',
    'Aligners',
    'Remake',
    'Temp Crown',
    'Temp Bridge',
    'Dx Workup',
    'Sent to Lab'
  )
);
