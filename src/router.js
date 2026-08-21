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

export function initRouter() {
  function route() {
    const hash = location.hash.replace('#/', '') || '';
    const app  = document.getElementById('app');
    if (!app) return;
    app.innerHTML = '';
    window.scrollTo(0, 0);

    logPageVisit(hash);

    // entry/:id — title set inside renderEntry()
    if (hash.startsWith('entry/')) {
      const id = hash.replace('entry/', '');
      renderEntry(app, id);
      return;
    }

    const page = routes[hash] ?? routes[''];
    setMeta(page.title, page.desc);
    page.render(app);
  }
  window.addEventListener('hashchange', route);
  route();
}
