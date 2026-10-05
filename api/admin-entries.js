// /api/admin-entries.js
// Vercel serverless function — the ONLY way entries (and admin-only tables) get
// written now that anon has no insert/update/delete grant on them (see the
// 2026-09-13 RLS lockdown). Requires a signed admin token from /api/admin-auth
// and writes via the Supabase service role key, which bypasses RLS/grants.
//
// 2026-09-28: also the only way the admin manages entry media uploads, the
// admin-set play/book prices and private play link, and admin-only access
// grants for paid entries on a new device (see
// .agent/plans/2026-09-28-media-prices-access.md Parts 2-5). Every new table
// this touches (site_settings, private_settings, entry_purchases, entry_access)
// requires the service role key — there is no anon fallback anywhere in this file.

import crypto from 'crypto';
import { verifyToken } from './_admin-token.js';
import { intasendKeys } from './_intasend.js';
import { fetchT, safeJson, isSafeSlug, isEntryMediaUrl, normaliseYouTubeUrl, fetchInvoice } from './_util.js';
import { hashKey, randomKey } from './_access.js';
import { markEntryPurchasePaid } from './_payments.js';

// `likes` is deliberately NOT here: readers change it (via /api/like), so an admin save must never
// overwrite the live count with the stale number the admin page loaded.
const ENTRY_COLUMNS = [
  'id', 'slug', 'title', 'excerpt', 'category', 'entry_date', 'author',
  'price', 'preview_words', 'body', 'sort_order',
  'image_url', 'audio_url', 'video_url', 'og_image_url',
];
const ORDER_STATUSES = ['Awaiting payment', 'Paid', 'Dispatched', 'Delivered'];

// Media upload whitelist (Part 2): mime -> file extension. Extension always comes from
// the mime type, never from the browser-supplied filename.
const IMAGE_MIME_EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const AUDIO_MIME_EXT = {
  'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a',
  'audio/aac': 'aac', 'audio/wav': 'wav', 'audio/ogg': 'ogg',
};
const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const AUDIO_MAX_BYTES = 25 * 1024 * 1024;

