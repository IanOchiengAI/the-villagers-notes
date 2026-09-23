# Plan: IntaSend on Vic's account + Vic's feedback (2026-09-23)

> Written by Opus for a Sonnet session. Execute top to bottom. Phases 1 to 4 are independent and each ends in its own commit.
> **This repo is PUBLIC.** Never commit keys, passwords, phone numbers or prices. Env var *names* are fine; *values* never are.
> Project folder: `F:\Work\Websites\Vic\`. Vercel project: `the-villagers-notes`. Supabase project ref: `bjbqhvvwrllwscshqyvl`. Live: `https://thevillagersnotes.com`.

---

## 0. Before you touch anything

1. Read, in order: `F:\Work\.studio\KNOWLEDGE.md`, `F:\Work\Websites\.agents\KNOWLEDGE.md`, `.agent\state.md`, `DECISIONS_LOG.md`. Invariants 1.1, 1.3, 1.5 and 1.7 matter most for this work.
2. `git status` should be clean on `main`. Local `main` is **1 commit ahead of `origin/main`** (`c0417e7`, docs only). Push it first so later deploys don't mix unrelated work.
3. Do **not** merge `feature/daraja-mpesa`. It stays parked (invariant 1.3). This plan keeps IntaSend and changes only *whose* account is used.
4. Do **not** merge `security/remove-admin-password-fallback` unless Ian confirms `ADMIN_PASSWORD` is set in Vercel (see Phase 3, step 3a).

### Vic's message (verbatim, 2026-09-23, Swahili/English mix). Copy this into DECISIONS_LOG Section 2
> "A few things hapa pale nilikuwa nangoja umalize ile story ingine ndo nikushow, but here it goes . When sharing the link, the featured image ni cover book ya UTMT, naeza penda kama ingekuwa the logo ya VN, if possible…
> Kuna something else nimeona when posting an entry - wacha when I post the next entry if the problem will persist ama it was a this time thing only.
> Nimejaribu ku delete an entry ikakataa.
> Tunaeza connect it to google analytics?"

Translated, he's asking for four things:
| # | Ask | Phase |
|---|-----|-------|
| A | Link previews show the *Under the Mango Tree* book cover; he wants the VN logo | 2 |
| B | Something odd happened when posting an entry; he'll check whether it repeats | 3 (diagnose only) |
| C | Deleting an entry failed | 3 |
| D | Connect Google Analytics | 4 |
| + | Ian's own request: switch IntaSend to **Vic's** account | 1 |

---

## Phase 1: IntaSend on Vic's own account

### What exists now (checked 2026-09-23)
- `api/stk-push.js`, `api/stk-status.js` and `api/get-content.js` each hardcode `DEFAULT_INTASEND_KEY = 'ISPubKey_live_…'` as a fallback after `process.env.INTASEND_PUBLISHABLE_KEY || process.env.INTASEND_PUBLIC_KEY`. That key is **not** confirmed to be Vic's. Assume it's the studio's/Ian's until Ian says otherwise. So right now book orders, soda tips and paid-entry payments may be landing in the wrong wallet.
- Only the **publishable** key is used. The status check runs on the publishable key too.
- `index.html` loads `intasend-inlinejs-sdk@3.0.4` from unpkg. `book.js` and `soda-tip.js` fall back to it (`window.IntaSend`) if `/api/stk-push` fails.
- CSP `connect-src` already allows `https://payment.intasend.com`.
- **Paywall hole (fix it in this phase):** `api/get-content.js` unlocks a paid entry for **any** invoice whose state is `COMPLETE`. It never checks the amount or which entry the invoice paid for. A KES 10 soda tip invoice ID unlocks any paid article, and one invoice ID can be shared around. There are no paid entries live right now (every `entries.price` is 0), so this isn't being exploited yet, but it has to be closed before Vic prices anything.

