import { getEntries } from './admin.js';
import { renderNewsletter } from '../components/newsletter.js';
import { footerHTML } from '../components/footer.js';

function toTitleCase(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function logAnalyticsEvent(type, payload = {}) {
  try {
    const raw = localStorage.getItem('tvn_analytics');
    const log = raw ? JSON.parse(raw) : [];
    log.push({
      type,
      time: new Date().toISOString(),
      ...payload
    });
    if (log.length > 500) log.splice(0, log.length - 500); // keep recent
    localStorage.setItem('tvn_analytics', JSON.stringify(log));
  } catch (_) {}
}

export function renderEntry(app, id) {
  const ENTRIES = getEntries();
  const idx   = ENTRIES.findIndex(e => e.id === id);
  const entry = ENTRIES[idx];
  const prev  = ENTRIES[idx - 1] ?? null;
  const next  = ENTRIES[idx + 1] ?? null;

  if (!entry) {
    app.innerHTML = `
      <div class="container" style="padding:var(--space-24) 0;text-align:center;">
        <p style="color:var(--text-muted)">Entry not found.</p>
        <a href="#/entries" class="btn btn--outline" style="margin-top:var(--space-6);display:inline-flex">← Back to Entries</a>
      </div>`;
    return;
  }

  // Paywall handling: check if paid entry
  const isPaid = Number(entry.price) > 0;
  const isUnlocked = !isPaid || !!localStorage.getItem(`tvn_unlocked_${entry.id}`) || !!sessionStorage.getItem(`tvn_unlocked_${entry.id}`);
  let bodyParagraphs = Array.isArray(entry.body) ? entry.body : [];

  // Check if full body is in private store
  if (isPaid && isUnlocked && bodyParagraphs.length === 0) {
    try {
      const privateBody = localStorage.getItem(`tvn_paid_${entry.id}`);
      if (privateBody) {
        bodyParagraphs = JSON.parse(privateBody);
      }
    } catch (_) {}
  }

  // Reading time — average 200 wpm
  const bodyText   = bodyParagraphs.join(' ');
  const excerptText = entry.excerpt || '';
  const wordCount  = bodyText.split(/\s+/).length + excerptText.split(/\s+/).length;
  const readMins   = Math.max(1, Math.ceil(wordCount / 200));

  // Author formatting
  const author = toTitleCase(entry.author || 'Vic Munala');
  const metaParts = [];
  if (entry.category) metaParts.push(entry.category);
  if (entry.date) metaParts.push(entry.date);
  if (author) metaParts.push(author);
  const metaText = metaParts.length > 0 ? metaParts.join(' · ') : entry.meta;

  // Reading progress bar element
  const progressBar = document.createElement('div');
  progressBar.className = 'reading-progress';
  progressBar.id = 'reading-progress';
  document.body.appendChild(progressBar);

  // Set page title & OG dynamically
  document.title = `${entry.title} — The Villager's Notes`;

  app.innerHTML = `
    <div class="entry-detail">
      <div class="container">

        <!-- Back link -->
        <a href="#/entries" class="entry-detail__back">← Entries</a>

        <!-- Toolbar: meta + read time + share -->
        <div class="entry-detail__toolbar">
          <div class="entry-detail__meta">${metaText}</div>
          <div style="display:flex;align-items:center;gap:var(--space-4);">
            <span class="entry-detail__readtime">${readMins} min read</span>
            <div class="share-btn-wrap">
              <button class="share-btn" id="share-btn" aria-label="Share this entry" aria-expanded="false">
                <svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                Share
              </button>
              <div class="share-dropdown" id="share-dropdown" style="display:none;">
                <button class="share-dropdown__item" data-share="ig">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                  Instagram
                </button>
                <a class="share-dropdown__item" data-share="twitter" target="_blank" rel="noopener">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  Twitter / X
                </a>
                <a class="share-dropdown__item" data-share="facebook" target="_blank" rel="noopener">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  Facebook
                </a>
                <a class="share-dropdown__item" data-share="whatsapp" target="_blank" rel="noopener">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 6.46 17.5 2 12.04 2M12.05 20.15C10.57 20.15 9.12 19.75 7.85 19L7.55 18.82L4.43 19.64L5.26 16.59L5.07 16.29C4.24 14.97 3.81 13.46 3.81 11.91C3.81 7.37 7.5 3.69 12.05 3.69C14.25 3.69 16.32 4.55 17.88 6.11C19.44 7.67 20.3 9.74 20.3 11.94C20.3 16.48 16.6 20.15 12.05 20.15M16.57 14.46C16.32 14.33 15.1 13.73 14.88 13.65C14.65 13.56 14.49 13.52 14.32 13.77C14.16 14.02 13.69 14.57 13.54 14.73C13.4 14.9 13.25 14.92 13 14.8C12.75 14.67 11.71 14.33 10.47 13.23C9.51 12.38 8.86 11.32 8.68 11C8.5 10.68 8.66 10.5 8.79 10.37C8.9 10.26 9.03 10.08 9.16 9.94C9.28 9.79 9.32 9.69 9.4 9.52C9.48 9.36 9.44 9.21 9.38 9.09C9.32 8.97 8.83 7.76 8.63 7.27C8.43 6.79 8.23 6.85 8.08 6.85C7.94 6.84 7.78 6.84 7.61 6.84C7.45 6.84 7.18 6.9 6.96 7.15C6.73 7.39 6.12 7.97 6.12 9.15C6.12 10.33 6.98 11.47 7.1 11.63C7.22 11.79 8.8 14.23 11.23 15.28C11.81 15.53 12.26 15.68 12.61 15.79C13.19 15.98 13.72 15.95 14.14 15.89C14.61 15.82 15.58 15.3 15.78 14.73C15.99 14.15 15.99 13.66 15.93 13.56C15.86 13.46 15.71 13.4 15.46 13.27"/></svg>
                  WhatsApp
                </a>
                <a class="share-dropdown__item" data-share="email">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  Email
                </a>
                <button class="share-dropdown__item" data-share="copy">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  <span id="copy-label">Copy Link</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Title -->
        <h1 class="entry-detail__title">${entry.title}</h1>

        <!-- Excerpt / lede -->
        <p class="entry-detail__excerpt">${entry.excerpt || ''}</p>

        <hr class="divider" />

        <!-- Body / Paywall -->
        <div class="entry-detail__body" id="entry-body">
          ${isPaid && !isUnlocked ? `
            <div style="background:var(--surface);border:1px solid var(--border);padding:var(--space-8);border-radius:8px;text-align:center;margin:var(--space-6) 0;box-shadow:0 4px 20px rgba(0,0,0,0.04);">
              <p style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;color:hsl(24, 75%, 45%);margin-bottom:8px;">Paid Story</p>
              <h3 style="font-family:var(--font-hand);font-size:2rem;color:var(--text);margin-bottom:10px;">This story requires a key.</h3>
              <p style="font-size:0.95rem;color:var(--text-muted);max-width:44ch;margin:0 auto var(--space-6);line-height:1.6;">
                Unlock and read this full story for <strong>KES ${Number(entry.price).toLocaleString()}</strong> via M-Pesa.
              </p>
              
              <div style="max-width:320px;margin:0 auto var(--space-4);text-align:left;">
                <label style="font-size:0.72rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-muted);display:block;margin-bottom:6px;">M-Pesa Number</label>
                <input type="tel" id="paywall-phone" placeholder="07XX XXX XXX" style="width:100%;padding:10px 14px;border:1.5px solid var(--border);border-radius:6px;font-size:0.95rem;box-sizing:border-box;margin-bottom:12px;" />
                <button class="btn--sharp" id="paywall-unlock-btn" style="width:100%;padding:12px;font-size:0.85rem;">
                  UNLOCK FOR KES ${Number(entry.price).toLocaleString()} →
                </button>
                <div id="paywall-status" style="margin-top:10px;font-size:0.85rem;text-align:center;"></div>
              </div>
            </div>
          ` : bodyParagraphs.map(p => `<p>${p}</p>`).join('')}
        </div>

        <!-- Newsletter at end of every entry -->
        <div id="entry-newsletter"></div>

        <!-- Prev / Next navigation -->
        <nav class="entry-nav" style="display:flex;justify-content:space-between;margin-top:var(--space-12);padding-top:var(--space-6);border-top:1px solid var(--border);gap:var(--space-4);">
          <div>
            ${prev ? `
              <a href="#/entry/${prev.id}" style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;color:var(--text-muted);">← Previous</a>
              <div style="font-family:var(--font-hand);font-size:1.1rem;color:var(--accent);margin-top:var(--space-1);">${prev.title}</div>
            ` : ''}
          </div>
          <div style="text-align:right;">
            ${next ? `
              <a href="#/entry/${next.id}" style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;color:var(--text-muted);">Next →</a>
              <div style="font-family:var(--font-hand);font-size:1.1rem;color:var(--accent);margin-top:var(--space-1);">${next.title}</div>
            ` : ''}
          </div>
        </nav>

      </div>
    </div>
  `;

  // Footer
  app.insertAdjacentHTML('beforeend', footerHTML());

  // Newsletter component
  const nlWrap = document.getElementById('entry-newsletter');
  if (nlWrap) renderNewsletter(nlWrap, { variant: `entry-${entry.id}` });

  // Reading progress bar and completion tracker
  let completedLogged = false;
  function onScroll() {
    const body   = document.getElementById('entry-body');
    const bar    = document.getElementById('reading-progress');
    if (!body || !bar) return;
    const bodyTop  = body.getBoundingClientRect().top + window.scrollY;
    const bodyEnd  = bodyTop + body.offsetHeight;
    const scrolled = window.scrollY + window.innerHeight;
    const pct      = Math.min(100, Math.max(0, ((scrolled - bodyTop) / (bodyEnd - bodyTop)) * 100));
    bar.style.width = pct + '%';

    if (pct >= 95 && !completedLogged) {
      completedLogged = true;
      logAnalyticsEvent('read_complete', { entryId: entry.id, title: entry.title });
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  const cleanup = () => {
    window.removeEventListener('scroll', onScroll);
    progressBar.remove();
    window.removeEventListener('hashchange', cleanup);
  };
  window.addEventListener('hashchange', cleanup);

  // Share dropdown wiring
  const shareBtn = document.getElementById('share-btn');
  const dropdown = document.getElementById('share-dropdown');
  const shareUrl = window.location.href;
  const shareTitle = entry.title;
  const shareExcerpt = entry.excerpt || '';

  if (shareBtn && dropdown) {
    // Populate social URLs
    const twitterLink = dropdown.querySelector('[data-share="twitter"]');
    if (twitterLink) twitterLink.href = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`;

    const fbLink = dropdown.querySelector('[data-share="facebook"]');
    if (fbLink) fbLink.href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;

    const waLink = dropdown.querySelector('[data-share="whatsapp"]');
    if (waLink) waLink.href = `https://wa.me/?text=${encodeURIComponent(`${shareTitle} — ${shareUrl}`)}`;

    const mailLink = dropdown.querySelector('[data-share="email"]');
    if (mailLink) mailLink.href = `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(`${shareExcerpt}\n\nRead more at: ${shareUrl}`)}`;

    // Toggle menu
    shareBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isClosed = dropdown.style.display === 'none';
      dropdown.style.display = isClosed ? 'flex' : 'none';
      shareBtn.setAttribute('aria-expanded', isClosed ? 'true' : 'false');
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target) && e.target !== shareBtn) {
        dropdown.style.display = 'none';
        shareBtn.setAttribute('aria-expanded', 'false');
      }
    });

    // IG share / copy action
    dropdown.querySelector('[data-share="ig"]')?.addEventListener('click', () => {
      navigator.clipboard.writeText(shareUrl).then(() => {
        alert('Link copied! You can now paste and share it on Instagram.');
        dropdown.style.display = 'none';
      });
    });

    // Copy link item
    dropdown.querySelector('[data-share="copy"]')?.addEventListener('click', () => {
      const copyLabel = document.getElementById('copy-label');
      navigator.clipboard.writeText(shareUrl).then(() => {
        if (copyLabel) copyLabel.textContent = 'Copied ✓';
        setTimeout(() => {
          if (copyLabel) copyLabel.textContent = 'Copy Link';
          dropdown.style.display = 'none';
        }, 1200);
      });
    });
  }

  // Paywall unlock button handler
  const unlockBtn = document.getElementById('paywall-unlock-btn');
  const phoneInput = document.getElementById('paywall-phone');
  const statusEl = document.getElementById('paywall-status');

  if (unlockBtn && phoneInput && statusEl) {
    unlockBtn.addEventListener('click', async () => {
      const raw = phoneInput.value.trim().replace(/\D/g, '');
      let phone = null;
      if (raw.startsWith('254') && raw.length === 12) phone = raw;
      else if ((raw.startsWith('07') || raw.startsWith('01')) && raw.length === 10) phone = '254' + raw.slice(1);
      else if (raw.length === 9) phone = '254' + raw;

      if (!phone) {
        statusEl.style.color = 'hsl(0 60% 50%)';
        statusEl.textContent = '⚠ Enter a valid Kenyan phone number (e.g. 0712345678).';
        return;
      }

      unlockBtn.disabled = true;
      unlockBtn.textContent = 'Sending prompt…';
      statusEl.style.color = 'var(--text-muted)';
      statusEl.textContent = '📲 Prompt sent — enter your M-Pesa PIN on your phone.';

      try {
        const res = await fetch('/api/stk-push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone,
            amount: Number(entry.price),
            narrative: `Unlock: ${entry.title}`,
          }),
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'STK push failed');

        const invoiceId = data.invoice_id || data.CheckoutRequestID;
        let tries = 0;
        const interval = setInterval(async () => {
          tries++;
          try {
            const check = await fetch('/api/stk-status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ invoice_id: invoiceId, CheckoutRequestID: invoiceId }),
            }).then(r => r.json());

            if (check.ResultCode === '0' || check.state === 'COMPLETE' || check.state === 'SUCCESSFUL') {
              clearInterval(interval);
              localStorage.setItem(`tvn_unlocked_${entry.id}`, 'true');
              statusEl.style.color = 'hsl(143 60% 40%)';
              statusEl.textContent = '✅ Unlocked! Loading story…';
              setTimeout(() => renderEntry(app, id), 1000);
            } else if (check.ResultCode === '1' || check.state === 'FAILED' || check.state === 'CANCELLED') {
              clearInterval(interval);
              statusEl.style.color = 'hsl(0 60% 50%)';
              statusEl.textContent = `❌ Payment failed: ${check.ResultDesc || 'Declined'}.`;
              unlockBtn.disabled = false;
              unlockBtn.textContent = `UNLOCK FOR KES ${Number(entry.price).toLocaleString()} →`;
            }
          } catch (_) {}

          if (tries >= 15) {
            clearInterval(interval);
            statusEl.style.color = 'var(--text-muted)';
            statusEl.textContent = 'Payment confirmation in progress. If you entered your PIN, please refresh.';
            unlockBtn.disabled = false;
            unlockBtn.textContent = `UNLOCK FOR KES ${Number(entry.price).toLocaleString()} →`;
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
              amount: Number(entry.price),
              currency: 'KES',
              phone_number: phone,
              email: 'vikmunala@gmail.com',
              api_ref: `ENTRY_${entry.id}_${Date.now()}`,
              comment: `Story Unlock - ${entry.title}`,
            })
            .on('IN-PROGRESS', () => {
              statusEl.textContent = '📲 Prompt sent. Enter your PIN on your phone.';
            })
            .on('COMPLETE', () => {
              localStorage.setItem(`tvn_unlocked_${entry.id}`, 'true');
              statusEl.style.color = 'hsl(143 60% 40%)';
              statusEl.textContent = '✅ Unlocked! Loading story…';
              setTimeout(() => renderEntry(app, id), 1000);
            })
            .on('FAILED', () => {
              statusEl.style.color = 'hsl(0 60% 50%)';
              statusEl.textContent = 'Payment cancelled or declined.';
              unlockBtn.disabled = false;
              unlockBtn.textContent = `UNLOCK FOR KES ${Number(entry.price).toLocaleString()} →`;
            });
            return;
          } catch (_) {}
        }

        statusEl.style.color = 'hsl(0 60% 50%)';
        statusEl.textContent = `❌ ${err.message || 'Could not initiate payment'}`;
        unlockBtn.disabled = false;
        unlockBtn.textContent = `UNLOCK FOR KES ${Number(entry.price).toLocaleString()} →`;
      }
    });
  }
}

