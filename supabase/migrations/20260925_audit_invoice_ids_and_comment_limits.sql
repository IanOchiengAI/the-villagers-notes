-- Apply in the Supabase SQL editor (NOT yet applied to production).
-- The code works without it, but with it tips are recorded exactly once and
-- comment length limits are enforced by the database, not just the browser.

alter table public.tips add column if not exists invoice_id text;
create unique index if not exists tips_invoice_id_key on public.tips (invoice_id);

-- NOT VALID: enforced for new rows, does not re-check existing ones.
alter table public.comments add constraint comments_author_len
  check (char_length(author) between 1 and 100) not valid;
alter table public.comments add constraint comments_comment_len
  check (char_length(comment) between 1 and 500) not valid;
