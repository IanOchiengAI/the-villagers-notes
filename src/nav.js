const LINKS = [
  { label: 'Entries',  href: '#/entries', page: 'entries' },
  { label: 'Projects', href: '#/projects', page: 'projects' },
];

export function initNav() {
  const root = document.getElementById('nav-root');
  if (!root) return; // Guard: #nav-root must exist

  root.innerHTML = `
    <nav class="nav" id="site-nav">
      <div class="container">
        <div class="nav__inner">
          <a href="#/" class="nav__logo">The Villager's Notes</a>
          <ul class="nav__links">
            ${LINKS.map(l => `<li><a href="${l.href}" data-page="${l.page}">${l.label}</a></li>`).join('')}
          </ul>
          <button class="nav__hamburger" id="hamburger" aria-label="Menu">
            <span></span><span></span><span></span>
          </button>
        </div>
        <div class="nav__mobile" id="mobile-menu">
          ${LINKS.map(l => `<a href="${l.href}">${l.label}</a>`).join('')}
        </div>
      </div>
    </nav>`;

  window.addEventListener('scroll', () => {
    const siteNav = document.getElementById('site-nav');
    if (siteNav) siteNav.classList.toggle('scrolled', window.scrollY > 20);
  });

  document.getElementById('hamburger')?.addEventListener('click', () => {
    document.getElementById('mobile-menu')?.classList.toggle('open');
  });

  // Auto-close mobile menu when any link is clicked
  document.querySelectorAll('#mobile-menu a').forEach(link => {
    link.addEventListener('click', () => {
      document.getElementById('mobile-menu')?.classList.remove('open');
    });
  });

  window.addEventListener('hashchange', highlightActive);
  highlightActive();
}

function highlightActive() {
  const hash = location.hash.replace('#/', '') || '';
  const page = hash.split('/')[0];
  document.querySelectorAll('.nav__links a').forEach(a => {
    const isMatch = a.dataset.page === page || (page.startsWith('entry') && a.dataset.page === 'entries');
    a.classList.toggle('active', isMatch);
  });
}
