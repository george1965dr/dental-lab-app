-- Insert sample cases (only if no cases exist)
insert into public.cases (
  id, patient_name, procedure, priority, teeth, shade, implant_type,
  start_date, due_date, created_date, workflow, completed_steps, current_step, notes,
  created_by
)
select 
  'C001', 'Sarah Johnson', 'Crown', 'normal', array['14'], 'A2', null,
  '2024-01-15', '2024-01-22', '2024-01-15',
  array['Impression', 'Designed', 'Milled', 'Sintered', 'Completed'],
  array['Impression', 'Designed'], 'Milled',
  'Patient prefers natural shade matching',
  auth.uid()
where not exists (select 1 from public.cases where id = 'C001')
and auth.uid() is not null;

insert into public.cases (
  id, patient_name, procedure, priority, teeth, shade, implant_type,
  start_date, due_date, created_date, workflow, completed_steps, current_step, notes,
  created_by
)
select 
  'C002', 'Michael Chen', 'Implant Bridge', 'rush', array['18', '19', '20'], 'B1', 'BSB NP',
  '2024-01-16', '2024-01-19', '2024-01-16',
  array['Impression', 'Designed', 'Milled', 'Sintered', 'Completed'],
  array['Impression', 'Designed', 'Milled', 'Sintered'], 'Completed',
  'Rush order - patient traveling next week',
  auth.uid()
where not exists (select 1 from public.cases where id = 'C002')
and auth.uid() is not null;

insert into public.cases (
  id, patient_name, procedure, priority, teeth, shade, implant_type,
  start_date, due_date, created_date, workflow, completed_steps, current_step, notes,
  created_by
)
select 
  'C003', 'Emma Rodriguez', 'Surgical Guide', 'normal', array['11', '12'], 'A3', null,
  '2024-01-17', '2024-01-24', '2024-01-17',
  array['Impression', 'Designed', '3D Printed', 'Completed'],
  array['Impression'], 'Designed',
  'Implant placement for anterior region',
  auth.uid()
where not exists (select 1 from public.cases where id = 'C003')
and auth.uid() is not null;
