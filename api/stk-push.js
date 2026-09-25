// Vercel serverless function — M-Pesa STK Push via IntaSend

import { intasendKeys, keysMissingResponse } from './_intasend.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { phone, amount, name, narrative, purpose, entry_id } = req.body || {};
  if (!phone) return res.status(400).json({ error: 'Missing phone' });

  const { publicKey } = intasendKeys();
  if (!publicKey) return keysMissingResponse(res);

  // For a paid-entry unlock, never trust the client's amount — look up the
  // real price server-side and bind the invoice to this exact entry via
  // api_ref. This closes the hole where any completed invoice (e.g. a KES 10
  // soda tip) could otherwise be replayed against /api/get-content to unlock
  // any paid article.
  let chargeAmount = amount;
  let apiRef = null;

  if (purpose === 'entry') {
    if (!entry_id || typeof entry_id !== 'string' || entry_id.length > 200) {
      return res.status(400).json({ error: 'Missing entry_id' });
    }
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Server configuration error' });
    }
    try {
      const dbRes = await fetch(
        `${supabaseUrl}/rest/v1/entries?id=eq.${encodeURIComponent(entry_id)}&select=id,price`,
        { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, Accept: 'application/json' } }
      );
      if (!dbRes.ok) return res.status(500).json({ error: 'Could not verify article price' });
      const rows = await dbRes.json();
      if (!Array.isArray(rows) || rows.length === 0) return res.status(404).json({ error: 'Entry not found' });
      const price = Number(rows[0].price);
      if (!price || price <= 0) return res.status(400).json({ error: 'This article is free — no payment required' });
      chargeAmount = price;
      apiRef = `entry:${entry_id}`;
    } catch (err) {
      console.error('[stk-push] entry price lookup failed:', err);
      return res.status(500).json({ error: 'Could not verify article price' });
    }
  } else if (purpose === 'book') {
    apiRef = `book:${Date.now()}`;
  } else if (purpose === 'play') {
    apiRef = `play:${Date.now()}`;
  } else if (purpose === 'tip') {
    apiRef = `tip:${Date.now()}`;
  }

  // Validate amount bounds
  const numAmount = Math.round(Number(chargeAmount));
  if (isNaN(numAmount) || numAmount < 10 || numAmount > 500000) {
    return res.status(400).json({ error: 'Invalid amount. Minimum is KES 10, maximum KES 500,000.' });
  }

  // Validate Kenyan phone format
  const cleanPhone = String(phone).replace(/\D/g, '');
  let formattedPhone = null;
  if (cleanPhone.startsWith('254') && cleanPhone.length === 12) formattedPhone = cleanPhone;
  else if ((cleanPhone.startsWith('07') || cleanPhone.startsWith('01')) && cleanPhone.length === 10) formattedPhone = '254' + cleanPhone.slice(1);
  else if (cleanPhone.length === 9 && (cleanPhone.startsWith('7') || cleanPhone.startsWith('1'))) formattedPhone = '254' + cleanPhone;

  if (!formattedPhone) {
    return res.status(400).json({ error: 'Invalid Kenyan phone number format. Use 07XXXXXXXX or 254XXXXXXXXX.' });
  }

  const cleanNarrative = String(narrative || `Order - ${name || 'Customer'}`).slice(0, 100).replace(/[^\w\s\-.,]/g, '');

  try {
    const response = await fetch('https://payment.intasend.com/api/v1/payment/mpesa-stk-push/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        public_key: publicKey,
        currency: 'KES',
        phone_number: formattedPhone,
        amount: numAmount,
        narrative: cleanNarrative,
        ...(apiRef ? { api_ref: apiRef } : {}),
      }),
    });

    const data = await response.json();

    if (!response.ok || data.errors) {
      const errMsg = typeof data.errors === 'string' ? data.errors : (data.detail || data.message || 'STK Push failed. Check phone number.');
      return res.status(400).json({ error: errMsg, details: data });
    }

    return res.status(200).json({
      ok: true,
      invoice_id: data.invoice?.invoice_id || data.id,
      tracking_id: data.tracking_id || data.invoice?.tracking_id,
      CheckoutRequestID: data.invoice?.invoice_id || data.id,
    });
  } catch (err) {
    console.error('[M-Pesa STK Push Error]:', err);
    return res.status(500).json({ error: err.message || 'Payment server error' });
  }
}
