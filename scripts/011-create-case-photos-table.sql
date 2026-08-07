-- Create case_photos table for storing photo metadata
create table if not exists public.case_photos (
  id uuid primary key default gen_random_uuid(),
  case_id text not null references public.cases(id) on delete cascade,
  photo_url text not null,
  storage_path text not null,
  uploaded_by uuid references auth.users(id) on delete set null,
  uploaded_at timestamptz default now(),
  photo_order int default 0,
  notes text
);

-- Enable RLS
alter table public.case_photos enable row level security;

-- RLS policies for case_photos - allow all authenticated users to view and manage photos
create policy "case_photos_select_authenticated"
  on public.case_photos for select
  using (auth.uid() is not null);

create policy "case_photos_insert_authenticated"
  on public.case_photos for insert
  with check (auth.uid() is not null and uploaded_by = auth.uid());

create policy "case_photos_update_authenticated"
  on public.case_photos for update
  using (auth.uid() is not null);

create policy "case_photos_delete_authenticated"
  on public.case_photos for delete
  using (auth.uid() is not null);

-- Create indexes for better performance
create index if not exists case_photos_case_id_idx on public.case_photos(case_id);
create index if not exists case_photos_uploaded_at_idx on public.case_photos(uploaded_at);
create index if not exists case_photos_photo_order_idx on public.case_photos(photo_order);
