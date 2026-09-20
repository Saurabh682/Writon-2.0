begin;

create table if not exists public.feed_shadow_rankings (
  feed_session_id uuid not null references public.reader_feed_sessions(id) on delete cascade,
  profile_id text not null references public.profiles(id) on delete cascade,
  story_id uuid not null references public.posts(id) on delete cascade,
  shadow_rank_position integer not null check (shadow_rank_position >= 0),
  visible_rank_position integer check (visible_rank_position is null or visible_rank_position >= 0),
  form_cohort text not null,
  normalized_quality numeric(6,5) not null check (normalized_quality between 0 and 1),
  model_version text not null,
  ranked_at timestamptz not null default now(),
  primary key (feed_session_id, story_id),
  unique (feed_session_id, shadow_rank_position)
);

alter table public.feed_shadow_rankings enable row level security;
revoke all privileges on public.feed_shadow_rankings from anon, authenticated;

create index if not exists feed_shadow_rankings_profile_ranked_idx
  on public.feed_shadow_rankings (profile_id, ranked_at desc);

create index if not exists feed_shadow_rankings_story_idx
  on public.feed_shadow_rankings (story_id);

commit;