### Step 1a: Ian/Vic do this, not you (write it up as a checklist for Ian to forward)
Vic needs his own IntaSend business account:
1. Sign up at `https://payment.intasend.com` (live, **not** sandbox) under Vic's name / The Villagers' Notes.
2. Complete KYC: national ID, KRA PIN, selfie, and a settlement destination (his M-Pesa number or bank account). Payouts aren't released until KYC is approved.
3. Once approved: Settings → API Keys → generate **live** keys. He needs to share the **Publishable key** (`ISPubKey_live_…`) and the **Secret key** (`ISSecretKey_live_…`) with Ian over a private channel, **never** WhatsApp group chat or email CC.
4. Optional but recommended: in IntaSend settings, set the business name that customers see on the STK prompt to "The Villagers Notes".

Draft this as a short plain-language message for Ian to send to Vic (Ian writes to Vic in English/Swahili mix, casual). Put it in your final chat reply, **not** in a repo file.

### Step 1b: Code changes (you do these now, before keys arrive, on branch `feat/intasend-vic-account`)
1. **Remove the hardcoded key** from all three API files. Use one shared helper, `api/_intasend.js`:
   ```js
   export function intasendKeys() {
     const publicKey = process.env.INTASEND_PUBLISHABLE_KEY;
     const secretKey = process.env.INTASEND_SECRET_KEY;
     return { publicKey, secretKey };
   }
   ```
   If `publicKey` is missing, return `503 { error: 'Payments are being set up. Please try again later or order via WhatsApp.' }`. Don't fall back to any hardcoded key. (Files beginning with `_` in `api/` aren't exposed as routes on Vercel, same pattern as `_admin-token.js`.)
2. **Bind each payment to what it pays for.** In `api/stk-push.js`, accept an optional `purpose` (`'entry' | 'book' | 'play' | 'tip'`) and `entry_id`. Send IntaSend an `api_ref` of the form `entry:<entry_id>` / `book` / `tip` (max 100 chars, sanitised like `narrative`). For `purpose === 'entry'`, **look up the price server-side** in Supabase (service role key, `select=id,price`). Ignore the client's `amount` and charge `entry.price`. Update the caller in `src/pages/entry.js` (~line 517) to send `purpose: 'entry', entry_id`.
3. **Harden `api/get-content.js`.** After confirming `state === 'COMPLETE'`:
   - require `Number(invoice.value) >= Number(entry.price)` (IntaSend returns the invoice amount as `value`; confirm the field name against a real status response and log it once with `console.log` during testing, then remove the log);
   - require `invoice.api_ref === 'entry:' + entry_id`.
   Fail with 402 otherwise. Keep the non-JSON guard from `8b8fecc`.
4. **Status check with the secret key.** Check IntaSend's current docs (Context7 `resolve-library-id` "intasend", or `https://developers.intasend.com`) for whether `/api/v1/payment/status/` with `Authorization: Bearer <secret>` is the recommended server-side verification. If it is, use it in `get-content.js` when `INTASEND_SECRET_KEY` is set and fall back to the public-key status call when it isn't. Don't guess the endpoint; confirm it in the docs.
5. **Remove the client-side SDK fallback.** Delete the `<script src="https://unpkg.com/intasend-inlinejs-sdk…">` tag from `index.html` and the `window.IntaSend` branches in `src/pages/book.js` (~line 199) and `src/components/soda-tip.js` (~line 135). It's a second payment path that skips the server entirely, and it bakes a public key into the browser. Then remove `https://unpkg.com` from CSP `script-src` in `vercel.json`, but only after grepping to confirm nothing else loads from unpkg.
6. Keep phone validation, amount bounds and narrative sanitising as they are.
7. `npm run build` must pass. Commit: `feat(payments): move IntaSend to env-only keys, bind invoices to entries`.

### Step 1c: Go live (only after Ian has Vic's keys)
1. Ian adds `INTASEND_PUBLISHABLE_KEY` and `INTASEND_SECRET_KEY` in Vercel → the-villagers-notes → Settings → Environment Variables (Production + Preview). Don't pass the values through chat. If Ian wants you to do it, use `vercel env add` interactively via `! vercel env add …` so the value never enters the transcript. (The Vercel CLI isn't installed on this machine; `npm i -g vercel` first.)
2. Remove any old `INTASEND_PUBLIC_KEY` env var so there's no ambiguity.
3. Deploy the branch as a **preview**. Test on the preview URL:
   - Soda tip KES 10 → STK arrives on a real phone → pay → status turns success → **the money shows up in Vic's IntaSend dashboard** (Vic or Ian confirms). This is the check that matters.
   - Temporarily set one test entry to price KES 10 via admin → pay → full body unlocks → refresh → still unlocked → open in a private window with the same invoice ID copied into `localStorage` for a **different** entry → must return 402.
   - Delete the test entry afterwards (after Phase 3 is fixed) and ask Vic to refund himself, or treat it as a tip.
