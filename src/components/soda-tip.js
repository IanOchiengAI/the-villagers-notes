// Tip recording is done server-side via /api/record-tip (which re-verifies the invoice)
import { cleanPhone, pollInvoice } from '../lib/pay.js';
import { postJson } from '../lib/net.js';

const AMOUNTS = [50, 100, 500];

export function renderSodaTip(container) {
  let selected = 100;
  let customAmount = 100;

  function render() {
    container.innerHTML = `
      <section class="soda-section" style="margin-top:5rem;padding-top:3rem;">
        <h2 style="font-size:clamp(1.75rem, 4.5vw, 2.5rem);font-family:var(--font-hand);font-weight:400;margin:0 0 1.5rem;">
          Enjoying the work here, buy me soda madiaba.
        </h2>

        <div class="soda-box" style="border:1px solid var(--rule);background:var(--card);padding:2rem;max-width:36rem;">
          <div class="label" style="margin-bottom:0.75rem;">AMOUNT (KES)</div>
          <div style="display:flex;flex-wrap:wrap;gap:0.5rem;align-items:center;margin-bottom:1.25rem;">
            ${AMOUNTS.map(a => `
              <button class="label soda-box__amount-btn ${a === selected ? 'selected' : ''}" type="button" data-val="${a}"
                      style="border:1px solid ${a === selected ? 'var(--accent)' : 'var(--rule)'};color:${a === selected ? 'var(--accent)' : 'var(--foreground)'};background:transparent;padding:0.5rem 1rem;cursor:pointer;transition:all 0.15s ease;">
                ${a}
              </button>
            `).join('')}
            <input type="number" id="soda-custom-val" value="${selected}" min="50" inputmode="numeric" aria-label="Custom amount in shillings"
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
            A payment prompt comes to your phone.
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
            const isMatch = Number(b.dataset.val) === val;
            b.classList.toggle('selected', isMatch);
            b.style.borderColor = isMatch ? 'var(--accent)' : 'var(--rule)';
            b.style.color = isMatch ? 'var(--accent)' : 'var(--foreground)';
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
        if (selected < 50) {
          setStatus(statusEl, 'error', '⚠ Minimum tip amount is KES 50.');
          return;
        }

        payBtn.disabled = true;
        payBtn.textContent = 'SENDING PROMPT…';
        setStatus(statusEl, 'pending', 'Sending the payment prompt…');

        const push = await postJson('/api/stk-push', {
          phone,
          amount: selected,
          purpose: 'tip',
          name: 'Soda Supporter',
          narrative: 'Buy me soda madiaba',
        }, 20000);

        if (!push.ok || push.data.error) {
          const msg = push.network
            ? 'No connection. Check your network and try again.'
            : (push.data.error || 'Could not start the payment. Please try again.');
          setStatus(statusEl, 'error', `❌ ${msg}`);
          payBtn.disabled = false;
          payBtn.textContent = 'SEND THE SODA';
          return;
        }

        const invoiceId = push.data.invoice_id || push.data.CheckoutRequestID;
        setStatus(statusEl, 'pending', '📲 Prompt sent — enter your M-Pesa PIN on your phone.');

        const { promise } = pollInvoice(invoiceId, {
          onTick: ({ offline }) => {
            if (offline) setStatus(statusEl, 'pending', '📶 Waiting for a connection… if you already entered your PIN, your soda is safe.');
          },
        });
        const result = await promise;

        if (result.state === 'COMPLETE') {
          setStatus(statusEl, 'success', '✅ Thank you for the soda! ❤️');
          payBtn.textContent = 'SENT ✓';
          // Server re-verifies the invoice before saving, so this can't be faked.
          postJson('/api/record-tip', { invoice_id: invoiceId, phone }, 15000);
        } else if (result.state === 'FAILED') {
          setStatus(statusEl, 'error', '❌ Payment declined or cancelled.');
          payBtn.disabled = false;
          payBtn.textContent = 'SEND THE SODA';
        } else {
          setStatus(statusEl, 'error', '⏱ No response yet. If you entered your PIN, check your M-Pesa messages before trying again.');
          payBtn.disabled = false;
          payBtn.textContent = 'SEND THE SODA';
        }
      });
    }
  }

  render();
}

function setStatus(el, type, msg) {
  if (!el) return;
  el.className = `stk-status ${type}`;
  el.textContent = msg;
}
