import { addTip } from '../pages/admin.js';

const AMOUNTS = [
  { label: '☕ KES 50',  value: 50 },
  { label: '🥤 KES 100', value: 100 },
  { label: '🍕 KES 250', value: 250 },
  { label: '🌮 KES 500', value: 500 },
];

export function renderSodaTip(container) {
  let selected = 100;

  function render() {
    container.innerHTML = `
      <section class="soda-section">
        <div class="container">
          <div class="soda-section__emoji">🥤</div>
          <h2 class="soda-section__title">Buy Vic a soda.</h2>
          <p class="soda-section__subtitle">
            If a piece moved you, made you think, or you just want to say thanks — 
            this is the way.
          </p>
          <div class="soda-amounts">
            ${AMOUNTS.map(a => `
              <button class="soda-amount-btn ${a.value === selected ? 'selected' : ''}" data-value="${a.value}">
                ${a.label}
              </button>
            `).join('')}
          </div>
          <div class="soda-form">
            <input class="form-input" type="tel" id="soda-phone" placeholder="Your M-Pesa number" style="text-align:center" />
            <button class="btn btn--primary" id="soda-pay" style="width:100%;justify-content:center">
              Send KES ${selected} ❤
            </button>
            <div class="stk-status" id="soda-status" style="width:100%;text-align:left"></div>
          </div>
        </div>
      </section>`;

    container.querySelectorAll('.soda-amount-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selected = Number(btn.dataset.value);
        render();
      });
    });

    const payBtn = container.querySelector('#soda-pay');
    if (payBtn) {
      payBtn.addEventListener('click', async () => {
        const phoneRaw = container.querySelector('#soda-phone').value.trim();
        const statusEl = container.querySelector('#soda-status');

        const phone = cleanPhone(phoneRaw);
        if (!phone) {
          setStatus(statusEl, 'error', '⚠ Enter a valid Kenyan phone number.');
          return;
        }

        payBtn.disabled = true;
        payBtn.textContent = 'Sending…';
        setStatus(statusEl, 'pending', '📲 M-Pesa prompt sent — enter your PIN.');
        addTip({ phone, amount: selected });

        try {
          const res = await fetch('/api/stk-push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, amount: selected, name: 'Tip', address: 'Buy me a soda' }),
          });
          const data = await res.json();
          if (!res.ok || data.error) throw new Error(data.error || 'Failed');

          // Simple poll
          let tries = 0;
          const iv = setInterval(async () => {
            tries++;
            const s = await fetch('/api/stk-status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ CheckoutRequestID: data.CheckoutRequestID }),
            }).then(r => r.json());
            if (s.ResultCode === '0') {
              clearInterval(iv);
              setStatus(statusEl, 'success', '✅ Thank you so much! 🥤');
              payBtn.textContent = 'Sent ❤';
            } else if (s.ResultCode && s.ResultCode !== '1032') {
              clearInterval(iv);
              setStatus(statusEl, 'error', '❌ Payment failed. Please try again.');
              payBtn.disabled = false; payBtn.textContent = `Send KES ${selected} ❤`;
            }
            if (tries >= 10) { clearInterval(iv); payBtn.disabled = false; }
          }, 3000);

        } catch (err) {
          setStatus(statusEl, 'error', `❌ ${err.message}`);
          payBtn.disabled = false;
          payBtn.textContent = `Send KES ${selected} ❤`;
        }
      });
    }
  }

  render();
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
