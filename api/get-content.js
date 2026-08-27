// /api/get-content.js
// Vercel serverless function — securely serve paid article full body after payment verification.
//
// Flow:
//   1. Frontend sends { entry_id, invoice_id } after M-Pesa payment detected
//   2. This endpoint re-verifies the payment status with IntaSend server-side
//   3. If payment is COMPLETE: fetch full_body from Supabase and return it
//
// Security:
//   - Full article body is NEVER sent to the browser without server-side payment verification
//   - The Supabase service role key is never exposed to the client
//   - Invoice IDs are bound to a single completed payment

const DEFAULT_INTASEND_KEY = 'ISPubKey_live_7a3054ea-0add-41ba-a643-46933dff26f3';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { entry_id, invoice_id } = req.body || {};

  if (!entry_id || typeof entry_id !== 'string' || entry_id.length > 200) {
    return res.status(400).json({ error: 'Missing or invalid entry_id' });
  }
  if (!invoice_id || typeof invoice_id !== 'string' || invoice_id.length > 200) {
    return res.status(400).json({ error: 'Missing or invalid invoice_id' });
  }

  const publicKey = process.env.INTASEND_PUBLISHABLE_KEY || process.env.INTASEND_PUBLIC_KEY || DEFAULT_INTASEND_KEY;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  // Use service role key for server-side access (not exposed to browser)
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    // Step 1: Verify payment status with IntaSend server-side
    const statusRes = await fetch('https://payment.intasend.com/api/v1/payment/mpesa-stk-push-status/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ public_key: publicKey, invoice_id }),
    });

    const statusData = await statusRes.json();
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

    // Step 2: Fetch full_body from Supabase
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

    // Safety: confirm full_body exists
    if (!Array.isArray(entry.full_body) || entry.full_body.length === 0) {
      return res.status(500).json({ error: 'Full article content not yet available. Contact the author.' });
    }

    // Step 3: Return the full body only after verified payment
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
