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
