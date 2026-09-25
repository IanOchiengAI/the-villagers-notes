// Public-site data access for entries. Kept tiny so reader pages never pull in the admin bundle.
import { getEntryListFromDB, getEntryFromDB } from './supabase.js';

const CACHE_KEY = 'tvn_entry_list_v1';
const FRESH_MS = 60 * 1000;
let memList = null; // { at, list }
let inflight = null;

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/**
 * Entry list WITHOUT bodies (titles, excerpts, prices). Cached in memory for 60s,
 * and the last good copy is kept in localStorage so a Supabase blip still shows the
 * archive instead of an error. Returns null only if nothing at all is available.
 */
export async function getEntryList({ force = false } = {}) {
  if (!force && memList && Date.now() - memList.at < FRESH_MS) return memList.list;
  if (inflight) return inflight;
  inflight = (async () => {
    const list = await getEntryListFromDB();
    if (list) {
      memList = { at: Date.now(), list };
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(list)); } catch (_) {}
      return list;
    }
    const cached = readCache();
    return Array.isArray(cached) ? cached : null;
  })().finally(() => { inflight = null; });
  return inflight;
}

export function invalidateEntryList() {
  memList = null;
}

/** One entry with its (preview or free) body, looked up by slug or id. */
export async function getEntry(idOrSlug) {
  return getEntryFromDB(idOrSlug);
}
