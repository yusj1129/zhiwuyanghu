-- 植物养护助手（Supabase）数据库初始化脚本
-- 说明：
-- 1) 建议在 Supabase SQL Editor 中直接粘贴执行一次
-- 2) 前端会使用以下表：
--    - public.profiles
--    - public.plants
--    - public.plant_logs
--    - public.care_reminders
-- 3) RLS 策略基于 auth.uid() 实现用户数据隔离

-- UUID 生成能力
create extension if not exists pgcrypto;

-- 用户资料
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now()
);

-- 用户植物（前端字段对齐：species、water_frequency、next_water_date、image_url 等）
create table if not exists public.plants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,

  name text not null,
  species text,
  family text,
  image_url text,

  -- 养护状态（前端目前使用：healthy / needsWater / needsFertilizer / needsPruning）
  status text not null default 'healthy'
    check (status in ('healthy','needsWater','needsFertilizer','needsPruning')),
  difficulty text,
  description text,

  -- 关键时间/频率（前端使用：water_frequency、next_water_date、last_watered_at）
  water_frequency integer not null default 7 check (water_frequency > 0),
  next_water_date timestamptz,
  last_watered_at timestamptz,

  -- 直接挂在 plants 上的“简版养护指南字段”
  care_water text,
  care_light text,
  care_temperature text,
  care_fertilizer text,
  care_pest text,

  created_at timestamptz not null default now()
);

-- 养护日志
create table if not exists public.plant_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plant_id uuid not null references public.plants(id) on delete cascade,

  log_date timestamptz not null default now(),
  content text not null,
  images text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- 养护提醒
create table if not exists public.care_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plant_id uuid not null references public.plants(id) on delete cascade,

  type text not null
    check (type in ('water','fertilizer','prune','repot')),
  frequency integer not null check (frequency > 0),
  unit text not null
    check (unit in ('day','week','month')),
  next_reminder timestamptz,
  enabled boolean not null default true,

  created_at timestamptz not null default now()
);

-- 索引（提升按用户/植物查询性能）
create index if not exists plants_user_id_idx on public.plants(user_id);
create index if not exists plants_created_at_idx on public.plants(created_at desc);
create index if not exists plant_logs_plant_id_idx on public.plant_logs(plant_id);
create index if not exists plant_logs_user_id_idx on public.plant_logs(user_id);
create index if not exists care_reminders_plant_id_idx on public.care_reminders(plant_id);
create index if not exists care_reminders_user_id_idx on public.care_reminders(user_id);

-- ========== RLS：profiles ==========
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
using (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
using (id = auth.uid())
with check (id = auth.uid());

-- ========== RLS：plants ==========
alter table public.plants enable row level security;

drop policy if exists "plants_select_own" on public.plants;
create policy "plants_select_own"
on public.plants
for select
using (user_id = auth.uid());

drop policy if exists "plants_insert_own" on public.plants;
create policy "plants_insert_own"
on public.plants
for insert
with check (user_id = auth.uid());

drop policy if exists "plants_update_own" on public.plants;
create policy "plants_update_own"
on public.plants
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "plants_delete_own" on public.plants;
create policy "plants_delete_own"
on public.plants
for delete
using (user_id = auth.uid());

-- ========== RLS：plant_logs ==========
alter table public.plant_logs enable row level security;

drop policy if exists "plant_logs_select_own" on public.plant_logs;
create policy "plant_logs_select_own"
on public.plant_logs
for select
using (user_id = auth.uid());

drop policy if exists "plant_logs_insert_own" on public.plant_logs;
create policy "plant_logs_insert_own"
on public.plant_logs
for insert
with check (user_id = auth.uid());

drop policy if exists "plant_logs_update_own" on public.plant_logs;
create policy "plant_logs_update_own"
on public.plant_logs
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "plant_logs_delete_own" on public.plant_logs;
create policy "plant_logs_delete_own"
on public.plant_logs
for delete
using (user_id = auth.uid());

-- ========== RLS：care_reminders ==========
alter table public.care_reminders enable row level security;

drop policy if exists "care_reminders_select_own" on public.care_reminders;
create policy "care_reminders_select_own"
on public.care_reminders
for select
using (user_id = auth.uid());

drop policy if exists "care_reminders_insert_own" on public.care_reminders;
create policy "care_reminders_insert_own"
on public.care_reminders
for insert
with check (user_id = auth.uid());

drop policy if exists "care_reminders_update_own" on public.care_reminders;
create policy "care_reminders_update_own"
on public.care_reminders
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "care_reminders_delete_own" on public.care_reminders;
create policy "care_reminders_delete_own"
on public.care_reminders
for delete
using (user_id = auth.uid());

-- 若你后续需要更多字段/关系，可以继续在此脚本扩展。
