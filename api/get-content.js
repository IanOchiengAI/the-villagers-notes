// /api/get-content.js
// Vercel serverless function — securely serve a paid article's full body after access is
// proven one of three ways (see .agent/plans/2026-09-28-media-prices-access.md Part 5):
//
//   1. device_key   — a key this browser already minted, stored in entry_access (kind=device).
//   2. access_token — a one-time link the admin sent the reader (kind=grant); claiming it
//                      atomically mints a new device key for this browser.
//   3. invoice_id   — the original purchase on the buying device: re-verifies the IntaSend
//                      invoice as before, then mints the FIRST device key for that purchase
//                      (one-time; a second attempt gets 409 ALREADY_CLAIMED).
//
// Every other case (unlock code sharing) was removed 2026-09-28 per Vic's instruction: only
// the admin can grant access on a new device now, so a leaked code can no longer be used by
// unlimited people.
//
// Security:
//   - Full article body is NEVER sent to the browser without one of the above being verified.
//   - The Supabase service role key is never exposed to the client.
//   - Only SHA-256 hashes of device keys / grant tokens are ever stored or looked up; the raw
//     values are never logged.
//   - A provider/DB outage is answered as 503 + state 'TRANSIENT', never a "not paid" verdict
//     (DECISIONS_LOG 1.9) — the reader's saved credential is not discarded on the client.

import { intasendKeys, keysMissingResponse } from './_intasend.js';
import { fetchT, fetchInvoice, safeJson, clientIp, allow, tooMany, normaliseYouTubeUrl } from './_util.js';
import { hashKey, randomKey } from './_access.js';
import { markEntryPurchasePaid } from './_payments.js';

// The paid recording of the play, sold on /projects. Its purchases live alongside paid entries.
export const PLAY_ID = 'play';
const PLAY_DEFAULT_PRICE = 1000;

