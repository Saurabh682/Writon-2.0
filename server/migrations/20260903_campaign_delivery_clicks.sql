create table if not exists public.campaign_delivery_clicks (
  delivery_id text primary key,
  platform text not null,
  click_count bigint not null default 0 check (click_count >= 0),
  first_clicked_at timestamptz not null default now(),
  last_clicked_at timestamptz not null default now()
);

comment on table public.campaign_delivery_clicks is
  'Privacy-safe campaign click aggregates. Stores no IP, user agent, fingerprint, account, or per-click event.';

create index if not exists campaign_delivery_clicks_last_clicked_idx
  on public.campaign_delivery_clicks (last_clicked_at desc);

alter table public.campaign_delivery_clicks enable row level security;
revoke all privileges on public.campaign_delivery_clicks from anon, authenticated;
