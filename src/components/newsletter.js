export function renderNewsletter(container, { variant = 'entry' } = {}) {
  const copy = variant === 'home'
    ? 'Notes, essays, and play updates — straight to your inbox. No spam, ever.'
    : 'If this landed, there\'s more. Notes, dispatches, and the occasional announcement — straight to your inbox.';

  container.innerHTML = `
    <div class="newsletter">
      <div class="newsletter__label">The Villager's Notes</div>
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
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (data.ok) {
        form.style.display = 'none';
        confirm.textContent = data.already
          ? 'You\'re already on the list — look out for the next note.'
          : 'You\'re in. Thank you — watch your inbox.';
        confirm.classList.add('shown');
      } else {
        throw new Error('failed');
      }
    } catch {
      btn.textContent = 'Subscribe';
      btn.disabled = false;
      confirm.textContent = 'Something went wrong. Try again or email hello@vicMunala.com.';
      confirm.classList.add('shown');
    }
  });
}
