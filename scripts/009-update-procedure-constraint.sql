-- Drop existing constraint and recreate with temp procedures
ALTER TABLE cases DROP CONSTRAINT IF EXISTS cases_procedure_check;

-- Add new constraint with temp procedures included
ALTER TABLE cases ADD CONSTRAINT cases_procedure_check 
CHECK (procedure IN ('Crown', 'Bridge', 'Denture', 'Partial', 'Implant', 'Veneer', 'Inlay', 'Onlay', 'Temp Crown', 'Temp Bridge'));
