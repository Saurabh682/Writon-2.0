-- Durable push-notification delivery for the server-only Fastify data path.
-- Firebase remains the authentication and FCM authority; this database stores
-- per-device registrations, user consent/preferences, and retryable delivery work.
begin;

create table if not exists public.device_push_tokens (
  id uuid primary key default gen_random_uuid(),
  profile_id text not null references public.profiles(id) on delete cascade,
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

create index if not exists device_push_tokens_active_profile_idx
  on public.device_push_tokens (profile_id, last_seen_at desc)
  where revoked_at is null;

create table if not exists public.notification_preferences (
  profile_id text primary key references public.profiles(id) on delete cascade,
  interactions_enabled boolean not null default true,
  follows_enabled boolean not null default true,
  editorial_enabled boolean not null default true,
  publishing_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_delivery_outbox (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null unique references public.notifications(id) on delete cascade,
  recipient_id text not null references public.profiles(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'sending', 'sent', 'skipped', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz not null default now(),
  delivered_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notification_delivery_outbox_pending_idx
  on public.notification_delivery_outbox (next_attempt_at, created_at)
  where status = 'pending';
create index if not exists notification_delivery_outbox_recipient_idx
  on public.notification_delivery_outbox (recipient_id);

alter table public.device_push_tokens enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notification_delivery_outbox enable row level security;
revoke all privileges on public.device_push_tokens from anon, authenticated;
revoke all privileges on public.notification_preferences from anon, authenticated;
revoke all privileges on public.notification_delivery_outbox from anon, authenticated;

commit;
