/** Escape text for safe use inside HTML text or double/single-quoted attributes. */
export function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** A small retryable error panel for pages whose data could not be loaded. */
export function loadErrorHTML(message = "Couldn't load this right now.") {
  return `
    <div class="container" style="padding:6rem 0;text-align:center;">
      <p style="color:var(--muted-foreground);font-size:1.1rem;">${esc(message)}</p>
      <button type="button" class="label" data-retry
        style="margin-top:1.5rem;border:1px solid var(--foreground);padding:0.65rem 1.4rem;color:var(--foreground);cursor:pointer;">
        Try again
      </button>
    </div>`;
}

/** Wire the [data-retry] button rendered by loadErrorHTML. */
export function wireRetry(root, fn) {
  root.querySelector('[data-retry]')?.addEventListener('click', fn);
}
