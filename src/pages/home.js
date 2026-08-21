import { getEntries } from './admin.js';
import { footerHTML } from '../components/footer.js';

export function renderHome(app) {
  const LATEST = getEntries().slice(0, 4);

  app.innerHTML = `
    <!-- HERO: centered squeezed quote -->
    <section class="hero">
      <div class="container">
        <p class="hero__quote">You can
remove the
village from a
person but
you...</p>
        <p class="hero__sub">wait, how does that saying go?<br>Anyway, something is being removed.</p>
      </div>
    </section>

    <!-- LATEST ENTRIES -->
    <section class="home-entries">
      <div class="container">
        <div class="home-entries__header">
          <span class="home-entries__title">Latest entries</span>
          <a href="#/entries" class="home-entries__all">ALL ENTRIES →</a>
        </div>
        ${LATEST.map(e => {
          const author = e.author ? e.author.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) : 'Vic Munala';
          const metaParts = [];
          if (e.category) metaParts.push(e.category);
          if (e.date) metaParts.push(e.date);
          if (author) metaParts.push(author);
          const metaText = metaParts.length > 0 ? metaParts.join(' · ') : e.meta;
          return `
            <a href="#/entry/${e.id}" class="entry-item" style="display:block;text-decoration:none;color:inherit;">
              <div class="entry-item__meta">${metaText}</div>
              <div class="entry-item__title">${e.title}</div>
              <p class="entry-item__excerpt">${e.excerpt || ''}</p>
            </a>
          `;
        }).join('')}
      </div>
    </section>
  `;

  // Footer on every page
  app.insertAdjacentHTML('beforeend', footerHTML());

  document.title = "The Villager's Notes — Vic Munala";
}
