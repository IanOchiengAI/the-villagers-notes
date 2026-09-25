import { loadErrorHTML, wireRetry } from './lib/html.js';

// Real URLs (/entries/my-story), not #hashes: search engines can index them and shared
// links open the right page everywhere. Old #/… links still work: they are upgraded on load.
//
// Pages are loaded on demand, so readers never download the admin.
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

// GA4 is configured with send_page_view: false (public/ga-init.js) because this is a
// client-side router: the browser never does a real navigation after the first load, so
// the automatic page_view would fire once per visit. Send one on every route change,
// reading document.title after render so entry pages report their own title.
// Skip admin so Vic's own visits aren't counted.
function sendPageView(path) {
  if (path === 'admin') return;
  if (typeof window.gtag !== 'function') return;
  try {
    window.gtag('event', 'page_view', {
      page_title: document.title,
      page_location: location.href,
      page_path: '/' + path,
    });
  } catch (_) {}
}

function currentPath() {
  return decodeURIComponent(location.pathname).replace(/^\/+|\/+$/g, '');
}

/** Old links looked like /#/entries/slug. Rewrite them to /entries/slug without a reload. */
function upgradeLegacyHash() {
  if (!location.hash.startsWith('#/')) return;
  const p = location.hash.slice(2).replace(/\/+$/, '');
  history.replaceState(null, '', '/' + p);
}

let navId = 0;

/** Go to a path (e.g. '/entries') without a page load. */
export function navigate(path) {
  history.pushState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function initRouter() {
  const app = document.getElementById('app');
  const root = document.documentElement;

  async function route() {
    if (!app) return;
    upgradeLegacyHash();
    const path = currentPath();
    const myNav = ++navId;
    // Pages read this after their awaits so a slow, superseded navigation can't overwrite a newer one.
    app.dataset.nav = String(myNav);

    // Hide public site nav on admin page so the admin bar sticks at top: 0
    const siteNav = document.getElementById('site-nav');
    if (siteNav) siteNav.style.display = path === 'admin' ? 'none' : '';

    // Keep the current page visible while the next one loads (no white flash); show a thin progress line if it's slow.
    const slowTimer = setTimeout(() => root.classList.add('is-loading'), 180);

    try {
      let render;
      let arg;
      const m = path.match(/^(?:entry|entries)\/(.+)$/);
      if (m) {
        arg = m[1];
        render = await import('./pages/entry.js').then(x => x.renderEntry);
      } else if (routes[path] !== undefined) {
        const page = routes[path];
        setMeta(page.title, page.desc);
        render = await page.load();
      } else {
        render = async (a) => {
          document.title = "Page not found — The Villager's Notes";
          a.innerHTML = `
            <div class="container" style="padding:6rem 0;text-align:center;">
              <p style="color:var(--muted-foreground);font-size:1.1rem;">That page doesn't exist.</p>
              <a href="/" class="label" style="margin-top:1.5rem;display:inline-flex;text-decoration:none;">← Back home</a>
            </div>`;
        };
      }
      if (myNav !== navId) return;
      await render(app, arg);
      if (myNav !== navId) return;

      const wasServerRendered = app.dataset.ssr === '1';
      delete app.dataset.ssr;
      window.scrollTo({ top: 0, behavior: 'instant' });
      // Gentle arrival: re-trigger the CSS fade on every route (skipped when swapping server-rendered content in place).
      app.classList.remove('route-enter');
      if (!wasServerRendered) {
        void app.offsetWidth;
        app.classList.add('route-enter');
      }
      sendPageView(path);
      window.dispatchEvent(new Event('routechange'));
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

  // Same-site link clicks navigate without reloading the page.
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    if ((a.target && a.target !== '_self') || a.hasAttribute('download')) return;
    let url;
    try { url = new URL(a.href, location.href); } catch { return; }
    if (url.origin !== location.origin) return;
    if (url.pathname.startsWith('/api/') || /\.[a-z0-9]{2,5}$/i.test(url.pathname)) return; // files, sitemap, etc.
    if (url.pathname === location.pathname && url.hash) return; // in-page anchor
    e.preventDefault();
    if (url.pathname + url.search === location.pathname + location.search) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    history.pushState(null, '', url.pathname + url.search);
    route();
  });

  window.addEventListener('popstate', route);
  window.addEventListener('hashchange', route); // a pasted/legacy #/ link while the app is open
  route();
}
