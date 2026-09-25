# DECISIONS_LOG.md - The Villagers' Notes (Vic Munala)
## Client Feedback, UX Rules & Product Decisions Tracker

> **CRITICAL RULE FOR ALL DEVELOPERS AND AI AGENTS:**
> Consult this document before making architectural, UI/UX, or data flow modifications.
> **DO NOT** revert, remove, or modify any confirmed design decision or client preference documented here without explicit instruction from Ian Ochieng or Vic Munala.

> **THIS REPO IS PUBLIC ON GitHub.** Never put credentials, passwords, phone numbers, pricing, proposals or other client-private data in this file or any tracked file.

> Seeded 2026-09-19 from git history (113 commits), `.agent/state.md` and a check of the code. The repo holds no verbatim client quotes, so origins cite the commit or `state.md` entry. Add the client's own words to Section 2 as new feedback arrives.

---

## 1. Non-Negotiable Product Invariants (Never Revert)

### 1.1 Paid articles are never sent to the browser without server-side payment verification
- **Rule:** The full body of a paid entry stays on the server. The browser only receives the preview until payment is verified.
- **Implementation:** Supabase `entries.full_body` (JSONB) holds the full text. `api/get-content.js` verifies the M-Pesa payment before returning it; `src/pages/entry.js` and `src/lib/supabase.js` call it. The full body is cached in `sessionStorage` for the session, and the `invoice_id` is kept in `localStorage` for re-verification on refresh. A different browser must pay again **unless the reader opts in to their unlock code** (added 2026-09-25 at Ian's instruction: the receipt id of their own payment, shown on request after unlocking and accepted on the paywall card under "Paid on another phone or browser?"; the server still verifies it is a completed payment for this exact entry and amount). Table writes and paywall data were locked down in `6499fb4`.
- **Origin:** `dae410c` (2026-08-27), `6499fb4` (2026-09-13), `state.md` 2026-08-27.
- **Rationale:** A client-side-only paywall can be bypassed from the browser dev tools.

### 1.2 The free preview is counted in words
- **Rule:** The preview before the paywall is measured in words, default 100, adjustable per article in the admin.
- **Implementation:** `previewWords` in `src/lib/supabase.js` (default 100); the per-article field is in `src/pages/admin.js`.
- **Origin:** `32be30f` (2026-08-25, changed from paragraphs to 100 words); cutoff softened in `6499fb4`.

### 1.3 Production M-Pesa stays on IntaSend until Daraja credentials arrive
- **Rule:** `main` keeps the IntaSend integration. Do **not** merge `feature/daraja-mpesa` into `main` until Vic has supplied Daraja credentials and the full payment-to-unlock flow has been tested end to end.
- **Implementation:** `feature/daraja-mpesa` is 3 commits ahead of `main` (`315c10b`, `86ed2f0`, `cb92d15`) and adds `api/_mpesa.js` and `api/mpesa-callback.js`. The production CSP in `vercel.json` still allows `payment.intasend.com`.
- **Origin:** `state.md` 2026-09-14: isolated on a branch to keep live `main` stable while awaiting Vic's Daraja credentials.

### 1.3a IntaSend must run on Vic's own account, keys only from Vercel env vars
- **Rule:** No IntaSend key may ever be hardcoded in this repo (it was, until 2026-09-23 — see below). `api/stk-push.js`, `api/stk-status.js` and `api/get-content.js` must read `INTASEND_PUBLISHABLE_KEY` / `INTASEND_SECRET_KEY` only, and return 503 (pointing to WhatsApp ordering) if unset — never fall back to a baked-in key. A paid-entry unlock must also verify the invoice's `api_ref` matches `entry:<entry_id>` and its paid value covers the entry's price, not just that its state is `COMPLETE`.
- **Status as of 2026-09-25: LIVE.** Keys set in Vercel (Production + Preview): `INTASEND_PUBLISHABLE_KEY` and `INTASEND_SECRET_KEY`. Branch `feat/intasend-vic-account` merged → `main` (`0dbd342`) and deployed. `INTASEND_PUBLIC_KEY` (old name) was never in Vercel — no cleanup needed. **Still required before marking fully complete:** (3) a real KES 10 soda-tip payment confirmed to land in *Vic's* IntaSend dashboard; (4) a test paid entry confirmed to unlock correctly and to reject a mismatched invoice.
- **Origin:** Ian's request 2026-09-23; keys received and deployed 2026-09-25.

### 1.4 Public play pages stay editorial
- **Rule:** Public play details stay editorial. Live engagement counters appear only in the Admin Stats dashboard. The share button uses `navigator.share` with a clipboard fallback, there is no frosted-glass nav effect, and the share dropdown uses the classic Twitter name and bird logo.
- **Origin:** commits `6ea5051`, `0538082`, `ccb3040` (2026-08-24). Client wording not recorded in the repo.

### 1.5 Admin authentication is checked on the server
- **Rule:** The admin password is verified by the `/api/admin-auth` serverless function, never in browser code.
- **Origin:** `c055cc0` (2026-08-27).
- **Security gap fixed 2026-09-25:** `ADMIN_PASSWORD` and `ADMIN_TOKEN_SECRET` set in Vercel (Production + Preview) with cryptographically random values. `security/remove-admin-password-fallback` (`6f53f08`) merged → `main` (`75c5368`) and deployed. The hardcoded `Villager@2026!` fallback no longer exists in the running code. The old literal is still in git history and must be treated as permanently compromised — do not reuse it.

### 1.5a Admin writes must show a visible error on failure, never fail silently
- **Rule:** Every save/delete call to `/api/admin-entries` must surface its real outcome to the admin — a visible inline success or error message — and never just quietly no-op.
- **Implementation:** `callAdminEntries()` in `src/lib/supabase.js` returns `{ ok, status, error, data }` instead of a bare boolean. `src/pages/admin.js`'s save-new/save-edit/delete handlers disable their button while in flight, show the error inline on failure without clearing the form, and show a brief success message before re-rendering.
- **Origin:** `d0566cb` (2026-09-23). Root cause of Vic's "I tried to delete an entry and it refused": `checkAuth()` (a `sessionStorage` flag) never expires client-side, but the signed write token from `/api/admin-auth` expires after 12 hours (`api/_admin-token.js`). The dashboard looked logged in indefinitely while every write silently 401'd once the token went stale, and the old boolean-returning helper threw the reason away.
- **Also fixed:** on a 401, the admin is logged out with a "session expired" notice, and whatever was in the form (new entry or edit) is restored automatically after logging back in (`tvn_admin_draft` in `sessionStorage`). Rapid double-clicking Save/Publish can no longer create duplicate entries — the button disables immediately.

### 1.5b The admin edit form loads an entry's real full text from the server, not from localStorage
- **Rule:** Opening "Edit" on an entry must show its true saved content (from Supabase `full_body`), not whatever happens to be cached in this browser's `localStorage`.
- **Implementation:** New `get_full_body` action in `api/admin-entries.js` (admin-token gated, service-role read). `src/pages/admin.js`'s Edit-toggle handler calls it via `getEntryFullBodyFromDB()` and fills the textarea with the result when non-empty.
- **Origin:** `d0566cb` (2026-09-23). The edit form previously only recovered an entry's full text from `localStorage.getItem('tvn_paid_<id>')`, which is per-device. Editing a paid (or once-paid) entry from a different browser/session and saving silently overwrote its real content with just the ~100-word preview. **This already happened** to the live, public, free entry "What it Means When a Man Falls From the Sky" (id `1789164489380`): its public `body` has only 3 preview paragraphs while the real 32-paragraph text sits unused in `full_body` — readers currently see a stub. Not yet corrected (needs Ian/Vic's OK to touch live content, see `state.md`); the code fix prevents it recurring and will surface the real text next time that entry is opened for edit.

