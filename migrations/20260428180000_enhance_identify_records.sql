/* Identify records enhancement: status, latency, provider, and diagnostics */

alter table if exists public.identify_records
  add column if not exists status text not null default 'success'
    check (status in ('queued', 'processing', 'success', 'failed')),
  add column if not exists provider text not null default 'custom-identify-api',
  add column if not exists latency_ms integer,
  add column if not exists error_message text,
  add column if not exists confidence numeric(5,2),
  add column if not exists plant_name_normalized text,
  add column if not exists request_id uuid not null default gen_random_uuid();

create index if not exists idx_identify_records_status_active
  on public.identify_records(status)
  where deleted_at is null;

create index if not exists idx_identify_records_created_at_active
  on public.identify_records(created_at desc)
  where deleted_at is null;
