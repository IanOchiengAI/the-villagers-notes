import { addTip } from '../pages/admin.js';

const AMOUNTS = [50, 100, 500];

export function renderSodaTip(container) {
  let selected = 100;
  let customAmount = 100;

  function render() {
    container.innerHTML = `
      <section class="soda-section" style="margin-top:5rem;border-top:1px solid var(--foreground);padding-top:3rem;">
        <h2 style="font-size:clamp(1.75rem, 4.5vw, 2.5rem);font-family:var(--font-hand);font-weight:400;margin:0 0 1.5rem;">
          Enjoying the work here, buy me soda madiaba.
        </h2>

        <div class="soda-box" style="border:1px solid var(--rule);background:var(--card);padding:2rem;max-width:36rem;">
          <div class="label" style="margin-bottom:0.75rem;">AMOUNT (KES)</div>
          <div style="display:flex;flex-wrap:wrap;gap:0.5rem;align-items:center;margin-bottom:1.25rem;">
            ${AMOUNTS.map(a => `
              <button class="label" type="button" data-val="${a}"
                      style="border:1px solid ${a === selected ? 'var(--accent)' : 'var(--rule)'};color:${a === selected ? 'var(--accent)' : 'var(--foreground)'};background:transparent;padding:0.5rem 1rem;cursor:pointer;transition:all 0.15s ease;">
                ${a}
              </button>
            `).join('')}
            <input type="number" id="soda-custom-val" value="${selected}" min="1" aria-label="Custom amount in shillings"
                   style="width:5.5rem;border:none;border-bottom:1px solid var(--rule);background:transparent;padding-bottom:0.25rem;font-size:1.125rem;font-family:var(--font-body);outline:none;color:var(--foreground);" />
          </div>

          <div style="margin-bottom:1.25rem;">
            <label class="label" for="soda-phone" style="display:block;margin-bottom:0.5rem;">M-Pesa number</label>
            <input type="tel" id="soda-phone" placeholder="07XX XXX XXX" inputmode="tel" required
                   style="width:100%;border:none;border-bottom:1px solid var(--foreground);background:transparent;padding-bottom:0.5rem;font-size:1.125rem;font-family:var(--font-body);outline:none;color:var(--foreground);" />
          </div>

          <button class="label" id="soda-pay" type="button"
                  style="border:1px solid var(--foreground);background:transparent;padding:0.625rem 1.25rem;color:var(--foreground);cursor:pointer;transition:all 0.15s ease;margin-bottom:0.75rem;"
                  onmouseover="this.style.borderColor='var(--accent)';this.style.color='var(--accent)';"
                  onmouseout="this.style.borderColor='var(--foreground)';this.style.color='var(--foreground)';">
            Send the soda
          </button>

          <p style="color:var(--muted-foreground);font-size:0.95rem;font-family:var(--font-body);margin-top:0.5rem;">
            A payment prompt comes to your phone. Nothing is charged until you enter your PIN.
          </p>

          <div class="stk-status" id="soda-status" style="margin-top:0.75rem;"></div>
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
