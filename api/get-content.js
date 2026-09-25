// /api/get-content.js
// Vercel serverless function — securely serve paid article full body after payment verification.
//
// Flow:
//   1. Frontend sends { entry_id, invoice_id } after M-Pesa payment detected
//   2. This endpoint re-verifies the payment status with IntaSend server-side
//   3. If payment is COMPLETE, for the right amount, for this exact entry: fetch
//      full_body from Supabase and return it
//
// Security:
//   - Full article body is NEVER sent to the browser without server-side payment verification
//   - The Supabase service role key is never exposed to the client
//   - The invoice must be COMPLETE, its api_ref must match this entry
//     (api_ref = "entry:<entry_id>", set by /api/stk-push), and its paid value
//     must be at least the entry's price. Without this, any completed invoice
//     — including a KES 10 soda tip — could unlock any paid article.

import { intasendKeys, keysMissingResponse } from './_intasend.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { entry_id, invoice_id } = req.body || {};

  if (!entry_id || typeof entry_id !== 'string' || entry_id.length > 200) {
    return res.status(400).json({ error: 'Missing or invalid entry_id' });
  }
  if (!invoice_id || typeof invoice_id !== 'string' || invoice_id.length > 200) {
    return res.status(400).json({ error: 'Missing or invalid invoice_id' });
  }

  const { publicKey, secretKey } = intasendKeys();
  if (!publicKey) return keysMissingResponse(res);

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  // Use service role key for server-side access (not exposed to browser)
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    // Step 1: Fetch the entry first so we know the real price to check the payment against.
    const dbRes = await fetch(
      `${supabaseUrl}/rest/v1/entries?id=eq.${encodeURIComponent(entry_id)}&select=id,price,full_body`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!dbRes.ok) {
      const err = await dbRes.text();
      console.error('[get-content] Supabase fetch error:', err);
      return res.status(500).json({ error: 'Failed to retrieve article' });
    }

    const rows = await dbRes.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    const entry = rows[0];

    // Safety: confirm entry actually requires payment
    if (!entry.price || Number(entry.price) <= 0) {
      return res.status(400).json({ error: 'This article is free — no payment required' });
    }

    // Step 2: Verify payment status with IntaSend server-side
    const statusHeaders = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
    if (secretKey) statusHeaders['Authorization'] = `Bearer ${secretKey}`;

    const statusRes = await fetch('https://payment.intasend.com/api/v1/payment/mpesa-stk-push-status/', {
      method: 'POST',
      headers: statusHeaders,
      body: JSON.stringify({ public_key: publicKey, invoice_id }),
    });

    let statusData;
    try {
      statusData = await statusRes.json();
    } catch {
      console.error('[get-content] IntaSend returned non-JSON status:', statusRes.status);
      return res.status(402).json({ error: 'Payment not confirmed', state: 'UNKNOWN', detail: 'Could not verify invoice with payment provider' });
    }
    const invoice = statusData.invoice || statusData;
    const state = invoice.state;

    // Only unlock on confirmed complete payment
    if (state !== 'COMPLETE' && state !== 'SUCCESSFUL') {
      return res.status(402).json({
        error: 'Payment not confirmed',
        state: state || 'UNKNOWN',
        detail: invoice.failed_reason || 'Payment status is not COMPLETE',
      });
    }

    // Step 3: Bind the invoice to THIS entry — the api_ref set by /api/stk-push
    // for an entry purchase is always "entry:<entry_id>". Reject anything else,
    // including a missing api_ref, so an unrelated completed invoice (a tip, a
    // book order, or a payment for a different entry) can never unlock this one.
    const expectedRef = `entry:${entry_id}`;
    if (invoice.api_ref !== expectedRef) {
      console.warn('[get-content] api_ref mismatch for entry', entry_id, '- got:', invoice.api_ref);
      return res.status(402).json({
        error: 'Payment not confirmed',
        state: 'MISMATCH',
        detail: 'This payment does not match this article. If you just paid, contact the author with your M-Pesa message.',
      });
    }

    // Step 4: Confirm the amount paid covers the article's price.
    const paidValue = Number(invoice.value ?? invoice.amount ?? 0);
    if (!paidValue || paidValue < Number(entry.price)) {
      console.warn('[get-content] amount mismatch for entry', entry_id, '- expected:', entry.price, 'got:', paidValue);
      return res.status(402).json({
        error: 'Payment not confirmed',
        state: 'AMOUNT_MISMATCH',
        detail: 'The payment amount does not match this article\'s price.',
      });
    }

    // Safety: confirm full_body exists
    if (!Array.isArray(entry.full_body) || entry.full_body.length === 0) {
      return res.status(500).json({ error: 'Full article content not yet available. Contact the author.' });
    }

    // Step 5: Return the full body only after verified, matched, fully-paid payment
    return res.status(200).json({
      ok: true,
      entry_id: entry.id,
      body: entry.full_body,
    });

  } catch (err) {
    console.error('[get-content] Error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
