-- Reconcile notification delivery indexes after rollout.
begin;

create index if not exists notification_delivery_outbox_recipient_idx
  on public.notification_delivery_outbox (recipient_id);

-- notifications_unread_idx already covers the same recipient/read query.
drop index if exists public.notifications_recipient_unread_created_idx;

commit;
