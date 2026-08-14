import { renderSodaTip } from '../components/soda-tip.js';
import { footerHTML } from '../components/footer.js';

const PROJECTS = [
  {
    id: 1,
    category: 'Play',
    title: 'Beneath the Surface',
    synopsis: 'A married couple\'s evening unfolds over dinner. The wife demands presence; the husband asks for endurance. Neither realises that the other is afraid of losing the marriage.',
    excerpt: 'Staged 2026 · Two-hander · 76 minutes. Script and rights available.',
    images: ['/images/play-scene-1.png', '/images/play-scene-2.png'],
    meta: { year: '2026', type: 'Two-Hander · 76 Minutes', note: 'Script & Rights Available' },
    cta: {
      label: 'Enquire about script & rights →',
      href: 'https://wa.me/254710276333?text=Hi%20Vic%2C%20I\'m%20interested%20in%20the%20script%20for%20Beneath%20the%20Surface.',
    },
  },
  {
    id: 2,
    category: 'Novel',
    title: 'Under the Mango Tree',
    synopsis: 'A novel about losing yourself and trying to find your way back home. Published 2024. Available at Nuria and directly from Vic.',
    images: ['/images/book-cover.png'],
    meta: { year: '2024', type: 'Novel', note: 'Nuria & Direct' },
    cta: {
      label: 'Order your copy →',
      href: '#/book',
    },
  },
];

export function renderProjects(app) {
  app.innerHTML = `
    <section class="projects-hero">
      <div class="container">
        <h1 style="font-family:var(--font-hand);font-size:clamp(2rem,5vw,3.2rem);font-weight:400;">Projects.</h1>
        <p style="color:var(--text-muted);margin-top:0.5rem;font-size:0.95rem;">There is more in drawers. These are the ones that left the house.</p>
      </div>
    </section>

    <div class="container" style="padding-top:var(--space-12);padding-bottom:var(--space-12);">
      ${PROJECTS.map((p, i) => {
        const isPlay = p.images.length > 1;
        const mediaHTML = isPlay
          ? `<div style="display:flex;flex-wrap:wrap;gap:var(--space-3);">
               <img src="${p.images[0]}" alt="${p.title} — scene 1"
                 style="flex:1 1 260px;min-width:0;height:260px;object-fit:cover;border-radius:var(--radius-lg);display:block;" />
               <img src="${p.images[1]}" alt="${p.title} — scene 2"
                 style="flex:1 1 260px;min-width:0;height:260px;object-fit:cover;border-radius:var(--radius-lg);display:block;" />
             </div>`
          : `<img src="${p.images[0]}" alt="${p.title}"
               style="width:100%;max-width:340px;height:auto;border-radius:var(--radius-lg);display:block;
                      box-shadow:8px 8px 32px hsl(30 10% 12% / 0.12);" />`;

        return `
          <div class="project-entry" data-id="${p.id}"
            style="margin-bottom:var(--space-16);padding-bottom:var(--space-16);
                   ${i < PROJECTS.length - 1 ? 'border-bottom:1px solid var(--border);' : ''}">
            <!-- Image(s) -->
            <div style="margin-bottom:var(--space-6);">${mediaHTML}</div>

            <!-- Category + Title -->
            <p class="eyebrow" style="margin-bottom:var(--space-2);">${p.category} · ${p.meta.year}</p>
            <h2 style="font-family:var(--font-hand);font-size:clamp(1.8rem,4vw,2.8rem);font-weight:400;margin-bottom:var(--space-4);">${p.title}</h2>

            <!-- Meta tags -->
            <div style="display:flex;gap:var(--space-4);font-size:0.72rem;text-transform:uppercase;
                        letter-spacing:0.08em;color:var(--text-muted);margin-bottom:var(--space-4);">
              <span>${p.meta.type}</span>
              <span style="color:var(--accent);">·</span>
              <span>${p.meta.note}</span>
            </div>

            <!-- Read more / synopsis -->
            <button class="synopsis-toggle" data-target="synopsis-${p.id}" aria-expanded="false">
              Read synopsis ↓
            </button>
            <div class="project-synopsis project-synopsis--collapsed" id="synopsis-${p.id}">
              <blockquote style="font-family:var(--font-serif);font-style:italic;font-size:1.05rem;
                                  color:var(--text-muted);border-left:3px solid var(--accent);
                                  padding-left:var(--space-4);margin:var(--space-4) 0 var(--space-6);line-height:1.75;">
                ${p.synopsis}
              </blockquote>
              ${p.excerpt ? `<p style="color:var(--text-muted);font-size:0.9rem;line-height:1.7;margin-bottom:var(--space-6);">${p.excerpt}</p>` : ''}
            </div>

            <!-- CTA -->
            <a href="${p.cta.href}" ${p.cta.href.startsWith('http') ? 'target="_blank" rel="noopener"' : ''}
               class="btn btn--outline" style="margin-top:var(--space-4);">
              ${p.cta.label}
            </a>
          </div>
        `;
      }).join('')}
    </div>
  `;

  // Synopsis toggle behaviour
  app.querySelectorAll('.synopsis-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const panel = document.getElementById(targetId);
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      if (expanded) {
        panel.classList.remove('project-synopsis--expanded');
        panel.classList.add('project-synopsis--collapsed');
        btn.textContent = 'Read synopsis ↓';
        btn.setAttribute('aria-expanded', 'false');
      } else {
        panel.classList.remove('project-synopsis--collapsed');
        panel.classList.add('project-synopsis--expanded');
        btn.textContent = 'Close synopsis ↑';
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  // Soda tip at bottom of projects
  const sodaWrap = document.createElement('div');
  app.appendChild(sodaWrap);
  renderSodaTip(sodaWrap);

  // Footer on every page
  app.insertAdjacentHTML('beforeend', footerHTML());
}
