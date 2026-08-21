import { getEntries } from './admin.js';
import { footerHTML } from '../components/footer.js';

export function renderHome(app) {
  const LATEST = getEntries().slice(0, 4);

  app.innerHTML = `
    <!-- HERO: centered squeezed quote -->
    <div style="border-bottom:1px solid var(--rule);">
      <section class="hero-section" style="min-height:52vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4.5rem 0;text-align:center;">
        <div class="container">
          <h1 style="margin:0 auto;font-size:clamp(2.25rem, 7.5vw, 4.5rem);line-height:1.15;font-family:var(--font-hand);font-weight:400;">
            You can<br>
            remove the<br>
            village from a<br>
            person but<br>
            you<span style="color:var(--accent);letter-spacing:0.08em;margin-left:0.1em;">...</span>
          </h1>
          <p style="margin:2rem auto 0;font-family:var(--font-hand);font-size:clamp(1.2rem, 3.8vw, 1.85rem);line-height:1.3;color:var(--muted-foreground);">
            wait, how does that saying go?<br>
            Anyway, something is being<br>
            removed.
          </p>
        </div>
      </section>
    </div>

    <!-- LATEST ENTRIES -->
    <section class="home-entries" style="padding:3.5rem 0;">
      <div class="container">
        <div style="display:flex;align-items:baseline;justify-content:space-between;gap:1rem;margin-bottom:1.5rem;">
          <h2 style="font-size:clamp(1.75rem, 4.5vw, 2.25rem);font-family:var(--font-hand);font-weight:400;margin:0;">Latest entries</h2>
          <a href="#/entries" class="label" style="text-decoration:none;transition:color 0.15s ease;" onmouseover="this.style.color='var(--accent)'" onmouseout="this.style.color='var(--muted-foreground)'">
            ALL ENTRIES
          </a>
        </div>
        <ul style="list-style:none;padding:0;margin:0;">
          ${LATEST.map(e => {
            const metaParts = [];
            if (e.category) metaParts.push(e.category.toUpperCase());
            if (e.date) metaParts.push(e.date.toUpperCase());
            const metaText = metaParts.length > 0 ? metaParts.join(' · ') : (e.meta?.toUpperCase() || 'ESSAY');

            return `
              <li style="border-top:1px solid var(--rule);padding:1.5rem 0;">
                <a href="#/entries/${e.id}" style="display:block;text-decoration:none;color:inherit;" class="entry-link-group">
                  <div class="label" style="margin-bottom:0.5rem;">${metaText}</div>
                  <h3 style="font-size:clamp(1.4rem, 4vw, 1.75rem);font-family:var(--font-hand);font-weight:400;margin:0;transition:color 0.15s ease;color:var(--foreground);" onmouseover="this.style.color='var(--accent)'" onmouseout="this.style.color='var(--foreground)'">${e.title}</h3>
                  <p style="margin-top:0.4rem;max-width:60ch;color:var(--muted-foreground);font-family:var(--font-body);font-size:1.0625rem;line-height:1.6;font-style:italic;">${e.excerpt || ''}</p>
                </a>
              </li>
            `;
          }).join('')}
        </ul>
      </div>
    </section>
  `;

  // Footer on every page
  app.insertAdjacentHTML('beforeend', footerHTML());

  document.title = "The Villager's Notes — Vic Munala";
}