const PLAY_LINK_RE = /^https:\/\/[^\s"'<>]+$/;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    token, action, entry, entryId, fullBody, commentId, orderId, status,
    kind, contentType, size, prices, link, invoiceId, ideaId, ideaText,
  } = req.body || {};

  if (!verifyToken(token)) {
    return res.status(401).json({ error: 'Unauthorized — please log in again' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'The admin panel is not configured. Contact your developer.' });
  }

  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  };
  const T = 9000;

  try {
    if (action === 'upsert') {
      if (!entry || typeof entry !== 'object' || !entry.id || typeof entry.id !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid entry' });
      }
      // Whitelist columns; never let the client write arbitrary ones.
      const row = {};
      for (const c of ENTRY_COLUMNS) if (entry[c] !== undefined) row[c] = entry[c];

      // Media URL validation (2026-09-28): empty clears the field; anything else must be
      // a real file in our own storage bucket (image/audio) or a real YouTube link (video).
      for (const col of ['image_url', 'audio_url', 'og_image_url']) {
        if (row[col] === undefined) continue;
        const v = row[col];
        if (v === null || v === '') { row[col] = null; continue; }
        if (typeof v !== 'string' || !isEntryMediaUrl(v, supabaseUrl)) {
          return res.status(400).json({ error: col === 'audio_url' ? 'That audio link is not valid. Upload it through the form instead of pasting a URL.' : 'That cover image link is not valid. Upload it through the form instead of pasting a URL.' });
        }
      }
      if (row.video_url !== undefined) {
        const v = row.video_url;
        if (v === null || v === '') {
          row.video_url = null;
        } else {
          const normalised = typeof v === 'string' ? normaliseYouTubeUrl(v) : null;
          if (!normalised) return res.status(400).json({ error: "That doesn't look like a YouTube link." });
          row.video_url = normalised;
        }
      }

      // Paid full text travels in the SAME write as the preview so the two can never diverge.
      if (Array.isArray(fullBody)) {
        if (fullBody.length === 0) return res.status(400).json({ error: 'Full text is empty' });
        row.full_body = fullBody;
      }
      const r = await fetchT(`${supabaseUrl}/rest/v1/entries?on_conflict=id`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(row),
      }, T);
      if (!r.ok) {
        console.error('[admin-entries] upsert error:', await r.text());
        return res.status(502).json({ error: 'Failed to save entry' });
      }
      return res.status(200).json({ ok: true });
    }

    if (action === 'upsert_full_body') {
      if (!entryId || typeof entryId !== 'string' || !Array.isArray(fullBody) || fullBody.length === 0) {
        return res.status(400).json({ error: 'Missing entryId or fullBody' });
      }
      const r = await fetchT(`${supabaseUrl}/rest/v1/entries?id=eq.${encodeURIComponent(entryId)}`, {
        method: 'PATCH',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify({ full_body: fullBody }),
      }, T);
      if (!r.ok) {
        console.error('[admin-entries] upsert_full_body error:', await r.text());
        return res.status(502).json({ error: 'Failed to save full article body' });
      }
      return res.status(200).json({ ok: true });
    }

    // Share image only (the admin's one-time "Create share images" backfill). Touches no
    // other column, so it can't disturb an entry's text, price or likes.
    if (action === 'set_og_image') {
      const ogImageUrl = req.body?.ogImageUrl;
      if (!entryId || typeof entryId !== 'string' || entryId.length > 200) return res.status(400).json({ error: 'Missing entryId' });
      if (typeof ogImageUrl !== 'string' || !isEntryMediaUrl(ogImageUrl, supabaseUrl)) return res.status(400).json({ error: 'Invalid share image' });
      const r = await fetchT(`${supabaseUrl}/rest/v1/entries?id=eq.${encodeURIComponent(entryId)}`, {
        method: 'PATCH',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify({ og_image_url: ogImageUrl }),
      }, T);
      if (!r.ok) {
        console.error('[admin-entries] set_og_image error:', await r.text());
        return res.status(502).json({ error: 'Failed to save the share image' });
      }
      return res.status(200).json({ ok: true });
    }

    if (action === 'get_full_body') {
      if (!entryId || typeof entryId !== 'string') {
        return res.status(400).json({ error: 'Missing entryId' });
      }
      const r = await fetchT(
        `${supabaseUrl}/rest/v1/entries?id=eq.${encodeURIComponent(entryId)}&select=full_body`,
        { headers },
        T
      );
      if (!r.ok) {
        console.error('[admin-entries] get_full_body error:', await r.text());
        return res.status(502).json({ error: 'Failed to load full article body' });
      }
      const rows = await safeJson(r);
      const fb = Array.isArray(rows) && rows[0] && Array.isArray(rows[0].full_body) ? rows[0].full_body : [];
      return res.status(200).json({ ok: true, fullBody: fb });
    }

    if (action === 'delete') {
      if (!entryId || typeof entryId !== 'string') {
        return res.status(400).json({ error: 'Missing entryId' });
      }
      const r = await fetchT(`${supabaseUrl}/rest/v1/entries?id=eq.${encodeURIComponent(entryId)}`, {
        method: 'DELETE',
        headers,
      }, T);
      if (!r.ok) {
        console.error('[admin-entries] delete error:', await r.text());
        return res.status(502).json({ error: 'Failed to delete entry' });
      }
      return res.status(200).json({ ok: true });
    }

    // ── Comment moderation ──────────────────────────────────────────────────
    if (action === 'list_comments') {
      const r = await fetchT(
        `${supabaseUrl}/rest/v1/comments?select=id,entry_id,author,comment,created_at&order=created_at.desc&limit=100`,
        { headers },
        T
      );
      if (!r.ok) return res.status(502).json({ error: 'Failed to load comments' });
      return res.status(200).json({ ok: true, comments: (await safeJson(r)) || [] });
    }

    if (action === 'delete_comment') {
      if (!commentId || typeof commentId !== 'string' || !/^[0-9a-f-]{36}$/i.test(commentId)) {
        return res.status(400).json({ error: 'Missing commentId' });
      }
      const r = await fetchT(`${supabaseUrl}/rest/v1/comments?id=eq.${commentId}`, { method: 'DELETE', headers }, T);
      if (!r.ok) return res.status(502).json({ error: 'Failed to delete comment' });
      return res.status(200).json({ ok: true });
    }

    // ── Book order status ───────────────────────────────────────────────────
    if (action === 'set_order_status') {
      if (!orderId || typeof orderId !== 'string' || orderId.length > 200 || !ORDER_STATUSES.includes(status)) {
        return res.status(400).json({ error: 'Invalid order or status' });
      }
      const r = await fetchT(`${supabaseUrl}/rest/v1/orders?order_id=eq.${encodeURIComponent(orderId)}`, {
        method: 'PATCH',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify({ status }),
      }, T);
      if (!r.ok) return res.status(502).json({ error: 'Failed to update order' });
      return res.status(200).json({ ok: true });
    }

    // ── Entry media uploads (Part 2) ────────────────────────────────────────
    if (action === 'create_media_upload') {
      if (kind !== 'image' && kind !== 'audio') {
        return res.status(400).json({ error: 'Invalid media kind' });
      }
      const mimeMap = kind === 'image' ? IMAGE_MIME_EXT : AUDIO_MIME_EXT;
      const maxBytes = kind === 'image' ? IMAGE_MAX_BYTES : AUDIO_MAX_BYTES;
      const ext = mimeMap[contentType];
      if (!ext) return res.status(400).json({ error: kind === 'image' ? 'Use a JPEG, PNG or WebP image.' : 'Use an MP3, M4A, AAC, WAV or OGG audio file.' });
      const numSize = Number(size);
      if (!Number.isFinite(numSize) || numSize <= 0 || numSize > maxBytes) {
        return res.status(400).json({ error: `File is too large. Maximum is ${Math.round(maxBytes / (1024 * 1024))} MB.` });
      }
      const objectPath = `${kind}/${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
      const signRes = await fetchT(`${supabaseUrl}/storage/v1/object/upload/sign/entry-media/${objectPath}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      }, T);
      if (!signRes.ok) {
        console.error('[admin-entries] create_media_upload sign error:', await signRes.text());
        return res.status(502).json({ error: 'Could not prepare the upload. Please try again.' });
      }
      const signData = await safeJson(signRes);
      const signedUrl = signData && typeof signData.url === 'string' ? signData.url : '';
      const tokenMatch = signedUrl.match(/[?&]token=([^&]+)/);
      if (!tokenMatch) {
        console.error('[admin-entries] create_media_upload: no token in sign response');
        return res.status(502).json({ error: 'Could not prepare the upload. Please try again.' });
      }
      return res.status(200).json({
        ok: true,
        path: objectPath,
        token: decodeURIComponent(tokenMatch[1]),
        publicUrl: `${supabaseUrl}/storage/v1/object/public/entry-media/${objectPath}`,
      });
    }

    // ── Prices + private play link (Parts 3-4) ──────────────────────────────
    if (action === 'get_settings') {
      const [settingsRes, playRes] = await Promise.all([
        fetchT(`${supabaseUrl}/rest/v1/site_settings?key=in.(play_price,book_price,play_trailer_url)&select=key,value`, { headers }, T),
        fetchT(`${supabaseUrl}/rest/v1/private_settings?key=eq.play_private_link&select=value`, { headers }, T),
      ]);
      if (!settingsRes.ok || !playRes.ok) {
        console.error('[admin-entries] get_settings error');
        return res.status(502).json({ error: 'Could not load settings' });
      }
      const settingsRows = (await safeJson(settingsRes)) || [];
      const settings = { play_price: 1000, book_price: 1500 };
      let trailerUrl = '';
      for (const r of settingsRows) {
        if (r.key === 'play_trailer_url') { trailerUrl = normaliseYouTubeUrl(r.value) || ''; continue; }
        const n = Math.round(Number(r.value));
        if (Number.isFinite(n) && n >= 50) settings[r.key] = n;
      }
      const playRows = (await safeJson(playRes)) || [];
      const dbLink = Array.isArray(playRows) && playRows[0] ? String(playRows[0].value || '') : '';
      const envLink = process.env.PLAY_PRIVATE_LINK || '';
      const validLink = (s) => PLAY_LINK_RE.test(s) && s.length <= 500;
      const playLink = validLink(dbLink) ? dbLink : (validLink(envLink) ? envLink : null);
      return res.status(200).json({ ok: true, settings, playLink, trailerUrl });
    }

    if (action === 'set_prices') {
      if (!prices || typeof prices !== 'object') return res.status(400).json({ error: 'Missing prices' });
      const rows = [];
      for (const k of ['play_price', 'book_price']) {
        if (prices[k] === undefined) continue;
        const n = Math.round(Number(prices[k]));
        if (!Number.isFinite(n) || n < 50 || n > 50000) {
          return res.status(400).json({ error: `${k === 'play_price' ? 'Play' : 'Book'} price must be between KES 50 and 50,000.` });
        }
        rows.push({ key: k, value: String(n), updated_at: new Date().toISOString() });
      }
      if (rows.length === 0) return res.status(400).json({ error: 'Nothing to save' });
      const r = await fetchT(`${supabaseUrl}/rest/v1/site_settings?on_conflict=key`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(rows),
      }, T);
      if (!r.ok) {
        console.error('[admin-entries] set_prices error:', await r.text());
        return res.status(502).json({ error: 'Failed to save prices' });
      }
      return res.status(200).json({ ok: true });
    }

    // Public play trailer (a YouTube link shown on /projects). Stored in site_settings, which
    // the public can read, so this must never be the paid recording (DECISIONS_LOG 1.6).
    if (action === 'set_trailer') {
      if (link === '' || link === undefined || link === null) {
        const r = await fetchT(`${supabaseUrl}/rest/v1/site_settings?key=eq.play_trailer_url`, { method: 'DELETE', headers }, T);
        if (!r.ok) return res.status(502).json({ error: 'Failed to remove the trailer' });
        return res.status(200).json({ ok: true, trailerUrl: '' });
      }
      const normalised = typeof link === 'string' ? normaliseYouTubeUrl(link) : null;
      if (!normalised) return res.status(400).json({ error: "That doesn't look like a YouTube link." });
      const r = await fetchT(`${supabaseUrl}/rest/v1/site_settings?on_conflict=key`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ key: 'play_trailer_url', value: normalised, updated_at: new Date().toISOString() }),
      }, T);
      if (!r.ok) {
        console.error('[admin-entries] set_trailer error:', await r.text());
        return res.status(502).json({ error: 'Failed to save the trailer' });
      }
      return res.status(200).json({ ok: true, trailerUrl: normalised });
    }

    if (action === 'set_play_link') {
      // '' (or omitted) clears the link: the admin panel falls back to the PLAY_PRIVATE_LINK
      // env var. Never log the link's value, on either the save or the clear path.
      if (link === '' || link === undefined || link === null) {
        const r = await fetchT(`${supabaseUrl}/rest/v1/private_settings?key=eq.play_private_link`, { method: 'DELETE', headers }, T);
        if (!r.ok) {
          console.error('[admin-entries] set_play_link delete failed, status', r.status);
          return res.status(502).json({ error: 'Failed to clear the play link' });
        }
        return res.status(200).json({ ok: true });
      }
      if (typeof link !== 'string' || link.length > 500 || !PLAY_LINK_RE.test(link)) {
        return res.status(400).json({ error: 'The link must be a full https:// URL with no spaces or quotes.' });
      }
      const r = await fetchT(`${supabaseUrl}/rest/v1/private_settings?on_conflict=key`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ key: 'play_private_link', value: link, updated_at: new Date().toISOString() }),
      }, T);
      if (!r.ok) {
        console.error('[admin-entries] set_play_link save failed, status', r.status);
        return res.status(502).json({ error: 'Failed to save the play link' });
      }
      return res.status(200).json({ ok: true });
    }

    // ── Admin-only access on a new device (Part 5) ──────────────────────────
    if (action === 'list_purchases') {
      const r = await fetchT(
        `${supabaseUrl}/rest/v1/entry_purchases?select=invoice_id,entry_id,phone,amount,status,created_at,paid_at&order=created_at.desc&limit=500`,
        { headers },
        T
      );
      if (!r.ok) {
        console.error('[admin-entries] list_purchases error:', await r.text());
        return res.status(502).json({ error: 'Failed to load purchases' });
      }
      const purchases = (await safeJson(r)) || [];
      if (purchases.length === 0) return res.status(200).json({ ok: true, purchases: [] });

      // Per-invoice device/open-grant counts. Fetched in one unfiltered pass (bounded table,
      // admin-only, on demand) rather than building an `in.()` list from invoice ids, which
      // are opaque IntaSend strings we'd otherwise have to escape for PostgREST's list syntax.
      const accessRes = await fetchT(
        `${supabaseUrl}/rest/v1/entry_access?select=invoice_id,kind,revoked_at,used_at,expires_at&limit=5000`,
        { headers },
        T
      );
      const accessRows = accessRes.ok ? ((await safeJson(accessRes)) || []) : [];
      const now = Date.now();
      const counts = {};
      for (const a of accessRows) {
        const c = (counts[a.invoice_id] ||= { devices: 0, open_grants: 0 });
        if (a.kind === 'device' && !a.revoked_at) c.devices++;
        if (a.kind === 'grant' && !a.revoked_at && !a.used_at && a.expires_at && new Date(a.expires_at).getTime() > now) c.open_grants++;
      }
      const out = purchases.map((p) => ({
        ...p,
        devices: counts[p.invoice_id]?.devices || 0,
        open_grants: counts[p.invoice_id]?.open_grants || 0,
      }));
      return res.status(200).json({ ok: true, purchases: out });
    }

    if (action === 'grant_access') {
      if (!isSafeSlug(invoiceId)) return res.status(400).json({ error: 'Invalid invoice id' });
      if (entryId !== undefined && entryId !== null && !isSafeSlug(entryId)) {
        return res.status(400).json({ error: 'Invalid entry id' });
      }

      const purRes = await fetchT(
        `${supabaseUrl}/rest/v1/entry_purchases?invoice_id=eq.${encodeURIComponent(invoiceId)}&select=invoice_id,entry_id,status&limit=1`,
        { headers },
        T
      );
      if (!purRes.ok) {
        console.error('[admin-entries] grant_access lookup error:', await purRes.text());
        return res.status(502).json({ error: 'Could not look up this purchase' });
      }
      const purRows = await safeJson(purRes);
      let purchase = Array.isArray(purRows) && purRows[0] ? purRows[0] : null;

      if (!purchase || purchase.status !== 'Paid') {
        // Lets the admin help a buyer whose payment predates entry_purchases, or whose
        // purchase is still "Awaiting payment" because they closed the page before it was
        // confirmed: verify the invoice with IntaSend directly, same checks as /api/get-content.
        const entryId = purchase ? purchase.entry_id : req.body.entryId;
        if (!entryId) {
          return res.status(400).json({ error: 'This invoice has no purchase on file yet. Provide the entry to verify it.' });
        }
        const { publicKey, secretKey } = intasendKeys();
        if (!publicKey) return res.status(503).json({ error: 'Payments are not configured right now.' });

        // The play: its invoices are `play:<time>` and its price may have changed since the buyer
        // paid, so any completed play payment counts (the admin is choosing to help this buyer).
        const isPlay = entryId === 'play';
        let price = 50;
        if (!isPlay) {
          const entryRes = await fetchT(`${supabaseUrl}/rest/v1/entries?id=eq.${encodeURIComponent(entryId)}&select=id,price`, { headers }, T);
          if (!entryRes.ok) return res.status(502).json({ error: 'Could not look up the entry' });
          const entryRows = await safeJson(entryRes);
          if (!Array.isArray(entryRows) || !entryRows[0]) return res.status(404).json({ error: 'Entry not found' });
          price = Number(entryRows[0].price) || 0;
        }

        const { invoice, error: invErr } = await fetchInvoice(publicKey, secretKey, invoiceId);
        if (invErr) return res.status(503).json({ error: 'Could not reach the payment provider. Please try again.' });
        if (invoice.state !== 'COMPLETE' && invoice.state !== 'SUCCESSFUL') {
          return res.status(400).json({ error: 'This invoice has not been paid.' });
        }
        const refOk = isPlay ? String(invoice.api_ref || '').startsWith('play:') : invoice.api_ref === `entry:${entryId}`;
        if (!refOk) {
          return res.status(400).json({ error: 'This invoice does not match that entry.' });
        }
        const paidValue = Number(invoice.value ?? invoice.amount ?? 0);
        if (!paidValue || paidValue < price) {
          return res.status(400).json({ error: 'The paid amount does not cover this entry.' });
        }
        const okMark = await markEntryPurchasePaid(invoiceId, entryId, paidValue);
        if (!okMark) return res.status(502).json({ error: 'Could not record this purchase' });
        purchase = { invoice_id: invoiceId, entry_id: entryId, status: 'Paid' };
      }

      const rawToken = randomKey();
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
      const insRes = await fetchT(`${supabaseUrl}/rest/v1/entry_access`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify({
          invoice_id: purchase.invoice_id, entry_id: purchase.entry_id, kind: 'grant',
          key_hash: hashKey(rawToken), expires_at: expiresAt,
        }),
      }, T);
      if (!insRes.ok) {
        console.error('[admin-entries] grant_access insert error:', await insRes.text());
        return res.status(502).json({ error: 'Could not create the access link' });
      }

      // The raw token is returned once, here, and never stored or logged again.
      if (purchase.entry_id === 'play') {
        return res.status(200).json({ ok: true, url: `https://thevillagersnotes.com/projects?access=${encodeURIComponent(rawToken)}`, expiresAt });
      }
      const slugRes = await fetchT(`${supabaseUrl}/rest/v1/entries?id=eq.${encodeURIComponent(purchase.entry_id)}&select=slug`, { headers }, T);
      const slugRows = slugRes.ok ? await safeJson(slugRes) : null;
      const slug = Array.isArray(slugRows) && slugRows[0] && slugRows[0].slug ? slugRows[0].slug : purchase.entry_id;
      return res.status(200).json({
        ok: true,
        url: `https://thevillagersnotes.com/entries/${encodeURIComponent(slug)}?access=${encodeURIComponent(rawToken)}`,
        expiresAt,
      });
    }

    if (action === 'revoke_access') {
      if (!isSafeSlug(invoiceId)) return res.status(400).json({ error: 'Invalid invoice id' });
      const r = await fetchT(
        `${supabaseUrl}/rest/v1/entry_access?invoice_id=eq.${encodeURIComponent(invoiceId)}&revoked_at=is.null`,
        {
          method: 'PATCH',
          headers: { ...headers, Prefer: 'return=representation' },
          body: JSON.stringify({ revoked_at: new Date().toISOString() }),
        },
        T
      );
      if (!r.ok) {
        console.error('[admin-entries] revoke_access error:', await r.text());
        return res.status(502).json({ error: 'Could not revoke access' });
      }
      const rows = await safeJson(r);
      return res.status(200).json({ ok: true, revoked: Array.isArray(rows) ? rows.length : 0 });
    }

    // ── Ideas (2026-10-05): Vic's list of changes for the next phase ─────────
    // Vic adds and lists; he may delete only his own ideas still marked New. Status and
    // note are set by Ian outside the dashboard (shared admin login), never here.
    if (action === 'list_ideas') {
      const r = await fetchT(
        `${supabaseUrl}/rest/v1/ideas?select=id,created_at,body,entry_id,source,status,note&order=created_at.desc&limit=200`,
        { headers },
        T
      );
      if (!r.ok) return res.status(502).json({ error: 'Failed to load ideas' });
      return res.status(200).json({ ok: true, ideas: (await safeJson(r)) || [] });
    }

    if (action === 'add_idea') {
      const text = typeof ideaText === 'string' ? ideaText.trim() : '';
      if (!text || text.length > 2000) {
        return res.status(400).json({ error: 'Write your idea (up to 2,000 characters).' });
      }
      if (entryId != null && entryId !== '' && !isSafeSlug(entryId)) {
        return res.status(400).json({ error: 'Invalid entry' });
      }
      const r = await fetchT(`${supabaseUrl}/rest/v1/ideas`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify({ body: text, entry_id: entryId || null, source: 'Vic', status: 'New' }),
      }, T);
      if (!r.ok) {
        console.error('[admin-entries] add_idea error:', await r.text());
        return res.status(502).json({ error: 'Failed to save your idea' });
      }
      const rows = await safeJson(r);
      return res.status(200).json({ ok: true, idea: Array.isArray(rows) ? rows[0] : null });
    }

    if (action === 'delete_idea') {
      if (!ideaId || typeof ideaId !== 'string' || !/^[0-9a-f-]{36}$/i.test(ideaId)) {
        return res.status(400).json({ error: 'Missing idea' });
      }
      const r = await fetchT(
        `${supabaseUrl}/rest/v1/ideas?id=eq.${ideaId}&source=eq.Vic&status=eq.New`,
        { method: 'DELETE', headers: { ...headers, Prefer: 'return=representation' } },
        T
      );
      if (!r.ok) return res.status(502).json({ error: 'Failed to delete idea' });
      const rows = await safeJson(r);
      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(409).json({ error: 'This idea is already being worked on, so it can no longer be deleted.' });
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (err) {
    console.error('[admin-entries] Error:', err);
    return res.status(502).json({ error: 'The database did not respond in time. Please try again.' });
  }
}
