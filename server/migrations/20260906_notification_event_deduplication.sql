-- Additive notification-event identity. Apply before deploying server code that
-- writes deduplication_key. Existing rows and released clients remain unchanged.
begin;

alter table public.notifications
  add column if not exists deduplication_key text;

create unique index if not exists notifications_deduplication_key_unique
  on public.notifications (deduplication_key)
  where deduplication_key is not null;

commit;
