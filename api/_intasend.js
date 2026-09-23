// Shared helper — IntaSend keys, read only from Vercel env vars.
// No hardcoded fallback key: payments must use the account that's actually
// configured for this deployment (Vic's IntaSend account), never a key baked
// into the source. If the keys aren't set yet, callers should return 503 and
// point customers at the WhatsApp ordering fallback instead of silently
// charging into an unknown account.

export function intasendKeys() {
  return {
    publicKey: process.env.INTASEND_PUBLISHABLE_KEY || null,
    secretKey: process.env.INTASEND_SECRET_KEY || null,
  };
}

export function keysMissingResponse(res) {
  return res.status(503).json({
    error: 'Online payments are being set up. Please try again later or order via WhatsApp.',
  });
}
