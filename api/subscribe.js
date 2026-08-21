// Vercel serverless function — subscriber alerts via Formspree
// Target email: vikmunala@gmail.com
// Wire up by:
// 1. Creating a free form at https://formspree.io set to send alerts to vikmunala@gmail.com
// 2. Setting FORMSPREE_FORM_ID in Vercel environment variables (e.g. xpwzyab)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body || {};

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  const formId = process.env.FORMSPREE_FORM_ID;
  const formUrl = process.env.FORMSPREE_URL || (formId ? `https://formspree.io/f/${formId}` : null);

  if (formUrl) {
    try {
      const response = await fetch(formUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          email,
          _subject: `New Newsletter Subscriber: ${email}`,
          message: `New reader subscribed to The Villager's Notes:\n\nEmail: ${email}\nDate: ${new Date().toLocaleString('en-GB')}`,
          _replyto: email,
        }),
      });

      if (response.ok) {
        return res.status(200).json({ ok: true });
      }
    } catch (err) {
      console.error('[Newsletter/Formspree] Error:', err);
    }
  }

  // Graceful fallback during local dev or before Formspree form ID is set
  console.log('[Newsletter] Subscribed:', email, '(Alert target: vikmunala@gmail.com)');
  return res.status(200).json({ ok: true, dev: !formUrl });
}

