import { renderSodaTip } from '../components/soda-tip.js';
import { cleanPhone, pollInvoice } from '../lib/pay.js';
import { postJson } from '../lib/net.js';
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
  return { ...BOOK_DEFAULT };
}

export function renderBook(app) {
  const book = getCurrentBook();
  const excerpt = EXCERPT_TEXT;
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
  const address = addressInput.value.trim();
  const signed  = signedInput?.checked ?? true;
  const label   = `PAY KES ${currentBook.price.toLocaleString()} →`;

  if (!name || !phoneInput.value.trim() || !address) {
    setStatus(status, 'error', 'Please fill in all fields.');
    return;
  }
  const cleaned = cleanPhone(phoneInput.value);
  if (!cleaned) {
    setStatus(status, 'error', 'Enter a valid Kenyan phone number (e.g. 0712345678).');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Sending prompt…';
  setStatus(status, 'pending', 'Sending the payment prompt…');

  // The server saves the order (name, phone, address) as soon as the prompt is sent,
  // so Vic has the delivery details even if this tab is closed.
  const push = await postJson('/api/stk-push', {
    phone: cleaned, name, address, signed, amount: currentBook.price,
    purpose: 'book', narrative: `Book: Under the Mango Tree - ${name}`,
  }, 20000);

  if (!push.ok || push.data.error) {
    const msg = push.network ? 'No connection. Check your network' : (push.data.error || 'Could not start the payment');
    setStatus(status, 'error', `${msg}. Please try again.`);
    btn.disabled = false;
    btn.textContent = label;
    return;
  }

  setStatus(status, 'pending', '📲 Check your phone — an M-Pesa prompt has been sent. Enter your PIN to complete.');
  const { promise } = pollInvoice(push.data.invoice_id || push.data.CheckoutRequestID, {
    maxMs: 150000,
    onTick: ({ offline }) => {
      if (offline) setStatus(status, 'pending', '📶 Waiting for a connection… your prompt is still active on your phone.');
    },
  });
  const result = await promise;

  if (result.state === 'COMPLETE') {
    setStatus(status, 'success', '✅ Payment received! Your signed copy will be delivered within 3–5 business days. Thank you!');
    btn.textContent = 'Order Placed ✓';
  } else if (result.state === 'FAILED') {
    setStatus(status, 'error', `Payment declined${result.desc ? `: ${result.desc}` : ''}. You haven't been charged. Please try again.`);
    btn.disabled = false;
    btn.textContent = label;
  } else {
    setStatus(status, 'error', 'We have not heard back from M-Pesa yet. If you entered your PIN you will get an SMS — your order details are saved, and Vic will confirm with you.');
    btn.disabled = false;
    btn.textContent = label;
  }
}

function setStatus(el, type, msg) {
  if (!el) return;
  el.className = `stk-status ${type}`;
  el.textContent = msg;
}
