// /api/intasend-webhook — IntaSend tells the site directly when a payment changes state, so a
// book/play order flips to "Paid" and a tip is recorded even if the buyer closed the page before
// the browser noticed the confirmation.
//
// Setup (IntaSend dashboard → Settings → Webhooks): URL https://thevillagersnotes.com/api/intasend-webhook
// and a "challenge" string, which must ALSO be set in Vercel as INTASEND_WEBHOOK_CHALLENGE.
//
// SECURITY: nothing in the request body is trusted. Only the invoice id is read from it; the state,
// reference and amount are always re-fetched from IntaSend with our secret key. A forged call can
// therefore only make us re-check a real invoice. The challenge is an extra gate on top.

import crypto from 'crypto';
import { intasendKeys } from './_intasend.js';
import { fetchInvoice, normalisePhone } from './_util.js';
import { markOrderPaid, recordTipOnce } from './_payments.js';

function sameSecret(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = req.body && typeof req.body === 'object' ? req.body : {};

  const expected = process.env.INTASEND_WEBHOOK_CHALLENGE;
  if (expected && !sameSecret(body.challenge ?? '', expected)) {
    return res.status(401).json({ error: 'Bad challenge' });
  }

  const invoiceId = body.invoice_id;
  if (!invoiceId || typeof invoiceId !== 'string' || invoiceId.length > 200) {
    return res.status(400).json({ error: 'Missing invoice_id' });
  }

  const { publicKey, secretKey } = intasendKeys();
  if (!publicKey) return res.status(503).json({ error: 'Not configured' });

  const { invoice, error } = await fetchInvoice(publicKey, secretKey, invoiceId);
  // 5xx makes IntaSend retry later; nothing has been changed.
  if (error) return res.status(503).json({ error: 'Could not verify the invoice right now' });

  if (invoice.state !== 'COMPLETE' && invoice.state !== 'SUCCESSFUL') {
    return res.status(200).json({ ok: true, ignored: invoice.state || 'unknown' });
  }

  const ref = String(invoice.api_ref || '');
  if (/^(book|play):/.test(ref)) {
    await markOrderPaid(invoiceId);
    return res.status(200).json({ ok: true, order: true });
  }

  if (ref.startsWith('tip:')) {
    const amount = Number(invoice.value ?? invoice.amount ?? 0);
    if (!amount || amount < 1) return res.status(200).json({ ok: true, ignored: 'no amount' });
    // The payer's number comes from IntaSend's own record. If it isn't there, keep the tip anyway.
    const phone = normalisePhone(invoice.account) || 'unknown';
    const saved = await recordTipOnce({ phone, amount, invoiceId });
    if (!saved.ok) return res.status(503).json({ error: 'Could not save the tip right now' });
    return res.status(200).json({ ok: true, tip: true });
  }

  // Paid-entry payments need no bookkeeping: /api/get-content verifies on demand.
  return res.status(200).json({ ok: true });
}
