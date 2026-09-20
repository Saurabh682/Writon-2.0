-- Migration: 20260919_trend_cloud_sync_outbox.sql
-- Durable PostgreSQL Outbox for Postgres -> GCP Durable Replication

begin;

create table if not exists public.trend_cloud_sync_outbox (
    id uuid primary key default gen_random_uuid(),

    report_id uuid not null
      references public.trend_reports(id)
      on delete cascade,

    status text not null default 'pending'
      check (
        status in (
          'pending',
          'processing',
          'partial',
          'synced',
          'failed'
        )
      ),

    gcs_status text not null default 'pending'
      check (
        gcs_status in (
          'pending',
          'synced',
          'failed'
        )
      ),

    bigquery_status text not null default 'pending'
      check (
        bigquery_status in (
          'pending',
          'synced',
          'failed'
        )
      ),

    dirty_tables text[] not null default '{}',

    sync_revision bigint not null default 0,

    attempt_count integer not null default 0,

    next_attempt_at timestamptz not null default now(),

    locked_at timestamptz,
    locked_by text,

    last_error text,

    gcs_synced_at timestamptz,
    bigquery_synced_at timestamptz,
    synced_at timestamptz,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    unique(report_id)
);

create index if not exists trend_cloud_sync_pending_idx
on public.trend_cloud_sync_outbox(
    status,
    next_attempt_at
);

-- Trigger Function: Upsert/dirty outbox entry on opportunity lifecycle update
create or replace function public.fn_mark_trend_opportunity_dirty()
returns trigger as $func$
begin
  insert into public.trend_cloud_sync_outbox (
    report_id,
    status,
    bigquery_status,
    dirty_tables,
    next_attempt_at,
    sync_revision
  ) values (
    NEW.report_id,
    'pending',
    'pending',
    array['trend_opportunities']::text[],
    now(),
    1
  )
  on conflict (report_id) do update set
    dirty_tables = case 
      when 'trend_opportunities' = any(public.trend_cloud_sync_outbox.dirty_tables)
      then public.trend_cloud_sync_outbox.dirty_tables
      else array_append(public.trend_cloud_sync_outbox.dirty_tables, 'trend_opportunities')
    end,
    bigquery_status = 'pending',
    status = case
      when public.trend_cloud_sync_outbox.status = 'processing'
      then public.trend_cloud_sync_outbox.status
      else 'pending'
    end,
    next_attempt_at = now(),
    sync_revision = public.trend_cloud_sync_outbox.sync_revision + 1,
    updated_at = now();

  return NEW;
end;
$func$ language plpgsql;

drop trigger if exists trg_trend_opportunity_dirty on public.trend_opportunities;

create trigger trg_trend_opportunity_dirty
after update of qualification_status on public.trend_opportunities
for each row
when (NEW.qualification_status is distinct from OLD.qualification_status and NEW.report_id is not null)
execute function public.fn_mark_trend_opportunity_dirty();

commit;
