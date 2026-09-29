# Plan 2026-09-28: typography revert, entry media, admin prices, private play link, admin-only access

Branch: `feat/media-prices-access` (from `main` @ `3cbc61a`). Approved by Ian in chat 2026-09-28.
This repo is PUBLIC. Never write the private play link, keys, phone numbers or prices-as-business-data into tracked files.

## Hard constraints (read before touching anything)
- `DECISIONS_LOG.md` Section 1 invariants stay intact unless this plan says otherwise (1.1 is changed by Part 5).
- **Vercel Hobby = 12 functions and `api/` already has 12.** Do NOT add any new file under `api/` except `_`-prefixed helpers (not counted). All new server behaviour goes into existing endpoints.
- CSP: no inline `<script>`, no inline event attributes (`onclick=` ...). Inline `style=` is allowed. Listeners in JS, styles in `src/components/enhancements.css`.
- Every visitor-supplied value is validated server-side and escaped where printed (`esc` in `src/lib/html.js`, `escHtml` in `api/_util.js`).
- Server fetches use `fetchT` (timeouts) from `api/_util.js`. Supabase from the server = REST with `SUPABASE_SERVICE_ROLE_KEY`.
- A payment/provider outage is never "not paid" (DECISIONS 1.9): 503 + `state: 'TRANSIENT'` for upstream trouble.
- Money amounts always come from the server/DB/IntaSend, never from the browser.

## Already done by the lead (do not redo, build on it)
- `supabase/migrations/20260928_media_prices_access.sql`: `entries.image_url/audio_url/video_url`; `site_settings` (public read: `play_price`, `book_price`); `private_settings` (no public access: `play_private_link`); `entry_purchases`; `entry_access`; storage bucket `entry-media` (public read, 25 MB, image+audio mime types). Read it for exact columns.
- `src/lib/supabase.js`: `rowToEntry` now has `imageUrl`, `audioUrl`, `videoUrl`; `entryToRow` sends `image_url`, `audio_url`, `video_url` (null when empty); list/full selects include them. New exports: `createMediaUploadAdmin`, `uploadEntryMedia`, `getSettingsAdmin`, `setPricesAdmin`, `setPlayLinkAdmin`, `listPurchasesAdmin`, `grantAccessAdmin`, `revokeAccessAdmin`, `getPublicPrices`, `DEFAULT_PRICES`. **These signatures are the contract; do not change them.**

---

## Part 1: Typography back to pre-audit (reader) — owner: READER agent (+ SERVER for entry-meta)
Reference = commit `59141f8` (last commit before the 2026-09-25 audit). `git show 59141f8:src/pages/entry.js`.
In `src/components/enhancements.css`:
- delete the Fiction/Shorts `text-indent` rule;
- delete the whole "Reading typography" block in `.entry-body` (`font-optical-sizing`, `font-kerning`, `font-variant-ligatures`, `font-variant-numeric: oldstyle-nums`, `hyphens`, `overflow-wrap`);
- delete every `text-wrap: balance|pretty` (entry title, standfirst, `.entry-body p`, `.entry-nav-title`);
- delete `.scene-break`; add `.entry-body hr.divider { margin: 2.5rem 0; }` (or reuse the existing `.divider` class + that margin).
In `src/pages/entry.js`: `---`/`***`/`___` render as `<hr class="divider" />` again (pre-audit markup), not `⁂`.
In `api/entry-meta.js` (SERVER agent): same `<hr class="divider" />` for the server-rendered copy.
KEEP: route fade-in and top loading line; everything else in the entry CSS (sizes/widths are identical to pre-audit).

## Part 2: Entry media
Data: `image_url` / `audio_url` = public URL inside bucket `entry-media`; `video_url` = YouTube watch URL `https://www.youtube.com/watch?v=<11-char id>`.
Media on paid entries is shown to everyone (teaser); only the text stays locked.

