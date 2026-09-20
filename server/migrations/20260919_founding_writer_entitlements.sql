-- Additive profile recognition fields. Assignment is deliberately manual so
-- bot, seed, and test profiles can never consume one of the 250 founder slots.
-- The broad founding_writer_eligibility campaign snapshot is intentionally
-- separate from this operator-curated, numbered recognition field.
alter table public.profiles
  add column if not exists founding_writer_number smallint,
  add column if not exists email_verified boolean not null default false;

alter table public.profiles
  drop constraint if exists profiles_founding_writer_number_range;

alter table public.profiles
  add constraint profiles_founding_writer_number_range
  check (founding_writer_number between 1 and 250);

create unique index if not exists profiles_founding_writer_number_unique
  on public.profiles (founding_writer_number)
  where founding_writer_number is not null;

comment on column public.profiles.founding_writer_number is
  'Operator-assigned, permanent Founding Writer sequence number (1-250).';

comment on column public.profiles.email_verified is
  'True only after Firebase reports email_verified=true; not identity verification.';
