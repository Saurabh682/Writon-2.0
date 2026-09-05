begin;

-- Internal at-most-once claim ledger for scheduled notification jobs.
-- This table lives in public for the existing migration convention, but is not
-- accessible to signed-out or signed-in Data API clients.
create table if not exists public.notification_dispatch_ledger (
  dispatch_key text primary key,
  dispatch_kind text not null,
  status text not null default 'claimed'
    check (status in ('claimed', 'completed', 'failed')),
  claimed_at timestamptz not null default now(),
  completed_at timestamptz,
  result jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.notification_dispatch_ledger enable row level security;
revoke all on table public.notification_dispatch_ledger from anon, authenticated;
grant select, insert, update on table public.notification_dispatch_ledger to service_role;

create index if not exists notification_dispatch_ledger_kind_claimed_idx
  on public.notification_dispatch_ledger (dispatch_kind, claimed_at desc);

commit;
