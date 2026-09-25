// Shared helpers for serverless functions.

/** fetch() that gives up after `ms` so a hung upstream can't hold a function open. */
export function fetchT(url, options = {}, ms = 9000) {
  return fetch(url, { ...options, signal: AbortSignal.timeout(ms) });
}

/** Parse a fetch Response as JSON, returning null instead of throwing on HTML/empty bodies. */
export async function safeJson(res) {
  try { return await res.json(); } catch { return null; }
}

/** Slugs/ids we generate are [A-Za-z0-9_-]. Anything else is rejected before touching a query. */
export function isSafeSlug(s) {
  return typeof s === 'string' && /^[A-Za-z0-9_-]{1,200}$/.test(s);
}

export function escHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Normalise a Kenyan number to 2547XXXXXXXX / 2541XXXXXXXX, or null. */
export function normalisePhone(raw) {
  const d = String(raw ?? '').replace(/\D/g, '');
  if (d.startsWith('254') && d.length === 12 && /^254[17]/.test(d)) return d;
  if ((d.startsWith('07') || d.startsWith('01')) && d.length === 10) return '254' + d.slice(1);
  if (d.length === 9 && /^[17]/.test(d)) return '254' + d;
  return null;
}

/** Look up an IntaSend invoice server-side. Returns { invoice } or { error, status }. */
export async function fetchInvoice(publicKey, secretKey, invoiceId) {
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
  if (secretKey) headers.Authorization = `Bearer ${secretKey}`;
  try {
    const r = await fetchT('https://payment.intasend.com/api/v1/payment/status/', {
      method: 'POST',
      headers,
      body: JSON.stringify({ public_key: publicKey, invoice_id: invoiceId }),
    });
    const data = await safeJson(r);
    if (!data) return { error: 'Payment provider returned an unreadable response', status: 502 };
    return { invoice: data.invoice || data };
  } catch {
    return { error: 'Payment provider did not respond in time', status: 504 };
  }
}

// ── Best-effort rate limiting ────────────────────────────────────────────────
// In-memory per function instance (Fluid Compute reuses instances, so this blunts
// bursts and scripted abuse, but it is NOT a substitute for Vercel Firewall
// rate-limit rules, which are enforced at the edge across all instances).
const hits = new Map();

export function clientIp(req) {
  const h = req.headers || {};
  const raw = h['x-vercel-forwarded-for'] || h['x-forwarded-for'] || h['x-real-ip'] || '';
  return String(raw).split(',')[0].trim() || 'unknown';
}

/** Returns true if allowed, false if `key` exceeded `limit` hits in `windowMs`. */
export function allow(key, limit, windowMs) {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) { hits.set(key, arr); return false; }
  arr.push(now);
  hits.set(key, arr);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (!v.length || now - v[v.length - 1] > windowMs) hits.delete(k);
  }
  return true;
}

export function tooMany(res) {
  res.setHeader?.('Retry-After', '60');
  return res.status(429).json({ error: 'Too many attempts. Please wait a minute and try again.' });
}
