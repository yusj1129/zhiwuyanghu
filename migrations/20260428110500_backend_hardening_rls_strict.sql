/* Step 2: strict RLS hardening (default deny + ownership checks) */

-- Ensure RLS is enabled and enforced
alter table if exists public.profiles enable row level security;
alter table if exists public.plants enable row level security;
alter table if exists public.plant_logs enable row level security;
alter table if exists public.care_reminders enable row level security;
alter table if exists public.guides enable row level security;
alter table if exists public.topics enable row level security;
alter table if exists public.posts enable row level security;
alter table if exists public.post_comments enable row level security;
alter table if exists public.post_likes enable row level security;
alter table if exists public.post_bookmarks enable row level security;
alter table if exists public.comment_likes enable row level security;
alter table if exists public.identify_records enable row level security;
alter table if exists public.favorites enable row level security;

alter table if exists public.profiles force row level security;
alter table if exists public.plants force row level security;
alter table if exists public.plant_logs force row level security;
alter table if exists public.care_reminders force row level security;
alter table if exists public.guides force row level security;
alter table if exists public.topics force row level security;
alter table if exists public.posts force row level security;
alter table if exists public.post_comments force row level security;
alter table if exists public.post_likes force row level security;
alter table if exists public.post_bookmarks force row level security;
alter table if exists public.comment_likes force row level security;
alter table if exists public.identify_records force row level security;
alter table if exists public.favorites force row level security;

-- profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
for select using (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
for insert with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
for update
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "profiles_delete_own" on public.profiles;

-- plants
drop policy if exists "plants_select_own" on public.plants;
create policy "plants_select_own" on public.plants
for select using (user_id = auth.uid() and deleted_at is null);

drop policy if exists "plants_insert_own" on public.plants;
create policy "plants_insert_own" on public.plants
for insert with check (
  user_id = auth.uid()
  and created_by = auth.uid()
  and deleted_at is null
);

drop policy if exists "plants_update_own" on public.plants;
create policy "plants_update_own" on public.plants
for update
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and created_by = auth.uid()
);

drop policy if exists "plants_delete_own" on public.plants;
create policy "plants_delete_own" on public.plants
for delete using (user_id = auth.uid());

-- plant_logs
drop policy if exists "plant_logs_select_own" on public.plant_logs;
create policy "plant_logs_select_own" on public.plant_logs
for select using (user_id = auth.uid() and deleted_at is null);

drop policy if exists "plant_logs_insert_own" on public.plant_logs;
create policy "plant_logs_insert_own" on public.plant_logs
for insert with check (
  user_id = auth.uid()
  and created_by = auth.uid()
  and deleted_at is null
);

drop policy if exists "plant_logs_update_own" on public.plant_logs;
create policy "plant_logs_update_own" on public.plant_logs
for update
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and created_by = auth.uid()
);

drop policy if exists "plant_logs_delete_own" on public.plant_logs;
create policy "plant_logs_delete_own" on public.plant_logs
for delete using (user_id = auth.uid());

-- care_reminders
drop policy if exists "care_reminders_select_own" on public.care_reminders;
create policy "care_reminders_select_own" on public.care_reminders
for select using (user_id = auth.uid() and deleted_at is null);

drop policy if exists "care_reminders_insert_own" on public.care_reminders;
create policy "care_reminders_insert_own" on public.care_reminders
for insert with check (
  user_id = auth.uid()
  and created_by = auth.uid()
  and deleted_at is null
);

drop policy if exists "care_reminders_update_own" on public.care_reminders;
create policy "care_reminders_update_own" on public.care_reminders
for update
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and created_by = auth.uid()
);

drop policy if exists "care_reminders_delete_own" on public.care_reminders;
create policy "care_reminders_delete_own" on public.care_reminders
for delete using (user_id = auth.uid());

-- posts
drop policy if exists "posts_select_all" on public.posts;
create policy "posts_select_all" on public.posts
for select using (deleted_at is null);

drop policy if exists "posts_insert_own" on public.posts;
create policy "posts_insert_own" on public.posts
for insert with check (
  user_id = auth.uid()
  and created_by = auth.uid()
  and deleted_at is null
);

drop policy if exists "posts_update_own" on public.posts;
create policy "posts_update_own" on public.posts
for update
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and created_by = auth.uid()
);

drop policy if exists "posts_delete_own" on public.posts;
create policy "posts_delete_own" on public.posts
for delete using (user_id = auth.uid());

-- post_comments
drop policy if exists "post_comments_select_all" on public.post_comments;
create policy "post_comments_select_all" on public.post_comments
for select using (deleted_at is null);

