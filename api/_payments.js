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
 * Flip a paid-entry purchase (`entry_purchases`) to "Paid" (idempotent). Creates the row if
 * it doesn't exist yet (buyers from before this feature shipped have none). Deliberately
 * never touches `device_minted_at` — that column is claimed separately, exactly once, by
 * /api/get-content so a purchase can still mint its first device key after this runs.
 */
export async function markEntryPurchasePaid(invoiceId, entryId, amount) {
  const { url, key } = db();
  if (!url || !key) return false;
  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  const paidAt = new Date().toISOString();
  try {
    // Try to update an existing row first — this is the common case (stk-push already
    // inserted an "Awaiting payment" row) and it's the only path guaranteed not to touch
    // device_minted_at.
    const patchRes = await fetchT(
      `${url}/rest/v1/entry_purchases?invoice_id=eq.${encodeURIComponent(invoiceId)}`,
      {
        method: 'PATCH',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify({ status: 'Paid', paid_at: paidAt }),
      },
      6000
    );
    if (!patchRes.ok) {
      console.error('[payments] markEntryPurchasePaid patch failed:', patchRes.status);
      return false;
    }
    const rows = await safeJson(patchRes);
    if (Array.isArray(rows) && rows.length > 0) return true;

    // No existing row: create it directly as Paid. device_minted_at stays null.
    const postRes = await fetchT(`${url}/rest/v1/entry_purchases?on_conflict=invoice_id`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: JSON.stringify({ invoice_id: invoiceId, entry_id: entryId, amount, status: 'Paid', paid_at: paidAt }),
    }, 6000);
    if (!postRes.ok) {
      console.error('[payments] markEntryPurchasePaid post failed:', postRes.status);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[payments] markEntryPurchasePaid error:', e);
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
