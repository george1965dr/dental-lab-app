-- Add Remake to the procedure check constraint
-- First drop the existing constraint
alter table public.cases drop constraint if exists cases_procedure_check;

-- Add new constraint that includes Remake procedure
alter table public.cases add constraint cases_procedure_check 
  check (procedure in ('Crown', 'Bridge', 'Inlay', 'Onlay', 'Implant Crown', 'Implant Bridge', 'Surgical Guide', 'Aligners', 'Remake'));
