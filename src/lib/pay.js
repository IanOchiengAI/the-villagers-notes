// Shared M-Pesa helpers used by the paywall, soda tip, book and play pages.
import { postJson } from './net.js';

/** Normalise a Kenyan number to 2547XXXXXXXX / 2541XXXXXXXX, or null. Matches the server. */
export function cleanPhone(raw) {
  const d = String(raw ?? '').replace(/\D/g, '');
  if (d.startsWith('254') && d.length === 12 && /^254[17]/.test(d)) return d;
  if ((d.startsWith('07') || d.startsWith('01')) && d.length === 10) return '254' + d.slice(1);
  if (d.length === 9 && /^[17]/.test(d)) return '254' + d;
  return null;
}

/**
 * Poll /api/stk-status until the payment reaches a verdict or `maxMs` passes.
 * Sequential (never overlapping requests), tolerant of flaky networks, cancellable.
 *
 * Resolves with { state: 'COMPLETE' | 'FAILED' | 'TIMEOUT' | 'CANCELLED', desc }.
 * `onTick({ elapsed, offline })` lets the UI show honest progress.
 */
export function pollInvoice(invoiceId, { maxMs = 120000, onTick, cancelOnNavigate = false } = {}) {
  let cancelled = false;
  let timer = null;
  let finish;
  const promise = new Promise((resolve) => { finish = resolve; });
  const started = Date.now();

  async function step() {
    if (cancelled) return finish({ state: 'CANCELLED' });
    const elapsed = Date.now() - started;
    if (elapsed > maxMs) return finish({ state: 'TIMEOUT' });

    const { ok, data, network } = await postJson('/api/stk-status', { invoice_id: invoiceId }, 10000);
    if (cancelled) return finish({ state: 'CANCELLED' });

    if (ok && (data.ResultCode === '0' || data.state === 'COMPLETE' || data.state === 'SUCCESSFUL')) {
      return finish({ state: 'COMPLETE' });
    }
    if (ok && (data.ResultCode === '1' || data.state === 'FAILED' || data.state === 'CANCELLED')) {
      return finish({ state: 'FAILED', desc: data.ResultDesc });
    }
    if (onTick) onTick({ elapsed, offline: !!network });
    // 3s at first, easing to 5s so a slow phone isn't hammered.
    timer = setTimeout(step, elapsed < 30000 ? 3000 : 5000);
  }

  timer = setTimeout(step, 2500);
  if (cancelOnNavigate) window.addEventListener('routechange', () => { cancelled = true; clearTimeout(timer); finish({ state: 'CANCELLED' }); }, { once: true });
  return {
    promise,
    cancel() {
      cancelled = true;
      clearTimeout(timer);
      finish({ state: 'CANCELLED' });
    },
  };
}
