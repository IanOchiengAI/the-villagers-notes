// /api/record-tip.js
// Vercel serverless — saves a confirmed M-Pesa tip to Supabase.
// Called by the frontend ONLY after IntaSend confirms state === 'COMPLETE'.
// No auth token required (public-facing) but we validate inputs server-side.

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { phone, amount } = req.body || {};

  if (!phone || typeof phone !== 'string') return res.status(400).json({ error: 'Missing phone' });
  const numAmount = Number(amount);
  if (!numAmount || numAmount < 1) return res.status(400).json({ error: 'Invalid amount' });

  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(500).json({ error: 'Server misconfigured' });

  try {
    const r = await fetch(`${url}/rest/v1/tips`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ phone, amount: numAmount }),
    });

    if (!r.ok) {
      const text = await r.text();
      console.error('[record-tip] supabase error:', text);
      return res.status(502).json({ error: 'Failed to save tip' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[record-tip] error:', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
