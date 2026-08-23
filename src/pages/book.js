import { renderSodaTip } from '../components/soda-tip.js';
import { getBookData, addOrder } from './admin.js';
import { footerHTML } from '../components/footer.js';

const BOOK_DEFAULT = {
  title:       'Under the Mango Tree',
  subtitle:    'A novel by Vic Munala',
  description: 'A novel about losing yourself and trying to find your way back home.',
  price:       1500,
  currency:    'KES',
};

// Chapter 1 excerpt — replace body text here when ready
// Leave EXCERPT_TEXT blank ('') to hide the section entirely
const EXCERPT_TEXT = ``;

function getCurrentBook() {
  const saved = getBookData();
  return {
    title:       BOOK_DEFAULT.title,
    subtitle:    BOOK_DEFAULT.subtitle,
    description: saved?.description ?? BOOK_DEFAULT.description,
    price:       saved?.price       ?? BOOK_DEFAULT.price,
    currency:    BOOK_DEFAULT.currency,
  };
}

export function renderBook(app) {
  const book = getCurrentBook();
  const saved = getBookData();
  const excerpt = saved?.excerpt ?? EXCERPT_TEXT;
  const hasExcerpt = excerpt.trim().length > 0;

  app.innerHTML = `
    <section class="book-page">
      <div class="container">

        <!-- Full-width page header -->
        <div class="book-hero">
          <p class="eyebrow">Novel · 2024</p>
          <h1 class="book-hero__title">${book.title}</h1>
          <p class="book-hero__desc">${book.description}</p>
        </div>

        <div class="book-page__inner">

          <!-- Book cover (sticky on desktop) -->
          <style>.book-cover-sticky{position:static}@media(min-width:700px){.book-cover-sticky{position:sticky;top:88px;align-self:start}}</style>
          <div class="book-cover-sticky">
            <img src="/images/utmt-1.jpg" alt="Under the Mango Tree by Vic Munala"
              style="width:100%;max-width:340px;box-shadow:12px 12px 40px hsl(30 10% 12% / 0.12);display:block;margin:0 auto;" />
          </div>

          <!-- Order form (clean, no card) -->
          <div class="book-info">

            ${hasExcerpt ? `
              <div style="margin-bottom:var(--space-8);padding-bottom:var(--space-8);border-bottom:1px solid var(--border);">
                <p style="font-size:0.68rem;font-weight:600;letter-spacing:0.1em;
                           text-transform:uppercase;color:var(--text-muted);margin-bottom:var(--space-4);">
                  Read — Chapter One
                </p>
                <div id="excerpt-body" style="font-size:0.95rem;line-height:1.85;color:var(--text);max-height:180px;overflow:hidden;position:relative;">
                  ${excerpt.split('\n\n').map(p => `<p style="margin-bottom:var(--space-4);">${p}</p>`).join('')}
                  <div style="position:absolute;bottom:0;left:0;right:0;height:80px;background:linear-gradient(transparent,var(--bg));"></div>
                </div>
                <button id="excerpt-toggle"
                  style="margin-top:var(--space-3);font-size:0.8rem;font-weight:600;
                         letter-spacing:0.08em;text-transform:uppercase;color:var(--accent);
                         background:none;border:none;cursor:pointer;padding:0;">
                  Read more ↓
                </button>
              </div>
            ` : ''}

              <div class="book-price-row">
                <span class="book-price-amount">KES ${book.price.toLocaleString()}</span>
              </div>

              <div class="form-group">
                <label class="form-label-underlined" for="buyer-name">Full Name</label>
                <input class="form-input-underlined" type="text" id="buyer-name" placeholder="Jane Mwangi" />
              </div>

              <div class="form-group">
                <label class="form-label-underlined" for="buyer-phone">M-Pesa Number</label>
                <input class="form-input-underlined" type="tel" id="buyer-phone" placeholder="07XX XXX XXX" maxlength="12" />
                <p class="form-hint-inline">You'll receive an STK push prompt on this number.</p>
              </div>

              <div class="form-group">
                <label class="form-label-underlined" for="delivery-address">Delivery Address</label>
                <input class="form-input-underlined" type="text" id="delivery-address" placeholder="e.g. Westlands, Nairobi" />
              </div>

              <!-- Signed copy checkbox -->
              <div class="form-group book-signed-row">
                <input type="checkbox" id="signed-copy" checked
                  style="width:16px;height:16px;accent-color:var(--text);flex-shrink:0;margin-top:2px;" />
                <label for="signed-copy" style="font-size:0.88rem;color:var(--text);line-height:1.5;cursor:pointer;">
                  <strong>Request a signed copy</strong>
                  <span style="display:block;color:var(--text-muted);font-size:0.8rem;">
                    Signed by Vic Munala — free, no extra cost
                  </span>
                </label>
              </div>

              <button class="btn--sharp book-pay-btn" id="pay-btn">
                PAY KES ${book.price.toLocaleString()} →
              </button>

              <div class="stk-status" id="stk-status"></div>

            </div>
          </div>
        </div>

        <!-- Buy me soda madiaba inside container -->
        <div id="soda-container"></div>

      </div>
    </section>
  `;

  // Soda tip below
  const sodaEl = app.querySelector('#soda-container');
  if (sodaEl) renderSodaTip(sodaEl);

  // Footer on every page
  app.insertAdjacentHTML('beforeend', footerHTML());

  // Excerpt expand toggle
  if (hasExcerpt) {
    const toggle = document.getElementById('excerpt-toggle');
    const body   = document.getElementById('excerpt-body');
    let expanded = false;
    toggle?.addEventListener('click', () => {
      expanded = !expanded;
      body.style.maxHeight   = expanded ? 'none' : '180px';
      body.querySelector('div').style.display = expanded ? 'none' : 'block';
      toggle.textContent     = expanded ? 'Show less ↑' : 'Read more ↓';
    });
  }

  // Wire up STK push
  document.getElementById('pay-btn')?.addEventListener('click', handleStkPush);
}


