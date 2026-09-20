-- Permanent, operator-curated Founding Writer number ledger.
-- Numbers are intentionally never recycled and rows are append-only.
create table if not exists public.founding_writer_assignments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null,
  founding_writer_number smallint not null,
  profile_pen_name text not null,
  profile_display_name text not null,
  assigned_by text not null,
  assignment_reason text not null,
  assigned_at timestamptz not null default now(),
  constraint founding_writer_assignments_number_range
    check (founding_writer_number between 1 and 250),
  constraint founding_writer_assignments_profile_unique unique (profile_id),
  constraint founding_writer_assignments_number_unique unique (founding_writer_number),
  constraint founding_writer_assignments_actor_nonempty check (length(trim(assigned_by)) between 2 and 120),
  constraint founding_writer_assignments_reason_nonempty check (length(trim(assignment_reason)) between 3 and 500)
);

alter table public.founding_writer_assignments enable row level security;
revoke all on public.founding_writer_assignments from anon, authenticated;

create or replace function public.prevent_founding_writer_assignment_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Founding Writer assignments are immutable';
end;
$$;

drop trigger if exists founding_writer_assignments_immutable
  on public.founding_writer_assignments;
create trigger founding_writer_assignments_immutable
before update or delete on public.founding_writer_assignments
for each row execute function public.prevent_founding_writer_assignment_mutation();

comment on table public.founding_writer_assignments is
  'Append-only audit ledger for manually assigned, non-recyclable Founding Writer numbers.';
