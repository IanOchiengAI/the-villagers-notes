# Project State — The Villagers' Notes (Vic Munala)

> Created: 2026-08-24
> Project folder: `F:\Work\Brands\Vik\`

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

---

## Open Items

### Phase 2 (next session)
- [ ] **Newsletter emails** — set up Formspree (free), add `FORMSPREE_FORM_ID` to Vercel env vars
- [ ] **M-Pesa end-to-end test** — test full payment → unlock flow once Vic has a paid article ready
- [ ] **Supabase RLS** — run SQL to prevent anon key from selecting `full_body` directly (belt-and-suspenders security)
- [ ] **Subscribers in Supabase** — newsletter subscribers currently stored in localStorage only; add `subscribers` table to Supabase
- [ ] **Orders in Supabase** — book orders currently stored in localStorage only; add `orders` table to Supabase
- [ ] **Admin auth** — replace hardcoded password with Supabase Auth (magic link or email/password)
- [ ] **Connect custom domain `thevillagersnotes.com` in Vercel** — DNS already added, just needs Vercel domain verification to complete

---

## Session Log

| Date | What Was Done |
|------|---------------|
| 2026-08-24 | Redesigned comments section to match reference image with custom font, underline name field, box textarea, live character counter, and outline button |
| 2026-08-24 | Formatted single entry header with ← ENTRIES back link and uppercase metadata (Category · Date · Read Time · Author) |
| 2026-08-25 | Changed paid article free preview from paragraphs to 100 words in admin CMS and reader view |
| 2026-08-27 | Migrated entries CMS from localStorage to Supabase with automated seed script, updated home/entries/entry/admin pages, and committed/pushed to GitHub |
| 2026-08-27 | Implemented secure cross-browser paywall: full_body column in Supabase, /api/get-content serverless endpoint, sessionStorage content cache, invoice re-verification on refresh |
| 2026-08-27 | Post-launch fixes: corrected sitemap slugs, updated admin password to Villager@2026!, verified og:image asset, added CSP security header to vercel.json |
| 2026-08-27 | Fixed free article paywall bug (Musings reset to price 0), added paywall warning banner to admin price field |
| 2026-08-27 | Untracked confidential proposal files from git and added to .gitignore; moved admin password authentication to secure /api/admin-auth serverless endpoint |
| 2026-08-27 | Created comments table in Supabase and built live cloud-synced comments system on all entry pages |
