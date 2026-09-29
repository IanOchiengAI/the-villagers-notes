// Shared helpers for paid-entry device keys and one-time grant links (2026-09-28,
// see .agent/plans/2026-09-28-media-prices-access.md Part 5).
// Only the SHA-256 hash is ever stored in `entry_access`; the raw value lives only
// in the reader's browser (device key) or in the link Vic sends (grant token).
// NEVER log a raw key/token returned by these functions.

import crypto from 'crypto';

/** A fresh random credential (device key or grant token), URL-safe. */
export function randomKey() {
  return crypto.randomBytes(32).toString('base64url');
}

/** One-way hash of a raw key/token for storage/lookup in `entry_access.key_hash`. */
export function hashKey(raw) {
  return crypto.createHash('sha256').update(String(raw)).digest('hex');
}
