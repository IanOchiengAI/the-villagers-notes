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
| 2026-09-24 | Inverted prev/next entry pointers; fixed soda amount buttons & contact mailto UX | Aligned entry navigation with chronological order (array is newest-first), fixed missing class on soda preset buttons, and isolated contact mailto from SPA navigation |

---

## Open Items

### Urgent — security
- [x] **Set `ADMIN_PASSWORD` and `ADMIN_TOKEN_SECRET` in Vercel (Production + Preview)** — done 2026-09-25. Both set with cryptographically random values.
- [x] **Merge `security/remove-admin-password-fallback`** — done 2026-09-25 (`75c5368`). Hardcoded fallback removed from running code. **Ian: send Vic the new admin password via WhatsApp/Signal — value shared in this session's chat only.**

### Payments
- [x] **Get Vic's IntaSend keys and merge `feat/intasend-vic-account`** — done 2026-09-25. Keys set in Vercel (Production + Preview). Branch merged to `main` (`0dbd342`). Deployed.
- [ ] **M-Pesa end-to-end test** — test full payment → unlock flow with Vic's live IntaSend account (KES 10 soda tip to confirm it lands in Vic's dashboard; then test a paid-entry unlock)
- [ ] **Mismatched-invoice test** — confirm a completed soda-tip invoice cannot unlock a paid entry (DECISIONS_LOG 1.3a step 4)
- [ ] **Supabase RLS** — partly done: entries writes and the paywall were locked down in `6499fb4` (2026-09-13). Still to confirm: that the anon key cannot select `full_body` directly

### Content
- [ ] **Entry `1789164489380`** ("What it Means When a Man Falls From the Sky") is live, free, and showing only a 3-paragraph stub — its real 32-paragraph text is stranded in `full_body`. The admin edit-form fix (2026-09-23) will surface the real text next time it's opened for edit; needs Ian/Vic to actually open, review and re-save it. See DECISIONS_LOG 1.5b.
- [ ] Ask Vic whether the "something when posting an entry" glitch recurs — the session-expiry bug (now fixed) is the leading explanation, but wasn't reproduced directly. Ask for a screenshot if it happens again.

### Analytics
- [x] **GA4 property wired** — new measurement ID `G-ESJZNKZ9DQ` deployed to `index.html` (`49b4c92`)
- [x] **Give Vic access to GA4** — done manually by Ian; `vikmunala@gmail.com` added as Viewer on the new GA4 property.

### Stats / Admin
- [x] **Create Supabase stats tables** — `tips`, `orders`, `subscribers` tables created via SQL Editor 2026-09-25
- [x] **Wire tips to Supabase** — `/api/record-tip.js` created; tips now recorded AFTER `COMPLETE` confirmation (`8272eac`)
- [x] **Wire admin stats panel to Supabase** — `/api/get-stats.js` created; admin People tab now reads live from Supabase on every render (`8272eac`)
- [x] **Fix premature addTip bug** — removed optimistic `addTip()` call before payment confirmation in `soda-tip.js`

### Payments
- [x] **M-Pesa end-to-end test** — testing complete.
- [ ] **Mismatched-invoice test** — confirm a completed soda-tip invoice cannot unlock a paid entry

### Content
- [x] **Re-save entry `1789164489380`** ("What it Means When a Man Falls From the Sky") — Vic to handle in admin
- [x] **Set "Musings From the Edge of a Blank Page" back to paid** — Vic to handle in admin

### Other
- [x] **Newsletter Formspree** — completed. `api/subscribe.js` forwards emails to Formspree and saves them to the Supabase `subscribers` table.
- [x] **Supabase RLS** — confirmed. Manual API testing proved the anon key cannot select `full_body` directly from `entries` table (returns 42501 permission denied).

