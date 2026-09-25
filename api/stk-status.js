// Vercel serverless function — Query M-Pesa STK Status via IntaSend.
// Returns only what the browser needs. The raw IntaSend payload (account,
// phone, references) is deliberately NOT passed through.

import { intasendKeys, keysMissingResponse } from './_intasend.js';
import { fetchInvoice } from './_util.js';
import { markOrderPaid } from './_payments.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { invoice_id, CheckoutRequestID } = req.body || {};
  const id = invoice_id || CheckoutRequestID;
  if (!id || typeof id !== 'string' || id.length > 200) {
    return res.status(400).json({ error: 'Missing invoice_id or CheckoutRequestID' });
  }

  const { publicKey, secretKey } = intasendKeys();
  if (!publicKey) return keysMissingResponse(res);

  const { invoice, error, status } = await fetchInvoice(publicKey, secretKey, id);
  if (error) {
    // Transient upstream trouble: tell the client it's not a verdict so it keeps polling.
    return res.status(200).json({ ResultCode: '1032', state: 'UNKNOWN', transient: true, ResultDesc: error, upstreamStatus: status });
  }

  const state = invoice.state; // 'COMPLETE', 'FAILED', 'PENDING', 'PROCESSING'
  let ResultCode = '1032'; // pending / default
  if (state === 'COMPLETE' || state === 'SUCCESSFUL') ResultCode = '0';
  else if (state === 'FAILED' || state === 'CANCELLED') ResultCode = '1';

  // A confirmed book payment flips the order saved by /api/stk-push to "Paid".
  if (ResultCode === '0' && /^(book|play):/.test(String(invoice.api_ref || ''))) {
    await markOrderPaid(id);
  }

  return res.status(200).json({
    ResultCode,
    ResultDesc: invoice.failed_reason || state,
    state,
  });
}
