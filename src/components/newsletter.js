import { addSubscriber } from '../pages/admin.js';

export function renderNewsletter(container, { variant = 'entry' } = {}) {
  const label = variant === 'entries'
    ? 'sign up for random good things'
    : "The Villager's Notes";

  const copy = variant === 'entries'
    ? 'Notes, essays, and random dispatches — straight to your inbox.'
    : variant === 'home'
    ? 'Notes, essays, and play updates — straight to your inbox. No spam, ever.'
    : 'If this landed, there\'s more. Notes, dispatches, and the occasional announcement — straight to your inbox.';

  container.innerHTML = `
    <div class="newsletter">
      <div class="newsletter__label">${label}</div>
      <p class="newsletter__text">${copy}</p>
      <form class="newsletter__form" id="nl-form-${variant}" novalidate>
        <input class="newsletter__input" type="email" id="nl-email-${variant}"
               placeholder="your@email.com" required autocomplete="email" />
        <button class="newsletter__btn" type="submit">Subscribe</button>
      </form>
      <p class="newsletter__confirm" id="nl-confirm-${variant}"></p>
    </div>`;

  const form    = container.querySelector(`#nl-form-${variant}`);
  const confirm = container.querySelector(`#nl-confirm-${variant}`);
  const input   = container.querySelector(`#nl-email-${variant}`);
  const btn     = container.querySelector('.newsletter__btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = input.value.trim();
    if (!email || !email.includes('@')) {
      input.style.borderColor = 'hsl(0 60% 60%)';
      input.focus();
      return;
    }

    // Loading state
    btn.textContent = 'Subscribing…';
    btn.disabled = true;
    input.style.borderColor = '';

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
        ? 'You\'re already on the list — look out for the next note.'
        : 'You\'re in. Thank you — watch your inbox.';
      confirm.classList.add('shown');
    } catch {
      btn.textContent = 'Subscribe';
      btn.disabled = false;
      confirm.textContent = 'Something went wrong. Try again or email vikmunala@gmail.com.';
      confirm.classList.add('shown');
    }
  });
}
