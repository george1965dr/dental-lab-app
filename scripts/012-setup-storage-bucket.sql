-- Create storage bucket for case photos
insert into storage.buckets (id, name, public)
values ('case-photos', 'case-photos', true)
on conflict (id) do nothing;

-- Storage policies for case-photos bucket
create policy "case_photos_bucket_select"
  on storage.objects for select
  using (bucket_id = 'case-photos' and auth.uid() is not null);

create policy "case_photos_bucket_insert"
  on storage.objects for insert
  with check (bucket_id = 'case-photos' and auth.uid() is not null);

create policy "case_photos_bucket_update"
  on storage.objects for update
  using (bucket_id = 'case-photos' and auth.uid() is not null);

create policy "case_photos_bucket_delete"
  on storage.objects for delete
  using (bucket_id = 'case-photos' and auth.uid() is not null);
