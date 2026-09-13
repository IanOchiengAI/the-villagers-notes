// Vercel serverless function — Safaricom Daraja calls this URL asynchronously once an
// STK Push resolves. The site's polling (/api/stk-status, via the Query API) is the
// primary confirmation path, so this endpoint just logs for a redundant record and
// acknowledges receipt the way Daraja requires (Safaricom retries if it doesn't get
// a 200 with this shape).

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).json({ ResultCode: 0, ResultDesc: 'Success' });
  }

  try {
    const stk = req.body?.Body?.stkCallback;
    if (stk) {
      console.log('[M-Pesa Callback]', JSON.stringify({
        MerchantRequestID: stk.MerchantRequestID,
        CheckoutRequestID: stk.CheckoutRequestID,
        ResultCode: stk.ResultCode,
        ResultDesc: stk.ResultDesc,
      }));
    } else {
      console.log('[M-Pesa Callback] unrecognized payload:', JSON.stringify(req.body));
    }
  } catch (err) {
    console.error('[M-Pesa Callback] logging error:', err);
  }

  return res.status(200).json({ ResultCode: 0, ResultDesc: 'Success' });
}
