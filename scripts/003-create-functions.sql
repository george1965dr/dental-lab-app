-- Function to generate case ID
create or replace function generate_case_id()
returns text
language plpgsql
as $$
declare
  new_id text;
  counter int;
begin
  -- Get the next case number
  select coalesce(max(cast(substring(id from 2) as int)), 0) + 1
  into counter
  from public.cases
  where id ~ '^C[0-9]+$';
  
  -- Format as C001, C002, etc.
  new_id := 'C' || lpad(counter::text, 3, '0');
  
  return new_id;
end;
$$;

-- Function to get workflow steps based on procedure
create or replace function get_workflow_for_procedure(proc text)
returns text[]
language plpgsql
as $$
begin
  case proc
    when 'Crown', 'Bridge', 'Inlay', 'Onlay', 'Implant Crown', 'Implant Bridge' then
      return array['Impression', 'Designed', 'Milled', 'Sintered', 'Completed'];
    when 'Surgical Guide' then
      return array['Impression', 'Designed', '3D Printed', 'Completed'];
    when 'Aligners' then
      return array['Impressions', 'Photos', 'Sent to Lab', 'In Office'];
    else
      return array['Started', 'In Progress', 'Completed'];
  end case;
end;
$$;

-- Function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Create triggers for updated_at
create trigger update_profiles_updated_at
  before update on public.profiles
  for each row execute function update_updated_at_column();

create trigger update_cases_updated_at
  before update on public.cases
  for each row execute function update_updated_at_column();
