// /api/like — shared like counter. Adds or removes ONE like on an entry and returns the new total.
// The database function `adjust_likes` (supabase/migrations/20260925_shared_likes.sql) does the
// atomic +/-1; it is only callable with the service-role key, so the browser can't skip this
// endpoint's limits. Per-device "already liked" state stays in the browser (localStorage), so
// this is friendly counting, not one-person-one-vote enforcement.

import { fetchT, safeJson, isSafeSlug, clientIp, allow, tooMany } from './_util.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { entry_id, delta } = req.body || {};
  if (!isSafeSlug(entry_id)) return res.status(400).json({ error: 'Invalid entry' });
  if (delta !== 1 && delta !== -1) return res.status(400).json({ error: 'Invalid change' });

  const ip = clientIp(req);
  if (!allow(`like:${ip}`, 30, 10 * 60_000) || !allow(`like:${ip}:${entry_id}`, 6, 10 * 60_000)) return tooMany(res);

  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(503).json({ error: 'Likes are not available right now' });

  try {
    const r = await fetchT(`${url}/rest/v1/rpc/adjust_likes`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_id: entry_id, p_delta: delta }),
    }, 6000);
    if (!r.ok) {
      console.error('[like] rpc failed:', r.status, await r.text());
      return res.status(503).json({ error: 'Likes are not available right now' });
    }
    const likes = await safeJson(r);
    if (typeof likes !== 'number') return res.status(404).json({ error: 'Entry not found' });
    return res.status(200).json({ ok: true, likes });
  } catch (err) {
    console.error('[like] error:', err);
    return res.status(503).json({ error: 'Likes are not available right now' });
  }
}
