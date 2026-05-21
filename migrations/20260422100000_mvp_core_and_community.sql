/* MVP core schema + community schema + RLS baseline */

create extension if not exists pgcrypto;

-- profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  bio text,
  notifications_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

-- plants
create table if not exists public.plants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  species text,
  scientific_name text,
  family text,
  image_url text,
  status text not null default 'healthy'
    check (status in ('healthy', 'needsWater', 'needsFertilizer', 'needsPruning')),
  difficulty text,
  description text,
  water_frequency integer not null default 7 check (water_frequency > 0),
  next_water_date timestamptz,
  last_watered_at timestamptz,
  care_water text,
  care_light text,
  care_temperature text,
  care_fertilizer text,
  care_pest text,
  created_at timestamptz not null default now()
);

-- plant_logs
create table if not exists public.plant_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plant_id uuid not null references public.plants(id) on delete cascade,
  log_date timestamptz not null default now(),
  content text not null,
  images text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- care_reminders
create table if not exists public.care_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plant_id uuid not null references public.plants(id) on delete cascade,
  type text not null check (type in ('water', 'fertilizer', 'prune', 'repot')),
  frequency integer not null check (frequency > 0),
  unit text not null check (unit in ('day', 'week', 'month')),
  next_reminder timestamptz,
  enabled boolean not null default true,
  remind_advance_days integer not null default 0,
  created_at timestamptz not null default now()
);

-- guides
create table if not exists public.guides (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  cover_url text,
  category text,
  difficulty text check (difficulty in ('beginner', 'intermediate', 'advanced')),
  content text not null default '',
  author_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- topics
create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  icon text,
  post_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- posts
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid references public.topics(id) on delete set null,
  content text not null,
  images text[] not null default '{}',
  likes_count integer not null default 0,
  comments_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- post_comments
create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  likes_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- post_likes
create table if not exists public.post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint post_likes_user_post_unique unique (post_id, user_id)
);

-- post_bookmarks
create table if not exists public.post_bookmarks (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint post_bookmarks_user_post_unique unique (post_id, user_id)
);

-- comment_likes
create table if not exists public.comment_likes (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.post_comments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint comment_likes_user_comment_unique unique (comment_id, user_id)
);

create index if not exists plants_user_id_idx on public.plants(user_id);
create index if not exists plant_logs_user_id_idx on public.plant_logs(user_id);
create index if not exists plant_logs_plant_id_idx on public.plant_logs(plant_id);
create index if not exists care_reminders_user_id_idx on public.care_reminders(user_id);
create index if not exists care_reminders_plant_id_idx on public.care_reminders(plant_id);
create index if not exists posts_user_id_idx on public.posts(user_id);
create index if not exists posts_topic_id_idx on public.posts(topic_id);
create index if not exists post_comments_post_id_idx on public.post_comments(post_id);
create index if not exists post_likes_post_id_idx on public.post_likes(post_id);
create index if not exists post_bookmarks_user_id_idx on public.post_bookmarks(user_id);
create index if not exists comment_likes_comment_id_idx on public.comment_likes(comment_id);

