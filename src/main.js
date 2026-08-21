import './index.css';
import './components/enhancements.css';

import { initNav } from './nav.js';
import { initRouter } from './router.js';
import { initWhatsAppFab } from './components/whatsapp-fab.js';

initNav();
initRouter();
initWhatsAppFab();

// Reveal animation observer
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('is-visible');
      revealObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.12 });

function observeRevealEls() {
  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
}

window.addEventListener('hashchange', () => setTimeout(observeRevealEls, 60));
setTimeout(observeRevealEls, 60);

