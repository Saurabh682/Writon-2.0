-- Migration: 20260823_bot_network.sql
-- Description: Tables for autonomous bot personas, Gemini Spark global settings, and activity logs.

-- 1. Bot Configs table linked to public.profiles
create table if not exists public.bot_configs (
  id text primary key references public.profiles(id) on delete cascade,
  is_active boolean not null default true,
  persona_prompt text not null,
  categories text[] not null default array['Essays', 'Culture'],
  post_frequency_hours integer not null default 24 check (post_frequency_hours >= 1),
  like_probability numeric(4,3) not null default 0.850 check (like_probability >= 0 and like_probability <= 1),
  comment_probability numeric(4,3) not null default 0.700 check (comment_probability >= 0 and comment_probability <= 1),
  comment_style text not null default 'insightful, encouraging, reflective and authentic',
  last_posted_at timestamptz,
  last_interacted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Bot Global Settings table (single-row configuration)
create table if not exists public.bot_global_settings (
  id text primary key default 'global',
  is_engine_enabled boolean not null default true,
  spark_automation_mode text not null default 'hybrid' check (spark_automation_mode in ('pulse', 'event_reactive', 'hybrid')),
  llm_provider text not null default 'gemini',
  llm_model text not null default 'gemini-2.0-flash',
  gemini_api_key text,
  posts_per_day_target integer not null default 4 check (posts_per_day_target >= 0),
  spark_pulse_interval_minutes integer not null default 15 check (spark_pulse_interval_minutes >= 1),
  human_post_reaction_rate numeric(4,3) not null default 0.900 check (human_post_reaction_rate >= 0 and human_post_reaction_rate <= 1),
  reaction_delay_min_minutes integer not null default 2 check (reaction_delay_min_minutes >= 0),
  reaction_delay_max_minutes integer not null default 20 check (reaction_delay_max_minutes >= reaction_delay_min_minutes),
  bot_to_bot_interaction_rate numeric(4,3) not null default 0.400 check (bot_to_bot_interaction_rate >= 0 and bot_to_bot_interaction_rate <= 1),
  updated_at timestamptz not null default now()
);

-- Ensure initial default settings record exists
insert into public.bot_global_settings (id, is_engine_enabled)
values ('global', true)
on conflict (id) do nothing;

-- 3. Bot Activity Logs table
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

create index if not exists bot_activity_logs_created_at_idx
  on public.bot_activity_logs (created_at desc);

create index if not exists bot_activity_logs_bot_id_idx
  on public.bot_activity_logs (bot_id, created_at desc);
