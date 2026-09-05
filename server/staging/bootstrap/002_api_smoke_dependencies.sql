-- Minimal dependencies required to exercise authentication/profile creation and
-- engagement preferences in the isolated remote staging API. This is not a
-- replacement for the full production schema and contains no production data.

alter table public.profiles
  add column if not exists email text,
  add column if not exists pen_name text,
  add column if not exists full_name text,
  add column if not exists bio text,
  add column if not exists avatar_url text,
  add column if not exists location text,
  add column if not exists joined_at timestamptz not null default now(),
  add column if not exists followers_count integer not null default 0,
  add column if not exists following_count integer not null default 0,
  add column if not exists account_type text not null default 'unknown';

create unique index if not exists profiles_pen_name_unique_idx
  on public.profiles (lower(pen_name))
  where pen_name is not null;

create table if not exists public.legacy_import_profile_attributes (
  profile_id text primary key references public.profiles(id) on delete cascade,
  quote_of_day text
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id text not null references public.profiles(id) on delete cascade,
  title text not null,
  content text not null default '',
  status text not null default 'draft',
  likes_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.bot_configs (
  id text primary key references public.profiles(id) on delete cascade
);
