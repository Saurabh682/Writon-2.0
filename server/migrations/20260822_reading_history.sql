-- Read pattern: one user's recently read stories, ordered by last activity.
-- This is additive and safe to deploy before the Android reader starts writing progress.
create table if not exists public.reading_history (
  user_id text not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  progress numeric(5,4) not null default 0 check (progress >= 0 and progress <= 1),
  read_seconds integer not null default 0 check (read_seconds >= 0),
  first_read_at timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

-- Serves GET /api/v1/me/reading-history without a sort or table scan.
create index if not exists reading_history_user_last_read_idx
  on public.reading_history (user_id, last_read_at desc);