4. Merge to `main`, confirm the production deploy, repeat the KES 10 tip test once on production.
5. Update `MPESA_SETUP_GUIDE.md`: it currently describes Daraja and hardcodes Vic's phone number in a tracked file. Rewrite it for IntaSend and **remove the phone number** (public repo). Keep a short "Daraja later" note that points at `feature/daraja-mpesa`.

---

## Phase 2: Link preview shows the VN logo (ask A)

### Cause
`index.html` sets `og:image` and `twitter:image` to `https://thevillagersnotes.com/images/book-cover.png`. The site uses **hash routing** (`#/entry/…`). Crawlers from WhatsApp, X and Facebook never see anything after `#`, and they don't run JS, so **every** shared link (home, entries, individual stories) shows the static tags in `index.html`. `setMeta()` in `src/router.js` only changes tags in the live browser, which the crawlers never read.

### Fix (the part Vic asked for)
1. Make a proper **1200×630** share card, not the raw logo. `VN Logo.png` in the project root is 1080×1350 portrait RGBA, and `public/images/vn-logo.png` exists too. A portrait logo gets cropped badly in WhatsApp/X cards. Use Python + Pillow (installed) to centre the logo on a 1200×630 canvas filled with the site's background colour (read the `--background` / paper token from `src/index.css`). Put the logo at roughly 60% of the canvas height and leave generous margins, since WhatsApp crops to a near-square in some views. Save it as `public/images/og-vn.png` and keep it **under 300 KB** (WhatsApp skips large images). Optimise with `mcp-image-optimizer` if you need to.
2. In `index.html`, point `og:image` and `twitter:image` at `https://thevillagersnotes.com/images/og-vn.png`. Add `og:image:width` 1200, `og:image:height` 630, `og:image:alt` "The Villager's Notes", and `og:site_name` "The Villager's Notes".
3. Keep `book-cover.png` for the book page's in-page imagery. **Don't delete it.**
4. Check the JSON-LD block still parses (nothing to change there).
5. Commit: `feat(seo): use VN logo share card for link previews`.
6. After deploy: WhatsApp caches previews per URL for a long time. Test with a fresh query string (`https://thevillagersnotes.com/?v=2`), and run the URL through `https://developers.facebook.com/tools/debug/` → "Scrape Again", which also refreshes WhatsApp's cache in most cases. Tell Ian that links shared before the fix may keep the old image for a while.

### Out of scope, tell Ian as a follow-up
Per-story previews (the title and excerpt of *that* story in the card) are impossible with hash URLs. They'd need path routing (`/entries/slug`) plus a Vercel function that serves OG tags to bots. That's a bigger change and worth quoting as an add-on. Don't build it now.

---

## Phase 3: Deleting an entry fails (ask C) + the posting issue (ask B)

