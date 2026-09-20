-- Keep the database constraint aligned with the public notification contract.
-- This is additive for released clients: legacy kinds remain valid while the
-- server can persist the canonical granular kinds introduced in v2.
begin;

alter table public.notifications
  drop constraint if exists notifications_kind_check;

alter table public.notifications
  add constraint notifications_kind_check check (kind in (
    'applaud',
    'like',
    'follow',
    'bookmark',
    'publishing',
    'editorial',
    'first_applause',
    'comment',
    'reply',
    'new_follower',
    'followed_writer_published',
    'reading_nudge',
    'draft_nudge',
    'weekly_prompt_live',
    'daily_digest'
  ));

commit;
