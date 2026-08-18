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
    images: ['/images/book-cover.png'],
    cta: {
      label: 'READ MORE →',
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
            <div>
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
