create table if not exists public.bot_delayed_actions (
  id uuid primary key default gen_random_uuid(),
  bot_id text not null references public.profiles(id) on delete cascade,
  action_type text not null,
  target_post_id uuid,
  target_comment_id uuid,
  target_user_id text,
  payload jsonb not null default '{}'::jsonb,
  scheduled_at timestamptz not null default now(),
  execute_at timestamptz not null,
  status text not null default 'pending',
  attempts int not null default 0,
  last_error text,
  executed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
