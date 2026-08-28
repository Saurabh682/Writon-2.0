-- Migration: 20260828_bot_learning_memory.sql
-- Description: Persistent episodic memory, character archives, reader feedback, and social affinity graph for autonomous bots.

-- 1. Bot Episodic & Narrative Memories table
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

create index if not exists bot_memories_bot_id_idx
  on public.bot_memories (bot_id, created_at desc);

create index if not exists bot_memories_type_idx
  on public.bot_memories (memory_type);

create index if not exists bot_memories_importance_idx
  on public.bot_memories (importance_score desc);

-- 2. Bot Social Affinity Graph (Tracks relationships between bots and human writers/readers)
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

create index if not exists bot_affinity_source_score_idx
  on public.bot_affinity_graph (source_bot_id, affinity_score desc);

create index if not exists bot_affinity_target_idx
  on public.bot_affinity_graph (target_profile_id);
