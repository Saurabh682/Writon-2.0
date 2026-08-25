-- Maps an external authentication account to the canonical WritOn profile.
--
-- Legacy profiles intentionally keep their existing IDs because those IDs are
-- referenced by stories, comments, follows, bookmarks and reading history.
-- This mapping lets a verified Firebase account claim the matching profile
-- without rewriting any of that historical data.

begin;

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

commit;
