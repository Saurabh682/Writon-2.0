-- Server-authoritative milestone awards. Progress remains derived from source
-- activity tables; this table records only durable, once-earned recognition.
begin;

create table if not exists public.user_milestones (
  profile_id text not null references public.profiles(id) on delete cascade,
  milestone_key text not null check (char_length(milestone_key) between 3 and 64),
  earned_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (profile_id, milestone_key)
);

create index if not exists user_milestones_profile_earned_idx
  on public.user_milestones (profile_id, earned_at desc);

alter table public.user_milestones enable row level security;
revoke all privileges on public.user_milestones from anon, authenticated;

commit;
