// /sitemap.xml — generated from the entries table so new entries are listed
// automatically. Entry URLs use the path form (/entries/<slug>), which is what
// crawlers can actually index (see api/entry-meta.js); hash URLs are invisible to Google.

import { fetchT, escHtml, isSafeSlug } from './_util.js';

const SITE = 'https://thevillagersnotes.com';

export default async function handler(req, res) {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  let rows = [];
  if (url && key) {
    try {
      const r = await fetchT(
        `${url}/rest/v1/entries?select=slug,id,created_at&order=sort_order.desc,created_at.desc&limit=1000`,
        { headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' } },
        6000
      );
      if (r.ok) rows = await r.json();
    } catch (err) {
      console.error('[sitemap] fetch failed:', err);
    }
  }

  const statics = [
    { loc: `${SITE}/`, freq: 'weekly', pri: '1.0' },
    { loc: `${SITE}/entries`, freq: 'weekly', pri: '0.9' },
    { loc: `${SITE}/projects`, freq: 'monthly', pri: '0.8' },
    { loc: `${SITE}/book`, freq: 'monthly', pri: '0.8' },
    { loc: `${SITE}/privacy`, freq: 'yearly', pri: '0.3' },
  ];
  const entryUrls = (Array.isArray(rows) ? rows : [])
    .map((e) => ({ slug: e.slug || e.id, at: e.created_at }))
    .filter((e) => isSafeSlug(e.slug))
    .map((e) => ({ loc: `${SITE}/entries/${e.slug}`, freq: 'monthly', pri: '0.7', at: e.at }));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...statics, ...entryUrls].map((u) => `  <url>
    <loc>${escHtml(u.loc)}</loc>${u.at ? `\n    <lastmod>${new Date(u.at).toISOString().slice(0, 10)}</lastmod>` : ''}
    <changefreq>${u.freq}</changefreq>
    <priority>${u.pri}</priority>
  </url>`).join('\n')}
</urlset>
`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).send(xml);
}
