# Safaricom Daraja M-Pesa STK Push Guide — Vic Munala

This guide explains how the M-Pesa STK Push works for **Under the Mango Tree** book orders and **Buy Vic a Soda** tips on *The Villager's Notes*.

---

## 1. How It Works on the Website
1. **Customer perspective**: When a customer clicks **"Pay KES 1,500 via M-Pesa"** or **"Send KES 100"**, an instant popup appears on their Safaricom phone asking for their M-Pesa PIN.
2. **Author perspective**: The money lands directly in your Till Number or Paybill instantly, and you receive the normal Safaricom M-Pesa SMS notification.
3. **Security**: All API transactions run through a private Vercel serverless function (`/api/stk-push.js`). Your keys are never exposed in the browser.

---

## 2. If You Already Have a Till Number or Paybill

You only need to generate 4 API credentials from Safaricom:

1. **Consumer Key**
2. **Consumer Secret**
3. **Shortcode** (Your Till or Paybill number)
4. **Passkey**

### How to get them in 5 minutes:
1. Log in to [developer.safaricom.co.ke](https://developer.safaricom.co.ke).
2. Create an App named **The Villagers Notes**.
3. Under **Keys**, copy your **Consumer Key** and **Consumer Secret**.
4. Go to **APIs → M-PESA Express (STK Push)** to obtain your **Passkey**.
5. Send these 4 items to Kasuku Studio via WhatsApp/Signal. We plug them into Vercel, and automated payments go live immediately.

---

## 3. If You Don't Have a Till Number or Daraja Account Yet

**No worries at all — your website still takes orders immediately!**

- **Direct WhatsApp Ordering**: The book page features a direct **"Order via WhatsApp"** button linked to your number (`+254 710 276 333`). Customers can place orders directly with you via chat and pay to your personal number.
- **Getting a Till Number**: Whenever you are ready to automate:
  - You can apply for a Safaricom **Buy Goods Till** online or via `*334#`.
  - Kasuku Studio will guide you through connecting it to Daraja at zero extra cost.
