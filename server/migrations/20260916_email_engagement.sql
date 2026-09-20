begin;

create table if not exists public.user_email_preferences (
  profile_id text primary key references public.profiles(id) on delete cascade,
  reading_enabled boolean not null default false,
  activity_enabled boolean not null default false,
  lifecycle_enabled boolean not null default false,
  writer_tips_enabled boolean not null default false,
  locale text not null default 'en',
  timezone text not null default 'Asia/Kolkata',
  consent_source text,
  consent_text_version text,
  consented_at timestamptz,
  withdrawn_at timestamptz,
  email_version bigint not null default 1,
  email_fingerprint text,
  last_optional_sent_at timestamptz,
  cadence_reserved_until timestamptz,
  cadence_reserved_job_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.email_jobs (
  id uuid primary key,
  profile_id text not null references public.profiles(id) on delete cascade,
  recipient_email text not null,
  recipient_fingerprint text not null,
  recipient_email_version bigint not null,
  category text not null check (category in ('reading', 'activity', 'lifecycle', 'writer_tips')),
  template_key text not null,
  template_version text not null,
  event_key text not null,
  payload jsonb not null default '{}'::jsonb,
  due_at timestamptz not null,
  status text not null default 'queued' check (status in ('queued', 'processing', 'retry', 'sent', 'cancelled', 'dead', 'ambiguous')),
  attempts integer not null default 0,
  lease_token uuid,
  lease_expires_at timestamptz,
  idempotency_key text not null,
  provider_message_id text,
  last_error_code text,
  last_error_message text,
  accepted_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(profile_id, event_key, template_key, template_version)
);

create index if not exists email_jobs_due_idx on public.email_jobs(status, due_at);
create index if not exists email_jobs_provider_idx on public.email_jobs(provider_message_id);

create table if not exists public.email_delivery_events (
  provider_event_id text primary key,
  provider_message_id text,
  event_type text not null,
  occurred_at timestamptz,
  received_at timestamptz not null default now(),
  payload jsonb not null
);

create index if not exists email_delivery_events_message_idx on public.email_delivery_events(provider_message_id);

create table if not exists public.email_suppressions (
  recipient_fingerprint text primary key,
  reason text not null,
  effective_at timestamptz not null default now(),
  provider_event_id text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.email_daily_capacity (
  capacity_date date primary key,
  reserved_count integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.email_preference_audit (
  id bigserial primary key,
  profile_id text not null references public.profiles(id) on delete cascade,
  changed_at timestamptz not null default now(),
  source text not null,
  consent_text_version text,
  before_state jsonb,
  after_state jsonb not null
);

create index if not exists email_preference_audit_profile_idx on public.email_preference_audit(profile_id, changed_at desc);

create table if not exists public.writer_engagement_events (
  id uuid primary key,
  profile_id text not null references public.profiles(id) on delete cascade,
  story_id uuid references public.posts(id) on delete set null,
  event_type text not null,
  event_key text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists writer_engagement_events_profile_idx on public.writer_engagement_events(profile_id, occurred_at desc);

commit;