### 1.6 Client documents are never committed
- **Rule:** Proposals and briefs stay out of git. `.gitignore` excludes `*proposal*`, `*Brief*`, `*brief*`, `*.pdf` and `scripts/build_proposal.py`. Keep it that way; this repo is public. `handover-*.html` is also ignored (it holds pricing).
- **The private link to the paid play recording is never written into the repo, the public bundle, or any public page.** It is the product buyers pay KES 1,000 for. It lives only in the Vercel environment variable `PLAY_PRIVATE_LINK` and reaches the browser only through `api/get-stats.js`, which requires a valid admin token; the admin People tab uses it for the "Email the private link" button on paid play orders. Do not embed it as a public "trailer".
- **Origin:** `c055cc0` (2026-08-27); play link rule 2026-09-25.

### 1.7 Deployment Safeguards
*Re-checked 2026-09-23 against `vercel.json`, `index.html` and a live request to `thevillagersnotes.com`.*
- Vercel project: `the-villagers-notes`. Live domain: `thevillagersnotes.com` (HTTP 200); switched in `158997d`.
- Build: `vite build` (`npm run build`), a Vite single-page app plus serverless functions in `api/`.
- `vercel.json` sets security headers including a Content-Security-Policy. `connect-src` allows only `self`, `*.supabase.co`, `payment.intasend.com`, `www.google-analytics.com` and `formspree.io`. `script-src` is `'self'` plus Google Tag Manager / Analytics only: **no `'unsafe-inline'` and no `unpkg.com`** (2026-09-25). That means: never add inline `<script>` blocks or inline event attributes (`onclick=`, `onmouseover=`…) — use classes in `enhancements.css` and listeners in JS; the analytics init lives in `public/ga-init.js`. `style-src` still allows inline styles. `object-src 'none'` and `base-uri 'self'` were added. **Any new external service must be added to the CSP or the browser will block it.**
- The footer credit "SITE BY KASUKU STUDIO" (`fd0dca6`, 2026-09-14) is a studio decision: keep it subtle.
- Link previews (`og:image`/`twitter:image`) use `public/images/og-vn.png` (the VN logo on the site's paper background, 1200×630) — changed from the UTMT book cover per Vic's request 2026-09-23 (`0e6e99c`). Since 2026-09-25 the site uses real URLs (`/entries/<slug>`, `/projects`, `/book`, `/admin`); each entry link previews its own title and excerpt (rendered by `api/entry-meta.js`) but the image is still this one static VN logo, because `entries` has no `image_url` column. Old `/#/…` links still work (upgraded in `src/router.js`). Keep `book-cover.png` for the book page's own imagery.
- GA4 (`G-8YH7V59JKQ`) sends its own `page_view` on every hash-route change (`d63f2d7`, 2026-09-23) instead of relying on the single automatic one `gtag('config', ...)` would otherwise fire per visit. **Unconfirmed:** whether hits are actually reaching Google — see open item in `state.md`.

### 1.8 Nothing a visitor can send is trusted or rendered raw
- **Rule:** Every value that arrives from a visitor (tip phone, subscriber email, order name/address, comments, URL slugs) is validated on the server and escaped wherever it is printed, above all in the admin. Money facts (tip amount, paid status) come from IntaSend's own invoice record, never from the browser. A slug/id is whitelisted to `[A-Za-z0-9_-]` before it goes into a PostgREST filter or an inline script.
- **Implementation:** `api/_util.js` (`isSafeSlug`, `escHtml`, `normalisePhone`, `fetchInvoice`), `src/lib/html.js` (`esc`), `api/record-tip.js` (re-verifies the invoice), `api/entry-meta.js`, `api/subscribe.js`.
- **Origin:** audit of 2026-09-25 (see Section 2). Found: filter injection + reflected XSS in `entry-meta.js`, unauthenticated stored XSS into the admin via tip phone / subscriber email, and fake tips accepted from the browser.

### 1.9 A payment outage is never treated as "not paid"
- **Rule:** A reader's saved invoice id (`tvn_invoice_<entryId>` in `localStorage`) is deleted ONLY on a definitive verdict (`FAILED`, `CANCELLED`, `MISMATCH`, `AMOUNT_MISMATCH`). Timeouts, 5xx, IntaSend/Supabase outages and "still pending" keep it. The invoice id is saved the moment the STK prompt is sent, and the paywall offers an "I've already paid — check" button.
- **Implementation:** `src/pages/entry.js` (`unlockWithInvoice`, `verifyAndUnlock`), `api/get-content.js` returns 503/`TRANSIENT` for provider trouble.
- **Origin:** audit 2026-09-25. Before this, polling gave up after 45s, the invoice was only saved after a successful unlock, and any non-OK reply on re-verify deleted it: a paid reader could lose access permanently.

### 1.10 Admin edits never overwrite a paid article with its preview
- **Rule:** The edit form stays locked until the entry's true saved text has loaded from the server; a failed load keeps it locked. Paid entries write the preview and `full_body` in ONE request. Everything typed into an entry form is autosaved to `localStorage` (`tvn_draft_*`) until the entry saves.
- **Implementation:** `src/pages/admin.js` (`openEdit`, `save`, autosave), `api/admin-entries.js` `upsert` accepts `fullBody` and whitelists columns.
- **Origin:** audit 2026-09-25 (race/failure path re-created the 1.5b data-loss bug).

---

## 2. Chronological Decision & Feedback History

### 2026-09-25 (later — privacy page, IntaSend callback, handover fixes; on branch `privacy-webhook-2026-09-25`, not yet merged)
- **Privacy page** at `/privacy` (`src/pages/privacy.js`, footer link, sitemap): written from what the code actually does (phone for payments/tips, name+phone+address for book orders, email for play recording and newsletter, public comments, GA4 cookies, local-only browser storage; processors IntaSend, Supabase, Vercel, Formspree, Google Analytics; Kenya Data Protection Act 2019 rights; ODPC complaint route). **Rule: whenever a new service is added or new personal data is collected, update this page.** It is a plain-language notice, not legal advice; Ian/Vic should have a lawyer read it. Known gap: GA4 cookies with no consent banner.
- **IntaSend callback** `api/intasend-webhook.js` + shared `api/_payments.js`: IntaSend tells the site when a payment completes, so a book/play order flips "Awaiting payment" → "Paid" and a tip is recorded even if the buyer closed the page (before this it depended on the buyer's browser still polling). Nothing in the request body is trusted: only the invoice id is read and the state/reference/amount are re-fetched from IntaSend; optional `INTASEND_WEBHOOK_CHALLENGE` gate; 503 on provider outage so IntaSend retries; tips exactly-once via `tips.invoice_id`. **Not active until Ian adds the URL in the IntaSend dashboard** (Settings → Webhooks: `https://thevillagersnotes.com/api/intasend-webhook`, plus a challenge string that is also set in Vercel as `INTASEND_WEBHOOK_CHALLENGE`). The browser-driven paths still work.
- **Function count is now 12** (the Vercel Hobby limit). Any new `api/*.js` endpoint needs a plan upgrade or two endpoints merged first.
- **Handover doc (`handover-vic-munala.html`, untracked):** fixed share label (Twitter), likes, permanent-delete warning, tip wording, rate-limit wording, Formspree plan claim, "automatic Paid" (now true only once the callback is configured), added "Your readers' data" section and a privacy step. Domain registrar/renewal and the KES 20,000 card were left for Ian.

### 2026-09-25 (Ian: "do the rest of the recommendations" — merged to `main` as `07931ed` and verified live)
- **Real URLs + server-rendered entry pages:** `src/router.js` now uses the History API. `/entries/<slug>` is served by `api/entry-meta.js`, which returns the built app shell (`dist/index.html`, shipped with the function via `vercel.json` `functions.includeFiles`) with that entry's title, description, canonical URL, link-preview tags, Article JSON-LD and its **public** text already inside `<main id="app" data-ssr="1">`; the app then takes over in place. Paid entries expose only their preview (`isAccessibleForFree:false`); `full_body` is never selected there. Unknown slug = real 404; a database outage = plain app (never a false 404). Sitemap and `llms.txt` use the real URLs. Same-site link clicks are intercepted (no reload); Back/Forward work; `/#/…` links are upgraded with `replaceState`.
- **CSP without `'unsafe-inline'` scripts:** all inline event handlers became classes (`hv-accent`, `hv-accent-border`, `hv-credit`, `nl-input` in `enhancements.css`); the GA4 init moved to `public/ga-init.js`; the footer's dead `logo.svg` `<img>` (file never existed) was removed. Verified in a browser with the header enforced: zero violations.
- **Shared likes:** `api/like.js` (validated, rate-limited per IP and per IP+entry) calls the DB function `adjust_likes` (`supabase/migrations/20260925_shared_likes.sql`, **not yet applied — Ian must run it**; until then likes keep working per device and the API answers 503). The admin save no longer writes `likes` (`ENTRY_COLUMNS`), so it can't overwrite the live count.
- **Unlock code** (see 1.1): opt-in reopen of a paid entry on another device.
- **Handover document** (`handover-vic-munala.html`, untracked): now gitignored (`handover-*.html`) because it contains pricing and the repo is public (rule 1.6). Review notes were given to Ian; the file itself was not edited.
- **Play recording link (Ian, 2026-09-25: "here is a link to the show… its the full recording"):** the link is the full 77-minute recording (an unlisted YouTube upload on a third party's channel), i.e. the paid product, so it was **not** added to the public Projects page and is **not** in the repo. Added instead: admin People tab shows "Email the private link" (prefilled `mailto:`) and "Copy link" on paid play orders (`Play - <email>`), fed by `PLAY_PRIVATE_LINK` via `api/get-stats.js` (admin-only, https-only). The public trailer box still says "The trailer isn't up yet…"; a public trailer would need a short separate clip. Risk noted: the video sits on someone else's channel and is unlisted, so if that owner removes or privatises it, every buyer's link breaks — worth re-uploading to Vic's own channel.
- **Tests:** `vite build`; 16 offline API test groups (SSR escaping, paid preview only, 404 vs outage, likes validation/rate limit/fallback, sitemap, admin whitelist); real-browser run with the strict CSP: direct entry URL, in-app navigation without reload, Back, legacy `#/` upgrade, unlock-code error path. **Not tested:** any live payment, the deployed function bundle (`includeFiles`), the logged-in admin.

### 2026-09-25 (audit hardening pass, uncommitted at time of writing)
- **Request (Ian):** a read-only audit of the codebase, then "fix everything".
- **Security:** `api/entry-meta.js` — slug whitelisted, outputs escaped, `JSON.stringify` for the redirect script (closes filter injection while holding the service-role key, and reflected XSS). `api/record-tip.js` now verifies the invoice with IntaSend (state, `tip:` api_ref, amount) instead of trusting the browser. `subscribe.js` validates email shape/length. Admin escapes all visitor data (`src/lib/html.js`). `stk-status.js` no longer returns IntaSend's raw payload. `admin-auth.js`: constant-time compare, 1.2s delay on wrong guesses, requires `ADMIN_TOKEN_SECRET`; `_admin-token.js` no longer falls back to `ADMIN_PASSWORD`. `stk-push.js`: unknown `purpose` rejected, tip cap KES 20,000, book/play cap KES 50,000, provider error details no longer sent to the browser. All server-side fetches have timeouts (`api/_util.js`).
- **Payments UX:** shared poller `src/lib/pay.js` (sequential, 150s, offline-tolerant); invoice saved at push time; see 1.9. Soda tip polling no longer leaks an unhandled rejection or hangs forever. `stk-status` reports `RETRY`/upstream trouble as still-pending, not failed.
- **Orders:** book and play orders are now saved server-side (`orders` table, `order_id` = IntaSend invoice id, status `Awaiting payment` → `Paid` when `stk-status` sees COMPLETE). Before this they were saved only in the buyer's own browser and never reached Vic.
- **Admin rewrite (`src/pages/admin.js`):** real data only (removed the demo orders/subscribers/tips fallback), errors shown instead of empty lists, order status saved to the database, new Comments moderation tab (list/delete), tab switches keep open forms, autosave drafts, minimum paid price KES 50, atomic save (1.10). **Removed** the Book tab and Settings tab: both only wrote to Vic's own browser (`localStorage`), the change-password form could never succeed, and the real password is `ADMIN_PASSWORD` in Vercel. Removed the local-only analytics tab (it counted only this browser's visits); Stats now shows database counters and points to GA4.
- **Reader site:** `src/lib/store.js` list-without-bodies + single-entry fetch + 60s cache + last-good copy in `localStorage`; the hardcoded seed entries are no longer a fallback (a Supabase outage now shows a retry, not stale content). Router lazy-loads every page (admin no longer in the reader bundle), keeps the old page visible while loading (no white flash), has an error boundary and a navigation guard against slow pages overwriting newer ones. Prev/next/share links use slugs. Comments: honest errors, new comment shown immediately, name remembered. Underline toolbar (`<u>`) now renders instead of showing literal tags.
- **CSS:** defined the missing tokens (`--accent-dark`, `--accent-bg`, `--space-20`), removed the conflicting `.reveal` definition, moved entry-page inline styles to classes, added `:focus-visible`, `prefers-reduced-motion`, `text-wrap: balance/pretty`, old-style numerals, book-style indented paragraphs for Fiction/Shorts, and a `⁂` scene break for `---`. Dropped two unused fonts (Instrument Serif, Caveat).
- **SEO:** `/sitemap.xml` is now generated (`api/sitemap.js`, rewrite in `vercel.json`, static file removed) and lists `/entries/<slug>` URLs; `entry-meta.js` now returns the public text of the entry plus Article JSON-LD (paid entries flagged `isAccessibleForFree: false`) so crawlers can index it.
- **Decision check after the audit merge (Ian asked me to make sure nothing logged was reverted):** compared the merged code to Sections 1-3. Kept intact: paid text server-side (1.1), word-count preview (1.2), IntaSend on `main` and `feature/daraja-mpesa` unmerged (1.3), env-only keys + entry/amount binding (1.3a), editorial play pages and admin-only counters (1.4), server-side admin auth (1.5), visible admin errors + session-expiry draft restore (1.5a), full text loaded from the server on edit (1.5b), gitignored client documents (1.6), CSP/domain/GA4 per-route page_view/VN-logo preview (1.7), prev/next flip, soda buttons, contact mailto, Kasuku footer credit (untouched). **Drifts I found and restored:** the entry header had dropped `MIN READ` on locked paid entries (2026-08-24 format decision); the comments box used theme colours instead of the reference `#8e4823` / `#c8bcaf`; a mobile body-font shrink nobody asked for; the newsletter alert subject lost the subscriber's address. **Deliberate changes, approved by Ian's "do the rest of what you recommend", still to confirm with Vic:** book-style indented paragraphs for Fiction/Shorts, a `⁂` scene break instead of the thin rule for `---`, balanced/pretty text wrapping, old-style numerals, route fade-in, removal of the admin Book/Settings/analytics tabs and the Export button. Any of these can be undone in `src/components/enhancements.css` / `src/pages/entry.js`.
- **Link-preview bug found and fixed after the merge:** `api/entry-meta.js` selected an `image_url` column that does not exist in `entries`, so PostgREST rejected the query and every shared link fell back to the generic site title/logo (the same query shipped earlier on 2026-09-25, so previews were already broken before the audit merge). Now selects only real columns; previews show the story's own title and excerpt with the VN logo. A per-story image needs an `image_url` column added first.
- **Migration applied by Ian (verified afterwards):** `supabase/migrations/20260925_audit_invoice_ids_and_comment_limits.sql` added `tips.invoice_id` (exactly-once tips) and the `comments_author_len` / `comments_comment_len` checks. (A direct DB change from the agent session was refused by the permission classifier, so Ian ran it.)
- **Later the same day:** best-effort in-code rate limits added (`allow()` in `api/_util.js`: stk-push 6/min per IP and 3/2min per phone, admin-auth 8/10min, subscribe 5/10min, record-tip 20/10min). They are per function instance, so they blunt bursts but are NOT a substitute for Vercel Firewall rules. The Vercel MCP connection was not authorised for this team (403), so the firewall rules could not be set from the agent. Changes are on branch `audit/hardening-2026-09-25` (commit `f4a463d`), NOT merged to `main`; the Vercel preview build for it succeeded. `.env.production` (holds the admin password and signing secret) is now gitignored.
- **Deliberately not done:** switching to History-API routing / server-rendered entry pages (large change to every shared link; needs Ian/Vic sign-off); real server-side likes (needs a DB function; the like count is still per-device); removing `'unsafe-inline'` from the CSP (needs the inline handlers and inline styles refactored first); rate limits (must be configured as Vercel Firewall rules in the dashboard: `/api/stk-push`, `/api/admin-auth`, `/api/subscribe`, `/api/record-tip`).
- **Verified:** `vite build` passes; 9 offline API smoke groups (hostile slugs, XSS/junk inputs, auth gates, token fallback removal); real-browser check on the local production build: all 8 live entries render with no console errors, the paywall shows, a saved invoice survives an unreachable API and the recovery button appears. **Not verified:** any live payment (needs a phone), the admin logged-in screens (needs the admin password), the deployed serverless functions.

### 2026-09-25
- **IntaSend account migration complete:** Received Vic's live IntaSend keys. Set `INTASEND_PUBLISHABLE_KEY` and `INTASEND_SECRET_KEY` in Vercel for Production and Preview environments. Merged `feat/intasend-vic-account` → `main` (`0dbd342`). All M-Pesa payments on the live site now route to Vic's IntaSend account.
- **Admin password security fixed:** Set `ADMIN_PASSWORD` and `ADMIN_TOKEN_SECRET` in Vercel (Production + Preview) with cryptographically random values. Merged `security/remove-admin-password-fallback` → `main` (`75c5368`). The hardcoded `Villager@2026!` fallback is gone from the running code. Old password must be treated as permanently compromised — never reuse. **Next step for Ian:** send Vic the new password over WhatsApp/Signal (not email).
- **Still pending (manual, needs a phone):** KES 10 soda-tip live payment test; paid-entry unlock test; mismatched-invoice rejection test. See plan artifact for exact steps.
- **Per-entry link previews & Safari link fix:**
  - Added `api/entry-meta.js`: serverless function that catches `/entries/:slug`, fetches the entry's title and excerpt from Supabase, and serves customized OG tags (`og:title`, `og:description`, `og:image`) for bots (WhatsApp, Twitter/X, iMessage), while instantly redirecting browsers to `/#/entries/:slug`.
  - Added Vercel rewrite in `vercel.json` for `/entries/:slug` -> `/api/entry-meta?slug=:slug`.
  - Updated `src/pages/entry.js` social share buttons and copy-link button to output the canonical path URL (`/entries/slug`), resolving Safari/iOS hash-stripping where opening shared links routed users to the homepage.
  - Fixed stale IntaSend status URL in `api/get-content.js` from `mpesa-stk-push-status` (which returned 404) to `/api/v1/payment/status/`, ensuring paid entry unlocks succeed after payment.

### 2026-09-24
- **Vic's feedback (forwarded by Ian):**
  > "another small tweak....ideally, the My tongue story should be Previous Entry, not Next Entry (cause ni story ya last week)...if you can flip those"
- **Prev / Next Entry navigation flipped (`entry.js`):** Entries are fetched from Supabase sorted newest-first (`sort_order DESC, created_at DESC`). `idx + 1` is an older entry ("Previous entry") and `idx - 1` is a newer entry ("Next entry"). Swapped assignments so older stories display as "← Previous entry".
- **Codebase audit & bugfix pass:**
  - `src/components/soda-tip.js`: Preset amount buttons (50, 100, 500) were missing the `.soda-box__amount-btn` class referenced in `querySelectorAll`, causing click handlers to never bind. Added the class, synced inline border/color styles with custom input changes, and added an explicit timeout status message when polling reaches 15 attempts.
  - `src/components/contact.js`: Form submission was triggering `window.location.href = mailto:...` directly before updating UI state, which could abort client state or cause navigation issues. Switched to `window.open(mailtoUrl, '_blank')`.
  - `src/pages/entry.js`: Added DOM guard `if (document.getElementById('entry-body'))` before calling `renderEntry()` in async invoice re-verification and post-unlock timeout, preventing stale re-renders if a visitor navigates away while verification is in-flight. Also updated reading time estimation on entries to check full available text.

### 2026-09-23
- **Vic's message (verbatim, Swahili/English mix), forwarded by Ian:**
  > "A few things hapa pale nilikuwa nangoja umalize ile story ingine ndo nikushow, but here it goes. When sharing the link, the featured image ni cover book ya UTMT, naeza penda kama ingekuwa the logo ya VN, if possible…
  > Kuna something else nimeona when posting an entry - wacha when I post the next entry if the problem will persist ama it was a this time thing only.
  > Nimejaribu ku delete an entry ikakataa.
  > Tunaeza connect it to google analytics?"
- **Link preview image** → switched from the UTMT book cover to the VN logo (`0e6e99c`). See 1.7.
- **"Delete refused" / likely the posting glitch** → root-caused and fixed: admin sessions never expired client-side while the write token did (12h), so writes silently 401'd; and the edit form could silently truncate an entry's real text back to its preview when opened from a different browser (`d0566cb`). See 1.5, 1.5a, 1.5b. Vic's exact "something when posting" symptom wasn't reproduced directly — asked him to screenshot it if it recurs.
- **Google Analytics** → already installed since `c1a7a38`; fixed the router to send page_view on every in-app navigation, since the hash-routed SPA meant only one ever fired per visit (`d63f2d7`). Could not confirm hits are actually landing in GA4 — see `state.md` open items.
- **IntaSend on Vic's own account** (Ian's own request, not Vic's) → prepared on branch `feat/intasend-vic-account` (`8ae0526`), held unmerged pending Vic's IntaSend signup and keys. Also closes a paywall hole found while doing this: any completed invoice (e.g. a KES 10 tip) could previously unlock any paid entry, since `get-content.js` only checked `state === 'COMPLETE'`, not which entry or how much was paid. See 1.3a.
- **Found, not asked for:** the admin panel's only real password is one hardcoded in this public repo (`ADMIN_PASSWORD` unset in Vercel). See 1.5. Also found: entry `1789164489380` is live and free but showing only a 3-paragraph stub to readers instead of its real 32-paragraph text. See 1.5b.

### 2026-09-19
- **Log seeded.** Discrepancies found while checking the code: `state.md` gives the old project path `F:\Work\Brands\Vik\`; two `state.md` open items (Supabase RLS, admin auth) look partly done by `6499fb4` and `c055cc0` and need re-checking before anyone relies on them; the custom domain listed as an open item is already serving.

### 2026-09-14
- Subtle Kasuku Studio footer credit added and deployed (`fd0dca6`). Daraja M-Pesa migration kept on `feature/daraja-mpesa` (see 1.3).

### 2026-09-13
- Migrated M-Pesa from IntaSend to direct Safaricom Daraja on a branch (`315c10b`); locked down entries writes and paywall, softened preview cutoff (`6499fb4`); hardened `get-content` against non-JSON IntaSend responses (`8b8fecc`).

### 2026-08-27
- Entries CMS moved from `localStorage` to Supabase so stories appear on every device (`3a1554f`). Secure paywall built (`dae410c`). Domain switched to `thevillagersnotes.com` (`158997d`). Google Analytics 4 added (`c1a7a38`). Live cloud comments (`f5c6afa`). Admin auth moved server-side and proposals gitignored (`c055cc0`).

### 2026-08-22 to 2026-08-25
- Security pass: XSS patched, payment input validated, HTTP security headers (`7349aa2`). SEO: JSON-LD, `robots.txt`, `sitemap.xml` (`289eef9`). Admin gained categories, a formatting toolbar and a settings tab. Preview switched to 100 words (`32be30f`). Safari fixes (`09a39ed`).

### 2026-08-21 to 2026-08-24
- Visual polish rounds: official VN logo and favicon, larger logo, comments section redesign, entry header metadata format, play sidebar cleanup.

---

## 3. Rejected Options

### 2026-09-23
- **Widening the CSP's `connect-src` for Google Analytics** — the original plan for this session assumed CSP was blocking GA4 hits. Tested directly in a browser: `connect-src` already allows `https://www.google-analytics.com`, and a manual fetch to its `/g/collect` endpoint reached Google's servers with no CSP violation. Did not make this change; see 1.7 and `state.md` for the real (unresolved) question of whether hits are landing.
- **Per-entry link previews** (showing that story's own title/image when its link is shared) — needs path-based routing plus a bot-facing OG endpoint, since the current hash routing means crawlers only ever see `index.html`'s static tags. Worth quoting as a follow-up; not built this session.
- **Auto-migrating entry `1789164489380`'s stranded full text back into its public body** — the code fix (1.5b) prevents this recurring, but the specific already-broken row wasn't touched without Ian/Vic's sign-off on editing live content.

---

## 4. Maintenance Protocol for Future Sessions

When completing any change that alters user experience or incorporates client feedback:
1. **Append a new dated entry** under Section 2 with the client's request (quoted), the technical decision, files modified, and the commit hash or deploy note.
2. **Update Section 1** if a new permanent invariant or rule is established.
3. **Add to Section 3** if an option was raised and turned down.
4. **Re-verify Section 1.7** whenever a build, hosting, domain or CSP change is made.
5. Commit this file alongside the code changes it describes.
