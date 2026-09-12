begin;

alter table public.posts
  add column if not exists content_updated_at timestamptz;

alter table public.comments
  add column if not exists updated_at timestamptz;

commit;
