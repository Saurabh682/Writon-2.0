-- Migration: 20260917_editorial_publishing.sql
-- Description: Core schema for WritOn Journal, Product Updates, and Release Ingestion.

begin;

-- 1. Canonical Editorial Posts Table (Journal, Notes, Updates, Essays)
create table if not exists public.editorial_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  type text not null check (type in ('note', 'update', 'journal', 'essay')),
  category text not null check (category in ('inside-writon', 'building-writon', 'writing-reading', 'community', 'writon-updates')),
  status text not null default 'draft' check (status in ('idea', 'candidate', 'draft', 'review', 'approved', 'published', 'rejected', 'archived')),
  language text not null default 'en',
  author_name text not null default 'WritOn Editorial',
  author_pen_name text default 'writon_editorial',
  author_avatar_url text,
  excerpt text not null,
  content_markdown text not null,
  content_html text not null,
  estimated_read_minutes integer not null default 3 check (estimated_read_minutes >= 1),
  featured boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  source_events jsonb not null default '[]'::jsonb,
  related_posts jsonb not null default '[]'::jsonb,
  seo jsonb not null default '{}'::jsonb,
  automation_metadata jsonb not null default '{}'::jsonb
);

create index if not exists editorial_posts_status_published_idx
  on public.editorial_posts (status, published_at desc)
  where status = 'published';

create index if not exists editorial_posts_category_idx
  on public.editorial_posts (category, published_at desc);

create index if not exists editorial_posts_type_idx
  on public.editorial_posts (type, published_at desc);

create index if not exists editorial_posts_featured_idx
  on public.editorial_posts (featured, published_at desc)
  where featured = true;

-- 2. Release Events Ingestion Table
create table if not exists public.editorial_releases (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  platform text not null default 'android',
  version_code integer not null,
  version_name text not null,
  raw_payload jsonb not null default '{}'::jsonb,
  user_visible_changes jsonb not null default '[]'::jsonb,
  is_major boolean not null default false,
  processed boolean not null default false,
  post_id uuid references public.editorial_posts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists editorial_releases_processed_idx
  on public.editorial_releases (processed, created_at desc);

-- 3. Additional baseline anti-repetition rules for editorial slop
insert into public.editorial_anti_repetition (pattern_type, pattern, reason)
values
  ('cliche_phrase', 'In an era where', 'Sterile AI journalistic preamble'),
  ('cliche_phrase', 'Whether you''re a seasoned writer', 'Generic audience qualification trope'),
  ('cliche_phrase', 'At WritOn, we believe', 'Corporate marketing self-importance formula'),
  ('cliche_phrase', 'Unlock your creativity', 'Superficial SaaS advertising cliché'),
  ('cliche_phrase', 'revolutionize', 'Empty tech hyperbole; forbidden by craft guidelines'),
  ('cliche_phrase', 'game-changing', 'Inflated marketing buzzword; forbidden')
on conflict (pattern) do nothing;

commit;
