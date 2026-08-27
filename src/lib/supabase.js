import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Gracefully handle missing env vars (e.g. local dev or before credentials configured)
export const supabase = url && key ? createClient(url, key) : null;

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
 * Save (upsert) the full_body of a paid entry to Supabase separately.
 * Called by the admin panel when saving a paid entry.
 * @param {string} entryId - The entry's id
 * @param {string[]} fullBody - Array of paragraph strings (the complete, unpreviewed body)
 * @returns {Promise<boolean>} true on success, false on failure
 */
export async function upsertEntryFullBodyToDB(entryId, fullBody) {
  if (!supabase || !entryId) return false;
  if (!Array.isArray(fullBody) || fullBody.length === 0) return false;
  try {
    const { error } = await supabase
      .from('entries')
      .update({ full_body: fullBody })
      .eq('id', entryId);
    if (error) {
      console.warn('upsertEntryFullBodyToDB error:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('upsertEntryFullBodyToDB exception:', e);
    return false;
  }
}

/**
 * Save (insert or update) a single entry to Supabase.
 * If the entry already has a sort_order, it is preserved.
 * New entries get sort_order = current epoch seconds (so they sort newest-first).
 * @param {object} entry - JS entry object
 * @returns {Promise<boolean>} true on success, false on failure
 */
export async function upsertEntryToDB(entry) {
  if (!supabase) return false;
  try {
    const sortOrder = entry.sort_order ?? Math.floor(Date.now() / 1000);
    const row = entryToRow(entry, sortOrder);
    const { error } = await supabase
      .from('entries')
      .upsert(row, { onConflict: 'id' });
    if (error) {
      console.warn('upsertEntryToDB error:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('upsertEntryToDB exception:', e);
    return false;
  }
}

/**
 * Delete a single entry from Supabase by its id.
 * @param {string} id - Entry id
 * @returns {Promise<boolean>} true on success, false on failure
 */
export async function deleteEntryFromDB(id) {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('entries')
      .delete()
      .eq('id', id);
    if (error) {
      console.warn('deleteEntryFromDB error:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('deleteEntryFromDB exception:', e);
    return false;
  }
}

// ── Comments CRUD ────────────────────────────────────────────────────────────

/**
 * Fetch all public comments for an entry from Supabase.
 * @param {string} entryId
 * @returns {Promise<object[]>}
 */
export async function getCommentsFromDB(entryId) {
  if (!supabase || !entryId) return [];
  try {
    const { data, error } = await supabase
      .from('comments')
      .select('id, entry_id, author, comment, created_at')
      .eq('entry_id', entryId)
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map(c => ({
      id: c.id,
      author: c.author,
      text: c.comment,
      date: new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    }));
  } catch (e) {
    console.warn('getCommentsFromDB exception:', e);
    return [];
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

