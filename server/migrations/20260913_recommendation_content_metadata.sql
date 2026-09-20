-- Additive recommendation metadata. Existing APIs do not expose these columns.
-- Apply this schema migration before deploying writers for the new columns.
begin;

alter table public.posts
  add column if not exists content_form text,
  add column if not exists content_form_source text,
  add column if not exists content_form_confidence numeric(4,3),
  add column if not exists word_count integer,
  add column if not exists word_count_source text,
  add column if not exists script_code text,
  add column if not exists script_source text,
  add column if not exists script_confidence numeric(4,3),
  add column if not exists recommendation_metadata_updated_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'posts_content_form_check'
      and conrelid = 'public.posts'::regclass
  ) then
    alter table public.posts add constraint posts_content_form_check
      check (content_form in ('poetry', 'flash', 'short_story', 'essay', 'journalism', 'review', 'other')) not valid;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'posts_content_form_confidence_check'
      and conrelid = 'public.posts'::regclass
  ) then
    alter table public.posts add constraint posts_content_form_confidence_check
      check (content_form_confidence between 0 and 1) not valid;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'posts_word_count_check'
      and conrelid = 'public.posts'::regclass
  ) then
    alter table public.posts add constraint posts_word_count_check
      check (word_count >= 0) not valid;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'posts_script_code_check'
      and conrelid = 'public.posts'::regclass
  ) then
    alter table public.posts add constraint posts_script_code_check
      check (script_code in ('Latn', 'Deva', 'Beng', 'Arab')) not valid;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'posts_script_confidence_check'
      and conrelid = 'public.posts'::regclass
  ) then
    alter table public.posts add constraint posts_script_confidence_check
      check (script_confidence between 0 and 1) not valid;
  end if;
end $$;

alter table public.posts validate constraint posts_content_form_check;
alter table public.posts validate constraint posts_content_form_confidence_check;
alter table public.posts validate constraint posts_word_count_check;
alter table public.posts validate constraint posts_script_code_check;
alter table public.posts validate constraint posts_script_confidence_check;

commit;
