# Safaricom Daraja M-Pesa STK Push Guide — Vic Munala

This explains how M-Pesa STK Push works on *The Villager's Notes* for **Under the Mango Tree** book orders, paid-article unlocks, and **Buy Vic a Soda** tips. As of 2026-09-13, payments go straight through Safaricom's own Daraja API to Vic's Till Number — no third-party payment aggregator (previously IntaSend) sits in between, so there's no extra transaction cut and money lands in his Till instantly.

---

## 1. How It Works on the Website

1. **Customer perspective**: clicking "Pay KES X via M-Pesa" triggers an instant popup on their Safaricom phone asking for their M-Pesa PIN.
2. **Vic's perspective**: the money lands directly in his Till Number instantly, with the usual Safaricom M-Pesa SMS notification.
3. **Security**: all API calls run through private Vercel serverless functions (`/api/stk-push.js`, `/api/stk-status.js`, `/api/get-content.js`, `/api/mpesa-callback.js`). Vic's Daraja keys are never exposed in the browser.

---

## 2. Required Vercel Environment Variables (Production)

| Variable | What it is | Where it comes from |
|---|---|---|
| `MPESA_CONSUMER_KEY` | Daraja app API key | developer.safaricom.co.ke → your app → Keys |
| `MPESA_CONSUMER_SECRET` | Daraja app API secret | Same page as above |
| `MPESA_SHORTCODE` | Vic's Till Number | Vic (from `*334#` or his Till confirmation SMS) |
| `MPESA_PASSKEY` | Lipa Na M-Pesa Online passkey | Issued by Safaricom once the Till is approved for STK Push ("Go-Live") |
| `MPESA_ACCOUNT_TYPE` | `till` (default) or `paybill` | Set only if Vic's shortcode is a Paybill, not a Till |
| `MPESA_ENV` | `production` (default) or `sandbox` | Use `sandbox` only for testing against Safaricom's test environment |
| `MPESA_CALLBACK_URL` | Optional override | Defaults to `https://thevillagersnotes.com/api/mpesa-callback` |
| `SUPABASE_SERVICE_ROLE_KEY` | Already set | Needed by `get-content.js` and `admin-entries.js` (unrelated to M-Pesa, but also required) |

None of these should ever be committed to the repo — set them in Vercel's dashboard (Project → Settings → Environment Variables → Production).

---

## 3. Getting the Credentials (Kasuku Studio does this part)

1. Log in to [developer.safaricom.co.ke](https://developer.safaricom.co.ke) (Kasuku Studio's own developer account — this doesn't need to be Vic's).
2. Create an app named **The Villagers Notes**. This gives you the **Consumer Key** and **Consumer Secret**.
3. Under **APIs → M-PESA Express (STK Push)**, request/submit Vic's Till Number for **Go-Live** approval. Safaricom issues the **Passkey** once that Till is approved for STK Push API access — this step needs Vic's Till Number and may need his confirmation, since it's authorizing API access to his own money-receiving number.
4. Once you have all 4 values (Consumer Key, Consumer Secret, Shortcode = Till Number, Passkey), add them to Vercel's production environment variables and redeploy.

---

## 4. Testing Before Going Live

Safaricom provides a sandbox environment with test credentials and a test shortcode (`174379`) for verifying the integration end-to-end without moving real money. Set `MPESA_ENV=sandbox` plus Safaricom's published sandbox Consumer Key/Secret/Passkey temporarily to test the full flow (push → phone prompt simulator → status query → content unlock), then switch back to production values before going live for real customers.

---

## 5. If Vic Doesn't Have a Till Number Yet

**The website still takes orders immediately without one:**
- **Direct WhatsApp Ordering**: the book page has an "Order via WhatsApp" button linked to his number (`+254 710 276 333`) so customers can order and pay him directly via chat.
- **Getting a Till Number**: apply for a Safaricom **Buy Goods Till** via `*334#` (usually same-day, no business registration needed for an individual/sole-trader till). Kasuku Studio then handles the Daraja app + Go-Live request at zero extra cost to connect it.
