import { renderSodaTip } from '../components/soda-tip.js';
import { getBookData } from './admin.js';

const BOOK = {
  title:       'Under the Mango Tree',
  subtitle:    'A novel by Vic Munala',
  description: 'A novel about losing yourself and trying to find your way back home.',
  price:       1500,
  currency:    'KES',
};

// Chapter 1 excerpt — replace body text here when ready
// Leave EXCERPT_TEXT blank ('') to hide the section entirely
const EXCERPT_TEXT = ``;

export function renderBook(app) {
  // Merge admin overrides with defaults
  const saved = getBookData();
  const book = {
    title:       'Under the Mango Tree',
    subtitle:    'A novel by Vic Munala',
    description: saved?.description ?? BOOK.description,
    price:       saved?.price       ?? BOOK.price,
    currency:    'KES',
  };
  const excerpt = saved?.excerpt ?? EXCERPT_TEXT;
  const hasExcerpt = excerpt.trim().length > 0;

  app.innerHTML = `
    <section class="book-page">
      <div class="container">
        <div class="book-page__inner">

          <!-- Book cover -->
          <div style="position:sticky;top:88px;align-self:start;">
            <img src="/images/book-cover.png" alt="Under the Mango Tree by Vic Munala"
              style="width:100%;max-width:340px;border-radius:var(--radius-lg);
                     box-shadow:12px 12px 40px hsl(30 10% 12% / 0.15);display:block;margin:0 auto;" />

            <!-- Why buy direct -->
            <div style="margin-top:var(--space-6);padding:var(--space-5);
                        background:var(--bg-subtle);border-radius:var(--radius);
                        border:1px solid var(--border);max-width:340px;margin-left:auto;margin-right:auto;">
              <p style="font-size:0.68rem;font-weight:600;letter-spacing:0.1em;
                        text-transform:uppercase;color:var(--text-muted);margin-bottom:var(--space-3);">
                Why buy directly?
              </p>
              <ul style="list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:var(--space-2);">
                <li style="font-size:0.85rem;color:var(--text-muted);line-height:1.5;display:flex;gap:var(--space-2);">
                  <span style="color:var(--accent);flex-shrink:0;">→</span>
                  Every shilling goes directly to the author
                </li>
                <li style="font-size:0.85rem;color:var(--text-muted);line-height:1.5;display:flex;gap:var(--space-2);">
                  <span style="color:var(--accent);flex-shrink:0;">→</span>
                  All direct copies are <strong>signed by Vic Munala</strong>
                </li>
                <li style="font-size:0.85rem;color:var(--text-muted);line-height:1.5;display:flex;gap:var(--space-2);">
                  <span style="color:var(--accent);flex-shrink:0;">→</span>
                  Nairobi delivery included in the price
                </li>
              </ul>
            </div>
          </div>

          <!-- Book info + order form -->
          <div class="book-info">
            <p class="eyebrow book-info__eyebrow">Novel · 2024</p>
            <h1 class="book-info__title" style="font-family:var(--font-hand);font-size:clamp(2rem,5vw,3rem);font-weight:600;">
              ${BOOK.title}
            </h1>
            <p class="book-info__description">${book.description}</p>

            ${hasExcerpt ? `
              <!-- Chapter 1 Excerpt -->
              <div style="margin:var(--space-8) 0;padding:var(--space-6);
                          border-left:3px solid var(--accent);background:var(--bg-subtle);
                          border-radius:0 var(--radius) var(--radius) 0;">
                <p style="font-size:0.68rem;font-weight:600;letter-spacing:0.1em;
                           text-transform:uppercase;color:var(--text-muted);margin-bottom:var(--space-4);">
                  Read — Chapter One
                </p>
                <div id="excerpt-body" style="font-size:0.95rem;line-height:1.85;color:var(--text);max-height:180px;overflow:hidden;position:relative;">
                  ${EXCERPT_TEXT.split('\n\n').map(p => `<p style="margin-bottom:var(--space-4);">${p}</p>`).join('')}
                  <div style="position:absolute;bottom:0;left:0;right:0;
                              height:80px;background:linear-gradient(transparent,var(--bg-subtle));"></div>
                </div>
                <button id="excerpt-toggle"
                  style="margin-top:var(--space-3);font-size:0.8rem;font-weight:600;
                         letter-spacing:0.08em;text-transform:uppercase;color:var(--accent);
                         background:none;border:none;cursor:pointer;padding:0;">
                  Read more ↓
                </button>
              </div>
            ` : ''}

            <div class="book-order-form" id="order-form">
              <h3 style="font-family:var(--font-hand);font-size:1.5rem;font-weight:600;margin-bottom:var(--space-6);">
                Order Your Copy
              </h3>
              <div class="price-display">
                <span class="price-display__label">Price (inclusive of Nairobi delivery)</span>
                <span class="price-display__value">KES ${book.price.toLocaleString()}</span>
              </div>

              <div class="form-group">
                <label class="form-label" for="buyer-name">Full Name</label>
                <input class="form-input" type="text" id="buyer-name" placeholder="Jane Mwangi" />
              </div>

              <div class="form-group">
                <label class="form-label" for="buyer-phone">M-Pesa Phone Number</label>
                <input class="form-input" type="tel" id="buyer-phone" placeholder="0712 345 678" maxlength="12" />
                <p class="form-hint">You'll receive an STK push prompt on this number.</p>
              </div>

              <div class="form-group">
                <label class="form-label" for="delivery-address">Delivery Address</label>
                <input class="form-input" type="text" id="delivery-address" placeholder="e.g. Westlands, Nairobi" />
              </div>

              <!-- Signed copy checkbox -->
              <div class="form-group" style="display:flex;align-items:flex-start;gap:var(--space-3);margin-bottom:var(--space-2);">
                <input type="checkbox" id="signed-copy" checked
                  style="width:16px;height:16px;margin-top:2px;accent-color:var(--accent);flex-shrink:0;" />
                <label for="signed-copy" style="font-size:0.875rem;color:var(--text);line-height:1.5;cursor:pointer;">
                  <strong>Request a signed copy</strong>
                  <span style="display:block;color:var(--text-muted);font-size:0.82rem;">
                    Signed by Vic Munala — free, no extra cost
                  </span>
                </label>
              </div>

              <button class="btn btn--primary" id="pay-btn"
                style="width:100%;justify-content:center;padding:1rem;margin-top:var(--space-4);">
                Pay KES ${book.price.toLocaleString()} via M-Pesa
              </button>

              <div class="stk-status" id="stk-status"></div>

              <!-- WhatsApp alternative -->
              <div style="margin-top:var(--space-6);padding-top:var(--space-6);
                          border-top:1px solid var(--border);text-align:center;">
                <p style="font-size:0.82rem;color:var(--text-muted);margin-bottom:var(--space-3);">
                  Prefer WhatsApp, or need bulk copies?
                </p>
                <a href="https://wa.me/254710276333?text=Hi%20Vic%2C%20I'd%20like%20to%20order%20a%20copy%20of%20Under%20the%20Mango%20Tree."
                   target="_blank" rel="noopener"
                   class="btn btn--outline" style="display:inline-flex;gap:var(--space-2);">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0;">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.553 4.116 1.52 5.845L.057 23.8a.5.5 0 00.614.666l6.162-1.453A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.947 9.947 0 01-5.088-1.394l-.365-.216-3.785.893.908-3.682-.236-.38A9.947 9.947 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                  </svg>
                  Order via WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;

  // Soda tip below
  const sodaWrap = document.createElement('div');
  app.appendChild(sodaWrap);
  renderSodaTip(sodaWrap);

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

  try {
    const res = await fetch('/api/stk-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: cleaned, name, address, amount: book.price, signed }),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'STK push failed');
    pollStkStatus(data.CheckoutRequestID, status, btn);
  } catch (err) {
    setStatus(status, 'error', `${err.message}. Try again or WhatsApp Vic directly.`);
    btn.disabled = false;
    btn.textContent = `Pay KES ${book.price.toLocaleString()} via M-Pesa`;
  }
}

async function pollStkStatus(checkoutRequestID, statusEl, btn) {
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
        setStatus(statusEl, 'success', '✅ Payment received! Your signed copy will be delivered within 3–5 business days. Thank you!');
        btn.textContent = 'Order Placed ✓';
      } else if (data.ResultCode && data.ResultCode !== '1032') {
        clearInterval(interval);
        setStatus(statusEl, 'error', `Payment declined: ${data.ResultDesc || 'Unknown error'}. Please try again.`);
        btn.disabled = false;
        btn.textContent = `Pay KES ${book.price.toLocaleString()} via M-Pesa`;
      }
    } catch (_) {}
    if (attempts >= max) {
      clearInterval(interval);
      setStatus(statusEl, 'error', 'Payment not confirmed yet. If you entered your PIN, check your M-Pesa messages — or contact Vic directly.');
      btn.disabled = false;
      btn.textContent = `Pay KES ${book.price.toLocaleString()} via M-Pesa`;
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
