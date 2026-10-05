-- 2026-10-05: first entries on the Ideas list. Vic's requests from Signal (2026-10-05), the
-- newsletter sending moved from Phase 1 to Phase 2, and Kasuku Studio's suggestions.
-- Run once, after 20261005_ideas.sql.
insert into public.ideas (body, source, status, note) values
  ('Readers can reply to comments and react to them.', 'Vic', 'In Phase 2', 'Your replies will carry an "Author" badge so readers know it is you.'),
  ('Share button text: "Know someone who would enjoy this story? Send it to them."', 'Vic', 'In Phase 2', null),
  ('Rename the links at the end of each entry to "Read previous entry" and "Read next entry".', 'Vic', 'In Phase 2', null),
  ('Newsletter sending: email your subscribers from the dashboard when you publish a new entry.', 'Kasuku Studio', 'In Phase 2', 'Moved from Phase 1. Sign-ups are already being saved, so your list is ready when this is built.'),
  ('An email to you whenever a reader leaves a comment, so you can reply quickly.', 'Kasuku Studio', 'New', null),
  ('Move the play video to private video hosting, so a buyer cannot pass the link around.', 'Kasuku Studio', 'New', null),
  ('A reader pass: one M-Pesa payment unlocks every paid entry for 30 days.', 'Kasuku Studio', 'New', null),
  ('Payments straight to your own M-Pesa Till (Daraja), with lower fees than IntaSend.', 'Kasuku Studio', 'New', null),
  ('A monthly earnings summary in the dashboard: tips, paid entries, book and play sales.', 'Kasuku Studio', 'New', null),
  ('Move the hosting, database and analytics accounts into your own name.', 'Kasuku Studio', 'New', null),
  ('Series: group entries that belong together, shown as "Part 2 of 5" with series navigation.', 'Kasuku Studio', 'New', 'Only worth it if you write stories in parts.');
