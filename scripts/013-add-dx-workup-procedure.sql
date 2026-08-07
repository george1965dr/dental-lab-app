-- Add Dx Workup procedure to the cases table constraint
ALTER TABLE cases DROP CONSTRAINT IF EXISTS cases_procedure_check;

-- Add comprehensive constraint with all procedures including Dx Workup
ALTER TABLE cases ADD CONSTRAINT cases_procedure_check 
CHECK (procedure IN (
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
  'Dx Workup'
));
