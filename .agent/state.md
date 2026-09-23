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
| 2026-09-23 | Prepared IntaSend account move to Vic's own account on branch `feat/intasend-vic-account` (`8ae0526`), held unmerged | Removes the hardcoded IntaSend key, requires env vars, and binds a paid-entry unlock to the specific entry + amount (closes a hole where any completed invoice, e.g. a KES 10 tip, could unlock any paid article). Waiting on Vic's IntaSend signup + keys before merging |
| 2026-09-23 | Switched link-preview image from the UTMT book cover to the VN logo | Vic's request; composited `public/images/og-vn.png` (1200×630) from `VN Logo.png` |
| 2026-09-23 | Admin save/delete now show real errors and recover from an expired session | Root cause of "delete won't work": the 12h write-token expiry was invisible to the client, which never logged itself out, so writes silently 401'd |
| 2026-09-23 | Admin edit form now loads an entry's true full text from the server (`get_full_body` action) instead of a per-device localStorage cache | The old approach let an entry's real full text get silently overwritten by its ~100-word preview when edited from a different browser — found already live on one published entry |
| 2026-09-23 | Router sends its own `page_view` to GA4 on every hash-route change | The hash-routed SPA meant the automatic `gtag('config', ...)` page_view could only ever fire once per visit |

---

## Open Items

### Urgent — security
- [ ] **Set `ADMIN_PASSWORD` and `ADMIN_TOKEN_SECRET` in Vercel (Production + Preview).** Confirmed 2026-09-23 via `vercel env ls production`: neither is set. Both `api/admin-auth.js` and `api/_admin-token.js` fall back to a password hardcoded in this **public** repo (`Villager@2026!`) — anyone who reads the repo can currently log into Vic's admin. A strong random pair was generated this session and handed to Ian in chat (not stored in any file). Attempting to set them via `vercel env add` was blocked by the harness's own permission classifier (secret-store write) — this needs a human to run it, or Ian's explicit go-ahead in a session with that permission granted.
- [ ] **Merge `security/remove-admin-password-fallback`** (pushed to origin, `6f53f08`) — but only *after* the above is done, or Vic gets locked out of admin login entirely (the branch makes login fail closed with no fallback).

### Payments
- [ ] **Get Vic's IntaSend keys and merge `feat/intasend-vic-account`** (pushed to origin, `8ae0526`). See DECISIONS_LOG 1.3a for the full checklist (KYC approval, keys via private channel, env vars, live test payment, mismatched-invoice test) before merging.
- [ ] **M-Pesa end-to-end test** — test full payment → unlock flow once a paid article exists and Vic's IntaSend keys are live
- [ ] **Supabase RLS** — partly done: entries writes and the paywall were locked down in `6499fb4` (2026-09-13). Still to confirm: that the anon key cannot select `full_body` directly

### Content
- [ ] **Entry `1789164489380`** ("What it Means When a Man Falls From the Sky") is live, free, and showing only a 3-paragraph stub — its real 32-paragraph text is stranded in `full_body`. The admin edit-form fix (2026-09-23) will surface the real text next time it's opened for edit; needs Ian/Vic to actually open, review and re-save it. See DECISIONS_LOG 1.5b.
- [ ] Ask Vic whether the "something when posting an entry" glitch recurs — the session-expiry bug (now fixed) is the leading explanation, but wasn't reproduced directly. Ask for a screenshot if it happens again.

### Analytics
- [ ] **Confirm GA4 hits are actually landing** (GA4 → Reports → Realtime) now that the router sends page_view on every navigation. Could not confirm this from the test browser (see DECISIONS_LOG Section 3 — likely that browser's own tracker-blocking, not a site issue).
- [ ] **Give Vic access to the GA4 property** (`G-8YH7V59JKQ`) — GA Admin → Property access management → add his Google account, Viewer or Admin.

### Other
- [ ] **Newsletter emails** — set up Formspree (free), add `FORMSPREE_FORM_ID` to Vercel env vars
- [ ] **Subscribers in Supabase** — newsletter subscribers currently stored in localStorage only; add `subscribers` table to Supabase
- [ ] **Orders in Supabase** — book orders currently stored in localStorage only; add `orders` table to Supabase
- [ ] **Admin auth** — still open beyond the password fix above: move to real Supabase Auth instead of a shared password
- [ ] **Per-entry link previews** — needs path-based routing + a bot-facing OG endpoint; the hash-routed site can currently only show one static preview image for every shared link. Worth quoting as a follow-up.
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
| 2026-09-23 | Answered Vic's feedback + Ian's IntaSend-account request. Shipped to `main`: VN-logo link preview (`0e6e99c`), admin save/delete error handling + session-expiry recovery + full-body-from-server fix (`d0566cb`), GA4 page_view per route (`d63f2d7`). Prepared but held unmerged pending external inputs: `feat/intasend-vic-account` (`8ae0526`, needs Vic's IntaSend keys) and `security/remove-admin-password-fallback` (`6f53f08`, pushed this session, needs `ADMIN_PASSWORD`/`ADMIN_TOKEN_SECRET` set first). Found live: `ADMIN_PASSWORD` unset in Vercel (public-repo password is the real admin password right now) and one live free entry showing a truncated stub instead of its real text. Rewrote `MPESA_SETUP_GUIDE.md` for IntaSend and removed Vic's phone number from it. Did not widen the CSP for GA as originally planned — tested and found it wasn't the actual blocker. |
