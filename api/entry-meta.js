export default async function handler(req, res) {
  // Extract slug from query or URL
  let slug = req.query?.slug;
  if (!slug && req.url) {
    const match = req.url.match(/\/entries\/([^/?#]+)/);
    if (match) slug = match[1];
  }

  if (!slug) {
    return res.redirect(302, '/#/entries');
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  let title = "The Villager's Notes";
  let description = "You can remove a person from the village, but you can never remove the village from a person. We are all villagers, aren't we?";
  let canonicalSlug = slug;

  if (supabaseUrl && supabaseKey) {
    try {
      const r = await fetch(
        `${supabaseUrl}/rest/v1/entries?or=(slug.eq.${encodeURIComponent(slug)},id.eq.${encodeURIComponent(slug)})&select=id,slug,title,excerpt,category,price&limit=1`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            Accept: 'application/json',
          },
        }
      );
      if (r.ok) {
        const rows = await r.json();
        if (Array.isArray(rows) && rows[0]) {
          const e = rows[0];
          title = `${e.title} — The Villager's Notes`;
          if (e.excerpt) description = e.excerpt;
          if (e.slug) canonicalSlug = e.slug;
        }
      }
    } catch (err) {
      console.error('[entry-meta] Supabase fetch error:', err);
    }
  }

  const siteUrl = 'https://thevillagersnotes.com';
  const ogImage = `${siteUrl}/images/og-vn.png`;
  const canonicalUrl = `${siteUrl}/entries/${canonicalSlug}`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');

  function escHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(title)}</title>
  <meta name="description" content="${escHtml(description)}" />
  <meta property="og:type"        content="article" />
  <meta property="og:url"         content="${canonicalUrl}" />
  <meta property="og:site_name"   content="The Villager's Notes" />
  <meta property="og:title"       content="${escHtml(title)}" />
  <meta property="og:description" content="${escHtml(description)}" />
  <meta property="og:image"       content="${ogImage}" />
  <meta property="og:image:width"  content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card"        content="summary_large_image" />
  <meta name="twitter:title"       content="${escHtml(title)}" />
  <meta name="twitter:description" content="${escHtml(description)}" />
  <meta name="twitter:image"       content="${ogImage}" />
  <link rel="canonical" href="${canonicalUrl}" />
  <script>location.replace('/#/entries/${encodeURIComponent(canonicalSlug)}');</script>
</head>
<body>
  <p>Redirecting to <a href="/#/entries/${encodeURIComponent(canonicalSlug)}">${escHtml(title)}</a>...</p>
</body>
</html>`;

  return res.status(200).send(html);
}
