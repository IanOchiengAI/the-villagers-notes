// Vercel serverless function — newsletter signup.
// Saves the address to Supabase (the source of truth for the admin list) and
// sends Vic an alert through Formspree. Reports success only if at least one
// of the two actually stored it.
//
// Env: FORMSPREE_FORM_ID (optional), SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_URL

import { fetchT, clientIp, allow, tooMany } from './_util.js';

const EMAIL_RE = /^[^\s@<>"'(),;:\\]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9.-]{0,253}[A-Za-z0-9])?\.[A-Za-z]{2,}$/;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!allow(`sub:${clientIp(req)}`, 5, 10 * 60_000)) return tooMany(res);

  const raw = req.body?.email;
  const email = typeof raw === 'string' ? raw.trim().toLowerCase() : '';

  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  const formId = process.env.FORMSPREE_FORM_ID || 'xwlpqzle';
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  let stored = false;
  let already = false;

  // 1. Supabase (dedupe-aware). Look first so "already subscribed" is reported truthfully
  //    and Vic isn't alerted twice for the same address.
  if (supabaseUrl && supabaseKey) {
    try {
      const h = { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, Accept: 'application/json' };
      const existing = await fetchT(
        `${supabaseUrl}/rest/v1/subscribers?email=eq.${encodeURIComponent(email)}&select=id&limit=1`,
        { headers: h },
        6000
      );
      const found = existing.ok ? await existing.json() : null;
      if (Array.isArray(found) && found.length > 0) {
        return res.status(200).json({ ok: true, already: true });
      }
      const dbRes = await fetchT(`${supabaseUrl}/rest/v1/subscribers?on_conflict=email`, {
        method: 'POST',
        headers: { ...h, 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=minimal' },
        body: JSON.stringify({ email }),
      }, 6000);
      if (dbRes.ok) stored = true;
      else console.error('[subscribe] Supabase error:', await dbRes.text());
    } catch (err) {
      console.error('[subscribe] Supabase exception:', err);
    }
  }

  // 2. Alert Vic via Formspree (best effort)
  try {
    const fsRes = await fetchT(`https://formspree.io/f/${formId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        email,
        _subject: 'New Newsletter Subscriber',
        message: `New reader subscribed to The Villager's Notes:\n\nEmail: ${email}\nDate: ${new Date().toISOString()}`,
        _replyto: email,
      }),
    }, 6000);
    if (fsRes.ok) stored = true;
    else console.error('[subscribe] Formspree error:', await fsRes.text());
  } catch (err) {
    console.error('[subscribe] Formspree exception:', err);
  }

  if (!stored) {
    return res.status(502).json({ error: 'Could not save your email right now. Please try again in a moment.' });
  }
  return res.status(200).json({ ok: true, already });
}
