import { getEntries } from './admin.js';
import { renderNewsletter } from '../components/newsletter.js';
import { footerHTML } from '../components/footer.js';

export function renderEntry(app, id) {
  const ENTRIES = getEntries();
  const idx   = ENTRIES.findIndex(e => e.id === id);
  const entry = ENTRIES[idx];
  const prev  = ENTRIES[idx - 1] ?? null;
  const next  = ENTRIES[idx + 1] ?? null;

  if (!entry) {
    app.innerHTML = `
      <div class="container" style="padding:var(--space-24) 0;text-align:center;">
        <p style="color:var(--text-muted)">Entry not found.</p>
        <a href="#/entries" class="btn btn--outline" style="margin-top:var(--space-6);display:inline-flex">← Back to Entries</a>
      </div>`;
    return;
  }

  // Reading time — average 200 wpm
  const bodyText   = Array.isArray(entry.body) ? entry.body.join(' ') : '';
  const excerptText = entry.excerpt || '';
  const wordCount  = bodyText.split(/\s+/).length + excerptText.split(/\s+/).length;
  const readMins   = Math.max(1, Math.ceil(wordCount / 200));

  // Reading progress bar element
  const progressBar = document.createElement('div');
  progressBar.className = 'reading-progress';
  progressBar.id = 'reading-progress';
  document.body.appendChild(progressBar);

  // Set page title & OG dynamically
  document.title = `${entry.title} — The Villager's Notes`;

  app.innerHTML = `
    <div class="entry-detail">
      <div class="container">

        <!-- Back link -->
        <a href="#/entries" class="entry-detail__back">← Entries</a>

        <!-- Toolbar: meta + read time + share -->
        <div class="entry-detail__toolbar">
          <div class="entry-detail__meta">${entry.meta}</div>
          <div style="display:flex;align-items:center;gap:var(--space-4);">
            <span class="entry-detail__readtime">${readMins} min read</span>
            <button class="share-btn" id="share-btn" aria-label="Share this entry">
              <svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              Share
            </button>
          </div>
        </div>

        <!-- Title -->
        <h1 class="entry-detail__title">${entry.title}</h1>

        <!-- Excerpt / lede -->
        <p class="entry-detail__excerpt">${entry.excerpt}</p>

        <hr class="divider" />

        <!-- Body -->
        <div class="entry-detail__body" id="entry-body">
          ${entry.body.map(p => `<p>${p}</p>`).join('')}
        </div>

        <!-- Newsletter at end of every entry -->
        <div id="entry-newsletter"></div>

        <!-- Prev / Next navigation -->
        <nav class="entry-nav" style="display:flex;justify-content:space-between;margin-top:var(--space-12);padding-top:var(--space-6);border-top:1px solid var(--border);gap:var(--space-4);">
          <div>
            ${prev ? `
              <a href="#/entry/${prev.id}" style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;color:var(--text-muted);">← Previous</a>
              <div style="font-family:var(--font-hand);font-size:1.1rem;color:var(--accent);margin-top:var(--space-1);">${prev.title}</div>
            ` : ''}
          </div>
          <div style="text-align:right;">
            ${next ? `
              <a href="#/entry/${next.id}" style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;color:var(--text-muted);">Next →</a>
              <div style="font-family:var(--font-hand);font-size:1.1rem;color:var(--accent);margin-top:var(--space-1);">${next.title}</div>
            ` : ''}
          </div>
        </nav>

      </div>
    </div>
  `;

  // Footer
  app.insertAdjacentHTML('beforeend', footerHTML());

  // Newsletter component
  const nlWrap = document.getElementById('entry-newsletter');
  if (nlWrap) renderNewsletter(nlWrap, { variant: `entry-${entry.id}` });

  // Reading progress bar
  function onScroll() {
    const body   = document.getElementById('entry-body');
    const bar    = document.getElementById('reading-progress');
    if (!body || !bar) return;
    const bodyTop  = body.getBoundingClientRect().top + window.scrollY;
    const bodyEnd  = bodyTop + body.offsetHeight;
    const scrolled = window.scrollY + window.innerHeight;
    const pct      = Math.min(100, Math.max(0, ((scrolled - bodyTop) / (bodyEnd - bodyTop)) * 100));
    bar.style.width = pct + '%';
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  // Clean up when route changes
  const cleanup = () => {
    window.removeEventListener('scroll', onScroll);
    progressBar.remove();
    window.removeEventListener('hashchange', cleanup);
  };
  window.addEventListener('hashchange', cleanup);

  // Share button
  const shareBtn = document.getElementById('share-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const shareData = {
        title: entry.title,
        text:  entry.excerpt,
        url:   window.location.href,
      };
      if (navigator.share) {
        try { await navigator.share(shareData); } catch (_) {}
      } else {
        // Fallback: copy link
        navigator.clipboard.writeText(window.location.href).then(() => {
          shareBtn.textContent = 'Link copied!';
          setTimeout(() => { shareBtn.innerHTML = `<svg viewBox="0 0 24 24" style="width:13px;height:13px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg> Share`; }, 2000);
        });
      }
    });
  }
}
