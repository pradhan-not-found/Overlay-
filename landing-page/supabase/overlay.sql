-- Overlay · Supabase schema
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- Safe to run more than once. It only creates and changes overlay_* tables.
--
-- Row Level Security is on with no policies: nothing is readable from a browser.
-- Only the website's server functions (secret key) and the dashboard can read or write.

-- ─────────────────────────────────────────────────────────────
-- Sponsors: one row per sponsor checkout, from the form to payment.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.overlay_sponsors (
  id                   uuid primary key default gen_random_uuid(),
  product              text not null,
  link                 text not null,
  description          text not null default '',
  email                text not null,
  name                 text,
  phone                text,
  country              text,
  address              text,
  amount               integer not null,                 -- smallest unit (cents for USD, paise for INR)
  currency             text not null default 'USD',
  razorpay_order_id    text unique not null,             -- an order id, a UPI QR id, or lead_<id> before checkout
  razorpay_payment_id  text unique,
  status               text not null default 'created'
                       check (status in ('created', 'paid', 'failed', 'featured', 'rejected', 'refunded')),
  featured             boolean not null default false,   -- shown in the sponsor row on the website
  note                 text,
  created_at           timestamptz not null default now(),
  paid_at              timestamptz,
  updated_at           timestamptz not null default now()
);
create index if not exists overlay_sponsors_status_idx  on public.overlay_sponsors (status);
create index if not exists overlay_sponsors_created_idx on public.overlay_sponsors (created_at desc);

create or replace function public.overlay_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists overlay_sponsors_touch on public.overlay_sponsors;
create trigger overlay_sponsors_touch before update on public.overlay_sponsors
  for each row execute function public.overlay_touch_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Visits: daily totals per page, country, device and source.
-- Nothing personal is stored: no IP, no name, no cookie id.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.overlay_visit_days (
  day        date not null,
  path       text not null default '/',
  country    text not null default '',
  device     text not null default '',
  referrer   text not null default '',
  visits     bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (day, path, country, device, referrer)
);
create index if not exists overlay_visit_days_day_idx on public.overlay_visit_days (day desc);

create or replace function public.overlay_track_visit(p_path text, p_country text, p_device text, p_referrer text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.overlay_visit_days as v (day, path, country, device, referrer, visits)
  values (
    (now() at time zone 'UTC')::date,
    left(coalesce(nullif(p_path, ''), '/'), 80),
    case when upper(coalesce(p_country, '')) ~ '^[A-Z]{2}$' then upper(p_country) else '' end,
    case when lower(coalesce(p_device, '')) in ('desktop', 'mobile', 'tablet') then lower(p_device) else '' end,
    lower(left(coalesce(p_referrer, ''), 80)),
    1
  )
  on conflict (day, path, country, device, referrer)
  do update set visits = v.visits + 1, updated_at = now();
end $$;

-- ─────────────────────────────────────────────────────────────
-- Downloads: one counter per day and country.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.overlay_download_days (
  day        date not null,
  country    text not null default '',
  version    text not null default '',
  downloads  bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (day, country, version)
);
create index if not exists overlay_download_days_day_idx on public.overlay_download_days (day desc);

create or replace function public.overlay_track_download(p_country text, p_version text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.overlay_download_days as d (day, country, version, downloads)
  values (
    (now() at time zone 'UTC')::date,
    case when upper(coalesce(p_country, '')) ~ '^[A-Z]{2}$' then upper(p_country) else '' end,
    left(coalesce(p_version, ''), 24),
    1
  )
  on conflict (day, country, version)
  do update set downloads = d.downloads + 1, updated_at = now();
end $$;

-- ─────────────────────────────────────────────────────────────
-- Security: on, with no policies → server (secret key) only.
-- ─────────────────────────────────────────────────────────────
alter table public.overlay_sponsors      enable row level security;
alter table public.overlay_visit_days    enable row level security;
alter table public.overlay_download_days enable row level security;
revoke all on public.overlay_sponsors, public.overlay_visit_days, public.overlay_download_days from anon, authenticated;
revoke execute on function public.overlay_track_visit(text, text, text, text) from public, anon, authenticated;
revoke execute on function public.overlay_track_download(text, text) from public, anon, authenticated;
grant execute on function public.overlay_track_visit(text, text, text, text) to service_role;
grant execute on function public.overlay_track_download(text, text) to service_role;