-- counters
create or replace function public.fn_recount_post_likes(p_post_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.posts
  set likes_count = (
    select count(*)::int
    from public.post_likes
    where post_id = p_post_id
  )
  where id = p_post_id;
$$;

create or replace function public.fn_recount_post_comments(p_post_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.posts
  set comments_count = (
    select count(*)::int
    from public.post_comments
    where post_id = p_post_id
  )
  where id = p_post_id;
$$;

create or replace function public.fn_recount_comment_likes(p_comment_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.post_comments
  set likes_count = (
    select count(*)::int
    from public.comment_likes
    where comment_id = p_comment_id
  )
  where id = p_comment_id;
$$;

create or replace function public.fn_recount_topic_posts(p_topic_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.topics
  set post_count = (
    select count(*)::int
    from public.posts
    where topic_id = p_topic_id
  )
  where id = p_topic_id;
$$;

create or replace function public.trg_post_likes_recount()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    perform public.fn_recount_post_likes(old.post_id);
    return old;
  end if;
  perform public.fn_recount_post_likes(new.post_id);
  return new;
end;
$$;

create or replace function public.trg_post_comments_recount()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    perform public.fn_recount_post_comments(old.post_id);
    return old;
  end if;
  perform public.fn_recount_post_comments(new.post_id);
  return new;
end;
$$;

create or replace function public.trg_comment_likes_recount()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    perform public.fn_recount_comment_likes(old.comment_id);
    return old;
  end if;
  perform public.fn_recount_comment_likes(new.comment_id);
  return new;
end;
$$;

create or replace function public.trg_topics_post_count_recount()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    if old.topic_id is not null then
      perform public.fn_recount_topic_posts(old.topic_id);
    end if;
    return old;
  end if;
  if tg_op = 'UPDATE' and old.topic_id is distinct from new.topic_id then
    if old.topic_id is not null then
      perform public.fn_recount_topic_posts(old.topic_id);
    end if;
  end if;
  if new.topic_id is not null then
    perform public.fn_recount_topic_posts(new.topic_id);
  end if;
  return new;
end;
$$;

drop trigger if exists post_likes_recount on public.post_likes;
create trigger post_likes_recount
after insert or delete on public.post_likes
for each row execute function public.trg_post_likes_recount();

drop trigger if exists post_comments_recount on public.post_comments;
create trigger post_comments_recount
after insert or delete on public.post_comments
for each row execute function public.trg_post_comments_recount();

drop trigger if exists comment_likes_recount on public.comment_likes;
create trigger comment_likes_recount
after insert or delete on public.comment_likes
for each row execute function public.trg_comment_likes_recount();

drop trigger if exists topics_post_count_recount on public.posts;
create trigger topics_post_count_recount
after insert or update of topic_id or delete on public.posts
for each row execute function public.trg_topics_post_count_recount();

-- RLS
alter table public.profiles enable row level security;
alter table public.plants enable row level security;
alter table public.plant_logs enable row level security;
alter table public.care_reminders enable row level security;
alter table public.guides enable row level security;
alter table public.topics enable row level security;
alter table public.posts enable row level security;
alter table public.post_comments enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_bookmarks enable row level security;
alter table public.comment_likes enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (id = auth.uid());
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (id = auth.uid());
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "plants_select_own" on public.plants;
create policy "plants_select_own" on public.plants for select using (user_id = auth.uid());
drop policy if exists "plants_insert_own" on public.plants;
create policy "plants_insert_own" on public.plants for insert with check (user_id = auth.uid());
drop policy if exists "plants_update_own" on public.plants;
create policy "plants_update_own" on public.plants for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "plants_delete_own" on public.plants;
create policy "plants_delete_own" on public.plants for delete using (user_id = auth.uid());

drop policy if exists "plant_logs_select_own" on public.plant_logs;
create policy "plant_logs_select_own" on public.plant_logs for select using (user_id = auth.uid());
drop policy if exists "plant_logs_insert_own" on public.plant_logs;
create policy "plant_logs_insert_own" on public.plant_logs for insert with check (user_id = auth.uid());
drop policy if exists "plant_logs_update_own" on public.plant_logs;
create policy "plant_logs_update_own" on public.plant_logs for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "plant_logs_delete_own" on public.plant_logs;
create policy "plant_logs_delete_own" on public.plant_logs for delete using (user_id = auth.uid());

drop policy if exists "care_reminders_select_own" on public.care_reminders;
create policy "care_reminders_select_own" on public.care_reminders for select using (user_id = auth.uid());
drop policy if exists "care_reminders_insert_own" on public.care_reminders;
create policy "care_reminders_insert_own" on public.care_reminders for insert with check (user_id = auth.uid());
drop policy if exists "care_reminders_update_own" on public.care_reminders;
create policy "care_reminders_update_own" on public.care_reminders for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "care_reminders_delete_own" on public.care_reminders;
create policy "care_reminders_delete_own" on public.care_reminders for delete using (user_id = auth.uid());

drop policy if exists "guides_select_all" on public.guides;
create policy "guides_select_all" on public.guides for select using (true);

drop policy if exists "topics_select_all" on public.topics;
create policy "topics_select_all" on public.topics for select using (true);

drop policy if exists "posts_select_all" on public.posts;
create policy "posts_select_all" on public.posts for select using (true);
drop policy if exists "posts_insert_own" on public.posts;
create policy "posts_insert_own" on public.posts for insert with check (user_id = auth.uid());
drop policy if exists "posts_update_own" on public.posts;
create policy "posts_update_own" on public.posts for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "posts_delete_own" on public.posts;
create policy "posts_delete_own" on public.posts for delete using (user_id = auth.uid());

drop policy if exists "post_comments_select_all" on public.post_comments;
create policy "post_comments_select_all" on public.post_comments for select using (true);
drop policy if exists "post_comments_insert_own" on public.post_comments;
create policy "post_comments_insert_own" on public.post_comments for insert with check (user_id = auth.uid());
drop policy if exists "post_comments_update_own" on public.post_comments;
create policy "post_comments_update_own" on public.post_comments for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "post_comments_delete_own" on public.post_comments;
create policy "post_comments_delete_own" on public.post_comments for delete using (user_id = auth.uid());

drop policy if exists "post_likes_select_all" on public.post_likes;
create policy "post_likes_select_all" on public.post_likes for select using (true);
drop policy if exists "post_likes_insert_own" on public.post_likes;
create policy "post_likes_insert_own" on public.post_likes for insert with check (user_id = auth.uid());
drop policy if exists "post_likes_delete_own" on public.post_likes;
create policy "post_likes_delete_own" on public.post_likes for delete using (user_id = auth.uid());

drop policy if exists "post_bookmarks_select_own" on public.post_bookmarks;
create policy "post_bookmarks_select_own" on public.post_bookmarks for select using (user_id = auth.uid());
drop policy if exists "post_bookmarks_insert_own" on public.post_bookmarks;
create policy "post_bookmarks_insert_own" on public.post_bookmarks for insert with check (user_id = auth.uid());
drop policy if exists "post_bookmarks_delete_own" on public.post_bookmarks;
create policy "post_bookmarks_delete_own" on public.post_bookmarks for delete using (user_id = auth.uid());

drop policy if exists "comment_likes_select_own" on public.comment_likes;
create policy "comment_likes_select_own" on public.comment_likes for select using (user_id = auth.uid());
drop policy if exists "comment_likes_insert_own" on public.comment_likes;
create policy "comment_likes_insert_own" on public.comment_likes for insert with check (user_id = auth.uid());
drop policy if exists "comment_likes_delete_own" on public.comment_likes;
create policy "comment_likes_delete_own" on public.comment_likes for delete using (user_id = auth.uid());
