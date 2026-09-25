// Portable timeouts (AbortSignal.timeout/any are missing on older Safari/Android WebViews).

/** An AbortSignal that fires after `ms`. Call the returned `done()` to cancel the timer. */
export function timeoutSignal(ms) {
  if (typeof AbortController === 'undefined') return { signal: undefined, done() {} };
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, done: () => clearTimeout(t) };
}

/** fetch() with a timeout. Rejects with an AbortError-named error on timeout. */
export async function fetchTimeout(url, init = {}, ms = 15000) {
  const { signal, done } = timeoutSignal(ms);
  try {
    return await fetch(url, { ...init, ...(signal ? { signal } : {}) });
  } finally {
    done();
  }
}

/** POST JSON, return { ok, status, data } and never throw. `data` is {} when unparseable. */
export async function postJson(url, body, ms = 15000) {
  try {
    const res = await fetchTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }, ms);
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: {}, network: true };
  }
}
