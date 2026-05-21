-- 管理员审核：profiles.is_moderator + 帖子/评论删除策略 + 求助表 help_requests

alter table if exists public.profiles
  add column if not exists is_moderator boolean not null default false;

comment on column public.profiles.is_moderator is '内容审核员：可在应用内下架任意帖子/评论、处理求助。仅允许通过 service_role 或 SQL 将指定用户设为 true。';

create or replace function public.fn_is_moderator()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(
    (select p.is_moderator from public.profiles p where p.id = auth.uid() limit 1),
    false
  );
$$;

-- 帖子：审核员可删除（走既有 soft_delete 触发器）
drop policy if exists "posts_delete_moderator" on public.posts;
create policy "posts_delete_moderator" on public.posts
for delete
to authenticated
using (public.fn_is_moderator() = true);

-- 评论：审核员可删除
drop policy if exists "post_comments_delete_moderator" on public.post_comments;
create policy "post_comments_delete_moderator" on public.post_comments
for delete
to authenticated
using (public.fn_is_moderator() = true);

-- 求助（问题）审核
create table if not exists public.help_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  title text,
  body text not null,
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_help_requests_user_active
  on public.help_requests(user_id)
  where deleted_at is null;

create index if not exists idx_help_requests_status_created
  on public.help_requests(status, created_at desc)
  where deleted_at is null;

drop trigger if exists trg_help_requests_set_updated_at on public.help_requests;
create trigger trg_help_requests_set_updated_at
before update on public.help_requests
for each row execute function public.set_updated_at();

drop trigger if exists trg_help_requests_soft_delete on public.help_requests;
create trigger trg_help_requests_soft_delete
before delete on public.help_requests
for each row execute function public.soft_delete_row();

alter table public.help_requests enable row level security;
alter table public.help_requests force row level security;

drop policy if exists "help_requests_select_own" on public.help_requests;
create policy "help_requests_select_own" on public.help_requests
for select
to authenticated
using (user_id = auth.uid() and deleted_at is null);

drop policy if exists "help_requests_insert_own" on public.help_requests;
create policy "help_requests_insert_own" on public.help_requests
for insert
to authenticated
with check (
  user_id = auth.uid()
  and created_by = auth.uid()
  and deleted_at is null
);

drop policy if exists "help_requests_select_moderator" on public.help_requests;
create policy "help_requests_select_moderator" on public.help_requests
for select
to authenticated
using (public.fn_is_moderator() = true and deleted_at is null);

drop policy if exists "help_requests_update_moderator" on public.help_requests;
create policy "help_requests_update_moderator" on public.help_requests
for update
to authenticated
using (public.fn_is_moderator() = true)
with check (public.fn_is_moderator() = true);

drop policy if exists "help_requests_delete_moderator" on public.help_requests;
create policy "help_requests_delete_moderator" on public.help_requests
for delete
to authenticated
using (public.fn_is_moderator() = true);
