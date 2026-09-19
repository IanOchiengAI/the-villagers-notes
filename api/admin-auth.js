// /api/admin-auth.js
// Vercel serverless function — verify admin password server-side.
// This prevents exposing the admin password in the client JavaScript bundle.
// On success, issues a signed session token (not the password itself) that
// /api/admin-entries.js requires for any write to the entries table.

import { signToken } from './_admin-token.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { password } = req.body || {};

  if (!password || typeof password !== 'string') {
    return res.status(400).json({ ok: false, error: 'Password required' });
  }

  // No hardcoded fallback: this repository is public. ADMIN_PASSWORD must be set
  // in the Vercel project settings.
  const serverPass = process.env.ADMIN_PASSWORD;
  if (!serverPass) {
    return res.status(500).json({ ok: false, error: 'Admin login is not configured' });
  }

  if (password === serverPass) {
    return res.status(200).json({ ok: true, token: signToken() });
  }

  return res.status(401).json({ ok: false, error: 'Incorrect password' });
}
