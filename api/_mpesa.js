// Shared Safaricom Daraja helpers — OAuth token, STK password/timestamp, base URL.
// Requires these Vercel env vars (see MPESA_SETUP_GUIDE.md):
//   MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_SHORTCODE, MPESA_PASSKEY
// Optional:
//   MPESA_ENV = "production" (default) | "sandbox"
//   MPESA_ACCOUNT_TYPE = "till" (default) | "paybill"
//   MPESA_CALLBACK_URL (defaults to the production site's callback endpoint)

function baseUrl() {
  return process.env.MPESA_ENV === 'sandbox'
    ? 'https://sandbox.safaricom.co.ke'
    : 'https://api.safaricom.co.ke';
}

function requireConfig() {
  const { MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_SHORTCODE, MPESA_PASSKEY } = process.env;
  if (!MPESA_CONSUMER_KEY || !MPESA_CONSUMER_SECRET || !MPESA_SHORTCODE || !MPESA_PASSKEY) {
    const missing = ['MPESA_CONSUMER_KEY', 'MPESA_CONSUMER_SECRET', 'MPESA_SHORTCODE', 'MPESA_PASSKEY']
      .filter((k) => !process.env[k]);
    throw new Error(`M-Pesa not configured — missing env vars: ${missing.join(', ')}`);
  }
  return { MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_SHORTCODE, MPESA_PASSKEY };
}

async function getAccessToken() {
  const { MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET } = requireConfig();
  const auth = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString('base64');
  const res = await fetch(`${baseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!res.ok) {
    throw new Error(`M-Pesa auth failed (${res.status})`);
  }
  const data = await res.json();
  if (!data.access_token) throw new Error('M-Pesa auth response missing access_token');
  return data.access_token;
}

// Kenya is UTC+3 year-round (no DST) — compute wall-clock EAT regardless of server timezone.
function eatTimestamp() {
  const eat = new Date(Date.now() + 3 * 60 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return (
    eat.getUTCFullYear().toString() +
    pad(eat.getUTCMonth() + 1) +
    pad(eat.getUTCDate()) +
    pad(eat.getUTCHours()) +
    pad(eat.getUTCMinutes()) +
    pad(eat.getUTCSeconds())
  );
}

function shortcodeAndPassword() {
  const { MPESA_SHORTCODE, MPESA_PASSKEY } = requireConfig();
  const timestamp = eatTimestamp();
  const password = Buffer.from(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`).toString('base64');
  return { shortcode: MPESA_SHORTCODE, timestamp, password };
}

function isTill() {
  return (process.env.MPESA_ACCOUNT_TYPE || 'till').toLowerCase() !== 'paybill';
}

function callbackUrl() {
  return process.env.MPESA_CALLBACK_URL || 'https://thevillagersnotes.com/api/mpesa-callback';
}

export { baseUrl, requireConfig, getAccessToken, shortcodeAndPassword, isTill, callbackUrl };
