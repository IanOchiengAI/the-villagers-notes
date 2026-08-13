# Kasuku Studio — Knowledge Base

> The studio's second brain. Every agent reads this at the start of every session.
> Do not edit directly during a session. Add new lessons at the bottom of the relevant section.
> Last updated: 2026-07-20

---

## Tool & API Preferences

| Tool / API | Verdict | Notes |
|------------|---------|-------|
| Firebase | ✅ Preferred backend | Default choice for auth, database, and hosting on Kasuku projects |
| Vite | ✅ Preferred build tool | Use for new sites unless client specifies otherwise |
| Groq API | ✅ Easier to integrate | Preferred over Gemini for chat-based features on client sites |
| Gemini API | ⚠️ Use with caution | More complex setup — reserve for AI-heavy features where Groq falls short |
| TailwindCSS | ⚠️ Only if requested | Default to Vanilla CSS + Google Fonts. Tailwind adds complexity without clear gain |
| Google Analytics | ✅ Always add | Add tracking to every site post-launch |
| Google Search Console | ✅ Always connect | Submit sitemap on every launch |
| WhatsApp API | ✅ High priority | WhatsApp CTAs convert significantly better than contact forms for Kenyan clients |
| Google Maps Embed | ✅ Always add | Local businesses — customers expect to find them on a map |
| n8n | ✅ Preferred automation tool | Use for social media scheduling, API workflows, and business automation |
| PM2 | ✅ Always use with n8n | Keeps n8n running after terminal closes and survives reboots |

---

## Design Conventions

- **Typography**: Use Google Fonts. Preferred: `Inter`, `Outfit`, or `Roboto`. Never use browser defaults.
- **Colors**: Use curated HSL palettes. Avoid plain/generic red, blue, green.
- **CSS approach**: Vanilla CSS by default. No Tailwind unless explicitly requested by client.
- **Images**: Always compress all images before deployment — page speed is critical.
- **Animations**: Add subtle micro-animations and hover effects — they increase engagement and feel premium.
- **Dark mode / glassmorphism**: Use where appropriate to give a premium, modern feel.
- **Mobile first**: Most Kenyan users are on mobile. Always test on small screens.
- **Logo sizing**: Always test logo at 32px — small screens will break oversized logos.
- **Client Walls**: When designing text-based 'Trusted By' lists, avoid inline separators like dots (`·`) which break poorly when wrapping. Use pill-shaped chips with hover states for a cleaner, more professional look.
- **Grid Layouts**: For dynamic CSS Grid layouts mixing different sized cards (e.g., col-span-4 and col-span-2), always use `grid-flow-dense` (or `grid-auto-flow: dense`) to ensure smaller cards pack seamlessly into empty gaps.

---

## Kenyan Market Insights

