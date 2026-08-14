import { getEntries } from './admin.js';
import { renderNewsletter } from '../components/newsletter.js';
import { footerHTML } from '../components/footer.js';

export function renderEntries(app) {
  const ENTRIES = getEntries();

  app.innerHTML = `
    <section class="entries-hero">
      <div class="container">
        <h1>Entries.</h1>
      </div>
    </section>
    <section class="entries-list">
      <div class="container">
        ${ENTRIES.map(e => `
          <a href="#/entry/${e.id}" class="entry-item" data-id="${e.id}" style="display:block;text-decoration:none;color:inherit;">
            <div class="entry-item__meta">${e.meta}</div>
            <div class="entry-item__title">${e.title}</div>
            <p class="entry-item__excerpt">${e.excerpt}</p>
          </a>
        `).join('')}
      </div>
    </section>
  `;

  // Newsletter at bottom of entries
  const nlWrap = document.createElement('div');
  nlWrap.style.cssText = 'max-width:640px;margin:0 auto;padding:var(--space-12) var(--space-6) var(--space-12)';
  app.appendChild(nlWrap);
  renderNewsletter(nlWrap, { variant: 'entries' });

  // Footer on every page
  app.insertAdjacentHTML('beforeend', footerHTML());
}
