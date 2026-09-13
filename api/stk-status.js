// Vercel serverless function — Query M-Pesa STK Push status via Safaricom Daraja.

import { baseUrl, getAccessToken, shortcodeAndPassword } from './_mpesa.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { invoice_id, CheckoutRequestID } = req.body || {};
  const checkoutId = CheckoutRequestID || invoice_id;
  if (!checkoutId) return res.status(400).json({ error: 'Missing invoice_id or CheckoutRequestID' });

  try {
    const token = await getAccessToken();
    const { shortcode, timestamp, password } = shortcodeAndPassword();

    const response = await fetch(`${baseUrl()}/mpesa/stkpushquery/v1/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutId,
      }),
    });

    const data = await response.json().catch(() => ({}));

    // While the customer hasn't answered the prompt yet, Safaricom returns a non-2xx
    // "the transaction is being processed" error — that's not a failure, just "not yet."
    if (!response.ok) {
      const stillProcessing = /process|pending/i.test(data.errorMessage || '');
      return res.status(200).json({
        ResultCode: stillProcessing ? 'PENDING' : '1',
        ResultDesc: data.errorMessage || 'Unable to verify payment status',
        raw: data,
      });
    }

    const rawCode = data.ResultCode === undefined || data.ResultCode === null ? '' : String(data.ResultCode);
    const ResultCode = rawCode === '0' ? '0' : (rawCode ? '1' : 'PENDING');

    return res.status(200).json({
      ResultCode,
      ResultDesc: data.ResultDesc || 'Unknown',
      raw: data,
    });
  } catch (err) {
    console.error('[M-Pesa Status Error]:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
