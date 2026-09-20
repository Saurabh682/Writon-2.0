-- 20260918_x_bot_governance.sql
-- Production-frozen schema for X Bot runtime memory, governance, and provenance.
-- Enforces: JSON = Constitution, PostgreSQL = Runtime Memory.

-- 1. Candidate Master Record
create table if not exists public.x_bot_candidates (
  id text primary key check (id ~ '^xc_[a-z0-9_]+$'),
  insight_id text,
  active_draft_version integer not null default 1 check (active_draft_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Candidate Immutable Versions (Edits create vN+1)
create table if not exists public.x_bot_candidate_versions (
  candidate_id text not null references public.x_bot_candidates(id) on delete cascade,
  version integer not null check (version > 0),
  brain_version text not null,
  brain_hash text not null,
  proposition text not null,
  hook_type text not null check (hook_type in ('contrast', 'provocation', 'sensory_anchor', 'craft_truth', 'transformation')),
  text text not null check (char_length(text) <= 280),
  reply_text text check (reply_text is null or char_length(reply_text) <= 280),
  status text not null default 'drafted' check (
    status in (
      'discovered', 'drafted', 'evaluating', 'approved', 'queued',
      'dispatching', 'published', 'rejected', 'expired', 'failed', 'reconciliation_required'
    )
  ),
  provenance jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  evidence_bundle jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence_bundle) = 'object'),
  source_snapshot_hash text not null default '',
  scheduled_for timestamptz,
  eligible_after timestamptz,
  autonomous_allowed boolean not null default false,
  dispatch_key text unique,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by text,
  primary key (candidate_id, version)
);

-- 3. Append-Only Validation Runs Audit Ledger
create table if not exists public.x_bot_validation_runs (
  id serial primary key,
  candidate_id text not null,
  draft_version integer not null,
  trigger text not null check (trigger in ('generation', 'manual_validation', 'approval', 'dry_run', 'pre_dispatch')),
  brain_version text not null,
  brain_hash text not null,
  blocker_engine_version text not null default '3.0',
  repetition_engine_version text not null default '1.0',
  results jsonb not null default '{}'::jsonb check (jsonb_typeof(results) = 'object'),
  repetition_analysis jsonb not null default '{}'::jsonb check (jsonb_typeof(repetition_analysis) = 'object'),
  passed boolean not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_x_bot_validation_runs_cand_ver
  on public.x_bot_validation_runs (candidate_id, draft_version, created_at desc);

-- 4. Dispatches (Atomic Publishing Envelope)
create table if not exists public.x_bot_dispatches (
  id text primary key check (id ~ '^xd_[a-z0-9_]+$'),
  candidate_id text not null,
  candidate_version integer not null,
  dispatch_key text not null unique,
  brain_hash text not null,
  text_hash text not null,
  published_root_text text not null,
  published_reply_text text,
  status text not null default 'in_flight' check (
    status in ('in_flight', 'succeeded', 'failed', 'outcome_unknown', 'reconciliation_required', 'deleted')
  ),
  dispatched_at timestamptz not null default now(),
  completed_at timestamptz,
  error_message text,
  foreign key (candidate_id, candidate_version) references public.x_bot_candidate_versions(candidate_id, version)
);

create index if not exists idx_x_bot_dispatches_created
  on public.x_bot_dispatches (dispatched_at desc);

-- 5. Dispatch Items (Decomposed Root & Reply)
create table if not exists public.x_bot_dispatch_items (
  id serial primary key,
  dispatch_id text not null references public.x_bot_dispatches(id) on delete cascade,
  item_type text not null check (item_type in ('root', 'reply')),
  sequence integer not null check (sequence >= 1),
  text text not null,
  tweet_id text,
  status text not null default 'pending' check (
    status in ('pending', 'published', 'retryable_failed', 'fatal_failed', 'unknown')
  ),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (dispatch_id, sequence)
);

-- 6. Dispatch Attempts (Diagnostic Audit & Idempotency Proof)
create table if not exists public.x_bot_dispatch_attempts (
  id serial primary key,
  dispatch_id text not null references public.x_bot_dispatches(id) on delete cascade,
  attempt_number integer not null default 1,
  state text not null check (
    state in ('created', 'in_flight', 'succeeded', 'failed_safe_to_retry', 'outcome_unknown')
  ),
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb,
  error_code text,
  created_at timestamptz not null default now()
);

-- 7. Server-Side Telemetry Snapshots
create table if not exists public.x_bot_metrics (
  id serial primary key,
  dispatch_id text not null references public.x_bot_dispatches(id) on delete cascade,
  item_id integer references public.x_bot_dispatch_items(id) on delete cascade,
  snapshot_window text not null check (snapshot_window in ('+15m', '+1h', '+6h', '+24h', '+72h', 'current')),
  impressions integer not null default 0,
  likes integer not null default 0,
  replies integer not null default 0,
  reposts integer not null default 0,
  quotes integer not null default 0,
  bookmarks integer not null default 0,
  clicks integer not null default 0,
  recorded_at timestamptz not null default now()
);

create index if not exists idx_x_bot_metrics_dispatch
  on public.x_bot_metrics (dispatch_id, snapshot_window, recorded_at desc);

-- 8. Activity Ledger
create table if not exists public.x_bot_activity_ledger (
  id serial primary key,
  candidate_id text,
  event_type text not null,
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists idx_x_bot_activity_ledger_created
  on public.x_bot_activity_ledger (created_at desc);

-- Enable RLS and restrict
alter table public.x_bot_candidates enable row level security;
alter table public.x_bot_candidate_versions enable row level security;
alter table public.x_bot_validation_runs enable row level security;
alter table public.x_bot_dispatches enable row level security;
alter table public.x_bot_dispatch_items enable row level security;
alter table public.x_bot_dispatch_attempts enable row level security;
alter table public.x_bot_metrics enable row level security;
alter table public.x_bot_activity_ledger enable row level security;

revoke all on table public.x_bot_candidates from anon, authenticated;
revoke all on table public.x_bot_candidate_versions from anon, authenticated;
revoke all on table public.x_bot_validation_runs from anon, authenticated;
revoke all on table public.x_bot_dispatches from anon, authenticated;
revoke all on table public.x_bot_dispatch_items from anon, authenticated;
revoke all on table public.x_bot_dispatch_attempts from anon, authenticated;
revoke all on table public.x_bot_metrics from anon, authenticated;
revoke all on table public.x_bot_activity_ledger from anon, authenticated;

grant select, insert, update, delete on table public.x_bot_candidates to service_role;
grant select, insert, update, delete on table public.x_bot_candidate_versions to service_role;
grant select, insert, update, delete on table public.x_bot_validation_runs to service_role;
grant select, insert, update, delete on table public.x_bot_dispatches to service_role;
grant select, insert, update, delete on table public.x_bot_dispatch_items to service_role;
grant select, insert, update, delete on table public.x_bot_dispatch_attempts to service_role;
grant select, insert, update, delete on table public.x_bot_metrics to service_role;
grant select, insert, update, delete on table public.x_bot_activity_ledger to service_role;
