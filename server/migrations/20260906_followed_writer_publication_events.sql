-- Durable, disabled-by-default followed-writer publication fan-out.
-- Depends on 20260906_notification_event_deduplication.sql.
begin;

alter table public.notification_preferences
  add column if not exists timezone text not null default 'Asia/Kolkata';

create table if not exists public.publication_notification_events (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null unique references public.posts(id) on delete cascade,
  author_id text not null references public.profiles(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'done', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz not null default now(),
  processed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists publication_notification_events_pending_idx
  on public.publication_notification_events (next_attempt_at, created_at)
  where status = 'pending';

create or replace function public.enqueue_human_publication_notification_event()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'published'
     and new.is_public = true
     and new.provenance = 'human_verified'
     and (tg_op = 'INSERT' or old.status is distinct from 'published' or old.is_public is distinct from true)
  then
    insert into public.publication_notification_events (post_id, author_id)
    values (new.id, new.author_id)
    on conflict (post_id) do nothing;
  end if;
  return new;
end;
$$;

revoke all on function public.enqueue_human_publication_notification_event() from public, anon, authenticated;

drop trigger if exists posts_enqueue_publication_notification_event on public.posts;
create trigger posts_enqueue_publication_notification_event
after insert or update of status, is_public on public.posts
for each row execute function public.enqueue_human_publication_notification_event();

alter table public.publication_notification_events enable row level security;
revoke all privileges on public.publication_notification_events from anon, authenticated;

commit;
