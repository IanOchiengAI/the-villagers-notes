import { renderSodaTip } from '../components/soda-tip.js';
import { renderContact } from '../components/contact.js';
import { footerHTML } from '../components/footer.js';
import { addOrder, getBookData } from './admin.js';
import { incrementCounter, getCounters } from '../lib/supabase.js';

const PROJECTS = [
  {
    id: '01',
    num: '01',
    category: 'NOVEL',
    year: '',
    metaDetails: ['PUBLISHED 2024', 'PAPERBACK', 'KES 1500'],
    title: 'under the Mango Tree',
    synopsis: 'A novel about losing yourself and trying to find your way back home.',
    synopsisFull: `One minute, Esibanda is running as fast as he can because the teacher on duty will work a number on his buttocks because of lateness. The next minute, he is running away, and hiding from his landlord because the rent is due, the rent is always due, and he doesn't have the money.\n\nAfter the simplicity of life in the village with his two friends, Omulindi and Dennis, navigating school, play and mischief, he finds himself on the streets of Nairobi, with its complexities, where he stumbles on a dream, a dream he did not know he had because where he came from dreams like that were not within reach.\n\nDespite the title, no one in the story eats a mango. Neither does a mango fall on anyone's head. Disappointing as that may be, the narrative does well to compensate for that by bringing you into the full range of the human experience, dancing around themes of losing yourself and trying to find your way home. It takes you on a journey about childhood friendship, becoming a man and fatherhood, or lack thereof.`,
    images: ['/images/utmt-1.jpg', '/images/utmt-2.jpg'],
    type: 'novel',
  },
  {
    id: '02',
    num: '02',
    category: 'PLAY',
    year: '',
    metaDetails: ['77 MINUTES', 'STAGE PLAY', 'TWO-HANDER'],
    title: 'Beneath the Surface',
    synopsis: 'A married couple\'s evening unfolds over dinner. The wife demands presence; the husband asks for endurance. With each word uttered, neither realises that the other is afraid of losing the marriage by speaking the truth. You are a fly on the wall listening in on their conversation.',
    images: ['/images/play-scene-2.png', '/images/play-scene-1.png'],
    type: 'play',
    price: 1000,
  },
];

