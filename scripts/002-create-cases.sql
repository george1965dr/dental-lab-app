-- Create cases table for dental lab case management
create table if not exists public.cases (
  id text primary key,
  patient_name text not null,
  procedure text not null check (procedure in ('Crown', 'Bridge', 'Inlay', 'Onlay', 'Implant Crown', 'Implant Bridge', 'Surgical Guide', 'Aligners')),
  priority text not null default 'normal' check (priority in ('normal', 'rush')),
  teeth text[] not null default '{}',
  shade text,
  implant_type text check (implant_type in ('BSB NP', 'BSB RP', 'Forte', 'Megagen')),
  start_date date not null,
  due_date date not null,
  created_date date not null default current_date,
  workflow text[] not null default '{}',
  completed_steps text[] not null default '{}',
  current_step text,
  notes text,
  created_by uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.cases enable row level security;

-- RLS policies for cases - allow all authenticated users to view and manage cases
-- This is appropriate for a dental lab where team members need to collaborate
create policy "cases_select_authenticated"
  on public.cases for select
  using (auth.uid() is not null);

create policy "cases_insert_authenticated"
  on public.cases for insert
  with check (auth.uid() is not null and created_by = auth.uid());

create policy "cases_update_authenticated"
  on public.cases for update
  using (auth.uid() is not null);

create policy "cases_delete_authenticated"
  on public.cases for delete
  using (auth.uid() is not null);

-- Create indexes for better performance
create index if not exists cases_patient_name_idx on public.cases(patient_name);
create index if not exists cases_procedure_idx on public.cases(procedure);
create index if not exists cases_priority_idx on public.cases(priority);
create index if not exists cases_due_date_idx on public.cases(due_date);
create index if not exists cases_created_by_idx on public.cases(created_by);
