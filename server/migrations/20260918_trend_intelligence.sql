-- Migration: 20260918_trend_intelligence.sql
-- Gemini Spark Trend Intelligence Ingestion & Editorial Gate Airlock Tables

begin;

-- 1. Raw Daily/Run Trend Reports
create table if not exists public.trend_reports (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null default gen_random_uuid(),
  external_run_id text,
  payload_hash text not null,
  report_date date not null,
  region text not null default 'India',
  source text not null default 'gemini-trend-research',
  run_type text not null default 'daily',
  schema_version text not null default '1.0.0',
  raw_payload jsonb not null,
  total_trends integer not null default 0,
  processing_status text not null default 'received'
    check (processing_status in ('received', 'processing', 'processed', 'partially_processed', 'failed')),
  processing_error text,
  processing_summary jsonb not null default '{}'::jsonb,
  observed_at timestamptz not null default now(),
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Unique index on external_run_id per source when provided
create unique index if not exists trend_reports_external_run_uidx
  on public.trend_reports(source, external_run_id)
  where external_run_id is not null;

-- Database-enforced deduplication against concurrent duplicate payloads per source
create unique index if not exists trend_reports_payload_hash_uidx
  on public.trend_reports(source, payload_hash);

create index if not exists trend_reports_lookup_idx
  on public.trend_reports(report_date, source, region, run_type);

create index if not exists trend_reports_status_idx
  on public.trend_reports(processing_status, received_at desc);

-- 2. Normalized Trend Signals (Canonical Entities)
create table if not exists public.trend_signals (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  canonical_topic text not null,
  aliases text[] not null default '{}',
  normalized_keywords text[] not null default '{}',
  category text,
  source_status text not null default 'RISING',
  computed_status text not null default 'RISING'
    check (computed_status in ('BREAKOUT', 'RISING', 'STABLE', 'FALLING')),
  momentum text not null default 'MEDIUM',
  latest_score integer not null default 0
    check (latest_score between 0 and 100),
  peak_score integer not null default 0
    check (peak_score between 0 and 100),
  score_delta integer not null default 0,
  velocity_per_day numeric(8,2) not null default 0.0,
  writon_relevance integer not null default 50
    check (writon_relevance between 0 and 100),
  novelty_score integer not null default 50
    check (novelty_score between 0 and 100),
  source_confidence numeric(4,2) not null default 0.5
    check (source_confidence between 0.0 and 1.0),
  computed_evidence_confidence numeric(4,2) not null default 0.5
    check (computed_evidence_confidence between 0.0 and 1.0),
  sensitivity_class text not null default 'safe'
    check (sensitivity_class in ('safe', 'sensitive', 'political', 'breaking_news', 'crime', 'health', 'financial', 'unverified_claim', 'reputation_risk')),
  first_detected_at timestamptz not null default now(),
  last_detected_at timestamptz not null default now(),
  detection_count integer not null default 1,
  platforms text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists trend_signals_score_idx
  on public.trend_signals(latest_score desc);

create index if not exists trend_signals_velocity_idx
  on public.trend_signals(velocity_per_day desc);

create index if not exists trend_signals_computed_status_idx
  on public.trend_signals(computed_status);

-- 3. Trend Signal Snapshots (Per-Report Historical Progression)
create table if not exists public.trend_signal_snapshots (
  id uuid primary key default gen_random_uuid(),
  signal_id uuid not null references public.trend_signals(id) on delete cascade,
  report_id uuid not null references public.trend_reports(id) on delete cascade,
  snapshot_date date not null,
  observed_at timestamptz not null default now(),
  rank integer,
  score integer not null
    check (score between 0 and 100),
  source_status text not null,
  computed_status text not null
    check (computed_status in ('BREAKOUT', 'RISING', 'STABLE', 'FALLING')),
  momentum text not null,
  score_delta integer not null default 0,
  elapsed_hours numeric(8,2) not null default 0.0,
  velocity_per_day numeric(8,2) not null default 0.0,
  source_confidence numeric(4,2) not null default 0.5
    check (source_confidence between 0.0 and 1.0),
  computed_evidence_confidence numeric(4,2) not null default 0.5
    check (computed_evidence_confidence between 0.0 and 1.0),
  why_trending text,
  content_opportunity text,
  recommended_angles jsonb not null default '[]'::jsonb,
  keywords text[] not null default '{}',
  sources jsonb not null default '[]'::jsonb,
  urgency text,
  created_at timestamptz not null default now(),
  unique (signal_id, report_id)
);

create index if not exists trend_snapshots_signal_idx
  on public.trend_signal_snapshots(signal_id, observed_at desc);

create index if not exists trend_snapshots_report_idx
  on public.trend_signal_snapshots(report_id);

-- 4. Trend Opportunities (The Airlock Table)
create table if not exists public.trend_opportunities (
  id uuid primary key default gen_random_uuid(),
  signal_id uuid not null references public.trend_signals(id) on delete cascade,
  report_id uuid references public.trend_reports(id) on delete set null,
  opportunity_score integer not null
    check (opportunity_score between 0 and 100),
  priority_score integer not null
    check (priority_score between 0 and 100),
  writon_relevance integer not null
    check (writon_relevance between 0 and 100),
  novelty_score integer not null
    check (novelty_score between 0 and 100),
  source_confidence numeric(4,2) not null
    check (source_confidence between 0.0 and 1.0),
  computed_evidence_confidence numeric(4,2) not null
    check (computed_evidence_confidence between 0.0 and 1.0),
  sensitivity_class text not null default 'safe'
    check (sensitivity_class in ('safe', 'sensitive', 'political', 'breaking_news', 'crime', 'health', 'financial', 'unverified_claim', 'reputation_risk')),
  qualification_status text not null default 'candidate'
    check (qualification_status in ('candidate', 'qualified', 'watchlist', 'rejected', 'seeded')),
  rejection_reason text,
  candidate_personas jsonb not null default '[]'::jsonb,
  recommended_angles jsonb not null default '[]'::jsonb,
  sources jsonb not null default '[]'::jsonb,
  evaluated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint trend_opportunities_signal_report_unique unique(signal_id, report_id)
);

create index if not exists trend_opps_status_idx
  on public.trend_opportunities(qualification_status, opportunity_score desc);

create index if not exists trend_opps_signal_idx
  on public.trend_opportunities(signal_id);

-- 5. Extend editorial_ideas_backlog with Unidirectional Lineage
alter table public.editorial_ideas_backlog
  add column if not exists source_type text default 'internal',
  add column if not exists source_trend_signal_id uuid references public.trend_signals(id) on delete set null,
  add column if not exists source_trend_report_id uuid references public.trend_reports(id) on delete set null,
  add column if not exists source_trend_opportunity_id uuid references public.trend_opportunities(id) on delete set null,
  add column if not exists trend_score integer;

create index if not exists editorial_ideas_opp_idx
  on public.editorial_ideas_backlog(source_trend_opportunity_id)
  where source_trend_opportunity_id is not null;

commit;