export async function renderProjects(app) {
  const savedBook = getBookData();
  const bookPrice = savedBook?.price ?? 1500;

  // Fire page-view counter (once per browser session)
  incrementCounter('play_views');

  // Fetch current stats from Supabase
  const stats = await getCounters(['play_views', 'trailer_clicks', 'play_watch_clicks']);
  const playViews     = stats.play_views ?? 0;
  const trailerClicks = stats.trailer_clicks ?? 0;
  const watchClicks   = stats.play_watch_clicks ?? 0;
  const fmt = n => Number(n).toLocaleString('en-KE');

  app.innerHTML = `
    <section class="projects-hero">
      <div class="container" style="border-bottom:1px solid var(--rule);padding-bottom:1.5rem;">
        <h1>Projects</h1>
      </div>
    </section>

    <div class="container">
      ${PROJECTS.map(p => `
        <div class="project-row" id="project-${p.id}">
          <!-- Left metadata column -->
          <div class="project-meta-col">
            <div class="proj-num">${p.num}</div>
            <div class="proj-cat">${p.category}</div>
            ${p.year ? `<div>${p.year}</div>` : ''}
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

            ${p.type === 'novel' ? `
              <div class="project-cta-row" style="display:flex;align-items:center;gap:1.25rem;margin-top:1.5rem;flex-wrap:wrap;">
                ${p.synopsisFull ? `
                  <button class="synopsis-toggle label" data-target="synopsis-full-${p.id}" aria-expanded="false" style="color:var(--accent);cursor:pointer;background:none;border:none;padding:0;letter-spacing:0.16em;transition:opacity 0.15s ease;">
                    READ MORE →
                  </button>
                ` : ''}
                <button class="btn--sharp" id="toggle-book-inline-btn" aria-expanded="false">
                  GET A COPY — KES ${bookPrice.toLocaleString()} →
                </button>
              </div>

              ${p.synopsisFull ? `
                <div class="synopsis-full" id="synopsis-full-${p.id}" aria-hidden="true" style="margin-top:1.5rem;max-width:62ch;">
                  ${p.synopsisFull.split('\n\n').map(para => `<p style="margin-top:1.15rem;font-family:var(--font-body);font-size:1.0625rem;line-height:1.7;color:var(--foreground);">${para}</p>`).join('')}
                </div>
              ` : ''}

              <!-- Inline Book Order Accordion -->
              <div class="play-pay-box" id="book-inline-box" style="display:none;margin-top:1.75rem;">
                <div style="display:flex;align-items:baseline;justify-content:space-between;gap:1rem;margin-bottom:1.25rem;">
                  <h3 style="font-family:var(--font-hand);font-size:1.65rem;margin:0;font-weight:400;">Order Under the Mango Tree</h3>
                  <span class="label" style="color:var(--accent);font-size:0.8rem;font-weight:600;">KES ${bookPrice.toLocaleString()}</span>
                </div>
                <div class="form-group">
                  <label class="form-label-underlined" for="inline-buyer-name">Full Name</label>
                  <input type="text" id="inline-buyer-name" class="form-input-underlined" placeholder="Jane Mwangi" />
                </div>
                <div class="form-group">
                  <label class="form-label-underlined" for="inline-buyer-phone">M-Pesa Number</label>
                  <input type="tel" id="inline-buyer-phone" class="form-input-underlined" placeholder="07XX XXX XXX" maxlength="12" />
                  <p class="form-hint-inline">You will receive an STK push prompt on this phone.</p>
                </div>
                <div class="form-group">
                  <label class="form-label-underlined" for="inline-delivery-address">Delivery Address</label>
                  <input type="text" id="inline-delivery-address" class="form-input-underlined" placeholder="e.g. Westlands, Nairobi" />
                </div>
                <div class="form-group book-signed-row" style="margin-top:0.75rem;">
                  <input type="checkbox" id="inline-signed-copy" checked style="width:16px;height:16px;accent-color:var(--foreground);flex-shrink:0;margin-top:2px;" />
                  <label for="inline-signed-copy" style="font-size:0.85rem;color:var(--foreground);line-height:1.4;cursor:pointer;">
                    <strong>Request a signed copy</strong>
                    <span style="display:block;color:var(--muted-foreground);font-size:0.78rem;">Signed by Vic Munala — free, no extra charge</span>
                  </label>
                </div>
                <button class="btn--sharp" id="pay-book-inline-btn" style="margin-top:var(--space-3);">
                  PAY KES ${bookPrice.toLocaleString()} VIA M-PESA
                </button>
                <div class="stk-status" id="book-inline-stk-status"></div>
              </div>
            ` : `
              <!-- Play Stats Bar — live from Supabase -->
              <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(110px, 1fr));gap:1rem;margin:1.5rem 0;padding:1rem 0;border-top:1px solid var(--rule);border-bottom:1px solid var(--rule);">
                <div>
                  <div class="label" style="font-size:0.6rem;color:var(--muted-foreground);">PAGE VIEWS</div>
                  <div style="font-family:var(--font-mono);font-size:0.875rem;font-weight:500;margin-top:0.2rem;">${fmt(playViews)}</div>
                </div>
                <div>
                  <div class="label" style="font-size:0.6rem;color:var(--muted-foreground);">TRAILER PLAYS</div>
                  <div style="font-family:var(--font-mono);font-size:0.875rem;font-weight:500;margin-top:0.2rem;">${fmt(trailerClicks)}</div>
                </div>
                <div>
                  <div class="label" style="font-size:0.6rem;color:var(--muted-foreground);">DURATION</div>
                  <div style="font-family:var(--font-mono);font-size:0.875rem;font-weight:500;margin-top:0.2rem;">77 MINS</div>
                </div>
                <div>
                  <div class="label" style="font-size:0.6rem;color:var(--muted-foreground);">STREAMS SOLD</div>
                  <div style="font-family:var(--font-mono);font-size:0.875rem;font-weight:500;margin-top:0.2rem;">${fmt(watchClicks)}</div>
                </div>
              </div>

              <div class="project-cta-row">
                <button class="btn--sharp" id="toggle-trailer-btn" aria-expanded="false">
                  WATCH THE TRAILER →
                </button>
                <button class="btn--sharp" id="toggle-play-pay-btn" aria-expanded="false">
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
      <div id="soda-container" style="border-top:1px solid var(--rule);"></div>

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
      if (panel) {
        panel.setAttribute('aria-hidden', String(open));
        panel.classList.toggle('is-open', !open);
      }
      btn.textContent = open ? 'READ MORE →' : 'READ LESS ↑';
    });
  });

  // Wire Inline Book Order Toggle
  const bookOrderBtn = app.querySelector('#toggle-book-inline-btn');
  const bookInlineBox = app.querySelector('#book-inline-box');
  if (bookOrderBtn && bookInlineBox) {
    bookOrderBtn.addEventListener('click', () => {
      const isHidden = bookInlineBox.style.display === 'none';
      bookInlineBox.style.display = isHidden ? 'block' : 'none';
      bookOrderBtn.setAttribute('aria-expanded', String(isHidden));
      if (isHidden) {
        bookOrderBtn.textContent = 'CLOSE ORDER FORM ↑';
        bookOrderBtn.className = 'btn--sharp-close';
      } else {
        bookOrderBtn.textContent = `GET A COPY — KES ${bookPrice.toLocaleString()} →`;
        bookOrderBtn.className = 'btn--sharp';
      }
    });
  }

  // Wire Inline Book Payment Action
  const payBookBtn = app.querySelector('#pay-book-inline-btn');
  if (payBookBtn) {
    payBookBtn.addEventListener('click', () => handleBookInlineStkPush(bookPrice));
  }

  // Wire Play Trailer Toggle
  const trailerBtn = app.querySelector('#toggle-trailer-btn');
  const trailerBox = app.querySelector('#trailer-box');
  if (trailerBtn && trailerBox) {
    trailerBtn.addEventListener('click', () => {
      incrementCounter('trailer_clicks', false);
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
      incrementCounter('play_watch_clicks', false);
      const isHidden = playPayBox.style.display === 'none';
      playPayBox.style.display = isHidden ? 'block' : 'none';
      playPayBtn.setAttribute('aria-expanded', String(isHidden));
      if (isHidden) {
        playPayBtn.textContent = 'CLOSE ↑';
        playPayBtn.className = 'btn--sharp-close';
      } else {
        playPayBtn.textContent = 'WATCH THE PLAY — KES 1,000 →';
        playPayBtn.className = 'btn--sharp';
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

async function handleBookInlineStkPush(price) {
  const nameInput    = document.getElementById('inline-buyer-name');
  const phoneInput   = document.getElementById('inline-buyer-phone');
  const addressInput = document.getElementById('inline-delivery-address');
  const signedInput  = document.getElementById('inline-signed-copy');
  const status       = document.getElementById('book-inline-stk-status');
  const btn          = document.getElementById('pay-book-inline-btn');

  if (!nameInput || !phoneInput || !addressInput || !status || !btn) return;

  const name    = nameInput.value.trim();
  const phone   = phoneInput.value.trim().replace(/\s/g, '');
  const address = addressInput.value.trim();
  const signed  = signedInput?.checked ?? true;

  if (!name || !phone || !address) {
    setProjectStatus(status, 'error', 'Please fill in your name, phone number, and delivery address.');
    return;
  }
  const cleaned = cleanPhone(phone);
  if (!cleaned) {
    setProjectStatus(status, 'error', 'Enter a valid Kenyan phone number (e.g. 0712345678).');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Sending prompt…';
  setProjectStatus(status, 'pending', '📲 Check your phone — an M-Pesa prompt has been sent. Enter your PIN to complete.');

  // Track order in admin
  addOrder({ name, phone: cleaned, address, amount: price, signed });

  try {
    const res = await fetch('/api/stk-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: cleaned,
        name,
        address,
        amount: price,
        narrative: `Book: Under the Mango Tree - ${name}`,
      }),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'STK push failed');

    const invoiceId = data.invoice_id || data.CheckoutRequestID;
    pollBookInlineStkStatus(invoiceId, price, status, btn);
  } catch (err) {
    setProjectStatus(status, 'error', `${err.message || 'Could not initiate STK push'}. Please try again.`);
    btn.disabled = false;
    btn.textContent = `PAY KES ${price.toLocaleString()} VIA M-PESA`;
  }
}

async function pollBookInlineStkStatus(invoiceId, price, statusEl, btn) {
  let attempts = 0;
  const max = 15;
  const interval = setInterval(async () => {
    attempts++;
    try {
      const res = await fetch('/api/stk-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_id: invoiceId, CheckoutRequestID: invoiceId }),
      });
      const data = await res.json();
      if (data.ResultCode === '0' || data.state === 'COMPLETE' || data.state === 'SUCCESSFUL') {
        clearInterval(interval);
        setProjectStatus(statusEl, 'success', '✅ Payment received! Your copy will be dispatched shortly. Thank you!');
        btn.textContent = 'Order Confirmed ✓';
      } else if (data.ResultCode === '1' || data.state === 'FAILED' || data.state === 'CANCELLED') {
        clearInterval(interval);
        setProjectStatus(statusEl, 'error', `Payment declined: ${data.ResultDesc || 'Declined'}. Please try again.`);
        btn.disabled = false;
        btn.textContent = `PAY KES ${price.toLocaleString()} VIA M-PESA`;
      }
    } catch (_) {}

    if (attempts >= max) {
      clearInterval(interval);
      setProjectStatus(statusEl, 'error', 'Payment confirmation in progress. If you entered your PIN, your order is recorded and confirmed.');
      btn.disabled = false;
      btn.textContent = `PAY KES ${price.toLocaleString()} VIA M-PESA`;
    }
  }, 3000);
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
    setProjectStatus(status, 'error', 'Please fill in both your phone number and email.');
    return;
  }
  if (!email.includes('@') || !email.includes('.')) {
    setProjectStatus(status, 'error', 'Please enter a valid email address.');
    return;
  }
  const cleaned = cleanPhone(phone);
  if (!cleaned) {
    setProjectStatus(status, 'error', 'Enter a valid Kenyan phone number (e.g. 0712345678).');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Sending prompt…';
  setProjectStatus(status, 'pending', '📲 Check your phone — an M-Pesa prompt has been sent. Enter your PIN to complete.');

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
    setProjectStatus(status, 'error', `${err.message || 'Could not initiate payment'}. Please try again.`);
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
        setProjectStatus(statusEl, 'success', '✅ Payment received! The private viewing link has been sent to your email. Thank you!');
        btn.textContent = 'Link Sent ✓';
      } else if (data.ResultCode && data.ResultCode !== '1032') {
        clearInterval(interval);
        setProjectStatus(statusEl, 'error', `Payment declined: ${data.ResultDesc || 'Unknown error'}. Please try again.`);
        btn.disabled = false;
        btn.textContent = 'PAY KES 1,000';
      }
    } catch (_) {}
    if (attempts >= max) {
      clearInterval(interval);
      setProjectStatus(statusEl, 'error', 'Payment not confirmed yet. If you entered your PIN, check your M-Pesa messages or contact Vic directly.');
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

function setProjectStatus(el, type, msg) {
  if (!el) return;
  el.className = `stk-status ${type}`;
  el.textContent = msg;
}

