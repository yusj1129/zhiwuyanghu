/*
  PostgREST embed (?select=*,profiles(...)) requires a direct FK from the parent
  column to the embedded table. posts.user_id previously referenced only
  auth.users, so requests like getPosts() returned 400.

  Batch profile reads (e.g. CommunityPage) also need RLS to allow reading other
  authors' display fields for logged-in users.
*/

-- Ensure every post author has a profiles row before repointing the FK
insert into public.profiles (id)
select distinct p.user_id
from public.posts p
where not exists (select 1 from public.profiles pr where pr.id = p.user_id)
on conflict (id) do nothing;

alter table public.posts drop constraint if exists posts_user_id_fkey;

alter table public.posts
  add constraint posts_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;

drop policy if exists "profiles_select_peers" on public.profiles;
create policy "profiles_select_peers" on public.profiles
for select
to authenticated
using (true);
