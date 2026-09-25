// /api/admin-auth.js
// Vercel serverless function — verify admin password server-side.
// This prevents exposing the admin password in the client JavaScript bundle.
// On success, issues a signed session token (not the password itself) that
// /api/admin-entries.js requires for any write to the entries table.

import crypto from 'crypto';
import { signToken } from './_admin-token.js';
import { clientIp, allow, tooMany } from './_util.js';

// Constant-time compare that doesn't leak length either.
function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { password } = req.body || {};
  if (!allow(`auth:${clientIp(req)}`, 8, 10 * 60_000)) return tooMany(res);

  if (!password || typeof password !== 'string' || password.length > 200) {
    return res.status(400).json({ ok: false, error: 'Password required' });
  }

  // No hardcoded fallback: this repository is public. ADMIN_PASSWORD and
  // ADMIN_TOKEN_SECRET must be set in the Vercel project settings.
  const serverPass = process.env.ADMIN_PASSWORD;
  if (!serverPass || !process.env.ADMIN_TOKEN_SECRET) {
    return res.status(500).json({ ok: false, error: 'Admin login is not configured' });
  }

  if (safeEqual(password, serverPass)) {
    return res.status(200).json({ ok: true, token: signToken() });
  }

  // Slow every wrong guess down. (Also add a Vercel Firewall rate-limit rule on /api/admin-auth.)
  await new Promise((r) => setTimeout(r, 1200));
  return res.status(401).json({ ok: false, error: 'Incorrect password' });
}
