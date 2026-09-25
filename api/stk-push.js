// Vercel serverless function — M-Pesa STK Push via IntaSend

import { intasendKeys, keysMissingResponse } from './_intasend.js';
import { fetchT, safeJson, normalisePhone, clientIp, allow, tooMany } from './_util.js';

const TIP_MAX = 20000;
const BOOK_MAX = 50000;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { phone, amount, name, address, signed, narrative, purpose, entry_id } = req.body || {};
  if (!phone) return res.status(400).json({ error: 'Missing phone' });

  // Stops scripted STK-prompt spam: a handful per IP per minute, and a few per phone number.
  const digits = String(phone).replace(/\D/g, '').slice(-9);
  if (!allow(`stk:ip:${clientIp(req)}`, 6, 60_000) || !allow(`stk:ph:${digits}`, 3, 120_000)) return tooMany(res);

  const { publicKey, secretKey } = intasendKeys();
  if (!publicKey) return keysMissingResponse(res);

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  // For a paid-entry unlock, never trust the client's amount — look up the
  // real price server-side and bind the invoice to this exact entry via
  // api_ref. This closes the hole where any completed invoice (e.g. a KES 10
  // soda tip) could otherwise be replayed against /api/get-content to unlock
  // any paid article.
  let chargeAmount = amount;
  let apiRef = null;
  let maxAmount = 500000;

  if (purpose === 'entry') {
    if (!entry_id || typeof entry_id !== 'string' || entry_id.length > 200) {
      return res.status(400).json({ error: 'Missing entry_id' });
    }
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Server configuration error' });
    }
    try {
      const dbRes = await fetchT(
        `${supabaseUrl}/rest/v1/entries?id=eq.${encodeURIComponent(entry_id)}&select=id,price`,
        { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, Accept: 'application/json' } },
        7000
      );
      if (!dbRes.ok) return res.status(502).json({ error: 'Could not verify article price. Please try again.' });
      const rows = await safeJson(dbRes);
      if (!Array.isArray(rows) || rows.length === 0) return res.status(404).json({ error: 'Entry not found' });
      const price = Number(rows[0].price);
      if (!price || price <= 0) return res.status(400).json({ error: 'This article is free — no payment required' });
      chargeAmount = price;
      apiRef = `entry:${entry_id}`;
    } catch (err) {
      console.error('[stk-push] entry price lookup failed:', err);
      return res.status(502).json({ error: 'Could not verify article price. Please try again.' });
    }
  } else if (purpose === 'book') {
    apiRef = `book:${Date.now()}`;
    maxAmount = BOOK_MAX;
  } else if (purpose === 'play') {
    apiRef = `play:${Date.now()}`;
    maxAmount = BOOK_MAX;
  } else if (purpose === 'tip') {
    apiRef = `tip:${Date.now()}`;
    maxAmount = TIP_MAX;
  } else {
    return res.status(400).json({ error: 'Unknown payment purpose' });
  }

  // Validate amount bounds. (Minimum 50: IntaSend STK floor.)
  const numAmount = Math.round(Number(chargeAmount));
  if (isNaN(numAmount) || numAmount < 50 || numAmount > maxAmount) {
    return res.status(400).json({ error: `Invalid amount. Minimum is KES 50, maximum KES ${maxAmount.toLocaleString()}.` });
  }

  const formattedPhone = normalisePhone(phone);
  if (!formattedPhone) {
    return res.status(400).json({ error: 'Invalid Kenyan phone number format. Use 07XXXXXXXX or 254XXXXXXXXX.' });
  }

  const cleanName = String(name || '').trim().slice(0, 100);
  const cleanAddress = String(address || '').trim().slice(0, 300);
  const cleanNarrative = String(narrative || `Order - ${cleanName || 'Customer'}`).slice(0, 100).replace(/[^\w\s\-.,]/g, '');

  try {
    const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
    if (secretKey) headers.Authorization = `Bearer ${secretKey}`;

    const response = await fetchT('https://payment.intasend.com/api/v1/payment/mpesa-stk-push/', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        public_key: publicKey,
        currency: 'KES',
        phone_number: formattedPhone,
        amount: numAmount,
        narrative: cleanNarrative,
        api_ref: apiRef,
      }),
    });

    const data = await safeJson(response);
    if (!data) {
      return res.status(502).json({ error: 'The payment provider is not responding right now. Please try again in a minute.' });
    }

    if (!response.ok || data.errors) {
      const errMsg = typeof data.errors === 'string' ? data.errors : (data.detail || data.message || 'STK Push failed. Check phone number.');
      console.warn('[stk-push] IntaSend rejected:', errMsg);
      return res.status(400).json({ error: errMsg });
    }

    const invoiceId = data.invoice?.invoice_id || data.id;

    // Book and play orders are saved server-side the moment the prompt is sent, so Vic
    // has the delivery details even if the buyer closes the tab. stk-status
    // flips it from "Awaiting payment" to "Paid" once IntaSend confirms.
    if ((purpose === 'book' || purpose === 'play') && invoiceId && supabaseUrl && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const r = await fetchT(`${supabaseUrl}/rest/v1/orders`, {
          method: 'POST',
          headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
          body: JSON.stringify({
            order_id: invoiceId, // the IntaSend invoice id doubles as the order reference
            name: cleanName || 'Customer',
            phone: formattedPhone,
            address: cleanAddress,
            amount: numAmount,
            signed: signed !== false,
            status: 'Awaiting payment',
          }),
        }, 6000);
        if (!r.ok) console.error('[stk-push] order insert failed:', await r.text());
      } catch (e) {
        console.error('[stk-push] order insert error:', e);
      }
    }

    return res.status(200).json({
      ok: true,
      invoice_id: invoiceId,
      tracking_id: data.tracking_id || data.invoice?.tracking_id,
      CheckoutRequestID: invoiceId,
    });
  } catch (err) {
    console.error('[M-Pesa STK Push Error]:', err);
    return res.status(502).json({ error: 'Could not reach the payment provider. Please try again.' });
  }
}
