/* Backend hardening: unified audit fields, partial indexes, and soft-delete enforcement */

create extension if not exists pgcrypto;

-- Keep updated_at in sync on every update
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Convert delete operations into soft delete for selected tables
create or replace function public.soft_delete_row()
returns trigger
language plpgsql
as $$
begin
  execute format(
    'update %I.%I set deleted_at = now(), updated_at = now() where id = $1 and deleted_at is null',
    tg_table_schema,
    tg_table_name
  ) using old.id;
  return null;
end;
$$;

-- Common columns for core business tables
alter table if exists public.plants
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz,
  add column if not exists created_by uuid references auth.users(id) on delete restrict;

alter table if exists public.plant_logs
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz,
  add column if not exists created_by uuid references auth.users(id) on delete restrict;

alter table if exists public.care_reminders
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz,
  add column if not exists created_by uuid references auth.users(id) on delete restrict;

alter table if exists public.guides
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz;

alter table if exists public.topics
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz;

alter table if exists public.posts
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz,
  add column if not exists created_by uuid references auth.users(id) on delete restrict;

alter table if exists public.post_comments
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz,
  add column if not exists created_by uuid references auth.users(id) on delete restrict;

alter table if exists public.identify_records
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz,
  add column if not exists created_by uuid references auth.users(id) on delete restrict;

alter table if exists public.favorites
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz,
  add column if not exists created_by uuid references auth.users(id) on delete restrict;

-- Backfill created_by for existing rows
update public.plants set created_by = user_id where created_by is null;
update public.plant_logs set created_by = user_id where created_by is null;
update public.care_reminders set created_by = user_id where created_by is null;
update public.posts set created_by = user_id where created_by is null;
update public.post_comments set created_by = user_id where created_by is null;
update public.identify_records set created_by = user_id where created_by is null;
update public.favorites set created_by = user_id where created_by is null;

-- Keep writes strict after backfill
alter table if exists public.plants alter column created_by set not null;
alter table if exists public.plant_logs alter column created_by set not null;
alter table if exists public.care_reminders alter column created_by set not null;
alter table if exists public.posts alter column created_by set not null;
alter table if exists public.post_comments alter column created_by set not null;
alter table if exists public.identify_records alter column created_by set not null;
alter table if exists public.favorites alter column created_by set not null;

-- updated_at trigger bindings
drop trigger if exists trg_plants_set_updated_at on public.plants;
create trigger trg_plants_set_updated_at
before update on public.plants
for each row execute function public.set_updated_at();

drop trigger if exists trg_plant_logs_set_updated_at on public.plant_logs;
create trigger trg_plant_logs_set_updated_at
before update on public.plant_logs
for each row execute function public.set_updated_at();

drop trigger if exists trg_care_reminders_set_updated_at on public.care_reminders;
create trigger trg_care_reminders_set_updated_at
before update on public.care_reminders
for each row execute function public.set_updated_at();

drop trigger if exists trg_guides_set_updated_at on public.guides;
create trigger trg_guides_set_updated_at
before update on public.guides
for each row execute function public.set_updated_at();

drop trigger if exists trg_topics_set_updated_at on public.topics;
create trigger trg_topics_set_updated_at
before update on public.topics
for each row execute function public.set_updated_at();

drop trigger if exists trg_posts_set_updated_at on public.posts;
create trigger trg_posts_set_updated_at
before update on public.posts
for each row execute function public.set_updated_at();

drop trigger if exists trg_post_comments_set_updated_at on public.post_comments;
create trigger trg_post_comments_set_updated_at
before update on public.post_comments
for each row execute function public.set_updated_at();

drop trigger if exists trg_identify_records_set_updated_at on public.identify_records;
create trigger trg_identify_records_set_updated_at
before update on public.identify_records
for each row execute function public.set_updated_at();

drop trigger if exists trg_favorites_set_updated_at on public.favorites;
create trigger trg_favorites_set_updated_at
before update on public.favorites
for each row execute function public.set_updated_at();

-- Soft-delete triggers (transparent compatibility for existing delete calls)
drop trigger if exists trg_plants_soft_delete on public.plants;
create trigger trg_plants_soft_delete
before delete on public.plants
for each row execute function public.soft_delete_row();

drop trigger if exists trg_plant_logs_soft_delete on public.plant_logs;
create trigger trg_plant_logs_soft_delete
before delete on public.plant_logs
for each row execute function public.soft_delete_row();

drop trigger if exists trg_care_reminders_soft_delete on public.care_reminders;
create trigger trg_care_reminders_soft_delete
before delete on public.care_reminders
for each row execute function public.soft_delete_row();

