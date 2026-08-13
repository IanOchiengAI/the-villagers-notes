// Vercel serverless function — runs server-side, credentials never exposed to browser
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { phone, amount, name, address } = req.body || {};
  if (!phone || !amount) return res.status(400).json({ error: 'Missing phone or amount' });

  const {
    MPESA_CONSUMER_KEY,
    MPESA_CONSUMER_SECRET,
    MPESA_SHORTCODE,
    MPESA_PASSKEY,
    MPESA_CALLBACK_URL,
  } = process.env;

  if (!MPESA_CONSUMER_KEY || !MPESA_CONSUMER_SECRET) {
    return res.status(500).json({ error: 'M-Pesa API credentials not configured in environment variables' });
  }

  try {
    // 1. Get OAuth token
    const auth = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString('base64');
    const tokenRes = await fetch('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
      // NOTE: Change to https://api.safaricom.co.ke for PRODUCTION
      headers: { Authorization: `Basic ${auth}` },
    });
    const tokenData = await tokenRes.json();
    const access_token = tokenData.access_token;

    if (!access_token) {
      return res.status(500).json({ error: 'Failed to authenticate with Safaricom OAuth' });
    }

    // 2. Build STK payload
    const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
    const password  = Buffer.from(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`).toString('base64');

    // 3. Trigger STK push
    const stkRes = await fetch('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest', {
      // NOTE: Change to https://api.safaricom.co.ke for PRODUCTION
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        BusinessShortCode: MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: amount,
        PartyA: phone,
        PartyB: MPESA_SHORTCODE,
        PhoneNumber: phone,
        CallBackURL: MPESA_CALLBACK_URL || 'https://example.com/api/callback',
        AccountReference: 'VikBook',
        TransactionDesc: `Book order - ${name || 'Customer'} - ${address || 'N/A'}`,
      }),
    });

    const stkData = await stkRes.json();
    if (stkData.ResponseCode !== '0') {
      return res.status(400).json({ error: stkData.ResponseDescription || 'STK push failed' });
    }
    return res.status(200).json({ CheckoutRequestID: stkData.CheckoutRequestID });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
