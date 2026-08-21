export function renderContact(container) {
  container.innerHTML = `
    <section class="contact-section">
      <div class="contact-grid">
        <div class="contact-info">
          <h2>Write to me</h2>
          <p>Working together, feedback, a meet, anything at all.</p>
        </div>
        <form class="contact-form" id="write-to-me-form">
          <div class="form-group">
            <label for="contact-email">YOUR EMAIL</label>
            <input type="email" id="contact-email" placeholder="you@somewhere" required />
          </div>
          <div class="form-group">
            <label for="contact-msg">MESSAGE</label>
            <textarea id="contact-msg" rows="4" required></textarea>
          </div>
          <button type="submit" class="btn--sharp" id="contact-submit">SEND IT</button>
          <p id="contact-status" style="display:none;font-size:0.8rem;margin-top:10px;color:hsl(140,50%,30%);"></p>
        </form>
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
        status.style.display = 'block';
        status.textContent = '✓ Opening email client... Thank you!';
      }
    });
  }
}
