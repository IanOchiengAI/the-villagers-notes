export function footerHTML() {
  return `
    <footer class="footer">
      <div class="container">
        <div class="footer__inner">
          <div class="footer__brand" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span>THE VILLAGER'S NOTES — © ${new Date().getFullYear()}</span>
            <span style="opacity:0.5;">·</span>
            <a class="hv-credit" href="https://kasuku-studios.web.app" target="_blank" rel="noopener noreferrer" style="font-size:0.68rem;letter-spacing:0.1em;text-transform:uppercase;text-decoration:none;color:var(--text-muted);opacity:0.65;transition:opacity 0.15s ease,color 0.15s ease;">Site by Kasuku Studio</a>
          </div>
          <div class="footer__socials" style="display:flex;align-items:center;gap:1.25rem;">
            <a href="https://www.instagram.com/thevillagersnotes?igsh=MWthNzR1YW03Nmc3Mg==" target="_blank" rel="noopener noreferrer" aria-label="Instagram" class="footer__social-icon hv-accent" style="display:inline-flex;align-items:center;color:var(--muted-foreground);transition:color 0.15s ease;">
              <!-- Instagram (Outline) -->
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
            </a>
            <a href="https://www.tiktok.com/@the.villagers.notes?_r=1&_t=ZS-98zEbShlokn" target="_blank" rel="noopener noreferrer" aria-label="TikTok" class="footer__social-icon hv-accent" style="display:inline-flex;align-items:center;color:var(--muted-foreground);transition:color 0.15s ease;">
              <!-- TikTok (Minimalist Music Note) -->
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="8" cy="17" r="3.5"></circle>
                <path d="M11.5 17V4l8 3.5"></path>
              </svg>
            </a>
            <a href="https://x.com/" target="_blank" rel="noopener noreferrer" aria-label="Twitter" class="footer__social-icon hv-accent" style="display:inline-flex;align-items:center;color:var(--muted-foreground);transition:color 0.15s ease;">
              <!-- Twitter (Classic Bird) -->
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path>
              </svg>
            </a>
            <a href="mailto:vikmunala@gmail.com" class="footer__email-link label hv-accent" style="text-decoration:none;transition:color 0.15s ease;">EMAIL</a>
          </div>
        </div>
      </div>
    </footer>`;
}
