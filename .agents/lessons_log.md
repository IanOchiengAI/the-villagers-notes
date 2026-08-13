# Kasuku Studio — Lessons Log

> This is the raw inbox for new discoveries made during sessions.
> Agents append here during or after a project.
> The owner (or agent) reviews entries and promotes generalizable ones into KNOWLEDGE.md.

---

## How to Add a Lesson

Append a new entry in this format:

```
## YYYY-MM-DD — [Project Name or "General"]
- [Lesson learned — written as a general rule, not client-specific]
- [Another lesson]
- **Promoted to KNOWLEDGE.md?** Yes ✅ / No ❌ / Pending 🔄
```

---

## Log

## 2026-07-15 — General (Studio Setup)
- Post-launch checklist established: GSC sitemap, Google Business Profile (services + description), Google Analytics, image compression, Google Maps embed, 404 fix, SSL check, footer NAP, chamber of commerce listing.
- WhatsApp CTAs outperform contact forms for Kenyan local business clients.
- Google Maps embed is expected by Kenyan customers for local businesses.
- Always put business NAP (Name, Address, Phone) in the footer — critical for local SEO.
- SSL is non-negotiable — browsers warn users and it immediately kills trust.
- **Promoted to KNOWLEDGE.md?** Yes ✅

---

## 2026-07-18 — HarvestFarm Machineries (n8n + Facebook Automation)

- **Facebook Access Tokens expire in ~60 minutes.** Never paste the short-lived token from Graph API Explorer into n8n. Always run `GET /me/accounts` after generating a token — the `access_token` on the Page entry is a permanent Page Access Token that never expires.
- **n8n Wait node does NOT support milliseconds.** Only accepts: `seconds`, `minutes`, `hours`, `days`. Output `randomMinutes` from Code nodes and set Wait unit to `minutes`.
- **Google Sheets n8n integration requires BOTH Google Sheets API AND Google Drive API** enabled in Google Cloud Console. Enabling only Sheets gives a 403 Forbidden error.
- **After importing any n8n workflow from JSON, every Google Sheets node must be manually re-pointed.** Sheet field defaults to `By ID / gid=0`. Always change to `From list` and re-select the sheet tab after import.
- **n8n Update Row requires a Matching Column — use `row_number`.** n8n attaches `row_number` to every row read by "Get All Rows". This is the safest unique identifier for row updates.
- **Importing a workflow into n8n creates a duplicate, not a replacement.** Delete the old workflow first, or fix nodes directly in the UI to avoid confusion.
- **Facebook Groups API was permanently shut down by Meta in April 2024.** No tool can automate posting to groups you don't own. Correct strategy: automate Page posts via Graph API + manually share to 2-3 groups per day.
- **Always disable the Jitter Wait node during testing.** Right-click → Disable. Re-enable before going live — otherwise every test waits up to 45 minutes.
- **n8n stops when the terminal closes.** Use PM2 to keep it running permanently: `npm install -g pm2 && pm2 start "npx n8n start" --name "n8n" && pm2 startup && pm2 save`
- **Facebook Page ID is visible in the About page URL.** `facebook.com/profile.php?id=XXXXXXXXXX` — no API lookup needed.
- **Promoted to KNOWLEDGE.md?** Yes ✅

---

## 2026-07-23 — HarvestFarm Machineries (GitHub Actions vs n8n)

- **n8n Local vs Cloud:** If n8n runs locally on a desktop (via Docker or PM2), the machine *must* be powered on and awake for the cron schedules to trigger. For truly autonomous "set and forget" workflows without paying for cloud hosting, local n8n is not suitable.
- **GitHub Actions for Cron Jobs:** GitHub Actions is an excellent, 100% free alternative for running simple scheduled scripts (like checking a CSV and calling an API) in the cloud. You can schedule them using cron syntax in a `.yml` file.
- **Managing GitHub Action Minutes:** GitHub provides 2,000 free action minutes per month. Do not use long `sleep` or `setTimeout` delays (like 45-minute jitters) inside GitHub Actions, as you consume active runner time. Keep jitters to 1-5 minutes to save minutes while still bypassing basic bot detection.
- **Git as a Database (GitOps):** Instead of using Google Sheets API to store post statuses, you can track statuses directly in a CSV file in the GitHub repo. The GitHub Action script can read the CSV, post to Facebook, update the CSV, and `git commit & push` the changes back to the repository automatically. This eliminates the need for complex Google API OAuth setups.
- **Promoted to KNOWLEDGE.md?** Yes ✅
