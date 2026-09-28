-- 2026-09-28: entry media, admin-set prices, admin-set private play link, admin-only
-- paid-entry access on a new device. Apply in the Supabase SQL editor BEFORE deploying
-- the code that uses it (the reader pages select the new media columns).
--
-- Security model (SECURITY.md rule 2.10, DECISIONS_LOG 1.S):
--   site_settings     public READ only (prices shown on /projects). Writes: service role.
--   private_settings  no public access at all (holds the paid play link).
--   entry_purchases   no public access at all (phone numbers of paying readers).
--   entry_access      no public access at all (hashed device keys / one-time grant links).
--   storage entry-media  public read (files are shown on public pages); uploads only via
--                        signed upload URLs minted by /api/admin-entries (service role).

-- ── 1. Entry media ──────────────────────────────────────────────────────────────
alter table public.entries add column if not exists image_url text;
alter table public.entries add column if not exists audio_url text;
alter table public.entries add column if not exists video_url text;

-- ── 2. Public site settings (prices) ────────────────────────────────────────────
create table if not exists public.site_settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);
alter table public.site_settings enable row level security;
revoke all on public.site_settings from anon, authenticated;
grant select on public.site_settings to anon, authenticated;
drop policy if exists site_settings_public_read on public.site_settings;
create policy site_settings_public_read on public.site_settings for select to anon, authenticated using (true);

insert into public.site_settings (key, value) values
  ('play_price', '1000'),
  ('book_price', '1500')
on conflict (key) do nothing;

-- ── 3. Private settings (paid play link) ────────────────────────────────────────
create table if not exists public.private_settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);
alter table public.private_settings enable row level security;
revoke all on public.private_settings from anon, authenticated;

-- ── 4. Paid-entry purchases ─────────────────────────────────────────────────────
create table if not exists public.entry_purchases (
  invoice_id       text primary key,              -- IntaSend invoice id
  entry_id         text not null,
  phone            text,
  amount           integer,
  status           text not null default 'Awaiting payment'
                   check (status in ('Awaiting payment', 'Paid')),
  device_minted_at timestamptz,                   -- set once: the purchase's first device key
  created_at       timestamptz not null default now(),
  paid_at          timestamptz
);
create index if not exists entry_purchases_entry_idx on public.entry_purchases (entry_id);
create index if not exists entry_purchases_phone_idx on public.entry_purchases (phone);
alter table public.entry_purchases enable row level security;
revoke all on public.entry_purchases from anon, authenticated;

-- ── 5. Device keys + one-time access links ──────────────────────────────────────
-- Only SHA-256 hashes are stored; the raw key/token exists only in the reader's
-- browser (device) or in the link Vic sends (grant).
create table if not exists public.entry_access (
  id          uuid primary key default gen_random_uuid(),
  invoice_id  text not null references public.entry_purchases (invoice_id) on delete cascade,
  entry_id    text not null,
  kind        text not null check (kind in ('device', 'grant')),
  key_hash    text not null unique,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz,                        -- grants only
  used_at     timestamptz,                        -- grants only: set when redeemed
  revoked_at  timestamptz
);
create index if not exists entry_access_invoice_idx on public.entry_access (invoice_id);
alter table public.entry_access enable row level security;
revoke all on public.entry_access from anon, authenticated;

-- ── 6. Storage bucket for entry images and audio ────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'entry-media', 'entry-media', true, 26214400,  -- 25 MB
  array['image/jpeg', 'image/png', 'image/webp',
        'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/wav', 'audio/ogg']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
-- No storage.objects policies are added for anon/authenticated: public buckets are
-- readable by URL without one, and every upload goes through a signed upload URL
-- created with the service role key.
