-- Optional granular notification controls. NULL inherits the existing broad preference.
begin;

alter table public.notification_preferences
  add column if not exists first_applause_enabled boolean,
  add column if not exists comments_replies_enabled boolean,
  add column if not exists new_followers_enabled boolean,
  add column if not exists followed_writer_published_enabled boolean,
  add column if not exists reading_nudges_enabled boolean,
  add column if not exists draft_nudges_enabled boolean,
  add column if not exists weekly_prompt_enabled boolean,
  add column if not exists daily_digest_enabled boolean;

commit;
