-- Security sweep 2026-09-27: follow-up to 20260926_lock_entries_public_view.sql.
-- The view now runs with the caller's rights, so RLS on public.entries applies to it and the
-- Supabase advisor's SECURITY DEFINER error clears. Nothing in the site reads through this view.
alter view public.entries_public set (security_invoker = true);
