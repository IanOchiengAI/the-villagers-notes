// Shared payment bookkeeping. Used by the browser-driven paths (stk-status, record-tip)
// AND by the IntaSend callback (intasend-webhook), so whichever hears about a confirmed
// payment first, the result is the same and never doubled.

import { fetchT, safeJson } from './_util.js';

function db() {
  return { url: process.env.VITE_SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY };
}

/** Flip a book/play order saved by /api/stk-push from "Awaiting payment" to "Paid" (idempotent). */
export async function markOrderPaid(invoiceId) {
  const { url, key } = db();
  if (!url || !key) return false;
  try {
    const r = await fetchT(
      `${url}/rest/v1/orders?order_id=eq.${encodeURIComponent(invoiceId)}&status=eq.${encodeURIComponent('Awaiting payment')}`,
      {
        method: 'PATCH',
        headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ status: 'Paid' }),
      },
      5000
    );
    return r.ok;
  } catch (e) {
    console.error('[payments] order status update failed:', e);
    return false;
  }
}

/**
 * Save a confirmed tip exactly once. Returns { ok: true, duplicate?: true } or { ok: false }.
 * Uses tips.invoice_id (unique) when the column exists; otherwise falls back to
 * de-duplicating on phone + amount within 15 minutes.
 */
export async function recordTipOnce({ phone, amount, invoiceId }) {
  const { url, key } = db();
  if (!url || !key) return { ok: false };
  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' };
  try {
    let r = await fetchT(`${url}/rest/v1/tips?on_conflict=invoice_id`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: JSON.stringify({ phone, amount, invoice_id: invoiceId }),
    }, 7000);
    if (r.ok) return { ok: true };

    const text = await r.text();
    if (!/invoice_id/i.test(text)) {
      console.error('[payments] tip save error:', text);
      return { ok: false };
    }
    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const dupRes = await fetchT(
      `${url}/rest/v1/tips?phone=eq.${encodeURIComponent(phone)}&amount=eq.${amount}&created_at=gte.${encodeURIComponent(since)}&select=id&limit=1`,
      { headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' } },
      7000
    );
    const dup = await safeJson(dupRes);
    if (Array.isArray(dup) && dup.length > 0) return { ok: true, duplicate: true };
    r = await fetchT(`${url}/rest/v1/tips`, { method: 'POST', headers, body: JSON.stringify({ phone, amount }) }, 7000);
    if (!r.ok) { console.error('[payments] tip fallback error:', await r.text()); return { ok: false }; }
    return { ok: true };
  } catch (err) {
    console.error('[payments] tip error:', err);
    return { ok: false };
  }
}
