// /entries/:slug — serves the real app shell (dist/index.html) with THIS entry's title,
// description, link-preview tags, structured data and the public text already in the page.
//
// Why: crawlers (Google, WhatsApp, X) don't run the app, so they used to see an empty
// page. Browsers get the same HTML and the app then takes over in place.
//
// SECURITY: `slug` comes straight from the URL, so it is whitelisted before it goes near a
// PostgREST filter, and every value put into the HTML is escaped. Only PUBLIC columns are read
// (`body` holds a paid entry's preview only; `full_body` is never selected here).

import fs from 'node:fs';
import path from 'node:path';
import { fetchT, isSafeSlug, escHtml } from './_util.js';

const SITE = 'https://thevillagersnotes.com';
const DEFAULT_TITLE = "The Villager's Notes";
const DEFAULT_DESC = "You can remove a person from the village, but you can never remove the village from a person. We are all villagers, aren't we?";
const DEFAULT_IMAGE = `${SITE}/images/og-vn.png`;

let shellCache = null;

/** The built index.html (shipped with this function via vercel.json `includeFiles`). */
async function loadShell() {
  if (shellCache) return shellCache;
  const candidates = [
    path.join(process.cwd(), 'dist', 'index.html'),
    path.join(process.cwd(), 'index.html'),
  ];
  for (const p of candidates) {
    try {
      const html = fs.readFileSync(p, 'utf8');
      // The source index.html has no built assets; only trust a build output.
      if (html.includes('/assets/')) { shellCache = html; return html; }
    } catch (_) {}
  }
  try {
    const r = await fetchT(`${SITE}/index.html`, {}, 4000);
    if (r.ok) {
      const html = await r.text();
      if (html.includes('/assets/')) { shellCache = html; return html; }
    }
  } catch (_) {}
  return null;
}

// ── Server-side text formatting: same subset the reader page supports ───────
function inline(text) {
  return escHtml(text)
    .replace(/&lt;u&gt;([\s\S]+?)&lt;\/u&gt;/g, '<u>$1</u>')
    .replace(/\n/g, '<br />')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/__(.+?)__/g, '<u>$1</u>');
}
function paragraph(p) {
  const t = String(p).trim();
  if (t === '---' || t === '***' || t === '___') return '<div class="scene-break" role="separator">⁂</div>';
  if (t.startsWith('>')) return `<blockquote>${inline(t.replace(/^>\s*/, ''))}</blockquote>`;
  return `<p>${inline(p)}</p>`;
}
function previewParagraphs(paragraphs, maxWords) {
  const out = [];
  let count = 0;
  for (const para of paragraphs) {
    if (count >= maxWords) break;
    const words = para.trim().split(/\s+/).filter(Boolean);
    if (count + words.length <= maxWords) { out.push(para); count += words.length; }
    else { const rest = maxWords - count; if (rest > 0) out.push(words.slice(0, rest).join(' ')); break; }
  }
  return out.length ? out : paragraphs.slice(0, 1);
}

function articleHtml(e, isPaid, paragraphs) {
  const shown = isPaid ? previewParagraphs(paragraphs, Number(e.preview_words) > 0 ? Number(e.preview_words) : 100) : paragraphs;
  const meta = [e.category, e.entry_date].filter(Boolean).map((s) => String(s).toUpperCase()).concat([`BY ${String(e.author || 'Vic Munala').toUpperCase()}`]).join(' · ');
  return `<article class="entry-page" data-cat="${escHtml(e.category || '')}"><div class="container">
<div><a href="/entries" class="label back-link">← ENTRIES</a></div>
<div class="label entry-meta">${escHtml(meta)}</div>
<h1 class="entry-title">${escHtml(e.title)}</h1>
<p class="entry-standfirst">${escHtml(e.excerpt || '')}</p>
<div class="prose-note entry-body" id="entry-body">${shown.map(paragraph).join('')}${isPaid ? '<p><em>The rest of this entry is available to read on the site.</em></p>' : ''}</div>
</div></article>`;
}

