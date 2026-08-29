-- Give retryable app comment mutations a stable identity. The Fastify server
-- remains the only application data path, so the new column is not exposed to
-- Supabase Data API roles.
begin;

alter table public.comments
  add column if not exists client_mutation_id uuid;

create unique index if not exists comments_author_client_mutation_id_key
  on public.comments (author_id, client_mutation_id)
  where client_mutation_id is not null;

alter table public.comments enable row level security;
revoke all privileges on public.comments from anon, authenticated;

commit;
