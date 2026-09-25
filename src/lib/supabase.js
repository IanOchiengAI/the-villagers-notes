import { createClient } from '@supabase/supabase-js';
import { fetchTimeout } from './net.js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Gracefully handle missing env vars (e.g. local dev or before credentials configured)
// Every request gives up after 12s so a slow network shows an error instead of hanging forever.
const timeoutFetch = (input, init = {}) => {
  if (typeof AbortController === 'undefined') return fetch(input, init);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  if (init.signal) init.signal.addEventListener('abort', () => ctrl.abort());
  return fetch(input, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(t));
};
export const supabase = url && key
  ? createClient(url, key, { global: { fetch: timeoutFetch } })
  : null;

/**
 * Increment a named counter in Supabase.
 * Uses session storage to avoid double-counting on re-renders.
 * @param {string} name - Counter name (e.g. 'play_views')
 * @param {boolean} [dedupeSession=true] - If true, only increments once per browser session
 */
export async function incrementCounter(name, dedupeSession = true) {
  if (!supabase) return;
  if (dedupeSession) {
    const sessionKey = `tvn_counted_${name}`;
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, '1');
  }
  try {
    await supabase.rpc('increment_counter', { counter_name: name });
  } catch (e) {
    console.warn('Counter increment failed:', e);
  }
}

/**
 * Fetch current counts for a list of counter names.
 * Returns an object like { play_views: 312, trailer_clicks: 89, ... }
 * Falls back to all zeros on error.
 * @param {string[]} names
 * @returns {Promise<Record<string, number>>}
 */
export async function getCounters(names) {
  if (!supabase) return Object.fromEntries(names.map(n => [n, 0]));
  try {
    const { data, error } = await supabase
      .from('counters')
      .select('name, count')
      .in('name', names);
    if (error || !data) return Object.fromEntries(names.map(n => [n, 0]));
    return Object.fromEntries(data.map(r => [r.name, Number(r.count)]));
  } catch {
    return Object.fromEntries(names.map(n => [n, 0]));
  }
}

// ── Entries CRUD ──────────────────────────────────────────────────────────────

/**
 * Convert a Supabase DB row (snake_case) to the JS entry object (camelCase)
 * that the rest of the app expects.
 * NOTE: full_body is intentionally NOT mapped here — it is served only by
 * the /api/get-content server-side endpoint after payment verification.
 */
function rowToEntry(row) {
  return {
    id: row.id,
    slug: row.slug || row.id,
    title: row.title || '',
    excerpt: row.excerpt || '',
    category: row.category || 'Essay',
    date: row.entry_date || '',
    author: row.author || 'Vic Munala',
    price: Number(row.price) || 0,
    previewWords: Number(row.preview_words) || 100,
    likes: Number(row.likes) || 0,
    body: Array.isArray(row.body) ? row.body : [],
    meta: `${row.category || 'Essay'} · ${row.entry_date || ''}`,
    sort_order: Number(row.sort_order) || 0,
  };
}

/**
 * Convert a JS entry object (camelCase) to a Supabase DB row (snake_case).
 * Used for saving the public metadata + preview body. Full body is saved separately.
 * @param {object} entry - JS entry object
 * @param {number} sortOrder - Ordering value (higher = shown first)
 */
function entryToRow(entry, sortOrder) {
  return {
    id: entry.id,
    slug: entry.slug || entry.id,
    title: entry.title || '',
    excerpt: entry.excerpt || '',
    category: entry.category || 'Essay',
    entry_date: entry.date || '',
    author: entry.author || 'Vic Munala',
    price: Number(entry.price) || 0,
    preview_words: Number(entry.previewWords) || 100,
    likes: Number(entry.likes) || 0,
    body: Array.isArray(entry.body) ? entry.body : [],
    sort_order: sortOrder,
  };
}

const LIST_COLS = 'id,slug,title,excerpt,category,entry_date,author,price,preview_words,likes,sort_order,created_at';
const FULL_COLS = LIST_COLS + ',body';

