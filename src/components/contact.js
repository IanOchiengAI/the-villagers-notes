export function renderContact(container) {
  container.innerHTML = `
    <section class="contact-section" style="margin-top:4rem;border-top:1px solid var(--rule);padding-top:3rem;">
      <div style="display:grid;grid-template-columns:1fr 1.4fr;gap:3rem;align-items:start;">
        <div>
          <h2 style="font-size:clamp(1.75rem, 4.5vw, 2.5rem);font-family:var(--font-hand);font-weight:400;margin:0 0 1rem;">
            Write to me
          </h2>
          <p style="color:var(--muted-foreground);font-size:1.0625rem;font-family:var(--font-body);max-width:36ch;line-height:1.6;">
            Working together, feedback, a meet, anything at all.
          </p>
        </div>
        <div>
          <form class="contact-form" id="write-to-me-form" style="display:flex;flex-direction:column;gap:1.25rem;">
            <div>
              <label class="label" for="contact-email" style="display:block;margin-bottom:0.5rem;">Your email</label>
              <input type="email" id="contact-email" placeholder="you@somewhere" required
                     style="width:100%;border:none;border-bottom:1px solid var(--foreground);background:transparent;padding-bottom:0.5rem;font-size:1.125rem;font-family:var(--font-body);outline:none;color:var(--foreground);" />
            </div>
            <div>
              <label class="label" for="contact-msg" style="display:block;margin-bottom:0.5rem;">Message</label>
              <textarea id="contact-msg" rows="4" required
                        style="width:100%;border:none;border-bottom:1px solid var(--rule);background:transparent;padding-bottom:0.5rem;font-size:1.125rem;font-family:var(--font-body);outline:none;color:var(--foreground);resize:vertical;"></textarea>
            </div>
            <button class="label" type="submit" id="contact-submit"
                    style="align-self:flex-start;border:1px solid var(--foreground);background:transparent;padding:0.625rem 1.25rem;color:var(--foreground);cursor:pointer;transition:all 0.15s ease;"
                    onmouseover="this.style.borderColor='var(--accent)';this.style.color='var(--accent)';"
                    onmouseout="this.style.borderColor='var(--foreground)';this.style.color='var(--foreground)';">
              Send it
            </button>
            <p id="contact-status" style="display:none;font-family:var(--font-hand);font-size:1.5rem;color:var(--foreground);margin-top:1rem;"></p>
          </form>
        </div>
      </div>
    </section>
  `;

  const form = container.querySelector('#write-to-me-form');
  const status = container.querySelector('#contact-status');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = container.querySelector('#contact-email').value.trim();
      const msg = container.querySelector('#contact-msg').value.trim();
      if (!email || !msg) return;

      // Direct mailto fallback / feedback
      const mailtoUrl = `mailto:vikmunala@gmail.com?subject=${encodeURIComponent('Note from ' + email)}&body=${encodeURIComponent(msg + '\n\nFrom: ' + email)}`;
      window.location.href = mailtoUrl;

      if (status) {
        form.style.display = 'none';
        status.style.display = 'block';
        status.textContent = "Got it. I'll write back.";
      }
    });
  }
}
