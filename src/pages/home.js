import { getEntries } from './admin.js';
import { footerHTML } from '../components/footer.js';

export function renderHome(app) {
  const LATEST = getEntries().slice(0, 4);

  app.innerHTML = `
    <!-- HERO: centered squeezed quote -->
    <section class="hero">
      <div class="container">
        <p class="hero__quote">You can
Remove the village
From a person
But you…</p>
        <p class="hero__sub">wait, how does that saying go?<br>Anyway, something is being removed.</p>
      </div>
    </section>

    <!-- LATEST ENTRIES -->
    <section class="home-entries">
      <div class="container">
        <div class="home-entries__header">
          <span class="home-entries__title">Latest entries</span>
          <a href="#/entries" class="home-entries__all">All Entries →</a>
        </div>
        ${LATEST.map(e => `
          <a href="#/entry/${e.id}" class="entry-item" style="display:block;text-decoration:none;color:inherit;">
            <div class="entry-item__meta">${e.meta}</div>
            <div class="entry-item__title">${e.title}</div>
            <p class="entry-item__excerpt">${e.excerpt}</p>
          </a>
        `).join('')}
      </div>
    </section>
  `;

  // Footer on every page
  app.insertAdjacentHTML('beforeend', footerHTML());

  document.title = "The Villager's Notes — Vic Munala";
}
