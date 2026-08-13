// Vercel serverless function — newsletter subscription
// Forwards email to Buttondown. Wire up by:
// 1. Creating a free account at https://buttondown.email
// 2. Getting your API key from Settings → API
// 3. Adding BUTTONDOWN_API_KEY to Vercel environment variables

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body || {};

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  const apiKey = process.env.BUTTONDOWN_API_KEY;
  if (!apiKey) {
    // Graceful fallback during development — log and succeed silently
    console.log('[Newsletter] No API key set. Would have subscribed:', email);
    return res.status(200).json({ ok: true, dev: true });
  }

  try {
    const response = await fetch('https://api.buttondown.email/v1/subscribers', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, tags: ['the-villagers-notes'] }),
    });

    if (response.status === 201 || response.status === 200) {
      return res.status(200).json({ ok: true });
    }

    // Already subscribed — treat as success
    if (response.status === 400) {
      const data = await response.json();
      if (data?.email?.[0]?.includes('already')) {
        return res.status(200).json({ ok: true, already: true });
      }
    }

    return res.status(500).json({ error: 'Subscription failed' });
  } catch (err) {
    console.error('[Newsletter] Error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
