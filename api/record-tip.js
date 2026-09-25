// /api/record-tip.js
// Vercel serverless — saves a confirmed M-Pesa tip to Supabase.
// The browser only sends the invoice id. The server re-verifies the invoice with
// IntaSend and takes the amount from IntaSend's record, so nobody can inject
// fake tips or arbitrary text into the admin dashboard.

import { intasendKeys, keysMissingResponse } from './_intasend.js';
import { fetchT, fetchInvoice, safeJson, normalisePhone, clientIp, allow, tooMany } from './_util.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!allow(`tip:${clientIp(req)}`, 20, 10 * 60_000)) return tooMany(res);

  const { invoice_id, phone } = req.body || {};
  if (!invoice_id || typeof invoice_id !== 'string' || invoice_id.length > 200) {
    return res.status(400).json({ error: 'Missing invoice_id' });
  }
  const cleanPhone = normalisePhone(phone);
  if (!cleanPhone) return res.status(400).json({ error: 'Invalid phone' });

  const { publicKey, secretKey } = intasendKeys();
  if (!publicKey) return keysMissingResponse(res);

  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(500).json({ error: 'Server misconfigured' });

  const { invoice, error, status } = await fetchInvoice(publicKey, secretKey, invoice_id);
  if (error) return res.status(status || 502).json({ error });

  if (invoice.state !== 'COMPLETE' && invoice.state !== 'SUCCESSFUL') {
    return res.status(402).json({ error: 'Payment not confirmed' });
  }
  if (!String(invoice.api_ref || '').startsWith('tip:')) {
    return res.status(400).json({ error: 'Not a tip invoice' });
  }
  const amount = Number(invoice.value ?? invoice.amount ?? 0);
  if (!amount || amount < 1) return res.status(400).json({ error: 'Invalid amount' });

  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' };

  try {
    // Preferred path: invoice_id column (see supabase/migrations) makes this exactly-once.
    let r = await fetchT(`${url}/rest/v1/tips?on_conflict=invoice_id`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: JSON.stringify({ phone: cleanPhone, amount, invoice_id }),
    }, 7000);

    if (!r.ok) {
      const text = await r.text();
      if (!/invoice_id/i.test(text)) {
        console.error('[record-tip] supabase error:', text);
        return res.status(502).json({ error: 'Failed to save tip' });
      }
      // Column not migrated yet: fall back, de-duplicating on phone + amount within 15 minutes.
      const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const dupRes = await fetchT(
        `${url}/rest/v1/tips?phone=eq.${cleanPhone}&amount=eq.${amount}&created_at=gte.${encodeURIComponent(since)}&select=id&limit=1`,
        { headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' } },
        7000
      );
      const dup = await safeJson(dupRes);
      if (Array.isArray(dup) && dup.length > 0) return res.status(200).json({ ok: true, duplicate: true });
      r = await fetchT(`${url}/rest/v1/tips`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ phone: cleanPhone, amount }),
      }, 7000);
      if (!r.ok) {
        console.error('[record-tip] supabase fallback error:', await r.text());
        return res.status(502).json({ error: 'Failed to save tip' });
      }
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[record-tip] error:', err);
    return res.status(502).json({ error: 'Failed to save tip' });
  }
}
