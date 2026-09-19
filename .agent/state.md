# Project State — The Villagers' Notes (Vic Munala)

> Created: 2026-08-24
> Project folder: `F:\Work\Websites\Vic\`

---

## Client Profile

| Field | Value |
|-------|-------|
| **Client Name** | Vic Munala |
| **Business Name** | The Villagers' Notes |
| **Location** | Nairobi, Kenya |
| **Industry** | Literature / Publishing / Author / Creative Writing |

---

## Decisions Made

| Date | Decision | Reason |
|------|----------|--------|
| 2026-08-24 | Redesigned comments section UI | Matched reference design with handwritten title, underlined name input, bordered textarea, live character counter, and outline comment button |
| 2026-08-24 | Updated entry header metadata format | Matched uppercase tracking format: '← ENTRIES' and 'CATEGORY · DATE · X MIN READ · BY AUTHOR' |
| 2026-08-27 | Migrated Entries CMS to Supabase | Changed entries storage from localStorage to Supabase cloud DB so published stories appear globally across all devices and browsers |
| 2026-08-27 | Added `full_body` JSONB column to Supabase `entries` table | Stores paid article full body server-side, separate from preview `body` column |
| 2026-08-27 | Created `/api/get-content.js` serverless endpoint | Verifies M-Pesa payment with IntaSend server-side before returning full article body — full content never sent to browser without confirmed payment |
| 2026-08-27 | Paywall uses sessionStorage cache + invoice re-verification | Content cached in sessionStorage for the session; localStorage stores invoice_id for re-verification on refresh; different browsers must pay separately |
| 2026-09-14 | Isolated Daraja M-Pesa migration to feature branch `feature/daraja-mpesa` | Kept live `main` branch stable while awaiting Vic's Daraja credentials, allowing the footer credit to be deployed immediately to production |
| 2026-09-14 | Added subtle Kasuku Studio footer credit link | Added `· SITE BY KASUKU STUDIO` linking to https://kasuku-studios.web.app in footer |

---

## Open Items

### Phase 2 (next session)
- [ ] **Newsletter emails** — set up Formspree (free), add `FORMSPREE_FORM_ID` to Vercel env vars
- [ ] **M-Pesa end-to-end test** — test full payment → unlock flow once Vic has a paid article ready
- [ ] **Supabase RLS** — partly done: entries writes and the paywall were locked down in `6499fb4` (2026-09-13). Still to confirm: that the anon key cannot select `full_body` directly
- [ ] **Subscribers in Supabase** — newsletter subscribers currently stored in localStorage only; add `subscribers` table to Supabase
- [ ] **Orders in Supabase** — book orders currently stored in localStorage only; add `orders` table to Supabase
- [ ] **Admin auth** — the password is now checked server-side by `/api/admin-auth` (`c055cc0`). Still open: move to Supabase Auth. **Security follow-up:** branch `security/remove-admin-password-fallback` is ready. Set a new `ADMIN_PASSWORD` in the Vercel project settings first, redeploy, then merge the branch
- [x] **Connect custom domain `thevillagersnotes.com` in Vercel** — done; the domain serves the site (HTTP 200, checked 2026-09-19)

---

## Session Log

| Date | What Was Done |
|------|---------------|
| 2026-08-24 | Redesigned comments section to match reference image with custom font, underline name field, box textarea, live character counter, and outline button |
| 2026-08-24 | Formatted single entry header with ← ENTRIES back link and uppercase metadata (Category · Date · Read Time · Author) |
| 2026-08-25 | Changed paid article free preview from paragraphs to 100 words in admin CMS and reader view |
| 2026-08-27 | Migrated entries CMS from localStorage to Supabase with automated seed script, updated home/entries/entry/admin pages, and committed/pushed to GitHub |
| 2026-08-27 | Implemented secure cross-browser paywall: full_body column in Supabase, /api/get-content serverless endpoint, sessionStorage content cache, invoice re-verification on refresh |
| 2026-08-27 | Post-launch fixes: corrected sitemap slugs, changed the admin password (value removed 2026-09-19; not recorded here), verified og:image asset, added CSP security header to vercel.json |
| 2026-08-27 | Fixed free article paywall bug (Musings reset to price 0), added paywall warning banner to admin price field |
| 2026-08-27 | Untracked confidential proposal files from git and added to .gitignore; moved admin password authentication to secure /api/admin-auth serverless endpoint |
| 2026-08-27 | Created comments table in Supabase and built live cloud-synced comments system on all entry pages |
| 2026-09-14 | Added subtle Kasuku Studio footer credit link and deployed to production on main; moved unreleased Daraja M-Pesa migration to feature/daraja-mpesa branch |
| 2026-09-19 | Added `DECISIONS_LOG.md` and a `CLAUDE.md` pointer; removed a credential that had been written into this file; corrected the project path and stale open items; prepared branch `security/remove-admin-password-fallback` (not merged) |
