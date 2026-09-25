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

  const formId = process.env.FORMSPREE_FORM_ID || 'xwlpqzle';
  const formUrl = `https://formspree.io/f/${formId}`;

  // Supabase (Service Role Key for backend insertion bypassing RLS)
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let already = false;

  try {
    // 1. Alert via Formspree
    const fsRes = await fetch(formUrl, {
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

    if (!fsRes.ok) {
      console.error('[subscribe] Formspree error:', await fsRes.text());
    }

    // 2. Save to Supabase for Admin Dashboard
    if (supabaseUrl && supabaseKey) {
      const dbRes = await fetch(`${supabaseUrl}/rest/v1/subscribers?on_conflict=email`, {
        method: 'POST',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=ignore-duplicates,return=minimal'
        },
        body: JSON.stringify({ email })
      });

      if (!dbRes.ok) {
        const err = await dbRes.text();
        if (err.includes('duplicate key') || dbRes.status === 409) {
          already = true;
        } else {
          console.error('[subscribe] Supabase error:', err);
        }
      }
    }

    return res.status(200).json({ ok: true, already });

  } catch (err) {
    console.error('[subscribe] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

