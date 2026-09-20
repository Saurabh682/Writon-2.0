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
  add column if not exists account_type text not null default 'unknown',
  add column if not exists updated_at timestamptz not null default now();

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

alter table public.posts
  add column if not exists is_public boolean not null default false,
  add column if not exists provenance text not null default 'unknown',
  add column if not exists published_at timestamptz,
  add column if not exists slug text,
  add column if not exists summary text,
  add column if not exists category text,
  add column if not exists cover_image_url text,
  add column if not exists reading_time_min integer not null default 1,
  add column if not exists client_draft_id uuid,
  add column if not exists language_code text not null default 'und',
  add column if not exists language_source text,
  add column if not exists language_confidence real,
  add column if not exists content_form text,
  add column if not exists content_form_source text,
  add column if not exists content_form_confidence numeric(4,3),
  add column if not exists word_count integer,
  add column if not exists word_count_source text,
  add column if not exists script_code text,
  add column if not exists script_source text,
  add column if not exists script_confidence numeric(4,3),
  add column if not exists recommendation_metadata_updated_at timestamptz,
  add column if not exists provenance_verified_at timestamptz,
  add column if not exists provenance_verified_by text,
  add column if not exists bookmarks_count integer not null default 0,
  add column if not exists comments_count integer not null default 0,
  add column if not exists content_updated_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists posts_client_draft_idx
  on public.posts (author_id, client_draft_id)
  where client_draft_id is not null;

create unique index if not exists posts_slug_unique_idx
  on public.posts (slug)
  where slug is not null;

create table if not exists public.post_applauds (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id text not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.bookmarks (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id text not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id text not null references public.profiles(id) on delete cascade,
  parent_comment_id uuid references public.comments(id) on delete cascade,
  content text not null,
  client_mutation_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists public.reading_progress_mutations (
  user_id text not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  client_mutation_id uuid not null,
  received_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '35 days'),
  primary key (user_id, post_id, client_mutation_id)
);

create index if not exists reading_progress_mutations_post_idx
  on public.reading_progress_mutations (post_id);

create index if not exists reading_progress_mutations_expiry_idx
  on public.reading_progress_mutations (expires_at);

alter table public.reading_progress_mutations enable row level security;
revoke all on public.reading_progress_mutations from anon, authenticated;

create unique index if not exists comments_author_mutation_idx
  on public.comments (author_id, client_mutation_id)
  where client_mutation_id is not null;

create table if not exists public.legacy_import_comment_links (
  comment_id uuid primary key references public.comments(id) on delete cascade,
  legacy_parent_id text
);

create table if not exists public.follows (
  follower_id text not null references public.profiles(id) on delete cascade,
  following_id text not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id text not null references public.profiles(id) on delete cascade,
  actor_id text references public.profiles(id) on delete set null,
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid,
  kind text not null,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.profile_auth_identities (
  firebase_uid text primary key,
  profile_id text not null unique references public.profiles(id) on delete cascade,
  provider text not null default 'firebase',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profile_auth_identities_profile_id_idx
  on public.profile_auth_identities(profile_id);

alter table public.profile_auth_identities enable row level security;
