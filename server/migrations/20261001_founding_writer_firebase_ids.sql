-- profiles.id contains both legacy UUID strings and Firebase UIDs.
-- Widen the audit identifier without changing assignments, constraints or triggers.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
alter table public.founding_writer_assignments
  alter column profile_id type text using profile_id::text;
commit;

-- Rollback is possible only BEFORE any non-UUID assignment is recorded.
-- Otherwise roll forward: founder assignments must never be deleted or renumbered.
