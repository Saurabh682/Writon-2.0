begin;

-- Older environments may have created this table before the profile foreign
-- key was added to the canonical schema. Remove identifiers that no longer
-- resolve before enforcing the intended account-deletion cascade.
update public.reader_feed_sessions session
set profile_id = null
where session.profile_id is not null
  and not exists (
    select 1
    from public.profiles profile
    where profile.id = session.profile_id
  );

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.reader_feed_sessions'::regclass
      and conname = 'reader_feed_sessions_profile_id_fkey'
  ) then
    alter table public.reader_feed_sessions
      add constraint reader_feed_sessions_profile_id_fkey
      foreign key (profile_id) references public.profiles(id)
      on delete cascade
      not valid;
  end if;
end
$$;

alter table public.reader_feed_sessions
  validate constraint reader_feed_sessions_profile_id_fkey;

commit;
