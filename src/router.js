import { loadErrorHTML, wireRetry } from './lib/html.js';

// Pages are loaded on demand: readers never download the admin, and each route's code
// is fetched only when visited.
const routes = {
  '':         { load: () => import('./pages/home.js').then(m => m.renderHome),         title: "The Villager's Notes — Vic Munala",           desc: 'Writing by Vic Munala — novelist and playwright from Nairobi, Kenya.' },
  'entries':  { load: () => import('./pages/entries.js').then(m => m.renderEntries),   title: "Entries — The Villager's Notes",               desc: 'Essays, teasers, reviews, and notes from Vic Munala.' },
  'projects': { load: () => import('./pages/projects.js').then(m => m.renderProjects), title: "Projects — The Villager's Notes",              desc: 'Under the Mango Tree (Novel) and Beneath the Surface (Play) by Vic Munala.' },
  'works':    { load: () => import('./pages/projects.js').then(m => m.renderProjects), title: "Projects — The Villager's Notes",              desc: 'Under the Mango Tree (Novel) and Beneath the Surface (Play) by Vic Munala.' },
  'book':     { load: () => import('./pages/book.js').then(m => m.renderBook),         title: "Get the Book — Under the Mango Tree",          desc: 'Order Under the Mango Tree by Vic Munala directly via M-Pesa. Nairobi delivery available.' },
  'admin':    { load: () => import('./pages/admin.js').then(m => m.renderAdmin),       title: "Admin — The Villager's Notes",                desc: '' },
};

function setMeta(title, desc) {
  document.title = title;
  const ogTitle = document.querySelector('meta[property="og:title"]');
  const ogDesc = document.querySelector('meta[property="og:description"]');
  const metaDesc = document.querySelector('meta[name="description"]');
  if (ogTitle) ogTitle.setAttribute('content', title);
  if (ogDesc) ogDesc.setAttribute('content', desc);
  if (metaDesc) metaDesc.setAttribute('content', desc);
}

// GA4 is configured with send_page_view: false (index.html) because this is a
// hash-routed SPA: the browser never does a real navigation after the first
// load, so the automatic page_view would fire exactly once per visit. Send one
// on every route change, reading document.title after render so entry pages
// report their own title. Skip admin so Vic's own visits aren't counted.
function sendPageView(rawHash) {
  if (rawHash === 'admin') return;
  if (typeof window.gtag !== 'function') return;
  try {
    window.gtag('event', 'page_view', {
      page_title: document.title,
      page_location: location.href,
      page_path: '/' + rawHash,
    });
  } catch (_) {}
}

let navId = 0;

export function initRouter() {
  const app = document.getElementById('app');
  const root = document.documentElement;

  async function route() {
    if (!app) return;
    const rawHash = location.hash.replace(/^#\/?/, '').replace(/\/$/, '') || '';
    const myNav = ++navId;
    // Pages read this after their awaits so a slow, superseded navigation can't overwrite a newer one.
    app.dataset.nav = String(myNav);

    // Hide public site nav on admin page so the admin bar sticks at top: 0
    const siteNav = document.getElementById('site-nav');
    if (siteNav) siteNav.style.display = rawHash === 'admin' ? 'none' : '';

    // Keep the current page visible while the next one loads (no white flash); show a thin progress line if it's slow.
    const slowTimer = setTimeout(() => root.classList.add('is-loading'), 180);

    try {
      let render;
      let arg;
      if (rawHash.startsWith('entry/') || (rawHash.startsWith('entries/') && rawHash.replace('entries/', '').length > 0)) {
        const raw = rawHash.replace(/^(entry|entries)\//, '');
        try { arg = decodeURIComponent(raw); } catch { arg = raw; }
        render = await import('./pages/entry.js').then(m => m.renderEntry);
      } else {
        const page = routes[rawHash] ?? routes[''];
        setMeta(page.title, page.desc);
        render = await page.load();
      }
      if (myNav !== navId) return;
      await render(app, arg);
      if (myNav !== navId) return;

      window.scrollTo({ top: 0, behavior: 'instant' });
      // Gentle arrival: re-trigger the CSS fade on every route.
      app.classList.remove('route-enter');
      void app.offsetWidth;
      app.classList.add('route-enter');
      sendPageView(rawHash);
    } catch (err) {
      console.error('[router] render failed:', err);
      if (myNav !== navId) return;
      app.innerHTML = loadErrorHTML("Something went wrong loading this page. Check your connection and try again.");
      wireRetry(app, route);
    } finally {
      clearTimeout(slowTimer);
      if (myNav === navId) root.classList.remove('is-loading');
    }
  }

  window.addEventListener('hashchange', route);
  route();
}
