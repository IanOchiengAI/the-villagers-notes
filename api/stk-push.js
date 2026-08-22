// Vercel serverless function — M-Pesa STK Push via IntaSend / Direct Gateway

const DEFAULT_INTASEND_KEY = 'ISPubKey_live_7a3054ea-0add-41ba-a643-46933dff26f3';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { phone, amount, name, narrative } = req.body || {};
  if (!phone || !amount) return res.status(400).json({ error: 'Missing phone or amount' });

  // Validate amount bounds
  const numAmount = Math.round(Number(amount));
  if (isNaN(numAmount) || numAmount < 10 || numAmount > 500000) {
    return res.status(400).json({ error: 'Invalid amount. Minimum is KES 10, maximum KES 500,000.' });
  }

  // Validate Kenyan phone format
  const cleanPhone = String(phone).replace(/\D/g, '');
  let formattedPhone = null;
  if (cleanPhone.startsWith('254') && cleanPhone.length === 12) formattedPhone = cleanPhone;
  else if ((cleanPhone.startsWith('07') || cleanPhone.startsWith('01')) && cleanPhone.length === 10) formattedPhone = '254' + cleanPhone.slice(1);
  else if (cleanPhone.length === 9 && (cleanPhone.startsWith('7') || cleanPhone.startsWith('1'))) formattedPhone = '254' + cleanPhone;

  if (!formattedPhone) {
    return res.status(400).json({ error: 'Invalid Kenyan phone number format. Use 07XXXXXXXX or 254XXXXXXXXX.' });
  }

  const cleanNarrative = String(narrative || `Order - ${name || 'Customer'}`).slice(0, 100).replace(/[^\w\s\-.,]/g, '');
  const publicKey = process.env.INTASEND_PUBLISHABLE_KEY || process.env.INTASEND_PUBLIC_KEY || DEFAULT_INTASEND_KEY;

  try {
    const response = await fetch('https://payment.intasend.com/api/v1/payment/mpesa-stk-push/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        public_key: publicKey,
        currency: 'KES',
        phone_number: formattedPhone,
        amount: numAmount,
        narrative: cleanNarrative,
      }),
    });

    const data = await response.json();

    if (!response.ok || data.errors) {
      const errMsg = typeof data.errors === 'string' ? data.errors : (data.detail || data.message || 'STK Push failed. Check phone number.');
      return res.status(400).json({ error: errMsg, details: data });
    }

    return res.status(200).json({
      ok: true,
      invoice_id: data.invoice?.invoice_id || data.id,
      tracking_id: data.tracking_id || data.invoice?.tracking_id,
      CheckoutRequestID: data.invoice?.invoice_id || data.id,
    });
  } catch (err) {
    console.error('[M-Pesa STK Push Error]:', err);
    return res.status(500).json({ error: err.message || 'Payment server error' });
  }
}


