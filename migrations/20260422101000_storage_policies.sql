/* Storage buckets + RLS policies for MVP */

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('plant-images', 'plant-images', true, 10485760, array['image/png', 'image/jpeg', 'image/webp']),
  ('avatars', 'avatars', true, 5242880, array['image/png', 'image/jpeg', 'image/webp']),
  ('community-images', 'community-images', true, 10485760, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "storage_public_read" on storage.objects;
create policy "storage_public_read"
on storage.objects
for select
using (bucket_id in ('plant-images', 'avatars', 'community-images'));

drop policy if exists "storage_insert_own_prefix" on storage.objects;
create policy "storage_insert_own_prefix"
on storage.objects
for insert
to authenticated
with check (
  bucket_id in ('plant-images', 'avatars', 'community-images')
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "storage_update_own_prefix" on storage.objects;
create policy "storage_update_own_prefix"
on storage.objects
for update
to authenticated
using (
  bucket_id in ('plant-images', 'avatars', 'community-images')
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id in ('plant-images', 'avatars', 'community-images')
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "storage_delete_own_prefix" on storage.objects;
create policy "storage_delete_own_prefix"
on storage.objects
for delete
to authenticated
using (
  bucket_id in ('plant-images', 'avatars', 'community-images')
  and split_part(name, '/', 1) = auth.uid()::text
);
