import { renderHome }     from './pages/home.js';
import { renderEntries }  from './pages/entries.js';
import { renderEntry }    from './pages/entry.js';
import { renderProjects } from './pages/projects.js';
import { renderBook }     from './pages/book.js';
import { renderAdmin }    from './pages/admin.js';

const routes = {
  '':         { render: renderHome,     title: "The Villager's Notes — Vic Munala",           desc: 'Writing by Vic Munala — novelist and playwright from Nairobi, Kenya.' },
  'entries':  { render: renderEntries,  title: "Entries — The Villager's Notes",               desc: 'Essays, teasers, reviews, and notes from Vic Munala.' },
  'projects': { render: renderProjects, title: "Projects — The Villager's Notes",              desc: 'Under the Mango Tree (Novel) and Beneath the Surface (Play) by Vic Munala.' },
  'works':    { render: renderProjects, title: "Projects — The Villager's Notes",              desc: 'Under the Mango Tree (Novel) and Beneath the Surface (Play) by Vic Munala.' },
  'book':     { render: renderBook,     title: "Get the Book — Under the Mango Tree",          desc: 'Order Under the Mango Tree by Vic Munala directly via M-Pesa. Nairobi delivery available.' },
  'admin':    { render: renderAdmin,    title: "Admin — The Villager's Notes",                desc: '' },
};

function setMeta(title, desc) {
  document.title = title;
  let ogTitle = document.querySelector('meta[property="og:title"]');
  let ogDesc  = document.querySelector('meta[property="og:description"]');
  let metaDesc = document.querySelector('meta[name="description"]');
  if (ogTitle)  ogTitle.setAttribute('content', title);
  if (ogDesc)   ogDesc.setAttribute('content', desc);
  if (metaDesc) metaDesc.setAttribute('content', desc);
}

function logPageVisit(path) {
  try {
    const raw = localStorage.getItem('tvn_analytics');
    const log = raw ? JSON.parse(raw) : [];
    log.push({
      type: 'visit',
      path: path || 'home',
      time: new Date().toISOString()
    });
    if (log.length > 500) log.splice(0, log.length - 500);
    localStorage.setItem('tvn_analytics', JSON.stringify(log));
  } catch (_) {}
}

// GA4 is configured with send_page_view: false (index.html) because this is a
// hash-routed SPA: the browser never does a real navigation after the first
// load, so the automatic page_view would fire exactly once per visit no
// matter how many entries someone reads. Send one ourselves on every route
// change instead, reading document.title after render so entry pages report
// their own title. Skip the admin route so Vic's own visits aren't counted.
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

export function initRouter() {
  async function route() {
    const rawHash = location.hash.replace(/^#\/?/, '').replace(/\/$/, '') || '';
    const app = document.getElementById('app');
    if (!app) return;
    app.innerHTML = '';
    window.scrollTo(0, 0);

    logPageVisit(rawHash);

    // Hide public site nav on admin page so admin bar sticks directly at top: 0
    const siteNav = document.getElementById('site-nav');
    if (siteNav) {
      siteNav.style.display = rawHash === 'admin' ? 'none' : '';
    }

    // Support both #/entries/:slug and #/entry/:id
    if (rawHash.startsWith('entry/') || (rawHash.startsWith('entries/') && rawHash.replace('entries/', '').length > 0)) {
      const slugOrId = rawHash.replace(/^(entry|entries)\//, '');
      await renderEntry(app, slugOrId);
      sendPageView(rawHash);
      return;
    }

    const page = routes[rawHash] ?? routes[''];
    setMeta(page.title, page.desc);
    await page.render(app);
    sendPageView(rawHash);
  }
  window.addEventListener('hashchange', route);
  route();
}