**Server (`api/admin-entries.js`):**
- Add `image_url`, `audio_url`, `video_url` to `ENTRY_COLUMNS`. In `upsert`, validate each: `null`/`''` → `null`; image/audio must start with `${VITE_SUPABASE_URL}/storage/v1/object/public/entry-media/` and contain no whitespace/quotes/`<>`; video must match a YouTube URL (`youtube.com/watch?v=`, `youtu.be/`, `youtube.com/shorts/`, `youtube.com/embed/`) → normalise to `https://www.youtube.com/watch?v=<id>` where id `^[A-Za-z0-9_-]{11}$`. Invalid → 400 with a plain-English error.
- New action `create_media_upload` `{ kind: 'image'|'audio', filename, contentType, size }`: whitelist mime (image: jpeg/png/webp, max 5 MB; audio: mpeg/mp4/x-m4a/aac/wav/ogg, max 25 MB); path = `${kind}/${Date.now()}-${random8}.${ext}` (ext from mime, never from filename); `POST ${url}/storage/v1/object/upload/sign/entry-media/${path}` with service key → returns `{ url }` containing `token=`. Respond `{ ok, path, token, publicUrl: ${url}/storage/v1/object/public/entry-media/${path} }`.

**Server (`api/entry-meta.js`):** select `image_url,audio_url,video_url` too. `og:image`/`twitter:image`/JSON-LD `image` = `row.image_url` when it passes the same bucket-prefix check, else the VN logo. Drop the fixed `og:image:width/height` tags when using an entry image. SSR article: cover `<img>` under the standfirst when present (escaped); do not SSR audio/video players (the app renders them).

**Server (`vercel.json`) CSP:** add `media-src 'self' https://*.supabase.co; frame-src https://www.youtube-nocookie.com;`. Keep everything else.

**Reader (`src/pages/entry.js`):** under the standfirst, before `.entry-body`: cover image (`<img class="entry-cover" loading="eager" alt="">` escaped src), then `<audio controls preload="none" class="entry-audio">`, then YouTube as `<div class="entry-video"><iframe src="https://www.youtube-nocookie.com/embed/<id>" title="<entry title> video" loading="lazy" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>` (16:9 via `aspect-ratio`). Extract the id client-side with the same 11-char regex; render nothing if it doesn't match. Styles in `enhancements.css`, width = the 62ch column.
**Reader (`src/pages/entries.js`, and `home.js` if it lists entries):** small thumbnail of `imageUrl` when present; layout must not change for entries without one.

**Admin (`src/pages/admin.js`), new/edit entry form:** section "Media (optional)":
- Cover image: file input (accept jpeg/png/webp, ≤5 MB checked before upload) → `createMediaUploadAdmin('image', …)` → `uploadEntryMedia(path, token, file)` → set hidden field to `publicUrl`; show preview + "Remove".
- Audio: same with `'audio'`, ≤25 MB, shows an `<audio controls>` preview + "Remove".
- YouTube link: text input; show "Looks good" / "Not a YouTube link" hint; "Remove" clears it.
- Values flow into the entry object as `imageUrl`/`audioUrl`/`videoUrl` → existing `upsertEntryToDB`. Include them in autosave drafts (`tvn_draft_*`) and the edit form prefill. Disable Save while an upload is in progress; show upload errors inline (rule 1.5a).

**Privacy (`src/pages/privacy.js`):** add YouTube (embedded videos on some entries; YouTube may set cookies when the video is played; nocookie domain used) and note that entry images/audio are hosted with Supabase; add that phone numbers of paid-entry purchases are kept so Vic can restore access on a new device.

## Part 3: Admin-set play & book prices
**Server (`api/stk-push.js`):** for `purpose === 'play'|'book'`, read `site_settings` (`key=in.(play_price,book_price)`) with the service key; charge that price; fall back to 1000/1500 only if the row is missing (a DB error → 503 "try again"). Ignore the browser's `amount` for these purposes. Keep the 50..50000 bounds.
**Server (`api/admin-entries.js`):** `get_settings` → `{ settings: { play_price, book_price } (integers), playLink: string|null }`; `set_prices` `{ prices: { play_price?, book_price? } }` → each integer 50..50000 else 400 → upsert into `site_settings` (`on_conflict=key`, set `updated_at`).
**Reader (`src/pages/projects.js`):** `await getPublicPrices()` before rendering (render with `DEFAULT_PRICES` immediately if you prefer, then update — but no flash of a wrong price on the pay buttons: simplest is await then render). Every "KES 1,000"/"KES 1,500"/"KES 1500" and the amounts sent to `/api/stk-push` come from those values, formatted with `toLocaleString()` (fixes "KES 1500" vs "KES 1,500"). Text "KES 1,000 gets you a private link" uses the live price.
**Admin:** new "Prices" panel (put it in a new admin tab "Settings" or at the top of an existing tab — pick the cleaner one): Play price, Book price, Save; errors inline; min 50 enforced in the input and on the server.

