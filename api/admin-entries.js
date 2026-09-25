// /api/admin-entries.js
// Vercel serverless function — the ONLY way entries (and admin-only tables) get
// written now that anon has no insert/update/delete grant on them (see the
// 2026-09-13 RLS lockdown). Requires a signed admin token from /api/admin-auth
// and writes via the Supabase service role key, which bypasses RLS/grants.

import { verifyToken } from './_admin-token.js';
import { fetchT, safeJson } from './_util.js';

// `likes` is deliberately NOT here: readers change it (via /api/like), so an admin save must never
// overwrite the live count with the stale number the admin page loaded.
const ENTRY_COLUMNS = [
  'id', 'slug', 'title', 'excerpt', 'category', 'entry_date', 'author',
  'price', 'preview_words', 'body', 'sort_order',
];
const ORDER_STATUSES = ['Awaiting payment', 'Paid', 'Dispatched', 'Delivered'];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { token, action, entry, entryId, fullBody, commentId, orderId, status } = req.body || {};

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
  const T = 9000;

  try {
    if (action === 'upsert') {
      if (!entry || typeof entry !== 'object' || !entry.id || typeof entry.id !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid entry' });
      }
      // Whitelist columns; never let the client write arbitrary ones.
      const row = {};
      for (const c of ENTRY_COLUMNS) if (entry[c] !== undefined) row[c] = entry[c];
      // Paid full text travels in the SAME write as the preview so the two can never diverge.
      if (Array.isArray(fullBody)) {
        if (fullBody.length === 0) return res.status(400).json({ error: 'Full text is empty' });
        row.full_body = fullBody;
      }
      const r = await fetchT(`${supabaseUrl}/rest/v1/entries?on_conflict=id`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(row),
      }, T);
      if (!r.ok) {
        console.error('[admin-entries] upsert error:', await r.text());
        return res.status(502).json({ error: 'Failed to save entry' });
      }
      return res.status(200).json({ ok: true });
    }

    if (action === 'upsert_full_body') {
      if (!entryId || typeof entryId !== 'string' || !Array.isArray(fullBody) || fullBody.length === 0) {
        return res.status(400).json({ error: 'Missing entryId or fullBody' });
      }
      const r = await fetchT(`${supabaseUrl}/rest/v1/entries?id=eq.${encodeURIComponent(entryId)}`, {
        method: 'PATCH',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify({ full_body: fullBody }),
      }, T);
      if (!r.ok) {
        console.error('[admin-entries] upsert_full_body error:', await r.text());
        return res.status(502).json({ error: 'Failed to save full article body' });
      }
      return res.status(200).json({ ok: true });
    }

    if (action === 'get_full_body') {
      if (!entryId || typeof entryId !== 'string') {
        return res.status(400).json({ error: 'Missing entryId' });
      }
      const r = await fetchT(
        `${supabaseUrl}/rest/v1/entries?id=eq.${encodeURIComponent(entryId)}&select=full_body`,
        { headers },
        T
      );
      if (!r.ok) {
        console.error('[admin-entries] get_full_body error:', await r.text());
        return res.status(502).json({ error: 'Failed to load full article body' });
      }
      const rows = await safeJson(r);
      const fb = Array.isArray(rows) && rows[0] && Array.isArray(rows[0].full_body) ? rows[0].full_body : [];
      return res.status(200).json({ ok: true, fullBody: fb });
    }

    if (action === 'delete') {
      if (!entryId || typeof entryId !== 'string') {
        return res.status(400).json({ error: 'Missing entryId' });
      }
      const r = await fetchT(`${supabaseUrl}/rest/v1/entries?id=eq.${encodeURIComponent(entryId)}`, {
        method: 'DELETE',
        headers,
      }, T);
      if (!r.ok) {
        console.error('[admin-entries] delete error:', await r.text());
        return res.status(502).json({ error: 'Failed to delete entry' });
      }
      return res.status(200).json({ ok: true });
    }

    // ── Comment moderation ──────────────────────────────────────────────────
    if (action === 'list_comments') {
      const r = await fetchT(
        `${supabaseUrl}/rest/v1/comments?select=id,entry_id,author,comment,created_at&order=created_at.desc&limit=100`,
        { headers },
        T
      );
      if (!r.ok) return res.status(502).json({ error: 'Failed to load comments' });
      return res.status(200).json({ ok: true, comments: (await safeJson(r)) || [] });
    }

    if (action === 'delete_comment') {
      if (!commentId || typeof commentId !== 'string' || !/^[0-9a-f-]{36}$/i.test(commentId)) {
        return res.status(400).json({ error: 'Missing commentId' });
      }
      const r = await fetchT(`${supabaseUrl}/rest/v1/comments?id=eq.${commentId}`, { method: 'DELETE', headers }, T);
      if (!r.ok) return res.status(502).json({ error: 'Failed to delete comment' });
      return res.status(200).json({ ok: true });
    }

    // ── Book order status ───────────────────────────────────────────────────
    if (action === 'set_order_status') {
      if (!orderId || typeof orderId !== 'string' || orderId.length > 200 || !ORDER_STATUSES.includes(status)) {
        return res.status(400).json({ error: 'Invalid order or status' });
      }
      const r = await fetchT(`${supabaseUrl}/rest/v1/orders?order_id=eq.${encodeURIComponent(orderId)}`, {
        method: 'PATCH',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify({ status }),
      }, T);
      if (!r.ok) return res.status(502).json({ error: 'Failed to update order' });
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (err) {
    console.error('[admin-entries] Error:', err);
    return res.status(502).json({ error: 'The database did not respond in time. Please try again.' });
  }
}
