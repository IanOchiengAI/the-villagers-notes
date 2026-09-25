// /api/record-tip.js
// Vercel serverless — saves a confirmed M-Pesa tip to Supabase.
// The browser only sends the invoice id. The server re-verifies the invoice with
// IntaSend and takes the amount from IntaSend's record, so nobody can inject
// fake tips or arbitrary text into the admin dashboard. (The IntaSend callback,
// api/intasend-webhook.js, records the same tip; whichever comes first wins and
// the other is a no-op.)

import { intasendKeys, keysMissingResponse } from './_intasend.js';
import { fetchInvoice, normalisePhone, clientIp, allow, tooMany } from './_util.js';
import { recordTipOnce } from './_payments.js';

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

  if (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Server misconfigured' });
  }

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

  const saved = await recordTipOnce({ phone: cleanPhone, amount, invoiceId: invoice_id });
  if (!saved.ok) return res.status(502).json({ error: 'Failed to save tip' });
  return res.status(200).json(saved.duplicate ? { ok: true, duplicate: true } : { ok: true });
}
