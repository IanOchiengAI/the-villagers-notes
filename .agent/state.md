# Project State — Vic Munala / The Villager's Notes

> Created: 2026-08-13
> Project folder: `F:\Work\Brands\Vik\`
> Note: This project lives in Brands/, not the standard Websites/ — deliberate.

---

## Client Profile

| Field | Value |
|-------|-------|
| **Client Name** | Vic Munala |
| **Brand Name** | The Villager's Notes |
| **Location** | Nairobi, Kenya |
| **Industry** | Fiction / Theatre / Literary Writing |
| **Works** | Novel: *Under the Mango Tree* (2024), Play: *Beneath the Surface* (2026) |
| **Contact Email** | TBD — either hello@vicMunala.com or hello@villagersnotes.com (decide one) |
| **WhatsApp Number** | TBD — placeholder 254XXXXXXXXX in book.js and projects.js |

---

## Project Details

| Field | Value |
|-------|-------|
| **Domain** | TBD — vicmunala.com or thevillagersnotes.com |
| **Hosting** | Vercel |
| **Live URL** | https://the-villagers-notes.vercel.app |
| **GitHub Repo** | https://github.com/IanOchiengAI/the-villagers-notes |
| **Local Dev** | http://localhost:5174 (npm run dev) |
| **Vite dev server** | Running as background task — restart if needed |

---

## Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| **Framework** | Vite + Vanilla JS | Studio default; no overkill for a personal site |
| **Styling** | Vanilla CSS | Studio default |
| **Fonts** | Caveat (handwriting), Playfair Display (serif), Inter (sans) | Matches Vic's Lovable aesthetic |
| **Backend** | Vercel Serverless Functions | M-Pesa STK keys must be server-side |
| **Payment** | Safaricom Daraja API (M-Pesa STK push) | Client requirement |
| **Newsletter** | Buttondown (ready to wire) | Simplest for writers; api/subscribe.js already built |
| **Deployment** | Vercel | Client preference |

---

## Decisions Made

| Date | Decision | Reason |
|------|----------|--------|
| 2026-08-13 | Project lives at F:\Work\Brands\Vik\ not Websites\ | Client is a brand, not a studio website project |
| 2026-08-13 | Full rebuild (not editing Lovable source) | Lovable code not exportable; rebuild gives full control |
| 2026-08-13 | STK push via Vercel serverless functions | Daraja API keys must never be in frontend code |
| 2026-08-13 | Matched Lovable design language exactly | Client said he likes the Lovable home and entries pages |
| 2026-08-13 | Brand name = "The Villager's Notes" (not "Vic Munala") | Taken from Lovable site — client's chosen brand identity |
| 2026-08-13 | Caveat handwriting font for all titles | Core to the Lovable aesthetic Vic approved |
| 2026-08-13 | Accent color = mango yellow hsl(44,95%,52%) | Client explicitly said "he likes this yellow" |
| 2026-08-13 | Signed copies + "why buy direct" on book page | Standard author direct-sales best practice |
| 2026-08-13 | Newsletter via api/subscribe.js → Buttondown | Owns the list; Buttondown simplest for writers |
| 2026-08-14 | Font changed Caveat → Shadows Into The Light | Vic's explicit preference for his title font |
| 2026-08-14 | Hero squeezed to max-width:340px, 4-line format | Client wants dead space on the sides, not full-width |
| 2026-08-14 | Nav pages = Entries + Projects only | Client removed Get the Book from nav |
| 2026-08-14 | Newsletter moved from home to Entries page bottom | Client wants home uncluttered; entries is where readers are |
| 2026-08-14 | Footer stripped: light bg, copyright + social icons only | Client hates clutter; icons not names; no black bg |
| 2026-08-14 | Footer shared component across ALL pages | Client wants consistent footer everywhere |
| 2026-08-14 | Projects page: no filter pills, no Selected Work, synopsis via Read more toggle | Client prefers clean, minimal approach |
| 2026-08-14 | Projects layout: image top, synopsis below (consistent for both play and book) | Consistency between all project entries |
| 2026-08-14 | Soda tip: "Buy me a soda" (not "Buy Vic a soda") | Vic's voice; first-person feels more personal |
| 2026-08-14 | Soda tip moved to bottom of Projects page | Client wanted it there, not just on book page |
| 2026-08-14 | "Why buy directly" block removed from book page | Client said "toa" (remove) — too much copy |

---

## Open Items

- [ ] **BLOCKER** — Get Safaricom Daraja **production** credentials (Consumer Key, Secret, Passkey, Shortcode)
- [ ] **BLOCKER** — Choose and connect domain (vicmunala.com or thevillagersnotes.com)
- [ ] Decide on single email address (vicmunala.com or villagersnotes.com)
- [ ] Update social links (Twitter/X, Instagram) in home.js footer
- [ ] Create Buttondown account + add BUTTONDOWN_API_KEY to Vercel env vars
- [ ] Provide Chapter 1 excerpt for book page (add text via Admin → Book tab)
- [ ] Submit sitemap to Google Search Console after launch
- [ ] Collect KSh 10,000 deposit from Vic (M-Pesa to +254 713 812 392)
- [ ] Post-launch checklist (see KNOWLEDGE.md)
- [ ] Vic to provide additional photos for projects page (he's looking)
- [x] ~~Deploy to Vercel and GitHub~~ — https://the-villagers-notes.vercel.app & https://github.com/IanOchiengAI/the-villagers-notes
- [x] ~~Replace WhatsApp placeholder with Vic's real number~~ — 254710276333 updated across book.js, projects.js, and whatsapp-fab.js
- [x] ~~Get book title, price, cover image~~ — Under the Mango Tree, KES 1,500, cover in /images/
- [x] ~~Get theatre images~~ — play-scene-1.png and play-scene-2.png confirmed in /images/
- [x] ~~Replace dummy content with real content~~ — all pages have real Vic Munala content
- [x] ~~Admin CMS page~~ — built at #/admin, password: village2026
- [x] ~~Newsletter API~~ — api/subscribe.js → Buttondown (needs API key)
- [x] ~~Kasuku proposal~~ — kasuku_proposal_vic_munala.pdf ready to send, KSh 20,000 total

---

## Session Log

| Date | What Was Done |
|------|---------------|
| 2026-08-13 | Session 1: Initial setup & full build — gathered brief, scaffolded Vite project, built all pages/components & Vercel STK functions, verified build. |
| 2026-08-13 | Session 2: Design overhaul — matched Lovable aesthetic (Caveat font, centered hero, minimal nav), rebuilt Home/Entries/Projects/Book with real Vic Munala content and images. |
| 2026-08-13 | Session 3: Content & UX — added full entry body text, clickable entry detail pages, prev/next navigation, reading time, progress bar, share button, newsletter component, dynamic OG/title tags, JSON-LD schema, "why buy direct" panel, signed copy checkbox, WhatsApp fallback on book page. Newsletter wired to api/subscribe.js → Buttondown (awaiting API key). |
| 2026-08-13 | Session 4: Admin CMS, proposal & pricing — built password-protected admin page (#/admin, pw: village2026) with entry CRUD and book settings editor. Built Kasuku proposal PDF (KSh 20,000, 50/50 payment, Ian Ochieng sign-off). Fixed name typo Mumala → Munala across all 6 files. |
| 2026-08-13 | Session 5: Developer audit, mobile responsiveness, GitHub + Vercel deployment — fixed ghost admin so public pages read localStorage, created missing stk-status endpoint, fixed mobile menu close bug, fixed projects page mobile stacking, connected GitHub repo and Vercel CI/CD production domain, updated Vic's real WhatsApp number (0710276333). |
| 2026-08-13 | Session 6: Admin customer tracking, calendar picker, proposal polish — built People & Orders tracking tab in admin with order dispatch statuses and email list export. Upgraded Admin date input to native calendar with auto British/Kenyan formatting. Fixed CSS spacing scale tokens (--space-5, --space-10). Replaced proposal emojis with bespoke studio SVG line icons, removed developer jargon, and highlighted done-for-you tracking support in proposal PDF. |
| 2026-08-14 | Session 7: Design refinements from Vic's notes & full mobile audit — Shadows Into The Light font; hero squeezed to 4-line format with dead space; nav stripped to Entries + Projects only; home cleaned (no identity para, no subscribe); newsletter moved to Entries with 'sign up for random good things' copy; footer rebuilt as minimal light strip with social icons on all pages; projects page cleaned (no filter pills, no Selected Work, Read more synopsis toggles, consistent image-top layout); soda tip renamed Buy me a soda and added to Projects; Why buy directly removed from book page. Verified full mobile interactivity & admin CMS suite. |
| 2026-08-18 | Session 8: Full pixel-perfect alignment with Vic's Lovable preview — adjusted global container width to 720px (tight central column with dead space); updated header with dark charcoal logo and tracked uppercase links; matched exact hero quote line breaks/casing; implemented 2-column editorial project layout (metadata sidebar + right media gallery); rebuilt "Buy me soda madiaba" card and "Write to me" contact section; matched footer with TikTok, Instagram, X icons + EMAIL. Verified desktop and mobile viewports. |

---

## Lessons From This Project

- When client says "I like the Lovable design", do a deep visual audit of the Lovable site before building — inspect fonts, exact copy, layout rules, not just the general vibe.
- Writer personal sites need: newsletter capture, entry detail pages, prev/next nav, reading time. These are table stakes, not extras.
- "Why buy direct" + signed copy checkbox on book pages meaningfully improves perceived value even before a single order is placed.
