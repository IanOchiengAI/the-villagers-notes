import { ENTRIES } from '../data/entries.js';

const CATEGORIES = ['All', 'Essay', 'Teaser', 'Review', 'Article'];

export function renderEntries(app) {
  let active = 'All';

  function render() {
    const filtered = active === 'All' ? ENTRIES : ENTRIES.filter(e => e.category === active);
    app.innerHTML = `
      <section class="entries-hero">
        <div class="container">
          <h1>Entries.</h1>
          <div class="entries-filter">
            ${CATEGORIES.map(c => `
              <button class="filter-pill ${c === active ? 'active' : ''}" data-cat="${c}">${c}</button>
            `).join('')}
          </div>
        </div>
      </section>
      <section class="entries-list">
        <div class="container">
          ${filtered.map(e => `
            <a href="#/entry/${e.id}" class="entry-item" data-id="${e.id}" style="display:block;text-decoration:none;color:inherit;">
              <div class="entry-item__meta">${e.meta}</div>
              <div class="entry-item__title">${e.title}</div>
              <p class="entry-item__excerpt">${e.excerpt}</p>
            </a>
          `).join('')}
        </div>
      </section>
    `;

    app.querySelectorAll('.filter-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        active = btn.dataset.cat;
        render();
      });
    });
  }

  render();
}
