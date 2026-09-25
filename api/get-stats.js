// /api/get-stats.js
// Vercel serverless — returns tips, orders, subscribers from Supabase.
// Requires a valid admin token. No sensitive data in client.

import { verifyToken } from './_admin-token.js';

const SUPABASE_HEADERS = (key) => ({
  apikey: key,
  Authorization: `Bearer ${key}`,
  Accept: 'application/json',
  'Content-Type': 'application/json',
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { token } = req.body || {};
  if (!verifyToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(500).json({ error: 'Server misconfigured' });

  const headers = SUPABASE_HEADERS(key);

  try {
    const [tipsRes, ordersRes, subsRes] = await Promise.all([
      fetch(`${url}/rest/v1/tips?select=phone,amount,created_at&order=created_at.desc`, { headers }),
      fetch(`${url}/rest/v1/orders?select=*&order=created_at.desc`, { headers }),
      fetch(`${url}/rest/v1/subscribers?select=email,created_at&order=created_at.desc`, { headers }),
    ]);

    const [tips, orders, subscribers] = await Promise.all([
      tipsRes.ok ? tipsRes.json() : [],
      ordersRes.ok ? ordersRes.json() : [],
      subsRes.ok ? subsRes.json() : [],
    ]);

    // Normalize dates to be display-ready
    const fmt = (iso) =>
      iso
        ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : '';

    return res.status(200).json({
      tips: tips.map((t) => ({ phone: t.phone, amount: t.amount, date: fmt(t.created_at) })),
      orders: orders.map((o) => ({ ...o, date: fmt(o.created_at) })),
      subscribers: subscribers.map((s) => ({ email: s.email, date: fmt(s.created_at) })),
    });
  } catch (err) {
    console.error('[get-stats] error:', err);
    return res.status(500).json({ error: 'Failed to load stats' });
  }
}
