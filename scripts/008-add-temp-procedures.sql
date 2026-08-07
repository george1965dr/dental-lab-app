-- Add Temp Crown and Temp Bridge to the procedure constraint
ALTER TABLE public.cases 
DROP CONSTRAINT IF EXISTS cases_procedure_check;

ALTER TABLE public.cases 
ADD CONSTRAINT cases_procedure_check 
CHECK (procedure IN ('Crown', 'Bridge', 'Inlay', 'Onlay', 'Implant Crown', 'Implant Bridge', 'Surgical Guide', 'Aligners', 'Remake', 'Temp Crown', 'Temp Bridge'));
