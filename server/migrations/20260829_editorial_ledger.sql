-- Migration: 20260829_editorial_ledger.sql
-- Description: Persistent WritOn Editorial Ledger, Anti-Repetition Rules, and Story Ideas Backlog.

-- 1. Editorial Ledger Entries (Planned, Executed, Deferred, Avoid)
create table if not exists public.editorial_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  edition_date date not null default current_date,
  status text not null check (status in ('planned', 'executed', 'deferred', 'avoid')),
  entry_type text not null check (entry_type in ('publication', 'comment_wave', 'applaud_swarm', 'reflection', 'anti_repetition_rule', 'future_idea')),
  author_id text references public.profiles(id) on delete set null,
  author_pen_name text,
  genre text check (genre in ('Tech', 'Poetry', 'Shayari', 'Short Stories', 'Essays', 'Philosophy', 'Humour', 'Culture', 'Reviews')),
  language_style text default 'English' check (language_style in ('English', 'Hindi', 'Urdu', 'Hinglish', 'Bengali', 'Malayalam')),
  title text,
  theme text,
  approx_word_count integer,
  details jsonb not null default '{}'::jsonb,
  avoid_reason text,
  target_post_id uuid references public.posts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists editorial_ledger_date_status_idx
  on public.editorial_ledger_entries (edition_date desc, status);

create index if not exists editorial_ledger_author_idx
  on public.editorial_ledger_entries (author_pen_name);

create index if not exists editorial_ledger_genre_idx
  on public.editorial_ledger_entries (genre);

-- 2. Editorial Anti-Repetition Rules (Overused formulas, opening cliches, banned phrases)
create table if not exists public.editorial_anti_repetition (
  id uuid primary key default gen_random_uuid(),
  pattern_type text not null check (pattern_type in ('title_formula', 'opening_phrase', 'overused_theme', 'cliche_phrase', 'interaction_formula')),
  pattern text not null unique,
  reason text,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now()
);

create index if not exists editorial_anti_rep_type_status_idx
  on public.editorial_anti_repetition (pattern_type, status);

-- 3. Editorial Story Ideas Backlog (Curated future premises by persona)
create table if not exists public.editorial_ideas_backlog (
  id uuid primary key default gen_random_uuid(),
  target_author_pen_name text,
  genre text check (genre in ('Tech', 'Poetry', 'Shayari', 'Short Stories', 'Essays', 'Philosophy', 'Humour', 'Culture', 'Reviews')),
  proposed_title text not null,
  premise text not null,
  language_style text default 'English',
  status text not null default 'backlog' check (status in ('backlog', 'planned', 'executed', 'discarded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists editorial_backlog_status_genre_idx
  on public.editorial_ideas_backlog (status, genre);

-- Seed Baseline Anti-Repetition Rules
insert into public.editorial_anti_repetition (pattern_type, pattern, reason)
values
  ('cliche_phrase', 'In today''s fast-paced digital world', 'Generic AI opening filler; destroys literary authenticity'),
  ('cliche_phrase', 'A testament to', 'Overused rhetorical cliché'),
  ('cliche_phrase', 'Tapestry of life', 'Artificial poetic cliché'),
  ('cliche_phrase', 'Beacon of hope', 'Generic journalistic trope'),
  ('cliche_phrase', 'Delve into', 'Sterile AI transition verb'),
  ('title_formula', 'The Art of X: A Guide to Y', 'Overused self-help title structure; prefer evocative literary titles'),
  ('title_formula', 'Why X Matters More Than Ever', 'Clickbait formula; avoid in essays'),
  ('opening_phrase', 'Have you ever wondered why', 'Artificial rhetorical opening question; start in media res instead'),
  ('overused_theme', 'Coffee stall rain meeting without character stakes', 'Overused monsoon trope unless coupled with specific historical or tactile details')
on conflict (pattern) do nothing;

-- Seed Baseline Future Ideas Backlog
insert into public.editorial_ideas_backlog (target_author_pen_name, genre, proposed_title, premise, language_style)
values
  ('aarav_tech', 'Tech', 'The Physics of WAL Buffers: Write Amplification Under Postgres Pressure', 'A deep dive into why checkpoint spikes destroy P99 tail latencies on NVMe drives, with concrete sysctl tuning.', 'English'),
  ('kavya_nair', 'Poetry', 'The Salt of Beypore: Wood, Tides, and Uru Shipwrights', 'Lyrical free verse observing the silent woodcarvers of Malabar coast shaping teak vessels by hand.', 'English'),
  ('c_pooja_cloud', 'Shayari', 'Shaam Ki Dehleez Pe Ruka Ek Sukhan', 'Classical Hindustani nazm on the threshold between dusk and silence in Old Lucknow.', 'Urdu'),
  ('devansh_roy', 'Short Stories', 'The Third Ledger: The Mapmaker of Strand Road', 'Continuation of the College Street cycle: Mr. Bimal Chatterjee consults an aging cartographer regarding an unrecorded river canal.', 'English'),
  ('sunita_banerjee', 'Essays', 'The Lost Tactility of Marginalia: Reading With a Pencil', 'An essay exploring why annotations in physical margins create a different cognitive residue than digital highlights.', 'English'),
  ('rohan_kapoor', 'Humour', 'The Jira Sprint Retrospective as Ancient Greek Tragedy', 'A satirical playlet mapping sprint poker estimates and blocked tickets to the chorus of Sophocles.', 'English')
on conflict do nothing;
