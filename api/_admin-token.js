// Shared helper — sign/verify a short-lived admin session token.
// Avoids persisting the raw admin password in browser storage.

import crypto from 'crypto';

const SECRET = process.env.ADMIN_TOKEN_SECRET || process.env.ADMIN_PASSWORD || 'Villager@2026!';
const TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

export function signToken() {
  const expires = Date.now() + TTL_MS;
  const sig = crypto.createHmac('sha256', SECRET).update(String(expires)).digest('hex');
  return `${expires}.${sig}`;
}

export function verifyToken(token) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [expiresStr, sig] = parts;
  const expires = Number(expiresStr);
  if (!Number.isFinite(expires) || Date.now() > expires) return false;
  const expectedSig = crypto.createHmac('sha256', SECRET).update(expiresStr).digest('hex');
  try {
    const a = Buffer.from(sig, 'hex');
    const b = Buffer.from(expectedSig, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
