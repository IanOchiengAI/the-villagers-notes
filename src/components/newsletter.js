import { addSubscriber } from '../pages/admin.js';

export function renderNewsletter(container, { variant = 'entry' } = {}) {
  container.innerHTML = `
    <section class="newsletter-section" style="margin-top:4.5rem;border-top:1px solid var(--rule);padding-top:3rem;">
      <h2 style="font-size:clamp(1.85rem, 5vw, 2.5rem);font-family:var(--font-hand);font-weight:400;margin:0 0 2rem;color:var(--foreground);">Sign up for random good things</h2>
      <form class="newsletter__form" id="nl-form-${variant}" novalidate style="max-width:28rem;display:flex;flex-direction:column;gap:1.5rem;">
        <div>
          <label class="label" for="nl-email-${variant}" style="display:block;margin-bottom:0.6rem;font-size:0.6875rem;letter-spacing:0.16em;">EMAIL</label>
          <input class="form-input-underlined" type="email" id="nl-email-${variant}"
                 placeholder="you@somewhere" required autocomplete="email"
                 style="width:100%;border:none;border-bottom:1px solid var(--rule);background:transparent;padding:0.4rem 0 0.6rem;font-size:1.125rem;font-family:var(--font-body);outline:none;color:var(--foreground);border-radius:0;"
                 onfocus="this.style.borderBottomColor='var(--foreground)'"
                 onblur="this.style.borderBottomColor='var(--rule)'" />
        </div>
        <button class="label" type="submit"
                style="align-self:flex-start;border:1px solid var(--foreground);background:transparent;padding:0.65rem 1.4rem;color:var(--foreground);cursor:pointer;transition:all 0.15s ease;margin-top:0.5rem;font-size:0.6875rem;letter-spacing:0.16em;text-transform:uppercase;border-radius:0;"
                onmouseover="this.style.borderColor='var(--accent)';this.style.color='var(--accent)';"
                onmouseout="this.style.borderColor='var(--foreground)';this.style.color='var(--foreground)';">
          PUT ME ON THE LIST
        </button>
      </form>
      <p class="font-hand" id="nl-confirm-${variant}" style="display:none;margin-top:1.5rem;font-size:1.5rem;font-family:var(--font-hand);color:var(--foreground);"></p>
    </section>`;

  const form    = container.querySelector(`#nl-form-${variant}`);
  const confirm = container.querySelector(`#nl-confirm-${variant}`);
  const input   = container.querySelector(`#nl-email-${variant}`);
  const btn     = container.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = input.value.trim();
    if (!email || !email.includes('@')) {
      input.style.borderBottomColor = 'var(--destructive)';
      input.focus();
      return;
    }

    // Loading state
    btn.textContent = 'Sending…';
    btn.disabled = true;
    input.style.borderBottomColor = 'var(--foreground)';

    try {
      let already = false;
      try {
        const res = await fetch('/api/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        if (res.ok) {
          const data = await res.json();
          already = !!data.already;
        }
      } catch (_) {
        // Fallback for static dev environments
      }

      addSubscriber(email);
      form.style.display = 'none';
      confirm.textContent = already
        ? "You're already on the list. Nothing more to do."
        : "Done. You'll hear from me only when there's something to hear.";
      confirm.style.display = 'block';
    } catch {
      btn.textContent = 'Put me on the list';
      btn.disabled = false;
      confirm.textContent = 'That didn\'t go through. Try again.';
      confirm.style.display = 'block';
    }
  });
}
