-- Canonical story taxonomy. Trending remains a feed mode rather than a
-- publishable story category. The trusted Fastify server is the only data path.
begin;

create table if not exists public.story_categories (
  slug text primary key,
  name text not null unique,
  category_type text not null,
  display_order smallint not null unique check (display_order > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint story_categories_slug_format_check
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint story_categories_type_check
    check (category_type in ('content', 'feed'))
);

comment on table public.story_categories is
  'Ordered WritOn feed and publishable-content taxonomy used by server APIs.';

insert into public.story_categories (slug, name, category_type, display_order)
values
  ('trending', 'Trending', 'feed', 1),
  ('reviews', 'Reviews', 'content', 2),
  ('tech', 'Tech', 'content', 3),
  ('culture', 'Culture', 'content', 4),
  ('essays', 'Essays', 'content', 5),
  ('humour', 'Humour', 'content', 6),
  ('poetry', 'Poetry', 'content', 7),
  ('short-stories', 'Short Stories', 'content', 8),
  ('journal', 'Journal', 'content', 9),
  ('journalism', 'Journalism', 'content', 10),
  ('science-health', 'Science & Health', 'content', 11),
  ('business-finance', 'Business & Finance', 'content', 12),
  ('sports', 'Sports', 'content', 13),
  ('entertainment', 'Entertainment', 'content', 14),
  ('shayari', 'Shayari', 'content', 15),
  ('philosophy', 'Philosophy', 'content', 16),
  ('satire', 'Satire', 'content', 17),
  ('fiction', 'Fiction', 'content', 18)
on conflict (slug) do update
set name = excluded.name,
    category_type = excluded.category_type,
    display_order = excluded.display_order,
    is_active = true,
    updated_at = now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'posts_category_fkey'
      and conrelid = 'public.posts'::regclass
  ) then
    alter table public.posts
      add constraint posts_category_fkey
      foreign key (category)
      references public.story_categories(name)
      on update cascade
      on delete restrict
      not valid;
  end if;
end $$;

alter table public.posts validate constraint posts_category_fkey;

alter table public.story_categories enable row level security;
revoke all privileges on public.story_categories from anon, authenticated;

commit;

