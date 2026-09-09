-- 20260905_bot_system_runtime_tables_and_outbox.sql
-- Consolidate runtime bot tables, event outbox, and idempotency records into versioned migrations.

begin;

-- 1. Bot configurations
create table if not exists public.bot_configs (
  id text primary key references public.profiles(id) on delete cascade,
  is_active boolean not null default true,
  persona_prompt text not null,
  categories text[] not null default array['Essays', 'Culture'],
  post_frequency_hours integer not null default 24 check (post_frequency_hours >= 1),
  like_probability numeric(4,3) not null default 0.850 check (like_probability >= 0 and like_probability <= 1),
  comment_probability numeric(4,3) not null default 0.700 check (comment_probability >= 0 and comment_probability <= 1),
  comment_style text not null default 'insightful, encouraging, reflective and authentic',
  bot_type text not null default 'writer',
  last_posted_at timestamptz,
  last_interacted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bot_configs add column if not exists bot_type text not null default 'writer';
create index if not exists bot_configs_bot_type_idx on public.bot_configs (bot_type, is_active);

-- 2. Bot Global Settings
create table if not exists public.bot_global_settings (
  id text primary key default 'global',
  is_engine_enabled boolean not null default true,
  spark_automation_mode text not null default 'hybrid' check (spark_automation_mode in ('pulse', 'event_reactive', 'hybrid')),
  llm_provider text not null default 'gemini',
  llm_model text not null default 'gemini-3.5-flash',
  gemini_api_key text,
  posts_per_day_target integer not null default 4 check (posts_per_day_target >= 0),
  spark_pulse_interval_minutes integer not null default 15 check (spark_pulse_interval_minutes >= 1),
  human_post_reaction_rate numeric(4,3) not null default 0.900 check (human_post_reaction_rate >= 0 and human_post_reaction_rate <= 1),
  reaction_delay_min_minutes integer not null default 2 check (reaction_delay_min_minutes >= 0),
  reaction_delay_max_minutes integer not null default 20 check (reaction_delay_max_minutes >= reaction_delay_min_minutes),
  bot_to_bot_interaction_rate numeric(4,3) not null default 0.400 check (bot_to_bot_interaction_rate >= 0 and bot_to_bot_interaction_rate <= 1),
  reader_swarm_enabled boolean not null default true,
  applaud_swarm_intensity text not null default 'healthy',
  min_swarm_applauds_per_post integer not null default 12,
  max_swarm_applauds_per_post integer not null default 35,
  commenter_swarm_enabled boolean not null default true,
  min_comments_per_post integer not null default 2,
  max_comments_per_post integer not null default 6,
  updated_at timestamptz not null default now()
);

alter table public.bot_global_settings add column if not exists reader_swarm_enabled boolean not null default true;
alter table public.bot_global_settings add column if not exists applaud_swarm_intensity text not null default 'healthy';
alter table public.bot_global_settings add column if not exists min_swarm_applauds_per_post integer not null default 12;
alter table public.bot_global_settings add column if not exists max_swarm_applauds_per_post integer not null default 35;
alter table public.bot_global_settings add column if not exists commenter_swarm_enabled boolean not null default true;
alter table public.bot_global_settings add column if not exists min_comments_per_post integer not null default 2;
alter table public.bot_global_settings add column if not exists max_comments_per_post integer not null default 6;

insert into public.bot_global_settings (id, is_engine_enabled)
values ('global', true)
on conflict (id) do nothing;

-- 3. Bot Activity Logs
create table if not exists public.bot_activity_logs (
  id uuid primary key default gen_random_uuid(),
  bot_id text not null references public.profiles(id) on delete cascade,
  action_type text not null check (action_type in ('post', 'comment', 'applaud', 'follow', 'bookmark', 'reply', 'spark_reaction')),
  target_post_id uuid references public.posts(id) on delete set null,
  target_user_id text references public.profiles(id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  status text not null default 'success' check (status in ('success', 'failed', 'pending')),
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists bot_activity_logs_created_at_idx on public.bot_activity_logs (created_at desc);
create index if not exists bot_activity_logs_bot_id_idx on public.bot_activity_logs (bot_id);
create index if not exists bot_activity_logs_target_post_id_idx on public.bot_activity_logs (target_post_id) where target_post_id is not null;
create index if not exists bot_activity_logs_target_user_id_idx on public.bot_activity_logs (target_user_id) where target_user_id is not null;

-- 4. Bot Delayed Actions
create table if not exists public.bot_delayed_actions (
  id uuid primary key default gen_random_uuid(),
  bot_id text not null references public.bot_configs(id) on delete cascade,
  action_type text not null check (action_type in ('story', 'applaud', 'comment', 'reply', 'follow')),
  target_post_id uuid references public.posts(id) on delete cascade,
  target_comment_id uuid references public.comments(id) on delete cascade,
  target_user_id text references public.profiles(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  scheduled_at timestamptz not null default now(),
  execute_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  attempts int not null default 0,
  last_error text,
  executed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bot_delayed_actions_polling_idx on public.bot_delayed_actions (status, execute_at) where status = 'pending';
create index if not exists bot_delayed_actions_bot_id_idx on public.bot_delayed_actions (bot_id);
create index if not exists bot_delayed_actions_target_post_id_idx on public.bot_delayed_actions (target_post_id) where target_post_id is not null;

-- 5. Bot Episodic Memories
create table if not exists public.bot_memories (
  id uuid primary key default gen_random_uuid(),
  bot_id text not null references public.profiles(id) on delete cascade,
  memory_type text not null check (memory_type in ('story_arc', 'reader_feedback', 'cross_author_interaction', 'philosophical_reflection', 'style_evolution')),
  subject text not null,
  content text not null,
  importance_score numeric(3,2) not null default 1.00 check (importance_score >= 0 and importance_score <= 1.00),
  target_post_id uuid references public.posts(id) on delete set null,
  target_user_id text references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bot_memories_bot_id_created_at_idx on public.bot_memories (bot_id, created_at desc);

-- 6. Bot Affinity Graph
create table if not exists public.bot_affinity_graph (
  id uuid primary key default gen_random_uuid(),
  source_bot_id text not null references public.profiles(id) on delete cascade,
  target_profile_id text not null references public.profiles(id) on delete cascade,
  affinity_score numeric(4,3) not null default 0.100 check (affinity_score >= 0 and affinity_score <= 1.00),
  interaction_count integer not null default 1 check (interaction_count >= 1),
  last_interaction_type text not null default 'applaud' check (last_interaction_type in ('applaud', 'comment', 'reply', 'follow', 'citation')),
  last_interacted_at timestamptz not null default now(),
  constraint bot_affinity_unique_pair unique (source_bot_id, target_profile_id)
);

-- 7. Editorial Ledger Entries
create table if not exists public.editorial_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  edition_date date not null default current_date,
  status text not null check (status in ('planned', 'executed', 'deferred', 'avoid')),
  entry_type text not null check (entry_type in ('publication', 'comment_wave', 'applaud_swarm', 'reflection', 'anti_repetition_rule', 'future_idea')),
  author_id text references public.profiles(id) on delete set null,
  author_pen_name text,
  genre text,
  language_style text default 'English',
  title text,
  theme text,
  approx_word_count integer,
  details jsonb not null default '{}'::jsonb,
  avoid_reason text,
  target_post_id uuid references public.posts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists editorial_ledger_entries_edition_date_idx on public.editorial_ledger_entries (edition_date desc);

-- 8. Editorial Anti-Repetition
create table if not exists public.editorial_anti_repetition (
  id uuid primary key default gen_random_uuid(),
  pattern_type text not null check (pattern_type in ('title_formula', 'opening_phrase', 'overused_theme', 'cliche_phrase', 'interaction_formula')),
  pattern text not null unique,
  reason text,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now()
);

-- 9. Editorial Ideas Backlog
create table if not exists public.editorial_ideas_backlog (
  id uuid primary key default gen_random_uuid(),
  target_author_pen_name text,
  genre text,
  proposed_title text not null,
  premise text not null,
  language_style text default 'English',
  status text not null default 'backlog' check (status in ('backlog', 'planned', 'executed', 'discarded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 10. Editorial Research Briefs
create table if not exists public.editorial_research_briefs (
  id uuid primary key default gen_random_uuid(),
  research_date date not null default current_date,
  topic text not null,
  normalized_topic text not null,
  category text not null check (category in ('Trending', 'Reviews')),
  topic_category text not null,
  suggested_author_pen_name text,
  editorial_angle text,
  headline text,
  trend_score smallint not null check (trend_score between 0 and 100),
  verification jsonb not null default '{}'::jsonb,
  hashtag_intelligence jsonb not null default '{}'::jsonb,
  research_dossier jsonb not null default '{}'::jsonb,
  status text not null default 'pending_review' check (status in ('pending_review', 'approved', 'publishing', 'rejected', 'published')),
  approval_mode text not null default 'human_required' check (approval_mode in ('human_required', 'automatic_low_risk')),
  reviewed_by text,
  review_note text,
  reviewed_at timestamptz,
  published_post_id uuid references public.posts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_editorial_research_briefs_topic unique (research_date, category, normalized_topic)
);

create index if not exists editorial_research_briefs_status_idx on public.editorial_research_briefs (status, trend_score desc);

-- 11. Transactional Outbox for Asynchronous Bot Reactions & Memories
create table if not exists public.bot_event_outbox (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('reaction_wave', 'record_memory', 'ledger_entry', 'trend_refresh', 'social_syndicate')),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed', 'dead_letter')),
  attempts integer not null default 0,
  max_attempts integer not null default 5,
  scheduled_at timestamptz not null default now(),
  leased_until timestamptz,
  locked_by text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bot_event_outbox_queue_idx on public.bot_event_outbox (status, scheduled_at)
  where status in ('pending', 'failed');
create index if not exists bot_event_outbox_lease_idx on public.bot_event_outbox (leased_until)
  where status = 'processing';

-- 12. Bot Idempotency Records
create table if not exists public.bot_idempotency_records (
  scoped_key text primary key,
  request_hash text not null,
  route text not null,
  response_status integer not null,
  response_body jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

create index if not exists bot_memories_bot_id_idx on public.bot_memories (bot_id, created_at desc);
create index if not exists bot_affinity_source_score_idx on public.bot_affinity_graph (source_bot_id, affinity_score desc);
create index if not exists editorial_ledger_date_status_idx on public.editorial_ledger_entries (edition_date desc, status);
create unique index if not exists editorial_backlog_proposed_title_idx on public.editorial_ideas_backlog (proposed_title);
create index if not exists editorial_research_pending_idx on public.editorial_research_briefs (trend_score desc, created_at desc) where status = 'pending_review';
create index if not exists editorial_research_approved_idx on public.editorial_research_briefs (created_at asc) where status = 'approved';

-- Enable Row Level Security (RLS) on all bot tables
alter table public.bot_global_settings enable row level security;
alter table public.bot_configs enable row level security;
alter table public.bot_activity_logs enable row level security;
alter table public.bot_delayed_actions enable row level security;
alter table public.bot_memories enable row level security;
alter table public.bot_affinity_graph enable row level security;
alter table public.editorial_ledger_entries enable row level security;
alter table public.editorial_anti_repetition enable row level security;
alter table public.editorial_ideas_backlog enable row level security;
alter table public.editorial_research_briefs enable row level security;
alter table public.bot_event_outbox enable row level security;
alter table public.bot_idempotency_records enable row level security;

commit;