/**
 * Entry list WITHOUT bodies — enough for the home page, archive and prev/next links.
 * Returns null if Supabase is unavailable.
 */
export async function getEntryListFromDB() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('entries')
      .select(LIST_COLS)
      .order('sort_order', { ascending: false })
      .order('created_at', { ascending: false });
    if (error || !data) return null;
    return data.map(rowToEntry);
  } catch {
    return null;
  }
}

/**
 * One entry (with its public/preview body) by slug, falling back to id.
 * Returns undefined on a real "not found", null if Supabase failed.
 */
export async function getEntryFromDB(idOrSlug) {
  if (!supabase || !idOrSlug) return null;
  try {
    for (const col of ['slug', 'id']) {
      const { data, error } = await supabase.from('entries').select(FULL_COLS).eq(col, idOrSlug).maybeSingle();
      if (error) return null;
      if (data) return rowToEntry(data);
    }
    return undefined;
  } catch {
    return null;
  }
}

/**
 * Fetch all entries from Supabase, ordered newest-first (sort_order DESC).
 * SECURITY: full_body is intentionally excluded from this query.
 * It is only returned by the server-side /api/get-content endpoint after
 * verified M-Pesa payment. This prevents bypassing the paywall via devtools.
 * Returns null if Supabase is unavailable (caller should fall back to defaults).
 * @returns {Promise<object[]|null>}
 */
export async function getEntriesFromDB() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('entries')
      // Explicit column list — full_body deliberately excluded
      .select('id,slug,title,excerpt,category,entry_date,author,price,preview_words,likes,body,sort_order,created_at')
      .order('sort_order', { ascending: false })
      .order('created_at', { ascending: false });
    if (error || !data) return null;
    return data.map(rowToEntry);
  } catch {
    return null;
  }
}

/**
 * Admin writes to `entries` no longer go through the browser's anon-key client —
 * anon has no insert/update/delete grant on this table since the 2026-09-13 RLS
 * lockdown (it previously allowed ANYONE to read full_body or edit/delete any
 * article with no password check at the database level). All writes now go
 * through /api/admin-entries, which verifies the signed admin token issued by
 * /api/admin-auth and writes with the service role key server-side.
 */
function getAdminToken() {
  try { return sessionStorage.getItem('tvn_auth_token') || ''; } catch { return ''; }
}

/**
 * @typedef {object} AdminWriteResult
 * @property {boolean} ok
 * @property {number} status - HTTP status, or 0 for a network/exception failure
 * @property {string} [error] - Present when ok is false
 * @property {object} [data] - The parsed response body, present when ok is true
 */

/** @returns {Promise<AdminWriteResult>} */
async function callAdminEntries(payload) {
  try {
    const res = await fetchTimeout('/api/admin-entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: getAdminToken(), ...payload }),
    }, 25000);
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      const error = data.error || res.statusText || 'Request failed';
      console.warn('admin-entries error:', error);
      return { ok: false, status: res.status, error };
    }
    return { ok: true, status: res.status, data };
  } catch (e) {
    console.warn('admin-entries exception:', e);
    return { ok: false, status: 0, error: e?.name === 'AbortError' ? 'The server took too long to answer. Check your connection and try again.' : 'Network error — check your connection and try again.' };
  }
}

/**
 * Save (upsert) the full_body of a paid entry to Supabase separately.
 * Called by the admin panel when saving a paid entry.
 * @param {string} entryId - The entry's id
 * @param {string[]} fullBody - Array of paragraph strings (the complete, unpreviewed body)
 * @returns {Promise<AdminWriteResult>}
 */
export async function upsertEntryFullBodyToDB(entryId, fullBody) {
  if (!entryId || !Array.isArray(fullBody) || fullBody.length === 0) {
    return { ok: false, status: 0, error: 'Missing entry id or full body text.' };
  }
  return callAdminEntries({ action: 'upsert_full_body', entryId, fullBody });
}

/**
 * Save (insert or update) a single entry to Supabase.
 * If the entry already has a sort_order, it is preserved.
 * New entries get sort_order = current epoch seconds (so they sort newest-first).
 * @param {object} entry - JS entry object
 * @returns {Promise<AdminWriteResult>}
 */
