-- Security sweep 2026-09-26 (finding C2).
-- public.entries_public is a SECURITY DEFINER view, so it runs with the owner's rights and skips
-- RLS on public.entries. Postgres treated it as auto-updatable and anon/authenticated held
-- INSERT/UPDATE/DELETE on it, so anyone holding the public anon key could rewrite or delete entries.
-- The site never writes through this view (reads use public.entries; admin writes go through
-- /api/admin-entries with the service key), so read access is kept and write access removed.

revoke insert, update, delete, truncate, trigger, references
  on public.entries_public
  from anon, authenticated;

-- TRUNCATE ignores RLS. PostgREST can't issue it, but the public roles have no reason to hold it.
revoke truncate, trigger, references
  on public.entries, public.comments, public.orders, public.subscribers, public.tips
  from anon, authenticated;