- **WhatsApp CTAs** convert significantly better than contact forms. Always include a WhatsApp floating button or prominent link — don't make it the only CTA, but make it visible.
- **Google Maps embed**: Add to every local business site. Kenyan customers look for this.
- **Google Business Profile**: Every client should have this set up, services listed, and description filled.
- **Phone number & address (NAP)**: Always put the business name, address, and phone number in the footer. Critical for local SEO.
- **Chamber of commerce**: Advise every client post-launch to get listed with their local chamber of commerce.
- **SSL is non-negotiable**: Every site must have an SSL certificate before launch. Kenyan users distrust sites with browser warnings.
- **Language**: Most clients communicate in casual English or Swahili — match their tone.
- **Facebook Groups** are a major marketing channel for Kenyan SMEs. Advise clients to share Page posts to 2-3 relevant groups per day manually (Meta's API does not allow automated group posting).

---

## GEO (Generative Engine Optimization) & Modern SEO

- **Answer-First Content Architecture (BLUF):** For content to be cited in Google AI Overviews and RAG models, structure pages with H2/H3 question headers followed immediately by a bolded 45-75 word summary.
- **Entity Footprint & Citations:** To get recommended by ChatGPT, Claude, and Perplexity, B2B and service sites must prioritize listings on Clutch.co, active LinkedIn profiles, and local listicle roundups. AI models rely on synthesized third-party lists to verify recommendations.
- **NAP & Microdata:** Perfect Name, Address, and Phone (NAP) consistency across Google Business Profile, the website's JSON-LD schema, and local directories is non-negotiable for local pack rankings and Gemini search mapping.
- **`llms.txt` Deployment:** Always place a plain-text markdown `llms.txt` file in the public root folder summarizing pricing, services, and differentiators to help LLM scrapers understand the business structure efficiently.

---

## Post-Launch Checklist

Run through this after every site goes live. Do not skip steps:

- [ ] Connect Google Business Profile to Gemini
- [ ] Submit sitemap in Google Search Console
- [ ] Add all services to Google Business Profile + fill out description
- [ ] Set up Google Analytics and verify data is flowing
- [ ] Compress all images on the site
- [ ] Add Google Maps embed
- [ ] Fix all 404 pages (custom 404 page or proper redirects)
- [ ] Confirm SSL certificate is active and set to auto-renew
- [ ] Business name, address, and phone number visible in footer
- [ ] Verify llms.txt is deployed in the public/ root folder (crawled by LLMs)
- [ ] Verify structured JSON-LD schema contains Organization/Service details
- [ ] Format core page sections with H2/H3 question headers + BLUF summaries (GEO)
- [ ] Advise client to contact local chamber of commerce for listing

---

## Common Mistakes to Avoid

- ❌ Don't use Tailwind unless the client explicitly asks — it adds complexity and bloat
- ❌ Don't deploy without compressing images — slow sites lose users
- ❌ Don't skip the 404 page — it's a bad experience and hurts SEO rankings
- ❌ Don't forget footer NAP (Name, Address, Phone) — essential for local SEO
- ❌ Don't launch without SSL — browsers warn users and it kills trust immediately
- ❌ Don't use a plain contact form as the only CTA — always add WhatsApp
- ❌ Don't ignore mobile — test every layout on a small screen before launch

---

## Architecture & Project Setup

- All client websites live at `F:\Work\Websites\[Client Name]\`
- Every project should have a `.agent\state.md` file for client context
- Use `state_template.md` at `F:\Work\Websites\.agents\skills\project-state\state_template.md` to create new state files
- The `lessons_log.md` at `F:\Work\Websites\.agents\lessons_log.md` is for capturing raw lessons mid-session before generalising

---

## n8n Automation — Rules & Gotchas

These apply to any n8n workflow involving Google Sheets and Facebook/Meta APIs.

### Facebook / Meta API
- **Always use a Page Access Token, not a User Access Token.** User tokens expire in ~60 minutes. To get a permanent Page token: generate a User token in Graph API Explorer → run `GET /me/accounts` → copy the `access_token` value next to your Page. That token never expires.
- **Facebook Groups API is dead (since April 2024).** Meta shut it down permanently. No legitimate tool can post to groups you don't own. The only safe strategy is automating Page posts and manually sharing to groups.
- **Facebook Page ID**: Found directly in the About page URL — `facebook.com/profile.php?id=XXXXXXXXXX`. No API call needed.

### Google Sheets in n8n
- **Enable BOTH Google Sheets API and Google Drive API** in Google Cloud Console. Enabling only the Sheets API gives a 403 Forbidden error — n8n uses Drive API to list and find spreadsheets.
- **After importing any workflow from JSON**, all Google Sheets nodes reset to `By ID / gid=0`. Manually open each node, change Sheet from `By ID` to `From list`, and re-select the tab.
- **For Update Row operations**, set "Column to match on" to `row_number`. n8n automatically provides `row_number` on every row returned by "Get All Rows".

### n8n General
- **Wait node does not support milliseconds.** Valid units: `seconds`, `minutes`, `hours`, `days`. Use `randomMinutes` in Code nodes and set Wait unit to `minutes`.
- **Importing a workflow creates a new copy — it does not replace the existing one.** Delete the old workflow before importing, or edit nodes directly in the UI.
- **Always disable Wait/Jitter nodes during testing** (right-click → Disable). Re-enable before activating the scheduled workflow for production.
- **n8n stops when the terminal closes.** Always run it via PM2:
  ```powershell
  npm install -g pm2
  pm2 start "npx n8n start" --name "n8n"
  pm2 startup
  pm2 save
  ```

---

## GitOps & Scheduled Workflows (GitHub Actions)

- **GitHub Actions for Cron Jobs:** GitHub Actions is an excellent, 100% free alternative for running simple scheduled scripts (like checking a CSV and calling an API) in the cloud. You can schedule them using cron syntax in a `.yml` file.
- **Managing GitHub Action Minutes:** GitHub provides 2,000 free action minutes per month. Do not use long `sleep` or `setTimeout` delays (like 45-minute jitters) inside GitHub Actions, as you consume active runner time. Keep jitters to 1-5 minutes to save minutes while still bypassing basic bot detection.
- **Git as a Database (GitOps):** Instead of using Google Sheets API to store post statuses, you can track statuses directly in a CSV file in the GitHub repo. The GitHub Action script can read the CSV, post to Facebook, update the CSV, and `git commit & push` the changes back to the repository automatically. This eliminates the need for complex Google API OAuth setups.

---

## Lessons Log Reference

Raw lessons that haven't been fully integrated above are captured in:
```
F:\Work\Websites\.agents\lessons_log.md
```

- **Client Ghosting**: If a client ghosts after significant high-quality work is done, repurpose the project as a portfolio showcase piece (changing branding/names if necessary) rather than abandoning the code.
- **Vercel Screenshots**: When taking automated screenshots of Vercel or Next.js sites (e.g. via Playwright), always wait at least 8-10 seconds after network idle to account for serverless cold starts and entrance animations. This prevents capturing blank white screens.
- **Portfolio Images**: Rather than struggling with headless browser screenshots that may capture blank screens or loading states, check if the client provided high-quality hero assets or mockups. Using a real asset often looks much more premium in a portfolio than a literal screenshot.
- **Case Study Slugs**: Always double-check that slugs used in static arrays (like clientWall) match the actual case study slugs exactly, otherwise links will 404.
- **Portfolio Taxonomy**: When adding new projects to `caseStudies.ts` with novel `tag` values, always remember to add those tags to the `categories` array in `PortfolioPage.tsx`. Additionally, projects won't automatically appear on the `LandingPage.tsx` hero showcase/client wall — they must be added manually.

Review periodically and promote useful entries into the relevant section above.

- **Google AI Lab Applications**: When applying to Google's Africa Applied AI Lab, select "Education" as the field if the flagship product solves a social/knowledge problem — it's less competitive than "AI/ML" and aligns better with Google Africa's mission focus.
- **Application Positioning — Company vs. Product**: In accelerator/lab applications, distinguish clearly between the company (the applicant) and its flagship product (the demo). Positioning a single product as the company identity makes you look like a one-trick startup. Lead with the studio/company story, then showcase the product as the strongest proof of execution.
- **Supabase Secrets via CLI**: The Supabase CLI `secrets set` command requires the logged-in account to have owner/admin privileges on the project. If it fails with a privileges error, set secrets directly through the Supabase dashboard at supabase.com/dashboard/project/[project-ref]/settings/functions — it's faster anyway.
- **Brand Colors in AI-Generated Decks**: When using Gemini or any AI to generate pitch deck slides, always explicitly provide the exact hex codes from the project's CSS — never let the AI infer colors from the product name or content. AI tools will guess generic palettes otherwise.
- **Phased Pricing Strategy**: For Kenyan SME projects, pitch the build in distinct phases (e.g., Phase 1: Core Site + SEO, Phase 2: Admin/Automation, Phase 3: Scaling/Chatbot) rather than an all-in-one MVP. This makes the initial investment digestible for the client while protecting the studio's pricing standard.
- **Serverless Automation Architecture**: For simple social media distribution or data syncs, using Google Sheets to trigger a scheduled GitHub Actions workflow is a highly effective, zero-maintenance alternative to running n8n on a server.
- **Proposals — Use HTML not ReportLab**: NEVER use Python/ReportLab to generate client proposals. The output looks amateur and unprofessional. Instead, build the proposal as a **single `proposal.html` file** using the same CSS design system as the Waiga Joseph proposal (`F:\Work\Websites\Waiga Joseph\proposal.html`). The client opens it in Chrome and prints to PDF (`Ctrl+P → Save as PDF`). This gives pixel-perfect typography, Google Fonts, proper tables, green checkmark checklists, payment cards, and dark cover — matching a premium studio look. Key elements of the template: dark `#1A1A1A` cover page, `KASUKU.STUDIO` wordmark in white + green dot, `Plus Jakarta Sans` for headlines, `Inter` for body, `JetBrains Mono` for numbers/codes, green `#00B140` as primary accent, clean `thead tr { background: #1A1A1A }` tables with alternating row backgrounds, checklist items with CSS-drawn green circle checkmarks, payment cards with `.payment-card.featured { border-color: var(--green) }`, and a `@media print` block that hides the action bar and forces page breaks.
- **Deposit Before Work — No Exceptions**: Never begin building a site without receiving the deposit first. The Sani Solutions project was built in full before any payment was received. While the relationship made this workable, it is not a sustainable pattern. The deposit is what formally kicks off the engagement. The proposal and preview site are what convince the client to pay — not the fully built product.
- **Vite Config — New HTML Pages**: When adding new standalone HTML pages (e.g. `privacy.html`, `terms.html`) to a Vite project, they must be explicitly registered in `vite.config.ts` under `rollupOptions.input`. Otherwise the build will not include them and they will 404 in production.
- **Component Nav Initialisation on Sub-Pages**: When a site uses a shared JS nav component (`nav.js`), always verify that the initialisation script runs on every page — including deep sub-pages like case studies. The hamburger menu will appear but do nothing on pages where `initNav()` is not called. Test nav on at least one page per template type, not just the homepage.
- **Multi-Page Footer Updates via Script**: When a site-wide footer element needs to be added or changed (e.g. adding Privacy / Terms links), write a one-off Node or Python script to inject the change across all HTML files programmatically rather than editing each file manually. This also serves as a useful audit of which pages exist.
- **Legal Pages are Part of Every Package**: Privacy Policy and Terms & Conditions pages should be included as standard in every site — not treated as extras. They must be branded (matching the site's palette and typography), linked in every footer, and not redirect to a generic third-party policy page.
- **Discount Framing — Relationship vs. Category**: When giving a client a discount, never frame it as a category (e.g. "NGO rate" or "student rate") unless that is exactly what it is. If the discount comes from a working relationship or personal goodwill, say so explicitly: "partnership rate — a reflection of the trust we've built together." Clients feel valued by the relationship framing; they feel reduced by the category framing.
- **NGO/Consultancy Sites — Key Sections**: For edtech consultancies and African NGO-facing organisations, the most important site sections are: (1) a Case Studies / Our Work section with individual pages per project — not a gallery grid, (2) a geographic Impact section showing reach across countries (an interactive map beats a list of country names), (3) clear client/partner logos displayed prominently, and (4) a Contact form that stores submissions server-side — NGO decision-makers expect a paper trail.
- **Interactive Africa Map for Impact Pages**: For organisations working across multiple African countries, replace pill-tag country lists with a Leaflet.js interactive map. Plot the hub city (e.g. Nairobi) and each active country. Add hover tooltips with project counts. Style it to match the brand palette. This is far more impressive to NGO stakeholders than a bulleted list.
- **Supabase is the right choice for NGO/multi-role sites**: Sites with an admin panel, multiple staff users, stored form submissions, and analytics should use Supabase (PostgreSQL + Supabase Auth) rather than Firebase. Firebase is fine for simple read-heavy sites. Once you have role-based access control or relational data (submissions linked to users), reach for Supabase.
- **Preview Deployment as a Sales Tool**: Deploying a preview site (e.g. on Firebase's free `.web.app` subdomain) before formal sign-off gives the client something tangible to review and builds enormous confidence. Reference the preview URL prominently in the proposal. It reduces revision cycles and objections because the client is approving what they can already see, not imagining what they might get.
- **Tone in Proposals — Avoid Self-Congratulation**: Proposal copy should always centre the client, not the studio. Lines like "Most clients pay before seeing anything — you're different" sound arrogant even when well-intentioned. Replace with relationship-centred framing: "We've worked together long enough to know that trust goes both ways." The rule: if the sentence makes Kasuku Studio sound generous, rewrite it to make the client feel valued.

---

*This file is maintained automatically by the agent at the end of every session.*
*Owner can also edit directly at any time.*
