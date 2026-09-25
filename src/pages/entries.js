import { getEntryList } from '../lib/store.js';
import { esc, loadErrorHTML, wireRetry } from '../lib/html.js';
import { renderNewsletter } from '../components/newsletter.js';
import { footerHTML } from '../components/footer.js';

export function toTitleCase(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

export async function renderEntries(app) {
  const nav = app.dataset.nav;
  const ENTRIES = await getEntryList();
  if (app.dataset.nav !== nav) return;
  if (ENTRIES === null) {
    app.innerHTML = loadErrorHTML("We couldn't load the entries. Check your connection and try again.");
    wireRetry(app, () => renderEntries(app));
    return;
  }

  app.innerHTML = `
    <div style="padding:4rem 0;">
      <div class="container">
        <ul style="list-style:none;padding:0;margin:0;" id="entries-container">
          ${ENTRIES.length === 0 ? '<li style="padding:2rem 0;color:var(--muted-foreground);">Nothing published yet.</li>' : ''}
          ${renderEntriesList(ENTRIES)}
        </ul>

        <div id="newsletter-container"></div>
      </div>
    </div>
  `;

  // Newsletter at bottom of entries
  const nlWrap = app.querySelector('#newsletter-container');
  if (nlWrap) {
    renderNewsletter(nlWrap, { variant: 'entries' });
  }

  // Footer on every page
  app.insertAdjacentHTML('beforeend', footerHTML());
}

function renderEntriesList(list) {
  return list.map(e => {
    const metaParts = [];
    if (e.category) metaParts.push(e.category.toUpperCase());
    if (e.date) metaParts.push(e.date.toUpperCase());
    const metaText = metaParts.length > 0 ? metaParts.join(' · ') : (e.meta?.toUpperCase() || 'ESSAY');

    return `
      <li style="border-top:1px solid var(--rule);padding:1.75rem 0;">
        <a href="/entries/${encodeURIComponent(e.slug || e.id)}" style="display:block;text-decoration:none;color:inherit;" class="entry-link-group">
          <div class="label" style="margin-bottom:0.5rem;">${esc(metaText)}</div>
          <h2 class="hv-accent" style="font-size:clamp(1.5rem, 4vw, 1.85rem);font-family:var(--font-hand);font-weight:400;margin:0;transition:color 0.15s ease;color:var(--foreground);">${esc(e.title)}</h2>
          <p style="margin-top:0.4rem;max-width:62ch;color:var(--muted-foreground);font-family:var(--font-body);font-size:1.0625rem;line-height:1.6;">${esc(e.excerpt || '')}</p>
        </a>
      </li>
    `;
  }).join('');
}

