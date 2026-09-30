-- 2026-09-30: a separate, small "share image" per entry (1200x630 JPEG, ~250 KB) for link
-- previews. WhatsApp ignores og:image files much above ~300 KB, and several covers are
-- multi-MB phone photos. Written by /api/admin-entries (service role); read by
-- /api/entry-meta and by the site (it is only a public image URL, like image_url).
-- Apply BEFORE deploying the code that selects it.
alter table public.entries add column if not exists og_image_url text;
-- entries uses column-level SELECT grants (full_body stays hidden); new columns need their own.
grant select (og_image_url) on public.entries to anon, authenticated;