## Part 4: Admin-set private play link
**Server (`api/admin-entries.js`):** `set_play_link` `{ link }`: `''` → delete the row; else must match `^https:\/\/[^\s"'<>]+$` and ≤ 500 chars → upsert `private_settings` key `play_private_link`. `get_settings` returns `playLink` = DB value ?? `process.env.PLAY_PRIVATE_LINK` (validated) ?? null.
**Server (`api/get-stats.js`):** `playLink` = DB `private_settings.play_private_link` first, env var fallback. Admin token still required.
**Admin:** in the Settings/Prices panel: "Private play link" input showing the current link, Save, "Clear (use the Vercel setting)". Warn in small text: "This is what buyers pay for. Only paste the full-recording link here."
Never log the link, never put it in the public bundle.

## Part 5: Admin-only access on a new device (replaces the reader unlock code)
Vic's rule (via Ian, 2026-09-28): a buyer's code could be given to 100 people, so only the admin can give access on another device.

**Tables:** `entry_purchases` (one row per entry invoice), `entry_access` (sha256 hashes of device keys and one-time grant tokens). Hash = `crypto.createHash('sha256').update(raw).digest('hex')`. Raw keys/tokens = `crypto.randomBytes(32).toString('base64url')`.

**Server (`api/stk-push.js`):** after a successful push with `purpose === 'entry'`, insert `entry_purchases { invoice_id, entry_id, phone, amount, status: 'Awaiting payment' }` (service key, `Prefer: resolution=ignore-duplicates`); failure logged, never blocks the payment.
**Server (`api/_payments.js`):** new `markEntryPurchasePaid(invoiceId, entryId, amount)` — upsert row with `status: 'Paid', paid_at: now()` WITHOUT touching `device_minted_at` (use `on_conflict=invoice_id` + `resolution=merge-duplicates` and send only those columns, or PATCH then POST-if-missing). Call it from `api/stk-status.js` and `api/intasend-webhook.js` when a COMPLETE invoice has `api_ref` starting `entry:` (entry id = the part after `entry:`), and from `get-content.js` after a verified invoice.
**Server (`api/get-content.js`)** accepts exactly one credential besides `entry_id`:
1. `device_key` → hash → `entry_access?key_hash=eq.<h>&kind=eq.device&revoked_at=is.null&entry_id=eq.<entry>` → found → return full body `{ ok, body }`. Not found → 403 `{ state: 'NO_ACCESS', error: 'This device no longer has access. Message Vic on WhatsApp with the number you paid from.' }`.
2. `access_token` (one-time link) → hash → row `kind=grant`, entry matches, `used_at is null`, `revoked_at is null`, `expires_at > now()`. Claim atomically: `PATCH …?id=eq.<id>&used_at=is.null` with `Prefer: return=representation`; empty result → 410 `{ state: 'LINK_USED', error: 'This link has already been used or has expired. Ask Vic for a new one.' }`. Success → mint a device key (insert `entry_access kind=device` with the grant's `invoice_id`) → `{ ok, body, device_key }`.
3. `invoice_id` (the original purchase on the buying device): existing IntaSend verification unchanged (state, api_ref, amount). Then `markEntryPurchasePaid`. Then claim the one-time mint: `PATCH entry_purchases?invoice_id=eq.<id>&device_minted_at=is.null` `{ device_minted_at: now() }` with `return=representation`. Got a row → mint device key → `{ ok, body, device_key }`. Empty → 409 `{ state: 'ALREADY_CLAIMED', error: 'This payment has already unlocked a device. If you changed phones, message Vic on WhatsApp with the number you paid from.' }`. (Existing buyers from before this change have no purchase row yet: `markEntryPurchasePaid` creates it with `device_minted_at` null, so their first visit mints normally.)
Any Supabase error in these steps → 503 TRANSIENT. Keep `full_body` checks as today. Rate-limit this endpoint with `allow()` (e.g. 30/min per IP).

**Server (`api/admin-entries.js`):**
- `list_purchases` → last 500 `entry_purchases` newest first, plus per invoice `devices` (active device keys count) and `open_grants` (unused, unexpired, unrevoked grants count).
- `grant_access` `{ invoiceId, entryId? }`: purchase must exist with status Paid. If it doesn't exist and `entryId` is given, verify the invoice with IntaSend (`fetchInvoice`: COMPLETE, `api_ref === 'entry:'+entryId`, value ≥ entry price) and create it via `markEntryPurchasePaid` (lets Vic help a buyer from before this change). Create a grant (expires in 48 h), look up the entry slug, respond `{ url: 'https://thevillagersnotes.com/entries/<slug>?access=<raw token>', expiresAt }`. The raw token is returned once and never stored.
- `revoke_access` `{ invoiceId }` → set `revoked_at = now()` on all its `entry_access` rows where `revoked_at is null` → `{ revoked: n }`.
Validate every id: string, ≤200 chars, invoice ids `^[A-Za-z0-9_-]+$`.

**Reader (`src/pages/entry.js`):**
- REMOVE: the `<details class="paywall-code">` block ("Paid on another phone or browser? Use your unlock code") and its handlers; the `.unlock-code-note` "Read this on another device? Show my unlock code" + revealed code and handlers; their CSS in `enhancements.css` (`.paywall-code*`, `.unlock-code*`).
- ADD on the paywall card, under the status line: small muted text "Changed phones? Message Vic on WhatsApp with the number you paid from." linking to the same WhatsApp number/link the site already uses (`src/components/whatsapp-fab.js`), opened in a new tab.
- Storage: `tvn_device_<entryId>` in `localStorage` = device key. On load of a paid entry: if a device key exists → unlock with `{ entry_id, device_key }`; on `NO_ACCESS` delete it and show the paywall with that message. Else if `?access=` is in the URL → unlock with `{ entry_id, access_token }`, then `history.replaceState` to remove the query string whatever the result; show `LINK_USED` message on failure. Else the existing invoice flow (`tvn_invoice_<id>`, "I've already paid — check") → on success store the returned `device_key` and delete `tvn_invoice_<id>`; on `ALREADY_CLAIMED` delete the invoice and show the message. Keep rule 1.9: TRANSIENT/network keeps what's stored.
- Keep the existing sessionStorage full-body cache behaviour.

**Admin (`src/pages/admin.js`):** new tab "Paid readers": table of purchases (entry title from the entries list the admin already loads, phone, amount, status, date, devices); search box filtering by phone digits; per row "Give access" (→ `grantAccessAdmin` → show the link with "Copy" and "Send on WhatsApp" = `https://wa.me/<buyer phone>?text=<encoded message + link>`) and "Revoke" (confirm dialog). Below the table, "Buyer not listed?" form: entry (select) + IntaSend invoice id → `grantAccessAdmin(invoiceId, entryId)`. Escape everything with `esc`.

---

## Ownership (parallel agents; edit ONLY your files)
| Agent | Files |
|---|---|
| SERVER | `api/admin-entries.js`, `api/stk-push.js`, `api/stk-status.js`, `api/intasend-webhook.js`, `api/_payments.js`, `api/get-content.js`, `api/get-stats.js`, `api/entry-meta.js`, `vercel.json` (may add `api/_*.js` helpers) |
| READER | `src/pages/entry.js`, `src/pages/entries.js`, `src/pages/home.js`, `src/pages/projects.js`, `src/pages/privacy.js`, `src/components/enhancements.css` |
| ADMIN | `src/pages/admin.js` (may add `src/lib/admin-*.js`); admin styles inline or in a new `src/components/admin.css` imported by admin.js |
Nobody edits `src/lib/supabase.js`, the migration, `DECISIONS_LOG.md` or `.agent/state.md` (lead does). If you need a contract change, stop and report it instead.

## Verification (each agent, before reporting)
- `npm run build` passes.
- SERVER: offline tests with mocked `fetch` in the scratchpad (not in the repo) covering: URL validation (bucket prefix, YouTube forms, junk/`javascript:`), price bounds, play/book amount ignores the client, device-key path, grant single-use race (second PATCH returns empty → 410), invoice mint-once (409 on second), revoke, entry-meta og:image fallback, admin token required on every new action.
- READER/ADMIN: `npm run build`, then `npx vite preview` and check the pages render with no console errors (data may be empty/offline; that's fine). Report what you could not test.
- Report: files changed, what was tested, anything unfinished or any deviation from this plan.

## Lead's go-live checklist (not for agents)
1. Ian runs the migration in Supabase SQL editor → lead verifies via advisor + anon checks (`private_settings`, `entry_purchases`, `entry_access` denied; `site_settings` read-only).
2. Deploy AFTER the migration (reader selects the new columns).
3. Live checks: entry typography, media upload/preview/share preview, prices on /projects + server charge, play link in admin, paid unlock → device key, grant link single use, revoke.
4. Update DECISIONS_LOG 1.1, 1.6, 1.7 (CSP, og:image), new entries; state.md; ship-check.
