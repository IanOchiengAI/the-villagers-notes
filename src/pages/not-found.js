import { getEntryList } from '../lib/store.js';
import { esc } from '../lib/html.js';
import { footerHTML } from '../components/footer.js';

// Shown for any unknown address (the server also answers 404, see vercel.json) and for an
// entry slug that doesn't exist. Offers the three latest entries so a dead link still leads
// somewhere worth reading.
export async function renderNotFound(app, { kind = 'page' } = {}) {
  const nav = app.dataset.nav;
  document.title = kind === 'entry'
    ? "Entry not found — The Villager's Notes"
    : "Page not found — The Villager's Notes";

  const list = await getEntryList();
  if (app.dataset.nav !== nav) return;
  const latest = Array.isArray(list) ? list.slice(0, 3) : [];

  const lead = kind === 'entry'
    ? "This story left the village without telling anyone. It was renamed, it's hiding, or the link dropped a letter somewhere on the matatu."
    : "You've walked past the last house in the village, and out here there's only a goat and a broken link. The page has moved, gone to shags, or never existed.";

  app.innerHTML = `
    <section class="nf-page">
      <div class="container">
        <div class="label nf-code">404 · ${kind === 'entry' ? 'Entry' : 'Page'} not found</div>
        <h1 class="nf-title">Eh. Hapa ni wapi?</h1>
        <p class="nf-lead">${lead}</p>
        <p class="nf-motto">Relax. Nobody stays lost in a village. Someone always walks you home.</p>
        <div class="nf-actions">
          <a href="/" class="btn--sharp">← Walk me home</a>
          <a href="/entries" class="btn--sharp">Show me the stories →</a>
        </div>

        ${latest.length ? `
          <div class="nf-latest">
            <h2 class="nf-latest-title">Since you came all this way, have a story</h2>
            <ul class="nf-list">
              ${latest.map((e) => {
                const meta = [e.category, e.date].filter(Boolean).map((s) => String(s).toUpperCase()).join(' · ');
                return `
                  <li>
                    <a href="/entries/${encodeURIComponent(e.slug || e.id)}" class="entry-link-group">
                      ${meta ? `<div class="label">${esc(meta)}</div>` : ''}
                      <div class="entry-nav-title">${esc(e.title)}</div>
                    </a>
                  </li>`;
              }).join('')}
            </ul>
          </div>` : ''}
      </div>
    </section>
  `;
  app.insertAdjacentHTML('beforeend', footerHTML());
}
