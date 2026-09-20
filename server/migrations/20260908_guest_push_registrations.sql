-- Additive guest installation registry. Authenticated device rows and endpoints stay unchanged.
begin;

create table if not exists public.guest_device_push_tokens (
  id uuid primary key default gen_random_uuid(),
  installation_id uuid not null unique,
  token text not null unique check (char_length(token) between 20 and 8192),
  platform text not null default 'android' check (platform in ('android', 'ios', 'web')),
  app_version_code integer check (app_version_code is null or app_version_code > 0),
  notification_permission text not null default 'unknown'
    check (notification_permission in ('granted', 'denied', 'unknown')),
  revoked_at timestamptz,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists guest_device_push_tokens_active_seen_idx
  on public.guest_device_push_tokens (last_seen_at desc)
  where revoked_at is null and notification_permission = 'granted';

alter table public.guest_device_push_tokens enable row level security;
revoke all privileges on public.guest_device_push_tokens from anon, authenticated;
grant select, insert, update, delete on public.guest_device_push_tokens to service_role;

commit;
