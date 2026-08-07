-- Comprehensive fix for procedure constraint including all procedures from previous migrations
-- Drop the existing constraint and recreate with complete procedure list
ALTER TABLE cases DROP CONSTRAINT IF EXISTS cases_procedure_check;

-- Add comprehensive constraint with all procedures from previous migrations
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
  'Temp Bridge'
));
