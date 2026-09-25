# M-Pesa STK Push Guide — Vic Munala

This guide explains how M-Pesa payments work for **Under the Mango Tree** book orders, the **Beneath the Surface** private viewing link, paid entries, and **Buy Vic a Soda** tips on *The Villager's Notes*.

The site currently runs M-Pesa through **IntaSend** (a Kenyan payment gateway that sits on top of Safaricom's Daraja API), not a direct Daraja integration. A direct-Daraja version exists on a separate branch and can be switched to later if there's a reason to — ask Kasuku Studio.

---

## 1. How It Works on the Website
1. **Customer perspective**: When a customer clicks "Pay via M-Pesa" or "Send soda", an instant popup appears on their Safaricom phone asking for their M-Pesa PIN.
2. **Author perspective**: IntaSend settles the payment to the account you registered with them (your M-Pesa number or bank account, whichever you chose during signup), usually within 1–3 business days depending on your settlement schedule. You also get the normal Safaricom M-Pesa SMS if it settles to your M-Pesa number directly.
3. **Security**: All payment API calls run through private Vercel serverless functions (`/api/stk-push.js`, `/api/stk-status.js`, `/api/get-content.js`). Your IntaSend keys are stored only in Vercel's environment variables and are never exposed in the browser or committed to the code.

---

## 2. Setting Up Your Own IntaSend Account

The site needs to run on **your own** IntaSend account so payments (and the settlement) go to you, not the studio.

1. Sign up at [payment.intasend.com](https://payment.intasend.com) — a **live** account, not sandbox — under your name or "The Villagers Notes."
2. Complete KYC (know-your-customer) verification: national ID, KRA PIN, a selfie, and the account you want payouts sent to (M-Pesa number or bank account). Payouts won't release until this is approved — it usually takes a day or two.
3. Once approved: **Settings → API Keys** → generate your **live** keys. You'll see two:
   - **Publishable key** (starts `ISPubKey_live_…`)
   - **Secret key** (starts `ISSecretKey_live_…`)
4. Send both keys to Kasuku Studio over a private channel (WhatsApp DM or Signal — not a group chat, not email CC). We add them to Vercel's environment variables and redeploy; nothing needs to change in the code itself.
5. Optional: in IntaSend's settings, set the business display name customers see on the STK prompt to "The Villagers Notes."

---

## 3. If You Don't Have an IntaSend Account Yet

**No worries — the website still takes orders immediately.**

- **Direct WhatsApp ordering**: The book page has an "Order via WhatsApp" button. Customers can place orders directly with you via chat and pay to your personal M-Pesa number.
- Once your IntaSend account is approved and you've sent Kasuku Studio your keys (Section 2), automated M-Pesa payments go live on the site without any other changes needed.
