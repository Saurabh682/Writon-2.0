-- Additive, server-owned onboarding and engagement preference state.
-- Existing profile and interest contracts remain unchanged.
begin;

create table if not exists public.profile_engagement_preferences (
  profile_id text primary key references public.profiles(id) on delete cascade,
  primary_intent text,
  onboarding_version integer not null default 0,
  onboarding_completed_at timestamptz,
  preference_card_state text not null default 'unseen',
  preference_card_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_engagement_preferences_intent_check
    check (primary_intent is null or primary_intent in ('read', 'write', 'both')),
  constraint profile_engagement_preferences_version_check
    check (onboarding_version between 0 and 1000),
  constraint profile_engagement_preferences_card_state_check
    check (preference_card_state in ('unseen', 'dismissed', 'completed'))
);

alter table public.profile_engagement_preferences enable row level security;

-- Mobile/web clients use the authenticated Fastify service. Keep the exposed
-- public-schema table inaccessible through Supabase's direct Data API.
revoke all on table public.profile_engagement_preferences from anon, authenticated;

comment on table public.profile_engagement_preferences is
  'Server-owned onboarding lifecycle, primary intent, and existing-user preference-card state.';

commit;
