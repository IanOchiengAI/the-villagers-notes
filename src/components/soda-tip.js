import { addTip } from '../pages/admin.js';

const AMOUNTS = [50, 100, 500];

export function renderSodaTip(container) {
  let selected = 100;
  let customAmount = 100;

  function render() {
    container.innerHTML = `
      <section class="soda-section">
        <h2 class="soda-section__title">Buy me soda madiaba</h2>
        <p class="soda-section__subtitle">
          Everything here is free to read and always will be. If something landed, you can send the price of a soda. No tiers, no members-only anything.
        </p>

        <div class="soda-box">
          <div class="soda-box__label">AMOUNT (KES)</div>
          <div class="soda-box__amounts">
            ${AMOUNTS.map(a => `
              <button class="soda-box__amount-btn ${a === selected ? 'selected' : ''}" data-val="${a}">
                ${a}
              </button>
            `).join('')}
            <input type="number" class="soda-box__custom-input" id="soda-custom-val" value="${selected}" min="10" step="10" />
          </div>

          <div class="soda-box__label">M-PESA NUMBER</div>
          <input class="soda-box__phone-input" type="tel" id="soda-phone" placeholder="07XX XXX XXX" />

          <button class="btn--sharp" id="soda-pay" style="width:100%;padding:11px;font-size:0.75rem;">
            SEND THE SODA
          </button>

          <div class="stk-status" id="soda-status" style="margin-top:10px;"></div>

          <p class="soda-box__note">
            A payment prompt comes to your phone. Nothing is charged until you enter your PIN.
          </p>
        </div>
      </section>`;

    // Amount buttons
    container.querySelectorAll('.soda-box__amount-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selected = Number(btn.dataset.val);
        customAmount = selected;
        render();
      });
    });

    // Custom input
    const customInput = container.querySelector('#soda-custom-val');
    if (customInput) {
      customInput.addEventListener('input', () => {
        const val = Number(customInput.value);
        if (val > 0) {
          selected = val;
          customAmount = val;
          container.querySelectorAll('.soda-box__amount-btn').forEach(b => {
            b.classList.toggle('selected', Number(b.dataset.val) === val);
          });
        }
      });
    }

    // Payment button
    const payBtn = container.querySelector('#soda-pay');
    if (payBtn) {
      payBtn.addEventListener('click', async () => {
        const phoneRaw = container.querySelector('#soda-phone').value.trim();
        const statusEl = container.querySelector('#soda-status');
        const phone = cleanPhone(phoneRaw);

        if (!phone) {
          setStatus(statusEl, 'error', '⚠ Enter a valid Kenyan phone number (e.g. 0712345678).');
          return;
        }

        payBtn.disabled = true;
        payBtn.textContent = 'SENDING PROMPT…';
        setStatus(statusEl, 'pending', '📲 Prompt sent — enter your M-Pesa PIN on your phone.');
        addTip({ phone, amount: selected });

        try {
          const res = await fetch('/api/stk-push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phone,
              amount: selected,
              name: 'Soda Supporter',
              narrative: 'Buy me soda madiaba',
            }),
          });
          const data = await res.json();
          if (!res.ok || data.error) throw new Error(data.error || 'Failed');

          const invoiceId = data.invoice_id || data.CheckoutRequestID;
          let tries = 0;
          const iv = setInterval(async () => {
            tries++;
            const s = await fetch('/api/stk-status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ invoice_id: invoiceId, CheckoutRequestID: invoiceId }),
            }).then(r => r.json());

            if (s.ResultCode === '0' || s.state === 'COMPLETE' || s.state === 'SUCCESSFUL') {
              clearInterval(iv);
              setStatus(statusEl, 'success', '✅ Thank you for the soda! ❤️');
              payBtn.textContent = 'SENT ✓';
            } else if (s.ResultCode === '1' || s.state === 'FAILED' || s.state === 'CANCELLED') {
              clearInterval(iv);
              setStatus(statusEl, 'error', '❌ Payment declined or timed out.');
              payBtn.disabled = false;
              payBtn.textContent = 'SEND THE SODA';
            }
            if (tries >= 15) {
              clearInterval(iv);
              payBtn.disabled = false;
              payBtn.textContent = 'SEND THE SODA';
            }
          }, 3000);

        } catch (err) {
          // Inline SDK fallback
          if (typeof window !== 'undefined' && window.IntaSend) {
            try {
              const is = new window.IntaSend({
                public_key: 'ISPubKey_live_7a3054ea-0add-41ba-a643-46933dff26f3',
                live: true,
              });
              is.run({
                amount: selected,
                currency: 'KES',
                phone_number: phone,
                email: 'vikmunala@gmail.com',
                api_ref: `SODA_${Date.now()}`,
                comment: 'Soda Tip - Buy me soda madiaba',
              })
              .on('IN-PROGRESS', () => {
                setStatus(statusEl, 'pending', '📲 M-Pesa prompt sent. Enter your PIN on your phone.');
              })
              .on('COMPLETE', () => {
                setStatus(statusEl, 'success', '✅ Thank you for the soda! ❤️');
                payBtn.textContent = 'SENT ✓';
              })
              .on('FAILED', () => {
                setStatus(statusEl, 'error', '❌ Payment cancelled or declined.');
                payBtn.disabled = false;
                payBtn.textContent = 'SEND THE SODA';
              });
              return;
            } catch (_) {}
          }

          setStatus(statusEl, 'error', `❌ ${err.message || 'Could not initiate payment'}`);
          payBtn.disabled = false;
          payBtn.textContent = 'SEND THE SODA';
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
