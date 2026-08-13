import { getEntries } from './admin.js';
import { renderNewsletter } from '../components/newsletter.js';

export function renderHome(app) {
  const LATEST = getEntries().slice(0, 4);

  app.innerHTML = `
    <!-- HERO: centered quote -->
    <section class="hero">
      <div class="container">
        <p class="hero__quote">You can remove the village from a person but you…</p>
        <p class="hero__sub">wait, how does that saying go?<br>Anyway, something is being removed.</p>
        <p class="hero__identity">
          <strong>Vic Munala</strong> is a Nairobi-based novelist and playwright.
          Author of <a href="#/book"><em>Under the Mango Tree</em></a> (Novel, 2024)
          and the stage play <a href="#/projects"><em>Beneath the Surface</em></a> (2026).
        </p>
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

  // Newsletter
  const nlWrap = document.createElement('div');
  nlWrap.style.cssText = 'max-width:640px;margin:0 auto;padding:0 var(--space-6) var(--space-12)';
  app.appendChild(nlWrap);
  renderNewsletter(nlWrap, { variant: 'home' });

  // Footer
  app.insertAdjacentHTML('beforeend', footerHTML());

  document.title = "The Villager's Notes — Vic Munala";
}

function footerHTML() {
  return `
    <footer class="footer">
      <div class="container">
        <div class="footer__inner">
          <div>
            <div class="footer__brand-name">The Villager's Notes</div>
            <p class="footer__bio">Writing by Vic Munala. Novels, plays, and essays from Nairobi, Kenya.</p>
            <p class="footer__nap" style="margin-top:1rem">
              Nairobi, Kenya · hello@vicmunala.com
            </p>
          </div>
          <div>
            <div class="footer__heading">Navigate</div>
            <ul class="footer__links">
              <li><a href="#/">Home</a></li>
              <li><a href="#/entries">Entries</a></li>
              <li><a href="#/projects">Projects</a></li>
              <li><a href="#/book">Get the Book</a></li>
            </ul>
          </div>
          <div>
            <div class="footer__heading">Connect</div>
            <ul class="footer__links">
              <li><a href="https://twitter.com/" target="_blank">Twitter / X</a></li>
              <li><a href="https://instagram.com/" target="_blank">Instagram</a></li>
              <li><a href="mailto:hello@vicmunala.com">Email</a></li>
            </ul>
          </div>
        </div>
        <div class="footer__bottom" style="flex-wrap:wrap;gap:var(--space-2)">
          <span>© ${new Date().getFullYear()} Vic Munala. All rights reserved.</span>
          <span>Built by <a href="https://kasuku.studio" target="_blank" style="color:inherit;text-decoration:underline">Kasuku Studio</a></span>
        </div>
      </div>
    </footer>`;
}