### What the code does
- Admin → Delete → `deleteEntryFromDB(id)` (`src/lib/supabase.js:184`) → POST `/api/admin-entries` `{ action: 'delete', token, entryId }` → server checks the HMAC token (`api/_admin-token.js`, **12-hour TTL**) → Supabase `DELETE` with the service role key.
- `callAdminEntries` **swallows every failure**. It only `console.warn`s and returns `false`. `admin.js:947-952` ignores the return value and re-renders, so the entry just "comes back" with no message. The same silent-failure pattern covers **save new** (`admin.js` ~913) and **save edit** (~955). That's very likely what Vic hit when posting (ask B) as well.
- Ruled out already (checked in Supabase 2026-09-23): there are **no foreign keys** on `entries` and `comments` doesn't reference it, so the delete isn't blocked by comments. The table has 9 entries, all price 0.
- Leading hypothesis: the admin session **token expired or went missing** (12h TTL, stored in `sessionStorage`, so it's lost when the tab closes) while the dashboard still looks logged in, so every write returns 401 silently. Check how `admin.js` decides it's logged in (~line 200-230, and the logout at ~304). If it relies on a separate flag or survives longer than the token, that's the bug.

### Steps
1. **Confirm the cause from real data before changing anything.** Pull Vercel runtime logs for `/api/admin-entries` for the last ~7 days (Vercel MCP `get_runtime_logs` for project `the-villagers-notes`; find the team/project via `list_teams` → `list_projects`). Look for 401 vs 502 vs 500 and the `[admin-entries] delete error:` text. Write down which one it was.
2. Fix whatever the logs show. Whatever the cause, also do these:
   - `callAdminEntries` returns `{ ok, status, error }` instead of a bare boolean. Update the three callers.
   - On `status === 401`: clear the token, show "Your session expired. Please log in again." and send the admin back to the login screen **without losing the form content**. Stash the unsaved form in `sessionStorage` and restore it after login.
   - On any other failure: show a visible inline error next to the button (match the admin's existing styling, no `alert()`), and **don't** re-render or clear the form.
   - On success: brief inline "Saved" / "Deleted" confirmation.
   - Disable the button while the request is in flight so a double click can't create two entries (new entries get `id = Date.now()`, so a double click really does create duplicates).
   - Save-new currently saves the entry and the paid `full_body` as two calls. If the second fails, the paid entry is live with no full body. Surface that failure explicitly ("Entry saved but the paid text failed to save. Click Save again.").
3. Security check while you're here (Ian's call, ask before merging):
   a. Check (without printing values) whether `ADMIN_PASSWORD` and `ADMIN_TOKEN_SECRET` are set in Vercel production (`filter_project_envs` / `vercel env ls`). `api/_admin-token.js` and `api/admin-auth.js` fall back to a password that's **hardcoded in this public repo**. If `ADMIN_PASSWORD` is unset, anyone can log in to the admin. Report the result to Ian.
   b. If both are set, the `security/remove-admin-password-fallback` branch is safe to merge. Ask Ian first.
4. **Leftover data:** entry `1789164489380` ("What it Means When a Man Falls From the Sky") is free (price 0) but still has a 32-paragraph `full_body`. It was probably paid and then made free. That's harmless, but it shows that switching a paid entry to free doesn't clear `full_body`, and if the preview body was trimmed while it was paid, the free version may now show **only the preview**. Compare its `body` length to `full_body` in Supabase. If `body` is shorter, that's another candidate for Vic's "something when posting" (ask B). Fix: when an entry is saved with price 0 and a stored `full_body` exists, write the full text into `body` and null out `full_body`. Ask Ian before changing Vic's live data. Code fix first, data fix only on approval.
5. Test locally with `vercel dev` (needs env vars pulled via `vercel env pull`, and **never** commit the resulting `.env*`) or on a preview deploy: create → edit → delete a throwaway entry; let the token expire (temporarily set TTL to 60s locally) and confirm the "session expired" flow keeps the form.
6. Commit: `fix(admin): surface save/delete errors, handle expired sessions`.
7. Ask B stays open. Vic said he'll watch whether it repeats. In the reply draft, ask him to screenshot it or describe what he saw next time.

---

## Phase 4: Google Analytics (ask D)

### What exists
GA4 is **already installed**: `index.html` loads `gtag.js` with measurement ID `G-8YH7V59JKQ` (`c1a7a38`, 2026-08-27). So Vic's ask is really "give me access and make sure it's counting".

### Problems to check and fix
1. **The CSP probably blocks GA4 hits.** `connect-src` allows only `https://www.google-analytics.com`. GA4 sends its hits to `https://region1.google-analytics.com/g/collect` (and `*.analytics.google.com`), so those requests are likely blocked right now. Confirm by loading the live site in Chrome (claude-in-chrome, `read_console_messages` pattern `Content Security Policy|collect`) or by reading the network requests. Fix `vercel.json` CSP per Google's GA4 CSP guidance:
   - `script-src` add `https://*.googletagmanager.com`
   - `connect-src` add `https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com`
   - `img-src` already allows `https:`
   Re-verify DECISIONS_LOG 1.7 afterwards (it lists the allowed origins).
2. **Hash routing means GA sees one page.** gtag only sends a page_view on first load, so navigating to `#/entries/…` records nothing. In `src/router.js` `route()`, after rendering, send:
   ```js
   if (typeof window.gtag === 'function') {
     window.gtag('event', 'page_view', {
       page_title: document.title,
       page_location: location.href,
       page_path: '/' + rawHash,
     });
   }
   ```
   Change the `gtag('config', …)` call in `index.html` to `gtag('config', 'G-8YH7V59JKQ', { send_page_view: false })` and let the router send the first view too, so it isn't counted twice. Skip the `admin` route so Vic's own admin visits aren't counted.
3. Optional, cheap, and useful for Vic: `gtag('event', 'purchase_attempt'|'purchase', { value, currency: 'KES', item_name })` on STK push start and success in `book.js`, `projects.js`, `entry.js` and `soda-tip.js`. Only if it takes under ~20 min. Otherwise list it as a follow-up.
4. Commit: `fix(analytics): allow GA4 in CSP, track hash-route page views`.
5. After deploy: open GA4 → Reports → Realtime, click around the live site, and confirm views appear with the right paths. If you can't reach GA, give Ian the steps.
6. **Access for Vic.** This is Ian's step: whoever owns property `G-8YH7V59JKQ` goes to GA Admin → Property access management → "+" → Vic's Google account email → role **Viewer** (or **Administrator** if the property should become Vic's; best practice is that the client owns their account and the studio is Admin). Write this as a step for Ian. Don't do it yourself.

---

## Phase 5: Close out (mandatory, per `F:\Work\AGENTS.md` Step 5)

1. `DECISIONS_LOG.md` Section 2, new entry `### 2026-09-23`: Vic's message verbatim (above), plus one line per change with its commit hash. Update Section 1:
   - 1.1: paid unlock now also checks invoice amount and entry binding (`api_ref`).
   - 1.3: reword to "production uses IntaSend on **Vic's own** account; keys only in Vercel env vars `INTASEND_PUBLISHABLE_KEY` and `INTASEND_SECRET_KEY`, no hardcoded fallback."
   - 1.7: new CSP origins; unpkg removed.
   - New invariant: "Admin writes must show a visible error on failure; never fail silently."
   - Section 3 (rejected): "Per-entry OG previews deferred, since hash routing makes them impossible without a routing change."
2. `.agent/state.md`: Session Log row for 2026-09-23. Open items: add "IntaSend keys from Vic", "GA access for Vic", "Ask B pending Vic's repro", "Per-entry OG previews (quote as add-on)", and the admin-password env check result. Tick anything finished.
3. Lessons → `F:\Work\Websites\.agents\lessons_log.md`:
   - Hash-routed SPAs can't have per-page link previews; the static `og:image` in `index.html` is what every shared link shows.
   - The GA4 CSP needs `*.google-analytics.com`, not just `www.`; hash routers need manual page_view events.
   - Admin CRUD helpers that return bare booleans and ignore failures make "it won't delete" bugs invisible to the client.
   - Payment unlock endpoints must bind the invoice to the item and the amount, not just check `COMPLETE`.
4. Gate: open both board files and confirm each has a 2026-09-23 entry before saying you're done.
5. Final chat reply to Ian:
   - what shipped (commits, deploy status) and what's waiting on keys;
   - the message to forward to Vic (casual English/Swahili mix like Vic's, answering all four points: logo share image done plus the WhatsApp cache note; delete fixed; send a screenshot if the posting thing repeats; GA was already on and is now tracking properly, and here's how you'll get access; the IntaSend signup steps);
   - the admin-password env check result.

---

## Guardrails
- Don't touch `feature/daraja-mpesa`.
- Don't print, log or commit any env var value. No `console.log` of keys, invoices or full request bodies left in production code.
- Don't change live Supabase data (Phase 3 step 4) without Ian's OK.
- Don't redesign anything visual beyond the OG card and the admin status messages.
- Every CSP change gets a live console check afterwards. A wrong CSP silently breaks payments.
- If IntaSend docs contradict anything in this plan (endpoint names, `value`/`api_ref` fields), the docs win. Note the difference in DECISIONS_LOG.
