-- Per-recipient discovery notification budget. Additive and server-only.
begin;

create table if not exists public.discovery_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  recipient_key text not null,
  profile_id text references public.profiles(id) on delete cascade,
  installation_id uuid,
  kind text not null check (kind in ('reading_nudge', 'draft_nudge', 'daily_digest')),
  target_post_id uuid references public.posts(id) on delete set null,
  local_date date not null,
  run_id text not null,
  status text not null default 'claimed' check (status in ('claimed', 'sent', 'failed', 'suppressed')),
  failure_code text,
  claimed_at timestamptz not null default now(),
  delivered_at timestamptz,
  updated_at timestamptz not null default now(),
  check ((profile_id is not null)::int + (installation_id is not null)::int = 1),
  unique (recipient_key, local_date)
);

create index if not exists discovery_notification_deliveries_budget_idx
  on public.discovery_notification_deliveries (recipient_key, claimed_at desc)
  where status in ('claimed', 'sent');

alter table public.discovery_notification_deliveries enable row level security;
revoke all privileges on public.discovery_notification_deliveries from anon, authenticated;
grant select, insert, update on public.discovery_notification_deliveries to service_role;

-- Budget associations expose no history to clients and survive token rotation.
create table if not exists public.discovery_notification_identities (
  installation_id uuid not null,
  profile_id text not null references public.profiles(id) on delete cascade,
  primary key (installation_id, profile_id)
);
create index if not exists discovery_notification_identities_profile_idx
  on public.discovery_notification_identities (profile_id);
alter table public.discovery_notification_identities enable row level security;
revoke all on public.discovery_notification_identities from public, anon, authenticated;
grant select, insert on public.discovery_notification_identities to service_role;

create or replace function public.link_discovery_notification_identity(p_installation_id uuid, p_profile_id text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  -- ponytail: serialize this low-volume budget; partition locks if measured contention grows.
  perform pg_advisory_xact_lock(hashtextextended('writon:discovery-budget', 0));
  insert into public.discovery_notification_identities values (p_installation_id, p_profile_id)
    on conflict do nothing;
  return true;
end;
$$;
revoke all on function public.link_discovery_notification_identity(uuid,text) from public, anon, authenticated;
grant execute on function public.link_discovery_notification_identity(uuid,text) to service_role;

create or replace function public.claim_discovery_notification(
  p_recipient_key text, p_profile_id text, p_installation_id uuid, p_kind text,
  p_target_post_id uuid, p_local_date date, p_run_id text
) returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  budget_keys text[];
begin
  if p_kind = 'draft_nudge' and not exists (
    select 1 from public.posts draft
     where draft.id = p_target_post_id and draft.author_id = p_profile_id
       and draft.status = 'draft' and draft.updated_at <= now() - interval '5 days'
  ) then return false; end if;

  if p_kind in ('reading_nudge', 'daily_digest') and not exists (
    select 1 from public.posts post
    join public.profiles author on author.id = post.author_id and author.account_type = 'human'
    where post.id = p_target_post_id and post.status = 'published' and post.is_public = true
      and post.provenance = 'human_verified'
  ) then return false; end if;

  perform pg_advisory_xact_lock(hashtextextended('writon:discovery-budget', 0));
  -- Shared installations conservatively share discovery caps, never account access.
  with recursive links as (
    select 'profile:' || profile_id as a, 'installation:' || installation_id::text as b
    from public.discovery_notification_identities
  ), connected(key) as (
    select p_recipient_key
    union
    select case when links.a = connected.key then links.b else links.a end
    from connected join links on links.a = connected.key or links.b = connected.key
  ) select array_agg(key) into budget_keys from connected;
  if exists (
    select 1 from public.discovery_notification_deliveries
     where recipient_key = any(budget_keys) and local_date = p_local_date
       and status in ('claimed', 'sent')
  ) or (
    select count(*) from public.discovery_notification_deliveries
     where recipient_key = any(budget_keys) and status in ('claimed', 'sent')
       and claimed_at >= now() - interval '7 days'
  ) >= 2 then return false; end if;

  insert into public.discovery_notification_deliveries (
    recipient_key, profile_id, installation_id, kind, target_post_id, local_date, run_id
  ) values (p_recipient_key, p_profile_id, p_installation_id, p_kind, p_target_post_id, p_local_date, p_run_id)
  on conflict (recipient_key, local_date) do nothing;
  return found;
end;
$$;

revoke all on function public.claim_discovery_notification(text, text, uuid, text, uuid, date, text)
  from public, anon, authenticated;
grant execute on function public.claim_discovery_notification(text, text, uuid, text, uuid, date, text)
  to service_role;
commit;
