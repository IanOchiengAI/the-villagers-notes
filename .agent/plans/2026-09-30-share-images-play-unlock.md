# Handoff 2026-09-30: share images, play unlock on the site, paywall line removed

Branch: `feat/share-images-play-unlock` (from `main` @ `313e090`). Code is WRITTEN and builds
(`npm run build` passes) but is NOT tested, NOT reviewed in a browser, NOT merged, NOT deployed.
Approved by Ian in chat 2026-09-30. Repo is PUBLIC: never commit the play link, keys or phone numbers.

Read first: `DECISIONS_LOG.md` Section 1 (esp. 1.1 access rules, 1.6 play link, 1.7 CSP/previews,
1.9 outages are never "not paid"), `F:\Work\.studio\security\SECURITY.md`,
`.agent/plans/2026-09-28-media-prices-access.md` (the device-key system this reuses).

## Why (Ian's requests)
1. "We can do away with this instruction" → remove the paywall line "Changed phones? Message Vic on WhatsApp…".
2. "Sharing a link doesn't come with the image of that specific post, it's still the VN logo."
   Diagnosed: all 9 entries have covers and entry-meta DOES send them, but 4 covers are 0.6–3 MB and
   WhatsApp ignores og:image much above ~300 KB; WhatsApp also caches previews of already-shared links.
