// Vercel serverless function — M-Pesa STK Push (Daraja API)
// Supports Buy Goods Till & Paybill in Production or Sandbox

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
    MPESA_ENV = 'production',
    MPESA_TRANSACTION_TYPE = 'CustomerBuyGoodsOnline', // Default to Till (Buy Goods)
    MPESA_PARTY_B,
  } = process.env;

  if (!MPESA_CONSUMER_KEY || !MPESA_CONSUMER_SECRET) {
    return res.status(500).json({ error: 'M-Pesa API credentials not configured in environment variables' });
  }

  const baseUrl = MPESA_ENV === 'sandbox' 
    ? 'https://sandbox.safaricom.co.ke' 
    : 'https://api.safaricom.co.ke';

  try {
    // 1. Get OAuth token
    const auth = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString('base64');
    const tokenRes = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
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
    const partyB    = MPESA_PARTY_B || MPESA_SHORTCODE;

    // 3. Trigger STK push
    const stkRes = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        BusinessShortCode: MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: MPESA_TRANSACTION_TYPE,
        Amount: Math.round(Number(amount)),
        PartyA: phone,
        PartyB: partyB,
        PhoneNumber: phone,
        CallBackURL: MPESA_CALLBACK_URL || 'https://thevillagersnotes.com/api/callback',
        AccountReference: 'VillagersNotes',
        TransactionDesc: `Villagers Notes - ${name || 'Order'}`,
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