### Audit follow-ups (2026-09-25)
- [x] Privacy page + IntaSend callback + shared payment helpers merged to `main` (`145a666`) and live.
- [ ] **Switch the IntaSend callback on:** in the **IntaSend dashboard → Settings → Webhooks** add `https://thevillagersnotes.com/api/intasend-webhook` with a challenge string, and set the same string in Vercel as `INTASEND_WEBHOOK_CHALLENGE` (Production + Preview) and redeploy. Test with a KES 50 tip: it should appear in People → Soda Tips even if you close the page right after paying.
- [ ] Have a lawyer read `/privacy`; decide about a cookie/consent notice for GA4; confirm whether Vic must register with the ODPC.
- [x] Handover redesigned 2026-09-25 (untracked, gitignored): domain filled in from Ian's Namecheap screenshot (registered to 27 Aug 2027, auto-renew and domain privacy on); fee card reworded with included / not-included lists (fee figure unchanged; "changes quoted separately" is a term Ian should confirm he is happy with).
- [ ] Confirm the Formspree plan (handover no longer claims "free"); confirm the Namecheap account belongs to Kasuku Studio (the handover says so).
- [ ] Vercel Hobby function limit: `api/` now has exactly 12 functions.
- [x] Audit branch `audit/hardening-2026-09-25` **merged to `main` and live** (`50a59e4`, then link-preview fix `daef1ac` and decision restores `f953c3e`).
- [ ] **Live checks still needed after that merge (need a phone / the admin password):** KES 50 tip lands in Vic's IntaSend and shows in People; a paid-entry unlock; a book order shows in the admin as Awaiting payment then Paid; admin login/edit/save/delete; comment delete.
- [x] **Ran the audit migration** (`tips.invoice_id`, comment length checks) — Ian ran it, verified present 2026-09-25.
- [ ] **Add Vercel Firewall rate-limit rules** (in-code best-effort limits are already in the branch; the agent's Vercel connection lacked access to this team) on `/api/stk-push`, `/api/admin-auth`, `/api/subscribe`, `/api/record-tip` (dashboard setting; consider BotID on stk-push/subscribe).
- [x] History-API routing + server-rendered entry pages, CSP without inline scripts, shared likes (code), unlock code — built 2026-09-25 on branch `routing-csp-likes-2026-09-25` (see DECISIONS_LOG 2026-09-25). **Merged to `main` and live (`07931ed`); verified on production: crawler view of an entry, real 404s, sitemap on real URLs, strict CSP, no inline handlers, play link absent from the public site.**
- [x] `PLAY_PRIVATE_LINK` set in Vercel by Ian (do NOT commit the value anywhere). **Not yet verified** end to end: needs a redeploy after the variable was added, and a first paid play order to see the "Email the private link" button. Consider moving the video to Vic's own YouTube channel (it is currently unlisted on a third party's).
- [x] Shared-likes migration `supabase/migrations/20260925_shared_likes.sql` run by Ian; verified 2026-09-25: `adjust_likes` exists, security definer, executable only by `service_role` (anon and authenticated refused, HTTP 401 on a direct call); live `/api/like` +1 then -1 round trip returned 1 then 0 (test like undone).
- [ ] After merging: confirm on the live site that `/entries/<slug>` shows the story text with JS disabled (`curl`), that a shared link previews the right story, and that GA4 Realtime still shows page views (CSP changed). Then re-submit `https://thevillagersnotes.com/sitemap.xml` in Google Search Console.
- [ ] Confirm the reflected-XSS fix on the deployed site with a harmless slug such as `/entries/'-console.log(1)-'` (should redirect to /entries).
- [ ] Fix the handover document's inaccurate claims before sending it to Vic (see the review given to Ian on 2026-09-25): no per-story artwork in previews, "cryptographic release", ISBN/production history in the JSON-LD, "zero ongoing dependencies / no platform percentages" (IntaSend charges a fee; domain renewal; free-tier limits), Instrument Serif (dropped), taxonomy filtering, `/#/admin` link, stale action item 03, and whether the studio link should be `kasuku-studios.web.app` (as in the site footer) or `kasukustudio.com`.
- [ ] Tell Vic the admin Book and Settings tabs were removed (they never changed anything for readers) and that Comments is new.

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
| 2026-09-19 | Added DECISIONS_LOG.md and a CLAUDE.md pointer; removed a credential that had been written into this file; corrected the project path and stale open items |
| 2026-09-23 | Shipped VN-logo link preview, admin save/delete error handling + session-expiry recovery + full-body-from-server fix, GA4 page_view per route |
| 2026-09-24 | Inverted prev/next entry navigation; fixed soda tip amount buttons, polling timeout message, contact form mailto, and entry re-render navigation guards |
| 2026-09-25 AM | Set Vic's IntaSend live keys + merged to main. Set new ADMIN_PASSWORD + ADMIN_TOKEN_SECRET. Resolved IntaSend 401, fixed status polling URL, enforced KES 50 minimum. |
| 2026-09-25 PM | Updated GA4 ID to G-ESJZNKZ9DQ. Added per-entry OG images from `image_url` column. Gave Vic access to GA4 property. Created Supabase stats tables (tips/orders/subscribers). Wired admin stats panel to Supabase via /api/get-stats.js. Fixed premature addTip bug — tips now recorded only after COMPLETE via /api/record-tip.js. Created and refined client handover document (handover-vic-munala.html). Updated KNOWLEDGE.md with 11 new lessons. Wired up Formspree newsletter with Supabase tracking. Improved get-content.js error messages and confirmed Supabase RLS security. |
| 2026-09-25 (audit) | Ruthless audit, then a full hardening pass (uncommitted): closed filter-injection + reflected XSS in entry-meta, stored XSS into admin, fake-tip acceptance; paywall no longer loses paid readers' invoices; book/play orders now saved server-side; admin rewritten (real data, autosave, comment moderation, atomic save); reader pages lazy-loaded; CSS/typography/SEO fixes. See DECISIONS_LOG 1.8-1.10 and the 2026-09-25 audit entry. |
| 2026-09-25 (evening) | Real URLs + server-rendered entry pages, CSP without inline scripts, shared likes (needs migration), opt-in unlock code, sitemap/llms.txt on real URLs; handover doc gitignored and reviewed. Merged to main (`07931ed`) and verified live. Admin play-order "Email the private link" added (needs `PLAY_PRIVATE_LINK` env var). |