3. Play: "people have paid… they should open the content". Decision (Ian: "for now, let's use YouTube"):
   the paid play unlocks ON THE SITE right after M-Pesa confirms, via the same device-key system as
   paid entries, instead of Vic emailing the link. Bunny Stream (link can't be shared) comes LATER.
   Known limit, told to Ian: the video is still an unlisted YouTube video; a technical buyer could
   extract and share its ID. Only one play order exists so far (a KES 50 test, "Delivered").

## Done on the branch (verify, don't redo)
**Paywall line** — removed from `src/pages/entry.js` (+ its CSS). Error messages that mention WhatsApp
(NO_ACCESS / ALREADY_CLAIMED from the server) are intentionally kept: only payers see them.

**Share images**
- `supabase/migrations/20260930_entries_share_image.sql`: `entries.og_image_url` + column SELECT grant
  (entries uses column-level grants). **Must be applied BEFORE deploy** (site + entry-meta select it).
- `src/lib/image-resize.js`: `makeShareImage(src)` → 1200×630 centre-crop JPEG ≤250 KB;
  `shrinkCover(file)` → covers >600 KB or >1600 px become ≤1600 px JPEG.
- `src/pages/admin.js`: cover upload now shrinks, uploads, then makes + uploads a share copy into hidden
  `#f-<key>-ogImageUrl`; saved as `ogImageUrl`; cleared when the cover is removed; image input now
  accepts up to 20 MB (resized under the 5 MB storage limit, `IMAGE_STORE_MAX`). `uploadBlob()` moved to
  shared scope. Entries tab shows a one-time **"Create share images"** card for entries with a cover
  but no share image (browser fetches the cover — storage CORS is `*` — and calls `setOgImageAdmin`).
- `src/lib/supabase.js`: `ogImageUrl` mapped both ways, in `LIST_COLS`; `setOgImageAdmin`.
- `api/admin-entries.js`: `og_image_url` in `ENTRY_COLUMNS` with the bucket check; new action
  `set_og_image { entryId, ogImageUrl }` (PATCHes only that column).
- `api/entry-meta.js`: preview image = share image > cover > VN logo; for share image/logo also sends
  `og:image:secure_url`, `og:image:type`, width 1200, height 630.
- `src/pages/entry.js`: Share/Copy links add `?s=<6 digits from the image file name>` so WhatsApp
  fetches a fresh preview (page ignores it; canonical unchanged).

**Play unlock (product id `play`)**
- `api/get-content.js`: `PLAY_ID='play'`. `loadEntry()` for play = price from `site_settings.play_price`
  (default 1000) + link from `private_settings.play_private_link` else env `PLAY_PRIVATE_LINK`.
  Success returns `content(entry)`: entries `{ body }`, play `{ video_url, youtube_id }`. Invoice path
  accepts `api_ref` starting `play:` for the play. Device-key / one-time-link / mint-once / release logic
  unchanged and shared.
- `api/stk-push.js`: purpose `play` also inserts `entry_purchases` (entry_id `play`); the `orders` row stays.
- `api/stk-status.js`, `api/intasend-webhook.js`: a COMPLETE `play:` invoice also calls
  `markEntryPurchasePaid(id, 'play', amount)`.
- `api/admin-entries.js` `grant_access`: play backfill accepts any COMPLETE `play:` invoice ≥ KES 50
  (price may have changed since purchase); play links go to `https://thevillagersnotes.com/projects?access=<token>`.
- `src/pages/admin.js` Paid readers: title "Beneath the Surface (the play)"; "Buyer not listed?" select
  offers the play first.
- `src/pages/projects.js`: `restorePlayAccess()` on load (device key `tvn_device_play` → `?access=` token →
  pending invoice `tvn_invoice_play`); after payment `unlockPlayWithInvoice()` (2 retries on transient);
  `showPlayer()` swaps the pay box for a youtube-nocookie embed + "Trouble playing? Open it on YouTube"
  link (plain "Watch the play" link when the URL isn't YouTube). Email is now optional. Copy updated.
  Styles `.play-unlocked-note`, `.play-open-link` in `enhancements.css`.

## Remaining work (in order)
1. **Review the diff** (`git diff origin/main`) against this file and DECISIONS_LOG Section 1. Check:
   escaping (`esc`) of `video_url`; no inline event handlers (CSP); `api/` still 12 non-underscore files.
2. **Server tests** — extend `C:\Users\User\AppData\Local\Temp\claude\F--Work-Websites-Vic\43373fe2-e4fe-4a84-8870-962f5c1430ed\scratchpad\server-tests\run.mjs`
   (99 passing; mocks global fetch; if the scratchpad is gone, write new ones outside the repo):
   play via invoice (COMPLETE `play:` ref, amount ≥ price → video + device_key; wrong ref → MISMATCH;
   second mint → 409), play via device key and via grant token; no link configured → 503 TRANSIENT;
   stk-push play inserts `entry_purchases` with entry_id `play` and ignores client amount;
   stk-status/webhook mark play purchase paid; `set_og_image` (valid, off-bucket rejected, auth required);
   entry-meta picks og_image_url over image_url and emits type/size tags; grant_access for play returns
   a `/projects?access=` URL.
3. **Ian applies** `20260930_entries_share_image.sql` in the Supabase SQL editor. Then verify with the anon
   key: `select=og_image_url` on entries works; `full_body` still denied.
4. **Browser checks (local `vite preview` + live after deploy):** admin cover upload shows
   "Preparing image… / Making the share image…" and fills ogImageUrl; "Create share images" converts all
   9 entries; `curl -A WhatsApp https://thevillagersnotes.com/entries/<id>` shows the small share image
   (<300 KB) with type/size tags; /projects: pay flow → player appears; refresh keeps it; second browser
   asks to pay; Paid readers → Give access link opens the player once; Revoke locks it.
5. **Confirm the play link works as an embed** (uploader may have disabled embedding; the fallback link
   covers that). Confirm `PLAY_PRIVATE_LINK` is set in Vercel or save the link in admin Settings.
6. **Board:** DECISIONS_LOG — rule 1.6 (the link now also reaches VERIFIED buyers via `/api/get-content`,
   still never public or committed), 1.7 (preview uses `og_image_url`, ~250 KB), 1.1 (the play uses the
   same one-device rule); dated Section 2 entry quoting Ian; `state.md` session row + open items
   (Bunny Stream later; ask Vic for the original video file).
7. `node F:\Work\.studio\security\ship-check.mjs "F:\Work\Websites\Vic" --audit` (exit 0), open a PR,
   Ian merges (agent merges are blocked). After merge confirm the production deployment status on
   `main` succeeded (a failed deploy silently keeps the old build).

## Later (not this PR)
Bunny Stream for the play (expiring, domain-locked playback; needs Vic's original file + an account);
then retire the YouTube link, the Settings play-link field and "Email the private link".
