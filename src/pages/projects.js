import { renderSodaTip } from '../components/soda-tip.js';
import { renderContact } from '../components/contact.js';
import { footerHTML } from '../components/footer.js';
import { addOrder } from './admin.js';

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
    images: ['/images/utmt-1.jpg', '/images/utmt-2.jpg'],
    type: 'novel',
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
    type: 'play',
    price: 1000,
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

            ${p.type === 'novel' ? `
              <div class="project-cta-row">
                <a href="${p.cta.href}" ${p.cta.isExternal ? 'target="_blank" rel="noopener"' : ''}
                   class="btn--sharp">
                  ${p.cta.label}
                </a>
              </div>
            ` : `
              <div class="project-cta-row">
                <button class="btn--sharp" id="toggle-trailer-btn" aria-expanded="false">
                  WATCH THE TRAILER →
                </button>
                <button class="btn--sharp-terracotta" id="toggle-play-pay-btn" aria-expanded="false">
                  WATCH THE PLAY — KES 1,000 →
                </button>
              </div>

              <!-- Play Payment Box -->
              <div class="play-pay-box" id="play-pay-box" style="display:none;">
                <p class="play-pay-desc">
                  A recording of the full 77 minutes. KES 1,000 gets you a private link, sent once, to your email.
                </p>
                <div class="form-group">
                  <label class="form-label-underlined" for="play-mpesa-phone">M-Pesa Number</label>
                  <input type="tel" id="play-mpesa-phone" class="form-input-underlined" placeholder="07XX XXX XXX" maxlength="12" />
                </div>
                <div class="form-group">
                  <label class="form-label-underlined" for="play-email">Email For The Link</label>
                  <input type="email" id="play-email" class="form-input-underlined" placeholder="you@somewhere" />
                </div>
                <button class="btn--sharp" id="pay-play-btn" style="margin-top:var(--space-2);">
                  PAY KES 1,000
                </button>
                <div class="stk-status" id="play-stk-status"></div>
              </div>

              <!-- Trailer Placeholder Box -->
              <div class="trailer-placeholder-box" id="trailer-box" style="display:none;">
                <p>The trailer isn't up yet. Send me the YouTube or Vimeo link and it plays right here.</p>
              </div>
            `}
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

  // Wire Play Trailer Toggle
  const trailerBtn = app.querySelector('#toggle-trailer-btn');
  const trailerBox = app.querySelector('#trailer-box');
  if (trailerBtn && trailerBox) {
    trailerBtn.addEventListener('click', () => {
      const isHidden = trailerBox.style.display === 'none';
      trailerBox.style.display = isHidden ? 'block' : 'none';
      trailerBtn.setAttribute('aria-expanded', String(isHidden));
      trailerBtn.textContent = isHidden ? 'HIDE THE TRAILER ↑' : 'WATCH THE TRAILER →';
    });
  }

  // Wire Play Payment Toggle
  const playPayBtn = app.querySelector('#toggle-play-pay-btn');
  const playPayBox = app.querySelector('#play-pay-box');
  if (playPayBtn && playPayBox) {
    playPayBtn.addEventListener('click', () => {
      const isHidden = playPayBox.style.display === 'none';
      playPayBox.style.display = isHidden ? 'block' : 'none';
      playPayBtn.setAttribute('aria-expanded', String(isHidden));
      if (isHidden) {
        playPayBtn.textContent = 'CLOSE ↑';
        playPayBtn.className = 'btn--sharp-close';
      } else {
        playPayBtn.textContent = 'WATCH THE PLAY — KES 1,000 →';
        playPayBtn.className = 'btn--sharp-terracotta';
      }
    });
  }

  // Wire Play Payment Action
  const payBtn = app.querySelector('#pay-play-btn');
  if (payBtn) {
    payBtn.addEventListener('click', handlePlayStkPush);
  }

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

async function handlePlayStkPush() {
  const phoneInput = document.getElementById('play-mpesa-phone');
  const emailInput = document.getElementById('play-email');
  const status     = document.getElementById('play-stk-status');
  const btn        = document.getElementById('pay-play-btn');

  if (!phoneInput || !emailInput || !status || !btn) return;

  const phone = phoneInput.value.trim().replace(/\s/g, '');
  const email = emailInput.value.trim();

  if (!phone || !email) {
    setPlayStatus(status, 'error', 'Please fill in both your phone number and email.');
    return;
  }
  if (!email.includes('@') || !email.includes('.')) {
    setPlayStatus(status, 'error', 'Please enter a valid email address.');
    return;
  }
  const cleaned = cleanPhone(phone);
  if (!cleaned) {
    setPlayStatus(status, 'error', 'Enter a valid Kenyan phone number (e.g. 0712345678).');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Sending prompt…';
  setPlayStatus(status, 'pending', '📲 Check your phone — an M-Pesa prompt has been sent. Enter your PIN to complete.');

  // Track order in admin
  addOrder({
    name: `Play Recording: ${email}`,
    phone: cleaned,
    address: `Private Link Email: ${email}`,
    amount: 1000,
    signed: false,
  });

  try {
    const res = await fetch('/api/stk-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: cleaned, name: `Play - ${email}`, address: email, amount: 1000 }),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'STK push failed');
    pollPlayStkStatus(data.CheckoutRequestID, status, btn);
  } catch (err) {
    setPlayStatus(status, 'error', `${err.message}. Try again or WhatsApp Vic directly.`);
    btn.disabled = false;
    btn.textContent = 'PAY KES 1,000';
  }
}

async function pollPlayStkStatus(checkoutRequestID, statusEl, btn) {
  let attempts = 0;
  const max = 10;
  const interval = setInterval(async () => {
    attempts++;
    try {
      const res  = await fetch('/api/stk-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ CheckoutRequestID: checkoutRequestID }),
      });
      const data = await res.json();
      if (data.ResultCode === '0') {
        clearInterval(interval);
        setPlayStatus(statusEl, 'success', '✅ Payment received! The private viewing link has been sent to your email. Thank you!');
        btn.textContent = 'Link Sent ✓';
      } else if (data.ResultCode && data.ResultCode !== '1032') {
        clearInterval(interval);
        setPlayStatus(statusEl, 'error', `Payment declined: ${data.ResultDesc || 'Unknown error'}. Please try again.`);
        btn.disabled = false;
        btn.textContent = 'PAY KES 1,000';
      }
    } catch (_) {}
    if (attempts >= max) {
      clearInterval(interval);
      setPlayStatus(statusEl, 'error', 'Payment not confirmed yet. If you entered your PIN, check your M-Pesa messages or contact Vic directly.');
      btn.disabled = false;
      btn.textContent = 'PAY KES 1,000';
    }
  }, 3000);
}

function cleanPhone(raw) {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('254') && digits.length === 12) return digits;
  if ((digits.startsWith('07') || digits.startsWith('01')) && digits.length === 10) return '254' + digits.slice(1);
  return null;
}

function setPlayStatus(el, type, msg) {
  if (!el) return;
  el.className = `stk-status ${type}`;
  el.textContent = msg;
}
