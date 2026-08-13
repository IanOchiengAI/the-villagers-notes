const PROJECTS = [
  {
    id: 1, category: 'Play', featured: true,
    title: 'Beneath the Surface',
    pullquote: 'A married couple\'s evening unfolds over dinner. The wife demands presence; the husband asks for endurance. Neither realises that the other is afraid of losing the marriage.',
    excerpt: 'Staged 2026 · Two-hander · 76 minutes. Script and rights available.',
    images: ['/images/play-scene-1.png', '/images/play-scene-2.png'],
    meta: { year: '2026', type: 'Two-Hander · 76 Minutes', note: 'Script & Rights Available' },
  },
  {
    id: 2, category: 'Novel', featured: false,
    title: 'Under the Mango Tree',
    excerpt: 'A novel about losing yourself and trying to find your way back home. Published 2024. Available at Nuria and directly from Vic.',
    image: '/images/book-cover.png',
    meta: { year: '2024', type: 'Novel', note: 'Nuria & Direct' },
  },
];

const CATEGORIES = ['All', 'Novel', 'Play'];

export function renderProjects(app) {
  let active = 'All';

  function render() {
    const featured = PROJECTS.find(p => p.featured);
    const rest = PROJECTS.filter(p =>
      !p.featured && (active === 'All' || p.category === active)
    );

    app.innerHTML = `
      <section class="projects-hero">
        <div class="container">
          <p class="eyebrow">Selected Work</p>
          <h1 style="font-family:var(--font-hand);font-size:clamp(2rem,5vw,3.2rem);font-weight:600;">Projects.</h1>
          <p style="color:var(--text-muted);margin-top:0.5rem;font-size:0.95rem;">There is more in drawers. These are the ones that left the house.</p>
          <div class="projects-filter">
            ${CATEGORIES.map(c => `
              <button class="filter-pill ${c === active ? 'active' : ''}" data-cat="${c}">${c}</button>
            `).join('')}
          </div>
        </div>
      </section>

      <div class="container">
        <!-- FEATURED — Beneath the Surface -->
        ${featured ? `
          <div class="project-feature">
            <div class="project-feature__media" style="aspect-ratio:unset;background:none;border:none;border-radius:0;display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);">
              <img src="${featured.images[0]}" alt="Beneath the Surface — scene 1" 
                style="width:100%;height:320px;object-fit:cover;border-radius:var(--radius-lg);display:block;" />
              <img src="${featured.images[1]}" alt="Beneath the Surface — scene 2" 
                style="width:100%;height:320px;object-fit:cover;border-radius:var(--radius-lg);display:block;" />
            </div>
            <div>
              <p class="eyebrow project-feature__label">${featured.category} · ${featured.meta.year}</p>
              <h2 class="project-feature__title" style="font-family:var(--font-hand);font-size:clamp(2rem,4vw,3rem);font-weight:600;">${featured.title}</h2>
              <blockquote class="project-feature__pullquote">${featured.pullquote}</blockquote>
              <p style="color:var(--text-muted);font-size:0.9rem;line-height:1.7">${featured.excerpt}</p>
              <div style="margin-top:var(--space-6);display:flex;gap:var(--space-4);font-size:0.75rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);">
                <span>${featured.meta.type}</span>
                <span style="color:var(--accent)">·</span>
                <span>${featured.meta.note}</span>
              </div>
              <a href="https://wa.me/254700000000?text=Hi%20Vic%2C%20I'm%20interested%20in%20the%20script%20for%20Beneath%20the%20Surface." 
                 target="_blank" class="btn btn--outline" style="margin-top:1.5rem">
                Enquire about script & rights →
              </a>
            </div>
          </div>
        ` : ''}

        <!-- REST OF GRID -->
        <div class="projects-grid" style="grid-template-columns:1fr;">
          ${rest.map(p => `
            <div class="project-card" style="display:grid;grid-template-columns:240px 1fr;gap:0;max-width:720px;">
              <div class="project-card__media" style="aspect-ratio:3/4;height:auto;">
                <img src="${p.image}" alt="${p.title}" style="width:100%;height:100%;object-fit:cover;" />
              </div>
              <div class="project-card__body" style="display:flex;flex-direction:column;justify-content:center;">
                <div class="project-card__category">${p.category} · ${p.meta.year}</div>
                <div class="project-card__title" style="font-family:var(--font-hand);font-size:1.8rem;font-weight:600;color:var(--text);">${p.title}</div>
                <p class="project-card__excerpt">${p.excerpt}</p>
                <div style="margin-top:var(--space-4);font-size:0.75rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);">
                  ${p.meta.note}
                </div>
                <a href="#/book" class="btn btn--primary" style="margin-top:var(--space-6);align-self:flex-start;">
                  Order your copy →
                </a>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    app.querySelectorAll('.filter-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        active = btn.dataset.cat;
        render();
      });
    });
  }

  render();
}