export async function upsertEntryToDB(entry, fullBody) {
  const sortOrder = entry.sort_order ?? Math.floor(Date.now() / 1000);
  const row = entryToRow(entry, sortOrder);
  // fullBody (paid entries) is written in the same request as the preview.
  return callAdminEntries({ action: 'upsert', entry: row, ...(Array.isArray(fullBody) ? { fullBody } : {}) });
}

/**
 * Delete a single entry from Supabase by its id.
 * @param {string} id - Entry id
 * @returns {Promise<AdminWriteResult>}
 */
export async function deleteEntryFromDB(id) {
  if (!id) return { ok: false, status: 0, error: 'Missing entry id.' };
  return callAdminEntries({ action: 'delete', entryId: id });
}

/**
 * Fetch an entry's true saved full_body from the server (admin-only).
 * The admin edit form uses this instead of trusting this browser's
 * localStorage cache, which is per-device and stale across sessions/devices.
 * @param {string} id - Entry id
 * @returns {Promise<AdminWriteResult>} data.fullBody is a string[] (possibly empty)
 */
export async function getEntryFullBodyFromDB(id) {
  if (!id) return { ok: false, status: 0, error: 'Missing entry id.' };
  return callAdminEntries({ action: 'get_full_body', entryId: id });
}

// ── Comments CRUD ────────────────────────────────────────────────────────────

/**
 * Fetch all public comments for an entry from Supabase.
 * @param {string} entryId
 * @returns {Promise<object[]>}
 */
export async function getCommentsFromDB(entryId) {
  if (!supabase) throw new Error('comments unavailable');
  if (!entryId) return [];
  try {
    const { data, error } = await supabase
      .from('comments')
      .select('id, entry_id, author, comment, created_at')
      .eq('entry_id', entryId)
      .order('created_at', { ascending: false });
    if (error || !data) throw new Error(error?.message || 'comments unavailable');
    return data.map(c => ({
      id: c.id,
      author: c.author,
      text: c.comment,
      date: new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    }));
  } catch (e) {
    console.warn('getCommentsFromDB exception:', e);
    throw e; // callers show "couldn't load comments" instead of a misleading empty list
  }
}

/**
 * Post a new public comment to Supabase.
 * @param {string} entryId
 * @param {string} author
 * @param {string} commentText
 * @returns {Promise<object|null>} The created comment or null
 */
export async function addCommentToDB(entryId, author, commentText) {
  if (!supabase || !entryId || !author || !commentText) return null;
  try {
    const { data, error } = await supabase
      .from('comments')
      .insert([{
        entry_id: entryId,
        author: author.trim().slice(0, 100),
        comment: commentText.trim().slice(0, 500),
      }])
      .select('id, entry_id, author, comment, created_at')
      .single();
    if (error || !data) {
      console.warn('addCommentToDB error:', error?.message);
      return null;
    }
    return {
      id: data.id,
      author: data.author,
      text: data.comment,
      date: new Date(data.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    };
  } catch (e) {
    console.warn('addCommentToDB exception:', e);
    return null;
  }
}


// ── Admin: comment moderation, order status, stats ────────────────────────────
export const listCommentsAdmin = () => callAdminEntries({ action: 'list_comments' });
export const deleteCommentAdmin = (commentId) => callAdminEntries({ action: 'delete_comment', commentId });
export const setOrderStatusAdmin = (orderId, status) => callAdminEntries({ action: 'set_order_status', orderId, status });

/** @returns {Promise<AdminWriteResult>} data = { tips, orders, subscribers } */
export async function getStatsAdmin() {
  try {
    const res = await fetchTimeout('/api/get-stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: getAdminToken() }),
    }, 25000);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, status: res.status, error: data.error || 'Could not load stats' };
    return { ok: true, status: res.status, data };
  } catch {
    return { ok: false, status: 0, error: 'Network error — check your connection and try again.' };
  }
}
