-- 2026-09-29: follow-up to 20260928_media_prices_access.sql.
-- `entries` uses column-level SELECT grants for anon/authenticated (so full_body stays
-- hidden), and new columns do not inherit them. Without this, the public site cannot
-- read image_url/audio_url/video_url and every entry query fails with 42501.
grant select (image_url, audio_url, video_url) on public.entries to anon, authenticated;
