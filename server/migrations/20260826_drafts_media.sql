-- Draft idempotency and private Supabase Storage for user-provided covers.
begin;

alter table public.posts
  add column if not exists client_draft_id uuid;

create unique index if not exists posts_author_client_draft_id_key
  on public.posts (author_id, client_draft_id)
  where client_draft_id is not null;

create index if not exists posts_author_draft_updated_idx
  on public.posts (author_id, updated_at desc)
  where status = 'draft';

-- The Fastify service uses the service-role key; no direct client policies are
-- granted. Run this in the Supabase SQL editor after setting the storage bucket
-- name in server environment configuration.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'writon-media', 'writon-media', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

commit;
