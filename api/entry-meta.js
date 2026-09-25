// Serves per-entry Open Graph tags to link-preview bots, then sends browsers
// to the hash-routed SPA. SECURITY: `slug` comes straight from the URL, so it is
// whitelisted before it goes anywhere near a PostgREST filter or inline script.

import { fetchT, isSafeSlug, escHtml } from './_util.js';

export default async function handler(req, res) {
  let slug = req.query?.slug;
  if (!slug && req.url) {
    const match = req.url.match(/\/entries\/([^/?#]+)/);
    if (match) {
      try { slug = decodeURIComponent(match[1]); } catch { slug = ''; }
    }
  }

  if (!isSafeSlug(slug)) {
    return res.redirect(302, '/#/entries');
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  const siteUrl = 'https://thevillagersnotes.com';
  let title = "The Villager's Notes";
  let description = "You can remove a person from the village, but you can never remove the village from a person. We are all villagers, aren't we?";
  let canonicalSlug = slug;
  let ogImage = `${siteUrl}/images/og-vn.png`;
  let heading = "";
  let paragraphs = []; // public text only: free entries in full, paid entries just their preview
  let isPaid = false;

  if (supabaseUrl && supabaseKey) {
    try {
      // slug is [A-Za-z0-9_-] only, so it cannot inject filter syntax. Two plain
      // eq lookups instead of a composite or=() filter.
      const q = (col) =>
        fetchT(
          `${supabaseUrl}/rest/v1/entries?${col}=eq.${slug}&select=id,slug,title,excerpt,price,body&limit=1`,
          { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, Accept: 'application/json' } },
          6000
        ).then((r) => (r.ok ? r.json() : []));
      let rows = await q('slug');
      if (!Array.isArray(rows) || !rows[0]) rows = await q('id');
      if (Array.isArray(rows) && rows[0]) {
        const e = rows[0];
        heading = String(e.title || "");
        isPaid = Number(e.price) > 0;
        paragraphs = Array.isArray(e.body) ? e.body.filter((p) => typeof p === "string").slice(0, 40) : [];
        title = `${e.title} — The Villager's Notes`;
        if (e.excerpt) description = e.excerpt;
        if (e.slug && isSafeSlug(e.slug)) canonicalSlug = e.slug;
        // No per-entry image: the entries table has no image_url column (asking for it made the whole lookup fail).
      }
    } catch (err) {
      console.error('[entry-meta] Supabase fetch error:', err);
    }
  }

  const canonicalUrl = `${siteUrl}/entries/${canonicalSlug}`;
  const target = `/#/entries/${canonicalSlug}`;

  // Article structured data (paid entries are flagged so search engines treat the paywall as legitimate).
  const ldJson = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: heading,
    description,
    author: { '@type': 'Person', name: 'Vic Munala' },
    mainEntityOfPage: canonicalUrl,
    image: ogImage,
    isAccessibleForFree: !isPaid,
  }).replace(/</g, '\\u003c');

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=3600');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(title)}</title>
  <meta name="description" content="${escHtml(description)}" />
  <meta property="og:type"        content="article" />
  <meta property="og:url"         content="${escHtml(canonicalUrl)}" />
  <meta property="og:site_name"   content="The Villager's Notes" />
  <meta property="og:title"       content="${escHtml(title)}" />
  <meta property="og:description" content="${escHtml(description)}" />
  <meta property="og:image"       content="${escHtml(ogImage)}" />
  <meta property="og:image:width"  content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card"        content="summary_large_image" />
  <meta name="twitter:title"       content="${escHtml(title)}" />
  <meta name="twitter:description" content="${escHtml(description)}" />
  <meta name="twitter:image"       content="${escHtml(ogImage)}" />
  <link rel="canonical" href="${escHtml(canonicalUrl)}" />
${heading ? `  <script type="application/ld+json">${ldJson}</script>\n` : ''}  <script>location.replace(${JSON.stringify(target).replace(/</g, '\\u003c')});</script>
</head>
<body>
${heading ? `  <article>
    <h1>${escHtml(heading)}</h1>
    ${paragraphs.map((p) => `<p>${escHtml(p)}</p>`).join('\n    ')}
    ${isPaid ? '<p><em>The rest of this entry is available to read on the site.</em></p>' : ''}
  </article>
  ` : ''}<p>Continue to <a href="${escHtml(target)}">${escHtml(title)}</a>...</p>
</body>
</html>`;

  return res.status(200).send(html);
}
