begin;

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

commit;