drop trigger if exists trg_posts_soft_delete on public.posts;
create trigger trg_posts_soft_delete
before delete on public.posts
for each row execute function public.soft_delete_row();

drop trigger if exists trg_post_comments_soft_delete on public.post_comments;
create trigger trg_post_comments_soft_delete
before delete on public.post_comments
for each row execute function public.soft_delete_row();

drop trigger if exists trg_identify_records_soft_delete on public.identify_records;
create trigger trg_identify_records_soft_delete
before delete on public.identify_records
for each row execute function public.soft_delete_row();

-- RLS policy tightening: hide soft-deleted rows in selects
drop policy if exists "plants_select_own" on public.plants;
create policy "plants_select_own" on public.plants
for select using (user_id = auth.uid() and deleted_at is null);

drop policy if exists "plant_logs_select_own" on public.plant_logs;
create policy "plant_logs_select_own" on public.plant_logs
for select using (user_id = auth.uid() and deleted_at is null);

drop policy if exists "care_reminders_select_own" on public.care_reminders;
create policy "care_reminders_select_own" on public.care_reminders
for select using (user_id = auth.uid() and deleted_at is null);

drop policy if exists "guides_select_all" on public.guides;
create policy "guides_select_all" on public.guides
for select using (deleted_at is null);

drop policy if exists "topics_select_all" on public.topics;
create policy "topics_select_all" on public.topics
for select using (deleted_at is null);

drop policy if exists "posts_select_all" on public.posts;
create policy "posts_select_all" on public.posts
for select using (deleted_at is null);

drop policy if exists "post_comments_select_all" on public.post_comments;
create policy "post_comments_select_all" on public.post_comments
for select using (deleted_at is null);

drop policy if exists "identify_records_own_select" on public.identify_records;
create policy "identify_records_own_select" on public.identify_records
for select using (auth.uid() = user_id and deleted_at is null);

drop policy if exists "favorites_select_own" on public.favorites;
create policy "favorites_select_own" on public.favorites
for select using (auth.uid() = user_id and deleted_at is null);

-- Partial indexes for active rows
create index if not exists idx_plants_user_id_active
  on public.plants(user_id)
  where deleted_at is null;
create index if not exists idx_plants_status_active
  on public.plants(status)
  where deleted_at is null;
create index if not exists idx_plants_created_at_active
  on public.plants(created_at desc)
  where deleted_at is null;

create index if not exists idx_plant_logs_user_id_active
  on public.plant_logs(user_id)
  where deleted_at is null;
create index if not exists idx_plant_logs_plant_id_active
  on public.plant_logs(plant_id)
  where deleted_at is null;
create index if not exists idx_plant_logs_created_at_active
  on public.plant_logs(created_at desc)
  where deleted_at is null;

create index if not exists idx_care_reminders_user_id_active
  on public.care_reminders(user_id)
  where deleted_at is null;
create index if not exists idx_care_reminders_next_reminder_active
  on public.care_reminders(next_reminder)
  where deleted_at is null;

create index if not exists idx_posts_user_id_active
  on public.posts(user_id)
  where deleted_at is null;
create index if not exists idx_posts_topic_id_active
  on public.posts(topic_id)
  where deleted_at is null;
create index if not exists idx_posts_created_at_active
  on public.posts(created_at desc)
  where deleted_at is null;

create index if not exists idx_post_comments_post_id_active
  on public.post_comments(post_id)
  where deleted_at is null;
create index if not exists idx_post_comments_user_id_active
  on public.post_comments(user_id)
  where deleted_at is null;

create index if not exists idx_identify_records_user_id_active
  on public.identify_records(user_id)
  where deleted_at is null;
create index if not exists idx_favorites_user_id_active
  on public.favorites(user_id)
  where deleted_at is null;

-- Full-text search support for community posts
create index if not exists idx_posts_content_tsv_gin
  on public.posts
  using gin (to_tsvector('simple', coalesce(content, '')))
  where deleted_at is null;

-- Keep counters consistent with soft-delete semantics
create or replace function public.fn_recount_post_comments(p_post_id uuid)
returns void
language sql
as $$
  update public.posts
  set comments_count = (
    select count(*)::int
    from public.post_comments
    where post_id = p_post_id
      and deleted_at is null
  )
  where id = p_post_id;
$$;

create or replace function public.fn_recount_topic_posts(p_topic_id uuid)
returns void
language sql
as $$
  update public.topics
  set post_count = (
    select count(*)::int
    from public.posts
    where topic_id = p_topic_id
      and deleted_at is null
  )
  where id = p_topic_id;
$$;
