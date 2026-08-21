import { getEntries } from './admin.js';
import { renderNewsletter } from '../components/newsletter.js';
import { footerHTML } from '../components/footer.js';

export function toTitleCase(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

export function renderEntries(app) {
  const ENTRIES = getEntries();

  app.innerHTML = `
    <div style="padding:4rem 0;">
      <div class="container">
        <div style="display:flex;align-items:baseline;gap:1.5rem;border-bottom:1px solid var(--rule);padding-bottom:0.75rem;margin-bottom:2.5rem;">
          <label for="entries-search" class="label" style="flex-shrink:0;letter-spacing:0.16em;">SEARCH</label>
          <input id="entries-search" type="search" placeholder="a word, a name, a kind…"
                 style="width:100%;background:transparent;border:none;font-size:1.125rem;font-family:var(--font-body);outline:none;color:var(--foreground);border-radius:0;" />
          <span class="label" id="search-count" style="flex-shrink:0;display:none;"></span>
        </div>

        <ul style="list-style:none;padding:0;margin:0;" id="entries-container">
          ${renderEntriesList(ENTRIES)}
        </ul>

        <div id="newsletter-container"></div>
      </div>
    </div>
  `;

  // Live search filtering
  const searchInput = app.querySelector('#entries-search');
  const container = app.querySelector('#entries-container');
  const countEl = app.querySelector('#search-count');

  if (searchInput && container) {
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.trim().toLowerCase();
      if (!q) {
        container.innerHTML = renderEntriesList(ENTRIES);
        if (countEl) countEl.style.display = 'none';
        return;
      }
      const filtered = ENTRIES.filter(e => {
        const title = (e.title || '').toLowerCase();
        const excerpt = (e.excerpt || '').toLowerCase();
        const author = (e.author || 'Vic Munala').toLowerCase();
        const cat = (e.category || '').toLowerCase();
        return title.includes(q) || excerpt.includes(q) || author.includes(q) || cat.includes(q);
      });

      if (countEl) {
        countEl.textContent = `${filtered.length} ${filtered.length === 1 ? 'result' : 'results'}`;
        countEl.style.display = 'inline';
      }

      container.innerHTML = filtered.length > 0 
        ? renderEntriesList(filtered)
        : `<p style="padding:2.5rem 0;color:var(--muted-foreground);border-top:1px solid var(--rule);">Nothing here by that word. Try a shorter one.</p>`;
    });
  }

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
        <a href="#/entries/${e.id}" style="display:block;text-decoration:none;color:inherit;" class="entry-link-group">
          <div class="label" style="margin-bottom:0.5rem;">${metaText}</div>
          <h2 style="font-size:clamp(1.5rem, 4vw, 1.85rem);font-family:var(--font-hand);font-weight:400;margin:0;transition:color 0.15s ease;color:var(--foreground);" onmouseover="this.style.color='var(--accent)'" onmouseout="this.style.color='var(--foreground)'">${e.title}</h2>
          <p style="margin-top:0.4rem;max-width:62ch;color:var(--muted-foreground);font-family:var(--font-body);font-size:1.0625rem;line-height:1.6;font-style:italic;">${e.excerpt || ''}</p>
        </a>
      </li>
    `;
  }).join('');
}

