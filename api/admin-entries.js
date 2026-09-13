// /api/admin-entries.js
// Vercel serverless function — the ONLY way entries get written now that
// anon has no insert/update/delete grant on the entries table (see the
// 2026-09-13 RLS lockdown). Requires a signed admin token from /api/admin-auth
// and writes via the Supabase service role key, which bypasses RLS/grants.

import { verifyToken } from './_admin-token.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { token, action, entry, entryId, fullBody } = req.body || {};

  if (!verifyToken(token)) {
    return res.status(401).json({ error: 'Unauthorized — please log in again' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Server not configured: SUPABASE_SERVICE_ROLE_KEY is missing in Vercel env vars' });
  }

  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  };

  try {
    if (action === 'upsert') {
      if (!entry || typeof entry !== 'object' || !entry.id) {
        return res.status(400).json({ error: 'Missing or invalid entry' });
      }
      const r = await fetch(`${supabaseUrl}/rest/v1/entries?on_conflict=id`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(entry),
      });
      if (!r.ok) {
        const errText = await r.text();
        console.error('[admin-entries] upsert error:', errText);
        return res.status(502).json({ error: 'Failed to save entry' });
      }
      return res.status(200).json({ ok: true });
    }

    if (action === 'upsert_full_body') {
      if (!entryId || typeof entryId !== 'string' || !Array.isArray(fullBody) || fullBody.length === 0) {
        return res.status(400).json({ error: 'Missing entryId or fullBody' });
      }
      const r = await fetch(`${supabaseUrl}/rest/v1/entries?id=eq.${encodeURIComponent(entryId)}`, {
        method: 'PATCH',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify({ full_body: fullBody }),
      });
      if (!r.ok) {
        const errText = await r.text();
        console.error('[admin-entries] upsert_full_body error:', errText);
        return res.status(502).json({ error: 'Failed to save full article body' });
      }
      return res.status(200).json({ ok: true });
    }

    if (action === 'delete') {
      if (!entryId || typeof entryId !== 'string') {
        return res.status(400).json({ error: 'Missing entryId' });
      }
      const r = await fetch(`${supabaseUrl}/rest/v1/entries?id=eq.${encodeURIComponent(entryId)}`, {
        method: 'DELETE',
        headers,
      });
      if (!r.ok) {
        const errText = await r.text();
        console.error('[admin-entries] delete error:', errText);
        return res.status(502).json({ error: 'Failed to delete entry' });
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (err) {
    console.error('[admin-entries] Error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