async function handleStkPush() {
  const currentBook  = getCurrentBook();
  const nameInput    = document.getElementById('buyer-name');
  const phoneInput   = document.getElementById('buyer-phone');
  const addressInput = document.getElementById('delivery-address');
  const signedInput  = document.getElementById('signed-copy');
  const status       = document.getElementById('stk-status');
  const btn          = document.getElementById('pay-btn');

  if (!nameInput || !phoneInput || !addressInput || !status || !btn) return;

  const name    = nameInput.value.trim();
  const phone   = phoneInput.value.trim().replace(/\s/g, '');
  const address = addressInput.value.trim();
  const signed  = signedInput?.checked ?? true;

  if (!name || !phone || !address) {
    setStatus(status, 'error', 'Please fill in all fields.');
    return;
  }
  const cleaned = cleanPhone(phone);
  if (!cleaned) {
    setStatus(status, 'error', 'Enter a valid Kenyan phone number (e.g. 0712345678).');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Sending prompt…';
  setStatus(status, 'pending', '📲 Check your phone — an M-Pesa prompt has been sent. Enter your PIN to complete.');

  // Track order in admin
  addOrder({ name, phone: cleaned, address, amount: currentBook.price, signed });

  try {
    const res = await fetch('/api/stk-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: cleaned,
        name,
        address,
        amount: currentBook.price,
        narrative: `Book: Under the Mango Tree - ${name}`,
      }),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'STK push failed');
    pollStkStatus(data.invoice_id || data.CheckoutRequestID, status, btn);
  } catch (err) {
    // Try client-side IntaSend inline SDK if API endpoint failed (e.g. static dev)
    if (typeof window !== 'undefined' && window.IntaSend) {
      try {
        const is = new window.IntaSend({
          public_key: 'ISPubKey_live_7a3054ea-0add-41ba-a643-46933dff26f3',
          live: true,
        });
        is.run({
          amount: currentBook.price,
          currency: 'KES',
          phone_number: cleaned,
          email: 'vikmunala@gmail.com',
          first_name: name.split(' ')[0] || 'Reader',
          last_name: name.split(' ').slice(1).join(' ') || 'Customer',
          api_ref: `BOOK_${Date.now()}`,
          comment: `Book order - ${name}`,
        })
        .on('IN-PROGRESS', () => {
          setStatus(status, 'pending', '📲 M-Pesa prompt sent. Enter your PIN on your phone.');
        })
        .on('COMPLETE', () => {
          setStatus(status, 'success', '✅ Payment received! Your signed copy will be delivered within 3–5 business days. Thank you!');
          btn.textContent = 'Order Placed ✓';
        })
        .on('FAILED', () => {
          setStatus(status, 'error', 'Payment declined or cancelled. Please try again.');
          btn.disabled = false;
          btn.textContent = `Pay KES ${currentBook.price.toLocaleString()} via M-Pesa`;
        });
        return;
      } catch (_) {}
    }

    setStatus(status, 'error', `${err.message || 'Could not initiate STK push'}. Please try again.`);
    btn.disabled = false;
    btn.textContent = `Pay KES ${currentBook.price.toLocaleString()} via M-Pesa`;
  }
}

async function pollStkStatus(checkoutRequestID, statusEl, btn) {
  const currentBook = getCurrentBook();
  let attempts = 0;
  const max = 15;
  const interval = setInterval(async () => {
    attempts++;
    try {
      const res  = await fetch('/api/stk-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_id: checkoutRequestID, CheckoutRequestID: checkoutRequestID }),
      });
      const data = await res.json();
      if (data.ResultCode === '0' || data.state === 'COMPLETE' || data.state === 'SUCCESSFUL') {
        clearInterval(interval);
        setStatus(statusEl, 'success', '✅ Payment received! Your signed copy will be delivered within 3–5 business days. Thank you!');
        btn.textContent = 'Order Placed ✓';
      } else if (data.ResultCode === '1' || data.state === 'FAILED' || data.state === 'CANCELLED') {
        clearInterval(interval);
        setStatus(statusEl, 'error', `Payment declined: ${data.ResultDesc || 'Unknown error'}. Please try again.`);
        btn.disabled = false;
        btn.textContent = `Pay KES ${currentBook.price.toLocaleString()} via M-Pesa`;
      }
    } catch (_) {}
    if (attempts >= max) {
      clearInterval(interval);
      setStatus(statusEl, 'error', 'Payment confirmation in progress. If you entered your PIN, you will receive an SMS and your order is recorded.');
      btn.disabled = false;
      btn.textContent = `Pay KES ${currentBook.price.toLocaleString()} via M-Pesa`;
    }
  }, 3000);
}

function cleanPhone(raw) {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('254') && digits.length === 12) return digits;
  if ((digits.startsWith('07') || digits.startsWith('01')) && digits.length === 10) return '254' + digits.slice(1);
  return null;
}

function setStatus(el, type, msg) {
  if (!el) return;
  el.className = `stk-status ${type}`;
  el.textContent = msg;
}