/** Put this entry's tags and content into the built shell. */
function render(shell, { title, description, canonicalUrl, image, article, ld }) {
  let html = shell
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escHtml(title)}</title>`)
    .replace(/<meta\s+name="description"[^>]*>\s*/gi, '')
    .replace(/<meta\s+property="og:[^"]*"[^>]*>\s*/gi, '')
    .replace(/<meta\s+name="twitter:[^"]*"[^>]*>\s*/gi, '')
    .replace(/<link\s+rel="canonical"[^>]*>\s*/gi, '');
  const head = `
  <meta name="description" content="${escHtml(description)}" />
  <link rel="canonical" href="${escHtml(canonicalUrl)}" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="${escHtml(canonicalUrl)}" />
  <meta property="og:site_name" content="${escHtml(DEFAULT_TITLE)}" />
  <meta property="og:title" content="${escHtml(title)}" />
  <meta property="og:description" content="${escHtml(description)}" />
  <meta property="og:image" content="${escHtml(image)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escHtml(title)}" />
  <meta name="twitter:description" content="${escHtml(description)}" />
  <meta name="twitter:image" content="${escHtml(image)}" />${ld ? `\n  <script type="application/ld+json">${ld}</script>` : ''}
`;
  html = html.replace('</head>', `${head}</head>`);
  if (article) {
    html = html.replace(/<main id="app"><\/main>/, () => `<main id="app" data-ssr="1">${article}</main>`);
  }
  return html;
}

export default async function handler(req, res) {
  let slug = req.query?.slug;
  if (!slug && req.url) {
    const match = req.url.match(/\/entries\/([^/?#]+)/);
    if (match) {
      try { slug = decodeURIComponent(match[1]); } catch { slug = ''; }
    }
  }
  if (!isSafeSlug(slug)) return res.redirect(302, '/entries');

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  let row = null;
  let lookupFailed = false;
  if (supabaseUrl && supabaseKey) {
    try {
      // slug is [A-Za-z0-9_-] only, so it cannot inject filter syntax. Two plain eq lookups.
      const q = async (col) => {
        const r = await fetchT(
          `${supabaseUrl}/rest/v1/entries?${col}=eq.${slug}&select=id,slug,title,excerpt,category,entry_date,author,price,preview_words,body&limit=1`,
          { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, Accept: 'application/json' } },
          6000
        );
        if (!r.ok) throw new Error(`supabase ${r.status}`);
        return r.json();
      };
      let rows = await q('slug');
      if (!Array.isArray(rows) || !rows[0]) rows = await q('id');
      row = Array.isArray(rows) && rows[0] ? rows[0] : null;
    } catch (err) {
      lookupFailed = true;
      console.error('[entry-meta] Supabase fetch error:', err);
    }
  } else {
    lookupFailed = true;
  }

  const shell = await loadShell();
  const canonicalSlug = row && row.slug && isSafeSlug(row.slug) ? row.slug : slug;
  const canonicalUrl = `${SITE}/entries/${canonicalSlug}`;

  // No shell (should not happen in production): send people to the app, which upgrades #/ links itself.
  if (!shell) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(
      `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${escHtml(row ? `${row.title} — ${DEFAULT_TITLE}` : DEFAULT_TITLE)}</title>` +
      `<meta http-equiv="refresh" content="0;url=/#/entries/${encodeURIComponent(canonicalSlug)}"></head>` +
      `<body><a href="/#/entries/${encodeURIComponent(canonicalSlug)}">Continue to the entry</a></body></html>`
    );
  }

  // Unknown entry: a real 404 for crawlers; the app shows its own "not found" page.
  if (!row && !lookupFailed) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=60');
    return res.status(404).send(render(shell, {
      title: `Entry not found — ${DEFAULT_TITLE}`, description: DEFAULT_DESC, canonicalUrl: `${SITE}/entries`, image: DEFAULT_IMAGE, article: '', ld: '',
    }));
  }

  // Lookup failed (Supabase down): serve the plain app so it can try for itself.
  if (!row) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(render(shell, {
      title: DEFAULT_TITLE, description: DEFAULT_DESC, canonicalUrl, image: DEFAULT_IMAGE, article: '', ld: '',
    }));
  }

  const isPaid = Number(row.price) > 0;
  const paragraphs = Array.isArray(row.body) ? row.body.filter((p) => typeof p === 'string').slice(0, 400) : [];
  const description = row.excerpt || DEFAULT_DESC;
  const title = `${row.title} — ${DEFAULT_TITLE}`;
  const ld = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: row.title,
    description,
    author: { '@type': 'Person', name: row.author || 'Vic Munala' },
    mainEntityOfPage: canonicalUrl,
    image: DEFAULT_IMAGE,
    isAccessibleForFree: !isPaid,
  }).replace(/</g, '\\u003c');

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=3600');
  return res.status(200).send(render(shell, {
    title, description, canonicalUrl, image: DEFAULT_IMAGE, article: articleHtml(row, isPaid, paragraphs), ld,
  }));
}
