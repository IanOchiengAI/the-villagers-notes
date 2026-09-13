// Vercel serverless function — M-Pesa STK Push via Safaricom Daraja (direct, no aggregator).
// Requires MPESA_CONSUMER_KEY / MPESA_CONSUMER_SECRET / MPESA_SHORTCODE / MPESA_PASSKEY
// in Vercel env vars — see MPESA_SETUP_GUIDE.md.

import { baseUrl, getAccessToken, shortcodeAndPassword, isTill, callbackUrl } from './_mpesa.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { phone, amount, name, narrative } = req.body || {};
  if (!phone || !amount) return res.status(400).json({ error: 'Missing phone or amount' });

  const numAmount = Math.round(Number(amount));
  if (isNaN(numAmount) || numAmount < 1 || numAmount > 500000) {
    return res.status(400).json({ error: 'Invalid amount. Minimum is KES 1, maximum KES 500,000.' });
  }

  const cleanPhone = String(phone).replace(/\D/g, '');
  let formattedPhone = null;
  if (cleanPhone.startsWith('254') && cleanPhone.length === 12) formattedPhone = cleanPhone;
  else if ((cleanPhone.startsWith('07') || cleanPhone.startsWith('01')) && cleanPhone.length === 10) formattedPhone = '254' + cleanPhone.slice(1);
  else if (cleanPhone.length === 9 && (cleanPhone.startsWith('7') || cleanPhone.startsWith('1'))) formattedPhone = '254' + cleanPhone;

  if (!formattedPhone) {
    return res.status(400).json({ error: 'Invalid Kenyan phone number format. Use 07XXXXXXXX or 254XXXXXXXXX.' });
  }

  const rawNarrative = String(narrative || `Order - ${name || 'Customer'}`);
  const accountRef = (rawNarrative.replace(/[^\w\s-]/g, '').trim().slice(0, 12) || 'TVN Order');
  const transactionDesc = (rawNarrative.slice(0, 13) || 'Payment');

  try {
    const token = await getAccessToken();
    const { shortcode, timestamp, password } = shortcodeAndPassword();

    const response = await fetch(`${baseUrl()}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: isTill() ? 'CustomerBuyGoodsOnline' : 'CustomerPayBillOnline',
        Amount: numAmount,
        PartyA: formattedPhone,
        PartyB: shortcode,
        PhoneNumber: formattedPhone,
        CallBackURL: callbackUrl(),
        AccountReference: accountRef,
        TransactionDesc: transactionDesc,
      }),
    });

    const data = await response.json();

    if (!response.ok || data.errorCode || data.ResponseCode !== '0') {
      const errMsg = data.errorMessage || data.ResponseDescription || 'STK Push failed. Check phone number.';
      return res.status(400).json({ error: errMsg, details: data });
    }

    return res.status(200).json({
      ok: true,
      invoice_id: data.CheckoutRequestID,
      tracking_id: data.MerchantRequestID,
      CheckoutRequestID: data.CheckoutRequestID,
    });
  } catch (err) {
    console.error('[M-Pesa STK Push Error]:', err);
    return res.status(500).json({ error: err.message || 'Payment server error' });
  }
}
