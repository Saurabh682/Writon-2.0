-- Persist each reader's chosen interests and give comment replies a real,
-- validated parent relationship. The Fastify service is the only data path;
-- RLS remains fail-closed for Supabase Data API roles.
begin;

create table if not exists public.profile_interests (
  profile_id text not null references public.profiles(id) on delete cascade,
  topic_id text not null check (char_length(btrim(topic_id)) between 1 and 64),
  created_at timestamptz not null default now(),
  primary key (profile_id, topic_id)
);

alter table public.profile_interests enable row level security;
revoke all privileges on public.profile_interests from anon, authenticated;

alter table public.comments
  add column if not exists parent_comment_id uuid
    references public.comments(id) on delete cascade;

create index if not exists comments_post_parent_created_idx
  on public.comments (post_id, parent_comment_id, created_at);
create index if not exists profile_interests_profile_created_idx
  on public.profile_interests (profile_id, created_at);

commit;
