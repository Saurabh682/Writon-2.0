begin;

-- Optimise the daily-digest story count query.
create index if not exists posts_daily_digest_idx
  on public.posts (coalesce(published_at, created_at) desc)
  where status = 'published' and is_public = true;

commit;
