-- Human-only, language-aware reader feed and privacy-bounded learning data.
-- The trusted Fastify server remains the only application data path.
begin;

alter table public.profiles
  add column if not exists account_type text not null default 'unknown';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_account_type_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_account_type_check
      check (account_type in ('human', 'editorial_bot', 'system', 'unknown'));
  end if;
end $$;

-- Bot registry membership is authoritative and wins over name or profile appearance.
update public.profiles profile
set account_type = 'editorial_bot'
where exists (select 1 from public.bot_configs bot where bot.id = profile.id)
   or profile.id like 'bot\_%' escape '\';

-- A linked Firebase identity plus a negative bot-registry check is the first
-- auditable human-account classification. Unlinked legacy profiles stay unknown.
update public.profiles profile
set account_type = 'human'
where profile.account_type = 'unknown'
  and exists (
    select 1 from public.profile_auth_identities identity
    where identity.profile_id = profile.id
  )
  and not exists (select 1 from public.bot_configs bot where bot.id = profile.id);

alter table public.posts
  add column if not exists language_code text not null default 'und',
  add column if not exists language_source text not null default 'system_default',
  add column if not exists language_confidence numeric(4,3) not null default 0,
  add column if not exists provenance text not null default 'unknown',
  add column if not exists provenance_verified_at timestamptz,
  add column if not exists provenance_verified_by text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'posts_language_code_check'
      and conrelid = 'public.posts'::regclass
  ) then
    alter table public.posts add constraint posts_language_code_check
      check (language_code in ('en', 'hi', 'bn', 'mr', 'es', 'fr', 'ur', 'und'));
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'posts_language_source_check'
      and conrelid = 'public.posts'::regclass
  ) then
    alter table public.posts add constraint posts_language_source_check
      check (language_source in ('author', 'moderator', 'backfill', 'system_default'));
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'posts_language_confidence_check'
      and conrelid = 'public.posts'::regclass
  ) then
    alter table public.posts add constraint posts_language_confidence_check
      check (language_confidence between 0 and 1);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'posts_provenance_check'
      and conrelid = 'public.posts'::regclass
  ) then
    alter table public.posts add constraint posts_provenance_check
      check (provenance in ('human_verified', 'brand', 'synthetic', 'unknown'));
  end if;
end $$;

update public.posts post
set provenance = 'synthetic',
    provenance_verified_at = now(),
    provenance_verified_by = 'migration:bot-registry-v1'
where exists (
  select 1 from public.profiles author
  where author.id = post.author_id and author.account_type = 'editorial_bot'
);

update public.posts post
set provenance = 'human_verified',
    provenance_verified_at = now(),
    provenance_verified_by = 'migration:firebase-identity-and-bot-registry-v1'
where post.provenance = 'unknown'
  and exists (
    select 1 from public.profiles author
    where author.id = post.author_id and author.account_type = 'human'
  );

-- Bengali script is unambiguous enough for an automated provisional backfill.
-- Devanagari and Latin stories deliberately stay `und` for human Hindi/Marathi
-- and English/Spanish/French review rather than receiving a false label.
update public.posts
set language_code = 'bn', language_source = 'backfill', language_confidence = 0.950
where language_code = 'und'
  and (coalesce(title, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(content, ''))
      ~ '[ঀ-৿]';

create table if not exists public.reader_feed_sessions (
  id uuid primary key default gen_random_uuid(),
  profile_id text references public.profiles(id) on delete cascade,
  preferred_language text not null,
  experiment_group text not null,
  ranking_version text not null,
  snapshot_seed uuid not null default gen_random_uuid(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (preferred_language in ('en', 'hi', 'bn', 'mr', 'es', 'fr', 'ur', 'und')),
  check (experiment_group in ('base', 'shadow', 'behavior', 'control', 'guest_base', 'guest_behavior'))
);

create table if not exists public.reader_behavior_events (
  id uuid primary key,
  profile_id text not null references public.profiles(id) on delete cascade,
  story_id uuid not null references public.posts(id) on delete cascade,
  event_type text not null check (event_type in ('impression', 'open', 'quick_exit', 'share')),
  numeric_value numeric(8,3) not null default 0 check (numeric_value between 0 and 86400),
  feed_session_id uuid references public.reader_feed_sessions(id) on delete set null,
  client_event_time timestamptz not null,
  server_received_at timestamptz not null default now(),
  idempotency_key uuid not null,
  ranking_model_version text not null,
  unique (profile_id, idempotency_key)
);

create table if not exists public.reader_affinity_scores (
  profile_id text not null references public.profiles(id) on delete cascade,
  dimension_type text not null check (dimension_type in ('topic', 'author', 'language')),
  dimension_value text not null,
  score numeric(8,3) not null default 0 check (score between -20 and 20),
  evidence_count integer not null default 0 check (evidence_count >= 0),
  positive_evidence_count integer not null default 0 check (positive_evidence_count >= 0),
  negative_evidence_count integer not null default 0 check (negative_evidence_count >= 0),
  last_decay_time timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (profile_id, dimension_type, dimension_value)
);

create table if not exists public.feed_exposures (
  profile_id text references public.profiles(id) on delete cascade,
  feed_session_id uuid not null references public.reader_feed_sessions(id) on delete cascade,
  story_id uuid not null references public.posts(id) on delete cascade,
  rank_position integer not null check (rank_position >= 0),
  candidate_pool text not null check (candidate_pool in ('preferred', 'affinity', 'exploration', 'fallback')),
  model_version text not null,
  ranked_at timestamptz not null default now(),
  shown_at timestamptz,
  opened_at timestamptz,
  primary key (feed_session_id, story_id),
  unique (feed_session_id, rank_position)
);

alter table public.reader_feed_sessions enable row level security;
alter table public.reader_behavior_events enable row level security;
alter table public.reader_affinity_scores enable row level security;
alter table public.feed_exposures enable row level security;

revoke all privileges on public.reader_feed_sessions from anon, authenticated;
revoke all privileges on public.reader_behavior_events from anon, authenticated;
revoke all privileges on public.reader_affinity_scores from anon, authenticated;
revoke all privileges on public.feed_exposures from anon, authenticated;

-- Candidate query: equality filters first, publication range/order last.
create index if not exists posts_reader_feed_language_published_idx
  on public.posts (language_code, published_at desc, id)
  where status = 'published' and is_public = true and provenance = 'human_verified';
create index if not exists posts_reader_feed_author_published_idx
  on public.posts (author_id, published_at desc, id)
  where status = 'published' and is_public = true and provenance = 'human_verified';
create index if not exists reader_behavior_profile_received_idx
  on public.reader_behavior_events (profile_id, server_received_at desc);
create index if not exists reader_behavior_story_type_idx
  on public.reader_behavior_events (story_id, event_type, server_received_at desc);
create index if not exists reader_behavior_session_story_idx
  on public.reader_behavior_events (feed_session_id, story_id, event_type);
create index if not exists reader_affinity_profile_type_score_idx
  on public.reader_affinity_scores (profile_id, dimension_type, score desc);
create index if not exists feed_exposures_profile_shown_idx
  on public.feed_exposures (profile_id, shown_at desc)
  where profile_id is not null;
create index if not exists feed_exposures_story_shown_idx
  on public.feed_exposures (story_id, shown_at desc)
  where shown_at is not null;
create index if not exists reader_feed_sessions_profile_created_idx
  on public.reader_feed_sessions (profile_id, created_at desc)
  where profile_id is not null;
create index if not exists reader_feed_sessions_expiry_idx
  on public.reader_feed_sessions (expires_at);

commit;
