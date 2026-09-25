// Vercel serverless function — Query M-Pesa STK Status via IntaSend

import { intasendKeys, keysMissingResponse } from './_intasend.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { invoice_id, CheckoutRequestID } = req.body || {};
  const id = invoice_id || CheckoutRequestID;
  if (!id) return res.status(400).json({ error: 'Missing invoice_id or CheckoutRequestID' });

  const { publicKey, secretKey } = intasendKeys();
  if (!publicKey) return keysMissingResponse(res);

  try {
    const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
    // Prefer the secret key for server-to-server verification when it's configured.
    if (secretKey) headers['Authorization'] = `Bearer ${secretKey}`;

    const response = await fetch('https://payment.intasend.com/api/v1/payment/status/', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        public_key: publicKey,
        invoice_id: id,
      }),
    });

    const data = await response.json();
    const invoice = data.invoice || data;
    const state = invoice.state; // 'COMPLETE', 'FAILED', 'PENDING', 'PROCESSING'

    let ResultCode = '1032'; // pending / default
    if (state === 'COMPLETE' || state === 'SUCCESSFUL') {
      ResultCode = '0';
    } else if (state === 'FAILED' || state === 'RETRY' || state === 'CANCELLED') {
      ResultCode = '1';
    }

    return res.status(200).json({
      ResultCode,
      ResultDesc: invoice.failed_reason || state,
      state: state,
      raw: data,
    });
  } catch (err) {
    console.error('[M-Pesa Status Error]:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
