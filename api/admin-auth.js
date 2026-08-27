// /api/admin-auth.js
// Vercel serverless function — verify admin password server-side.
// This prevents exposing the admin password in the client JavaScript bundle.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { password } = req.body || {};

  if (!password || typeof password !== 'string') {
    return res.status(400).json({ ok: false, error: 'Password required' });
  }

  const serverPass = process.env.ADMIN_PASSWORD || 'Villager@2026!';

  if (password === serverPass) {
    return res.status(200).json({ ok: true });
  }

  return res.status(401).json({ ok: false, error: 'Incorrect password' });
}