const TRANSIENT = { error: 'The article could not be loaded right now. Please try again in a moment.', state: 'TRANSIENT' };
const NO_ACCESS = { state: 'NO_ACCESS', error: 'This device no longer has access. Message Vic on WhatsApp with the number you paid from.' };
const LINK_USED = { state: 'LINK_USED', error: 'This link has already been used or has expired. Ask Vic for a new one.' };
const ALREADY_CLAIMED = { state: 'ALREADY_CLAIMED', error: 'This payment has already unlocked a device. If you changed phones, message Vic on WhatsApp with the number you paid from.' };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!allow(`get-content:${clientIp(req)}`, 30, 60_000)) return tooMany(res);

  const { entry_id, device_key, access_token, invoice_id } = req.body || {};

  if (!entry_id || typeof entry_id !== 'string' || entry_id.length > 200) {
    return res.status(400).json({ error: 'Missing or invalid entry_id' });
  }
  const provided = [device_key, access_token, invoice_id].filter((v) => typeof v === 'string' && v.length > 0);
  if (provided.length !== 1) {
    return res.status(400).json({ error: 'Provide exactly one of device_key, access_token or invoice_id' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return res.status(503).json(TRANSIENT);
  }
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', Accept: 'application/json' };

  // Every path ends the same way: load the entry's full_body and return it. Loaded once,
  // used by whichever branch proves access.
  // The paid play is the product id `play`: its price is the admin-set play price and its
  // "content" is the video (private_settings.play_private_link, else PLAY_PRIVATE_LINK),
  // handed out only here, after the same checks as a paid entry (DECISIONS_LOG 1.6).
  async function loadEntry() {
    if (entry_id === PLAY_ID) {
      const [priceRes, linkRes] = await Promise.all([
        fetchT(`${supabaseUrl}/rest/v1/site_settings?key=eq.play_price&select=value`, { headers }, 7000),
        fetchT(`${supabaseUrl}/rest/v1/private_settings?key=eq.play_private_link&select=value`, { headers }, 7000),
      ]);
      if (!priceRes.ok || !linkRes.ok) return { error: true };
      const priceRows = (await safeJson(priceRes)) || [];
      const linkRows = (await safeJson(linkRes)) || [];
      const price = Math.round(Number(priceRows[0]?.value)) || PLAY_DEFAULT_PRICE;
      const raw = String(linkRows[0]?.value || process.env.PLAY_PRIVATE_LINK || '');
      const link = /^https:\/\/[^\s"'<>]+$/.test(raw) ? raw : '';
      return { entry: { id: PLAY_ID, price, full_body: null, video_url: link, youtube: link ? normaliseYouTubeUrl(link) : null } };
    }
    const r = await fetchT(
      `${supabaseUrl}/rest/v1/entries?id=eq.${encodeURIComponent(entry_id)}&select=id,price,full_body`,
      { headers },
      8000
    );
    if (!r.ok) return { error: true };
    const rows = await safeJson(r);
    if (!Array.isArray(rows) || rows.length === 0) return { notFound: true };
    return { entry: rows[0] };
  }

  /** Returns a { status, json } to send if full_body isn't ready, else null. */
  function missingBody(entry) {
    if (entry.id === PLAY_ID) {
      return entry.video_url ? null : { status: 503, json: { error: "The play isn't available right now. Please try again later.", state: 'TRANSIENT' } };
    }
    if (!Array.isArray(entry.full_body) || entry.full_body.length === 0) {
      return { status: 500, json: { error: 'Full article content not yet available. Contact the author.' } };
    }
    return null;
  }

  /** What the browser receives once access is proven: an entry's full text, or the play's video. */
  function content(entry) {
    if (entry.id === PLAY_ID) {
      const id = entry.youtube ? (entry.youtube.match(/[?&]v=([A-Za-z0-9_-]{11})/) || [])[1] : null;
      return { video_url: entry.video_url, youtube_id: id || null };
    }
    return { body: entry.full_body };
  }

  /** Mint a new device key tied to `invoiceId`, insert it, and return the raw key. */
  async function mintDeviceKey(invoiceId) {
    const raw = randomKey();
    const r = await fetchT(`${supabaseUrl}/rest/v1/entry_access`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'return=minimal' },
      body: JSON.stringify({ invoice_id: invoiceId, entry_id, kind: 'device', key_hash: hashKey(raw) }),
    }, 7000);
    if (!r.ok) {
      console.error('[get-content] device key mint failed:', r.status);
      return null;
    }
    return raw;
  }

  /** Best-effort undo of a claim when minting failed after it (logged, never thrown). */
  async function release(pathAndFilter, patch) {
    try {
      const r = await fetchT(`${supabaseUrl}/rest/v1/${pathAndFilter}`, {
        method: 'PATCH', headers: { ...headers, Prefer: 'return=minimal' }, body: JSON.stringify(patch),
      }, 5000);
      if (!r.ok) console.error('[get-content] claim release failed:', r.status);
    } catch (e) {
      console.error('[get-content] claim release error:', e);
    }
  }

  try {
    // ── 1. Device key — this browser already unlocked the entry before ──────────────
    if (device_key) {
      if (device_key.length > 300) return res.status(400).json({ error: 'Invalid device key' });
      const hash = hashKey(device_key);
      const r = await fetchT(
        `${supabaseUrl}/rest/v1/entry_access?key_hash=eq.${encodeURIComponent(hash)}&kind=eq.device&revoked_at=is.null&entry_id=eq.${encodeURIComponent(entry_id)}&select=id&limit=1`,
        { headers },
        7000
      );
      if (!r.ok) return res.status(503).json(TRANSIENT);
      const rows = await safeJson(r);
      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(403).json(NO_ACCESS);
      }
      const { entry, error, notFound } = await loadEntry();
      if (error) return res.status(503).json(TRANSIENT);
      if (notFound) return res.status(404).json({ error: 'Entry not found' });
      const miss = missingBody(entry);
      if (miss) return res.status(miss.status).json(miss.json);
      return res.status(200).json({ ok: true, entry_id: entry.id, ...content(entry) });
    }

    // ── 2. One-time access token — a link the admin generated for this reader ───────
    if (access_token) {
      if (access_token.length > 300) return res.status(400).json({ error: 'Invalid access link' });
      const hash = hashKey(access_token);
      const nowIso = new Date().toISOString();
      const r = await fetchT(
        `${supabaseUrl}/rest/v1/entry_access?key_hash=eq.${encodeURIComponent(hash)}&kind=eq.grant&entry_id=eq.${encodeURIComponent(entry_id)}&used_at=is.null&revoked_at=is.null&expires_at=gt.${encodeURIComponent(nowIso)}&select=id,invoice_id&limit=1`,
        { headers },
        7000
      );
      if (!r.ok) return res.status(503).json(TRANSIENT);
      const rows = await safeJson(r);
      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(410).json(LINK_USED);
      }
      const grant = rows[0];

      // Load the entry BEFORE claiming, so a DB hiccup here doesn't burn the link.
      const { entry, error, notFound } = await loadEntry();
      if (error) return res.status(503).json(TRANSIENT);
      if (notFound) return res.status(404).json({ error: 'Entry not found' });
      const miss = missingBody(entry);
      if (miss) return res.status(miss.status).json(miss.json);

      // Claim it atomically: this PATCH only matches (and only returns a row) if used_at
      // was still null at the moment it runs, so a concurrent second use loses the race.
      const claimRes = await fetchT(
        `${supabaseUrl}/rest/v1/entry_access?id=eq.${encodeURIComponent(grant.id)}&used_at=is.null`,
        { method: 'PATCH', headers: { ...headers, Prefer: 'return=representation' }, body: JSON.stringify({ used_at: nowIso }) },
        7000
      );
      if (!claimRes.ok) return res.status(503).json(TRANSIENT);
      const claimed = await safeJson(claimRes);
      if (!Array.isArray(claimed) || claimed.length === 0) {
        return res.status(410).json(LINK_USED);
      }

      const rawDeviceKey = await mintDeviceKey(grant.invoice_id);
      if (!rawDeviceKey) {
        // Release the claim so the reader's retry can still use the link.
        await release(`entry_access?id=eq.${encodeURIComponent(grant.id)}`, { used_at: null });
        return res.status(503).json(TRANSIENT);
      }
      return res.status(200).json({ ok: true, entry_id: entry.id, ...content(entry), device_key: rawDeviceKey });
    }

    // ── 3. Original purchase invoice — the buying device, first visit ───────────────
    if (invoice_id) {
      if (invoice_id.length > 200) return res.status(400).json({ error: 'Missing or invalid invoice_id' });

      const { publicKey, secretKey } = intasendKeys();
      if (!publicKey) return keysMissingResponse(res);

      const { entry, error, notFound } = await loadEntry();
      if (error) return res.status(503).json(TRANSIENT);
      if (notFound) return res.status(404).json({ error: 'Entry not found' });
      if (!entry.price || Number(entry.price) <= 0) {
        return res.status(400).json({ error: 'This article is free — no payment required' });
      }

      // A provider outage is NOT a verdict on the payment: 503/TRANSIENT keeps the
      // reader's saved invoice and lets them retry (DECISIONS_LOG 1.9).
      const { invoice, error: invErr } = await fetchInvoice(publicKey, secretKey, invoice_id);
      if (invErr) {
        return res.status(503).json({ error: 'We could not reach the payment provider. Your payment is safe — please try again in a moment.', state: 'TRANSIENT' });
      }
      const state = invoice.state;
      if (state !== 'COMPLETE' && state !== 'SUCCESSFUL') {
        return res.status(402).json({ error: invoice.failed_reason || `Payment state is ${state}`, state: state || 'UNKNOWN' });
      }
      // Paid entries are bound to `entry:<id>`; the play's invoices are `play:<timestamp>`.
      const expectedRef = entry_id === PLAY_ID ? 'play:' : `entry:${entry_id}`;
      const refOk = entry_id === PLAY_ID ? String(invoice.api_ref || '').startsWith('play:') : invoice.api_ref === expectedRef;
      if (!refOk) {
        console.warn('[get-content] api_ref mismatch for entry', entry_id, '- got:', invoice.api_ref);
        return res.status(402).json({ error: `Payment mismatch (Expected ${expectedRef}, got ${invoice.api_ref}). Contact author.`, state: 'MISMATCH' });
      }
      const paidValue = Number(invoice.value ?? invoice.amount ?? 0);
      if (!paidValue || paidValue < Number(entry.price)) {
        console.warn('[get-content] amount mismatch for entry', entry_id, '- expected:', entry.price, 'got:', paidValue);
        return res.status(402).json({ error: `Amount mismatch (Paid ${paidValue}, Price ${entry.price}).`, state: 'AMOUNT_MISMATCH' });
      }
      const miss = missingBody(entry);
      if (miss) return res.status(miss.status).json(miss.json);

      // Record the purchase as Paid (creates the row if this buyer paid before the
      // entry_purchases table existed — device_minted_at stays null so the claim below
      // still succeeds for them).
      const marked = await markEntryPurchasePaid(invoice_id, entry_id, paidValue);
      if (!marked) return res.status(503).json(TRANSIENT);

      // Claim the one-time device mint for this purchase. Only the first caller to reach
      // this PATCH while device_minted_at is still null gets a row back.
      const claimRes = await fetchT(
        `${supabaseUrl}/rest/v1/entry_purchases?invoice_id=eq.${encodeURIComponent(invoice_id)}&device_minted_at=is.null`,
        { method: 'PATCH', headers: { ...headers, Prefer: 'return=representation' }, body: JSON.stringify({ device_minted_at: new Date().toISOString() }) },
        7000
      );
      if (!claimRes.ok) return res.status(503).json(TRANSIENT);
      const claimed = await safeJson(claimRes);
      if (!Array.isArray(claimed) || claimed.length === 0) {
        return res.status(409).json(ALREADY_CLAIMED);
      }

      const rawDeviceKey = await mintDeviceKey(invoice_id);
      if (!rawDeviceKey) {
        // Release the one-time mint so the buyer's retry isn't told ALREADY_CLAIMED.
        await release(`entry_purchases?invoice_id=eq.${encodeURIComponent(invoice_id)}`, { device_minted_at: null });
        return res.status(503).json(TRANSIENT);
      }
      return res.status(200).json({ ok: true, entry_id: entry.id, ...content(entry), device_key: rawDeviceKey });
    }

    // Unreachable: the `provided.length !== 1` check above guarantees one of the three ifs ran.
    return res.status(400).json({ error: 'Missing device_key, access_token or invoice_id' });
  } catch (err) {
    console.error('[get-content] Error:', err);
    return res.status(503).json({ error: 'Something went wrong on our side. Please try again in a moment.', state: 'TRANSIENT' });
  }
}
