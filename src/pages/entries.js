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
    <section class="entries-hero">
      <div class="container">
        <div class="entries-hero__header">
          <h1>Entries.</h1>
          <div class="entries-search-box">
            <svg class="entries-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input class="entries-search-input" id="entries-search" type="search" placeholder="Search entries..." aria-label="Search entries" autocomplete="off" />
          </div>
        </div>
        <hr class="divider" style="margin:var(--space-6) 0 var(--space-4);" />
      </div>
    </section>
    <section class="entries-list">
      <div class="container" id="entries-container">
        ${renderEntriesList(ENTRIES)}
      </div>
    </section>
  `;

  // Live search filtering
  const searchInput = app.querySelector('#entries-search');
  const container = app.querySelector('#entries-container');
  if (searchInput && container) {
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.trim().toLowerCase();
      if (!q) {
        container.innerHTML = renderEntriesList(ENTRIES);
        return;
      }
      const filtered = ENTRIES.filter(e => {
        const title = (e.title || '').toLowerCase();
        const excerpt = (e.excerpt || '').toLowerCase();
        const author = (e.author || 'Vic Munala').toLowerCase();
        const cat = (e.category || '').toLowerCase();
        return title.includes(q) || excerpt.includes(q) || author.includes(q) || cat.includes(q);
      });
      container.innerHTML = filtered.length > 0 
        ? renderEntriesList(filtered)
        : `<p style="padding:var(--space-8) 0;color:var(--text-muted);font-size:0.9rem;">No matching entries found.</p>`;
    });
  }

  // Newsletter at bottom of entries
  const nlWrap = document.createElement('div');
  nlWrap.style.cssText = 'max-width:640px;margin:0 auto;padding:var(--space-12) var(--space-6) var(--space-12)';
  app.appendChild(nlWrap);
  renderNewsletter(nlWrap, { variant: 'entries' });

  // Footer on every page
  app.insertAdjacentHTML('beforeend', footerHTML());
}

function renderEntriesList(list) {
  return list.map(e => {
    const author = toTitleCase(e.author || 'Vic Munala');
    const metaParts = [];
    if (e.category) metaParts.push(e.category);
    if (e.date) metaParts.push(e.date);
    if (author) metaParts.push(author);
    const metaText = metaParts.length > 0 ? metaParts.join(' · ') : e.meta;

    return `
      <a href="#/entry/${e.id}" class="entry-item" data-id="${e.id}" style="display:block;text-decoration:none;color:inherit;">
        <div class="entry-item__meta">${metaText}</div>
        <div class="entry-item__title">${e.title}</div>
        <p class="entry-item__excerpt">${e.excerpt || ''}</p>
      </a>
    `;
  }).join('');
}

