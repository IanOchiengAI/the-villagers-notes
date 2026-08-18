import { renderSodaTip } from '../components/soda-tip.js';
import { renderContact } from '../components/contact.js';
import { footerHTML } from '../components/footer.js';

const PROJECTS = [
  {
    id: '01',
    num: '01',
    category: 'NOVEL',
    year: '2024',
    metaDetails: ['PUBLISHED 2024', 'PAPERBACK', 'KES 1500', 'DELIVERED'],
    title: 'under the Mango Tree',
    synopsis: 'A novel about losing yourself and trying to find your way back home.',
    synopsisFull: `One minute, Esibanda is running as fast as he can because the teacher on duty will work a number on his buttocks because of lateness. The next minute, he is running away, and hiding from his landlord because the rent is due, the rent is always due, and he doesn't have the money.\n\nAfter the simplicity of life in the village with his two friends, Omulindi and Dennis, navigating school, play and mischief, he finds himself on the streets of Nairobi, with its complexities, where he stumbles on a dream, a dream he did not know he had because where he came from dreams like that were not within reach.\n\nDespite the title, no one in the story eats a mango. Neither does a mango fall on anyone's head. Disappointing as that may be, the narrative does well to compensate for that by bringing you into the full range of the human experience, dancing around themes of losing yourself and trying to find your way home. It takes you on a journey about childhood friendship, becoming a man and fatherhood, or lack thereof.`,
    images: ['/images/book-cover.png'],
    cta: {
      label: 'ORDER YOUR COPY →',
      href: '#/book',
      isExternal: false,
    },
  },
  {
    id: '02',
    num: '02',
    category: 'PLAY',
    year: 'JULY 2026',
    metaDetails: ['STAGED JULY 2026', 'TWO-HANDER - 77 MINUTES', 'SCRIPT & RIGHTS AVAILABLE'],
    title: 'Beneath the Surface',
    synopsis: 'A married couple\'s evening unfolds over dinner. The wife demands presence; the husband asks for endurance. With each word uttered, neither realises that the other is afraid of losing the marriage by speaking the truth. You are a fly on the wall listening in on their conversation.',
    images: ['/images/play-scene-2.png', '/images/play-scene-1.png'],
    cta: {
      label: 'WATCH THE TRAILER →',
      href: 'https://wa.me/254710276333?text=Hi%20Vic%2C%20I\'m%20interested%20in%20Beneath%20the%20Surface.',
      isExternal: true,
    },
  },
];

export function renderProjects(app) {
  app.innerHTML = `
    <section class="projects-hero">
      <div class="container">
        <h1>Projects</h1>
        <p>There is more in drawers. These are the ones that left the house.</p>
      </div>
    </section>

    <div class="container">
      ${PROJECTS.map(p => `
        <div class="project-row" id="project-${p.id}">
          <!-- Left metadata column -->
          <div class="project-meta-col">
            <div class="proj-num">${p.num}</div>
            <div class="proj-cat">${p.category}</div>
            <div>${p.year}</div>
            <div class="proj-details">
              ${p.metaDetails.map(d => `<div>${d}</div>`).join('')}
            </div>
          </div>

          <!-- Right content & media column -->
          <div class="project-content-col">
            <h2>${p.title}</h2>
            <div class="project-gallery">
              ${p.images.map(img => `
                <img src="${img}" alt="${p.title}" />
              `).join('')}
            </div>
            <p class="project-synopsis-text">${p.synopsis}</p>
            ${p.synopsisFull ? `
              <div class="synopsis-full" id="synopsis-full-${p.id}" aria-hidden="true">
                ${p.synopsisFull.split('\n\n').map(para => `<p class="project-synopsis-text project-synopsis-text--muted">${para}</p>`).join('')}
              </div>
              <button class="synopsis-toggle" data-target="synopsis-full-${p.id}" aria-expanded="false">
                READ MORE ↓
              </button>
            ` : ''}
            <div class="project-cta-row">
              <a href="${p.cta.href}" ${p.cta.isExternal ? 'target="_blank" rel="noopener"' : ''}
                 class="btn--sharp">
                ${p.cta.label}
              </a>
            </div>
          </div>
        </div>
      `).join('')}

      <!-- Buy me soda madiaba -->
      <div id="soda-container"></div>

      <!-- Write to me -->
      <div id="contact-container"></div>
    </div>
  `;

  // Wire synopsis toggles
  app.querySelectorAll('.synopsis-toggle').forEach(btn => {
    const panel = document.getElementById(btn.dataset.target);
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      panel.setAttribute('aria-hidden', String(open));
      btn.textContent = open ? 'READ MORE ↓' : 'SHOW LESS ↑';
    });
  });

  // Render Soda tip
  const sodaEl = app.querySelector('#soda-container');
  if (sodaEl) renderSodaTip(sodaEl);

  // Render Contact section
  const contactEl = app.querySelector('#contact-container');
  if (contactEl) renderContact(contactEl);

  // Footer
  app.insertAdjacentHTML('beforeend', footerHTML());

  document.title = "Projects — The Villager's Notes";
}