drop policy if exists "post_comments_insert_own" on public.post_comments;
create policy "post_comments_insert_own" on public.post_comments
for insert with check (
  user_id = auth.uid()
  and created_by = auth.uid()
  and deleted_at is null
);

drop policy if exists "post_comments_update_own" on public.post_comments;
create policy "post_comments_update_own" on public.post_comments
for update
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and created_by = auth.uid()
);

drop policy if exists "post_comments_delete_own" on public.post_comments;
create policy "post_comments_delete_own" on public.post_comments
for delete using (user_id = auth.uid());

-- post_likes
drop policy if exists "post_likes_select_all" on public.post_likes;
create policy "post_likes_select_all" on public.post_likes
for select using (true);

drop policy if exists "post_likes_insert_own" on public.post_likes;
create policy "post_likes_insert_own" on public.post_likes
for insert with check (user_id = auth.uid());

drop policy if exists "post_likes_update_own" on public.post_likes;

drop policy if exists "post_likes_delete_own" on public.post_likes;
create policy "post_likes_delete_own" on public.post_likes
for delete using (user_id = auth.uid());

-- post_bookmarks
drop policy if exists "post_bookmarks_select_own" on public.post_bookmarks;
create policy "post_bookmarks_select_own" on public.post_bookmarks
for select using (user_id = auth.uid());

drop policy if exists "post_bookmarks_insert_own" on public.post_bookmarks;
create policy "post_bookmarks_insert_own" on public.post_bookmarks
for insert with check (user_id = auth.uid());

drop policy if exists "post_bookmarks_update_own" on public.post_bookmarks;

drop policy if exists "post_bookmarks_delete_own" on public.post_bookmarks;
create policy "post_bookmarks_delete_own" on public.post_bookmarks
for delete using (user_id = auth.uid());

-- comment_likes
drop policy if exists "comment_likes_select_own" on public.comment_likes;
create policy "comment_likes_select_own" on public.comment_likes
for select using (user_id = auth.uid());

drop policy if exists "comment_likes_insert_own" on public.comment_likes;
create policy "comment_likes_insert_own" on public.comment_likes
for insert with check (user_id = auth.uid());

drop policy if exists "comment_likes_update_own" on public.comment_likes;

drop policy if exists "comment_likes_delete_own" on public.comment_likes;
create policy "comment_likes_delete_own" on public.comment_likes
for delete using (user_id = auth.uid());

-- identify_records
drop policy if exists "identify_records_own_select" on public.identify_records;
create policy "identify_records_own_select" on public.identify_records
for select using (user_id = auth.uid() and deleted_at is null);

drop policy if exists "identify_records_own_insert" on public.identify_records;
create policy "identify_records_own_insert" on public.identify_records
for insert with check (
  user_id = auth.uid()
  and created_by = auth.uid()
  and deleted_at is null
);

drop policy if exists "identify_records_own_update" on public.identify_records;
create policy "identify_records_own_update" on public.identify_records
for update
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and created_by = auth.uid()
);

drop policy if exists "identify_records_own_delete" on public.identify_records;
create policy "identify_records_own_delete" on public.identify_records
for delete using (user_id = auth.uid());

-- favorites
drop policy if exists "favorites_select_own" on public.favorites;
create policy "favorites_select_own" on public.favorites
for select using (user_id = auth.uid() and deleted_at is null);

drop policy if exists "favorites_insert_own" on public.favorites;
create policy "favorites_insert_own" on public.favorites
for insert with check (
  user_id = auth.uid()
  and created_by = auth.uid()
  and deleted_at is null
);

drop policy if exists "favorites_update_own" on public.favorites;
create policy "favorites_update_own" on public.favorites
for update
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and created_by = auth.uid()
);

drop policy if exists "favorites_delete_own" on public.favorites;
create policy "favorites_delete_own" on public.favorites
for delete using (user_id = auth.uid());

-- public read-only data sets, still hide soft-deleted rows
drop policy if exists "guides_select_all" on public.guides;
create policy "guides_select_all" on public.guides
for select using (deleted_at is null);

drop policy if exists "guides_insert_any" on public.guides;
drop policy if exists "guides_update_any" on public.guides;
drop policy if exists "guides_delete_any" on public.guides;

drop policy if exists "topics_select_all" on public.topics;
create policy "topics_select_all" on public.topics
for select using (deleted_at is null);

drop policy if exists "topics_insert_any" on public.topics;
drop policy if exists "topics_update_any" on public.topics;
drop policy if exists "topics_delete_any" on public.topics;
