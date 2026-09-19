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
- **Implementation:** Supabase `entries.full_body` (JSONB) holds the full text. `api/get-content.js` verifies the M-Pesa payment before returning it; `src/pages/entry.js` and `src/lib/supabase.js` call it. The full body is cached in `sessionStorage` for the session, and the `invoice_id` is kept in `localStorage` for re-verification on refresh. A different browser must pay again. Table writes and paywall data were locked down in `6499fb4`.
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

### 1.4 Public play pages stay editorial
- **Rule:** Public play details stay editorial. Live engagement counters appear only in the Admin Stats dashboard. The share button uses `navigator.share` with a clipboard fallback, there is no frosted-glass nav effect, and the share dropdown uses the classic Twitter name and bird logo.
- **Origin:** commits `6ea5051`, `0538082`, `ccb3040` (2026-08-24). Client wording not recorded in the repo.

### 1.5 Admin authentication is checked on the server
- **Rule:** The admin password is verified by the `/api/admin-auth` serverless function, never in browser code.
- **Origin:** `c055cc0` (2026-08-27).

### 1.6 Client documents are never committed
- **Rule:** Proposals and briefs stay out of git. `.gitignore` excludes `*proposal*`, `*Brief*`, `*brief*`, `*.pdf` and `scripts/build_proposal.py`. Keep it that way; this repo is public.
- **Origin:** `c055cc0` (2026-08-27).

### 1.7 Deployment Safeguards
*Checked 2026-09-19 against `vercel.json`, `.vercel/project.json`, `package.json` and a live request.*
- Vercel project: `the-villagers-notes`. Live domain: `thevillagersnotes.com` (HTTP 200); switched in `158997d`.
- Build: `vite build` (`npm run build`), a Vite single-page app plus serverless functions in `api/`.
- `vercel.json` sets security headers including a Content-Security-Policy. `connect-src` allows only `self`, `*.supabase.co`, `payment.intasend.com`, `www.google-analytics.com` and `formspree.io`. **Any new external service must be added to the CSP or the browser will block it.**
- The footer credit "SITE BY KASUKU STUDIO" (`fd0dca6`, 2026-09-14) is a studio decision: keep it subtle.

---

## 2. Chronological Decision & Feedback History

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

None recorded yet.

---

## 4. Maintenance Protocol for Future Sessions

When completing any change that alters user experience or incorporates client feedback:
1. **Append a new dated entry** under Section 2 with the client's request (quoted), the technical decision, files modified, and the commit hash or deploy note.
2. **Update Section 1** if a new permanent invariant or rule is established.
3. **Add to Section 3** if an option was raised and turned down.
4. **Re-verify Section 1.7** whenever a build, hosting, domain or CSP change is made.
5. Commit this file alongside the code changes it describes.
