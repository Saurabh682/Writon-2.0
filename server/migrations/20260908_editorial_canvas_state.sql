-- Durable, admin-only state and append-only revisions for the Global Editorial Canvas.
create table if not exists public.editorial_canvas_documents (
  document_id text primary key check (document_id ~ '^[a-z0-9][a-z0-9-]{0,63}$'),
  revision integer not null default 0 check (revision >= 0),
  state jsonb not null default '{}'::jsonb check (jsonb_typeof(state) = 'object'),
  updated_by text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.editorial_canvas_revisions (
  document_id text not null references public.editorial_canvas_documents(document_id) on delete cascade,
  revision integer not null check (revision > 0),
  changed_by text not null,
  state jsonb not null check (jsonb_typeof(state) = 'object'),
  created_at timestamptz not null default now(),
  primary key (document_id, revision)
);

create index if not exists editorial_canvas_revisions_created_idx
  on public.editorial_canvas_revisions (document_id, created_at desc);

alter table public.editorial_canvas_documents enable row level security;
alter table public.editorial_canvas_revisions enable row level security;
revoke all on table public.editorial_canvas_documents from anon, authenticated;
revoke all on table public.editorial_canvas_revisions from anon, authenticated;
grant select, insert, update, delete on table public.editorial_canvas_documents to service_role;
grant select, insert, update, delete on table public.editorial_canvas_revisions to service_role;
