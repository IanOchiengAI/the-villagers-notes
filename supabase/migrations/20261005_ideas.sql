-- 2026-10-05: "Ideas" — Vic's running list of changes he'd like, which Ian groups into the next phase.
-- Private table, same pattern as private_settings: RLS on, no policies, no anon/authenticated grants.
-- Only /api/admin-entries (service role, admin token) reads or writes it.
-- Status is changed by Ian (SQL / Supabase), never from the dashboard: Vic and Ian share one admin login.
-- Apply BEFORE deploying the code that uses it.
create table if not exists public.ideas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  entry_id text check (entry_id is null or entry_id ~ '^[A-Za-z0-9_-]{1,200}$'),
  source text not null default 'Vic' check (source in ('Vic', 'Kasuku Studio')),
  status text not null default 'New' check (status in ('New', 'Discussed', 'In Phase 2', 'Built', 'Not now')),
  note text check (note is null or char_length(note) <= 500)
);
alter table public.ideas enable row level security;
revoke all on public.ideas from anon, authenticated;
