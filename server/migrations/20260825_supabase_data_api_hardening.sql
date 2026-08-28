-- WritOn uses Firebase authentication and the trusted Fastify/Postgres server,
-- not the Supabase Data API. Keep every public-schema table fail-closed for
-- anon/authenticated API roles and leave the server's postgres connection as
-- the only application data path.

begin;

alter table public.legacy_import_comment_links enable row level security;
alter table public.legacy_import_profile_attributes enable row level security;
alter table public.reading_history enable row level security;

revoke all privileges on all tables in schema public from anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

create index if not exists bot_delayed_actions_target_comment_id_idx
  on public.bot_delayed_actions(target_comment_id);
create index if not exists bot_delayed_actions_target_user_id_idx
  on public.bot_delayed_actions(target_user_id);
create index if not exists comments_author_id_idx
  on public.comments(author_id);
create index if not exists notifications_actor_id_idx
  on public.notifications(actor_id);
create index if not exists notifications_comment_id_idx
  on public.notifications(comment_id);
create index if not exists notifications_post_id_idx
  on public.notifications(post_id);
create index if not exists reading_history_post_id_idx
  on public.reading_history(post_id);

-- profile_id already has a unique-constraint index; this duplicate index adds
-- write cost without improving any query plan.
drop index if exists public.profile_auth_identities_profile_id_idx;

commit;
