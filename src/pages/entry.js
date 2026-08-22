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
  const idx   = ENTRIES.findIndex(e => e.id === id || e.slug === id);
  const entry = ENTRIES[idx];
  const prev  = ENTRIES[idx - 1] ?? null;
  const next  = ENTRIES[idx + 1] ?? null;

  if (!entry) {
    app.innerHTML = `
      <div class="container" style="padding:var(--space-24) 0;text-align:center;">
        <p style="color:var(--text-muted)">Entry not found.</p>
        <a href="#/entries" class="label" style="margin-top:var(--space-6);display:inline-flex;text-decoration:none;">← Back to Entries</a>
      </div>`;
    return;
  }

  // Paywall handling: check if paid entry
  const isPaid = Number(entry.price) > 0;
  const isUnlocked = !isPaid || !!localStorage.getItem(`tvn_unlocked_${entry.id}`) || !!sessionStorage.getItem(`tvn_unlocked_${entry.id}`);
  let bodyParagraphs = Array.isArray(entry.body) ? [...entry.body] : [];

  // Check if full body is in private store
  try {
    const privateBody = localStorage.getItem(`tvn_paid_${entry.id}`);
    if (privateBody) {
      const fullList = JSON.parse(privateBody);
      if (Array.isArray(fullList) && fullList.length > 0) {
        bodyParagraphs = fullList;
      }
    }
  } catch (_) {}

  // Preview paragraphs for paywalled state: author-specified previewCount (e.g. 1, 2, 3...) or default 2
  const previewCount = Number(entry.previewCount) > 0 ? Number(entry.previewCount) : 2;
  const previewParagraphs = bodyParagraphs.slice(0, previewCount);

  // HTML sanitization & escaping helper
  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Markdown / Rich text formatting helper with XSS protection
  function formatInline(text) {
    if (!text) return '';
    const safe = escapeHTML(text);
    return safe
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
      .replace(/__(.+?)__/g, '<u>$1</u>');
  }

  function formatParagraph(p) {
    if (!p) return '';
    const trimmed = p.trim();
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      return `<hr class="divider" style="margin:2.5rem 0;" />`;
    }
    if (trimmed.startsWith('>')) {
      const quoteText = trimmed.replace(/^>\s*/, '');
      return `<blockquote style="border-left:2px solid var(--accent);padding-left:1.25rem;margin:1.75rem 0;font-style:italic;color:var(--foreground);">${formatInline(quoteText)}</blockquote>`;
    }
    return `<p>${formatInline(p)}</p>`;
  }

  // Reading time — average 200 wpm
  const bodyText   = bodyParagraphs.join(' ');
  const excerptText = entry.excerpt || '';
  const wordCount  = bodyText.split(/\s+/).length + excerptText.split(/\s+/).length;
  const readMins   = Math.max(1, Math.ceil(wordCount / 200));

  // Author formatting & meta
  const metaParts = [];
  if (entry.category) metaParts.push(entry.category.toUpperCase());
  if (entry.date) metaParts.push(entry.date.toUpperCase());
  const metaText = metaParts.length > 0 ? metaParts.join(' · ') : (entry.meta?.toUpperCase() || 'ESSAY');

  // Likes tracking
  const likedKey = `tvn_liked_${entry.id}`;
  const isLiked = !!localStorage.getItem(likedKey);
  const baseLikes = typeof entry.likes === 'number' ? entry.likes : 0;
  const storedLikeDelta = isLiked ? 1 : 0;
  let currentLikes = baseLikes + storedLikeDelta;

  // Reading progress bar — remove any stale bar first, then create fresh
  document.querySelectorAll('.reading-progress').forEach(el => el.remove());
  const progressBar = document.createElement('div');
  progressBar.className = 'reading-progress';
  progressBar.id = 'reading-progress';
  progressBar.setAttribute('role', 'progressbar');
  progressBar.setAttribute('aria-valuemin', '0');
  progressBar.setAttribute('aria-valuemax', '100');
  progressBar.setAttribute('aria-valuenow', '0');
  progressBar.setAttribute('aria-label', 'Reading progress');
  document.body.appendChild(progressBar);

  // Tell CSS exactly where the nav bottom is
  const nav = document.getElementById('site-nav');
  if (nav) {
    document.documentElement.style.setProperty('--nav-height', nav.offsetHeight + 'px');
  }

  // Set page title & OG dynamically
  document.title = `${entry.title} — The Villager's Notes`;

  app.innerHTML = `
    <article style="padding:4rem 0;">
      <div class="container">

        <!-- Back link -->
        <a href="#/entries" class="label" style="text-decoration:none;transition:color 0.15s ease;" onmouseover="this.style.color='var(--accent)'" onmouseout="this.style.color='var(--muted-foreground)'">
          ← ENTRIES
        </a>

        <!-- Meta -->
        <div class="label" style="margin-top:2.5rem;letter-spacing:0.16em;">
          ${metaText}
        </div>

        <!-- Title -->
        <h1 style="margin-top:0.75rem;max-width:22ch;font-size:clamp(2.25rem, 6.5vw, 3.75rem);font-family:var(--font-hand);font-weight:400;line-height:1.05;">
          ${entry.title}
        </h1>

        <!-- Excerpt / standfirst -->
        <p style="margin-top:1.25rem;max-width:54ch;font-size:1.15rem;line-height:1.65;color:var(--foreground);font-family:var(--font-body);font-style:normal;">
          ${entry.excerpt || ''}
        </p>

        <!-- Body / Paywall -->
        <div class="prose-note" id="entry-body" style="margin-top:2.5rem;max-width:62ch;border-top:1px solid var(--rule);padding-top:2rem;font-size:1.25rem;line-height:1.75;">
          ${isPaid && !isUnlocked ? `
            ${previewParagraphs.map(formatParagraph).join('')}
            <div style="background:var(--card);border:1px solid var(--rule);padding:2rem;margin:2rem 0;">
              <div class="label" style="margin-bottom:0.75rem;">Rest of this one is paid</div>
              <h2 style="font-size:clamp(1.5rem, 4vw, 2rem);font-family:var(--font-hand);font-weight:400;margin-bottom:1rem;">
                Read the whole thing — KES ${Number(entry.price).toLocaleString()}
              </h2>
              <div style="max-width:28rem;margin-top:1.5rem;display:flex;flex-direction:column;gap:1.25rem;">
                <div>
                  <label class="label" for="paywall-phone" style="display:block;margin-bottom:0.5rem;">M-Pesa Number</label>
                  <input type="tel" id="paywall-phone" placeholder="07XX XXX XXX"
                         style="width:100%;border:none;border-bottom:1px solid var(--foreground);background:transparent;padding-bottom:0.5rem;font-size:1.125rem;font-family:var(--font-body);outline:none;color:var(--foreground);" />
                </div>
                <div style="display:flex;align-items:center;gap:1.25rem;flex-wrap:wrap;margin-top:0.5rem;">
                  <button class="label" id="paywall-unlock-btn"
                          style="border:1px solid var(--foreground);background:transparent;padding:0.625rem 1.25rem;color:var(--foreground);cursor:pointer;transition:all 0.15s ease;"
                          onmouseover="this.style.borderColor='var(--accent)';this.style.color='var(--accent)';"
                          onmouseout="this.style.borderColor='var(--foreground)';this.style.color='var(--foreground)';">
                    Pay KES ${Number(entry.price).toLocaleString()}
                  </button>
                </div>
                <div id="paywall-status" style="font-size:0.85rem;"></div>
              </div>
            </div>
          ` : bodyParagraphs.map(formatParagraph).join('')}
        </div>

        <!-- Social interactions: Likes & Share -->
        <div style="display:flex;align-items:center;gap:1.5rem;margin-top:2.5rem;padding-top:1.5rem;border-top:1px solid var(--rule);max-width:62ch;">
          <button id="like-btn" class="label" style="background:transparent;border:none;cursor:pointer;display:inline-flex;align-items:center;gap:0.35rem;color:${isLiked ? 'var(--accent)' : 'inherit'};font-size:0.85rem;padding:0;">
            <span id="like-icon" style="font-size:1.1rem;line-height:1;">${isLiked ? '♥' : '♡'}</span>
            <span id="like-count">${currentLikes} ${currentLikes === 1 ? 'like' : 'likes'}</span>
          </button>

          <button id="share-btn" class="label" style="background:transparent;border:none;cursor:pointer;display:inline-flex;align-items:center;gap:0.35rem;font-size:0.85rem;padding:0;color:inherit;" onmouseover="this.style.color='var(--accent)'" onmouseout="this.style.color='inherit'">
            Share
          </button>
          <span id="share-feedback" class="label" style="display:none;color:var(--accent);">Link copied ✓</span>
        </div>

        <!-- Prev / Next navigation -->
        <nav style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-top:2.5rem;padding-top:1.5rem;border-top:1px solid var(--rule);max-width:62ch;">
          <div>
            ${prev ? `
              <a href="#/entries/${prev.id}" style="text-decoration:none;color:inherit;display:block;" class="entry-link-group">
                <div class="label">← Previous entry</div>
                <div style="font-family:var(--font-hand);font-size:1.35rem;margin-top:0.25rem;transition:color 0.15s ease;">${prev.title}</div>
              </a>
            ` : ''}
          </div>
          <div style="text-align:right;">
            ${next ? `
              <a href="#/entries/${next.id}" style="text-decoration:none;color:inherit;display:block;" class="entry-link-group">
                <div class="label">Next entry →</div>
                <div style="font-family:var(--font-hand);font-size:1.35rem;margin-top:0.25rem;transition:color 0.15s ease;">${next.title}</div>
              </a>
            ` : ''}
          </div>
        </nav>

        <!-- Comments Section -->
        <section style="margin-top:3rem;padding-top:2rem;border-top:1px solid var(--rule);max-width:62ch;" id="comments-section">
          <div style="display:flex;align-items:baseline;justify-content:space-between;gap:1rem;margin-bottom:1.5rem;">
            <h2 style="font-family:var(--font-hand);font-size:2rem;margin:0;font-weight:400;">Comments</h2>
            <button id="toggle-comment-btn" class="label" style="background:transparent;border:1px solid var(--rule);padding:0.4rem 0.85rem;cursor:pointer;transition:all 0.15s ease;" onmouseover="this.style.borderColor='var(--foreground)'" onmouseout="this.style.borderColor='var(--rule)'">
              Leave a comment
            </button>
          </div>

          <div id="comment-form-container" style="display:none;margin-bottom:2rem;padding:1.5rem 0;border-top:1px solid var(--rule);">
            <form id="new-comment-form">
              <div style="margin-bottom:1.5rem;">
                <label class="label" for="comment-author" style="display:block;margin-bottom:0.5rem;">Your Name</label>
                <input type="text" id="comment-author" required placeholder="e.g. Aoko" style="width:100%;border:none;border-bottom:1px solid var(--foreground);background:transparent;padding-bottom:0.5rem;font-family:var(--font-body);outline:none;font-size:1.0625rem;color:var(--foreground);" />
              </div>
              <div style="margin-bottom:1.5rem;">
                <label class="label" for="comment-text" style="display:block;margin-bottom:0.5rem;">Your Thoughts</label>
                <textarea id="comment-text" required rows="3" placeholder="Leave a reflection or note…" style="width:100%;border:none;border-bottom:1px solid var(--rule);background:transparent;padding-bottom:0.5rem;font-family:var(--font-body);outline:none;font-size:1.0625rem;color:var(--foreground);resize:vertical;"></textarea>
              </div>
              <button type="submit" class="label" style="background:var(--foreground);color:var(--background);border:none;padding:0.6rem 1.25rem;cursor:pointer;letter-spacing:0.16em;">
                Submit Note
              </button>
            </form>
          </div>

          <div id="comments-container">
            <!-- Rendered dynamically -->
          </div>
        </section>

      </div>
    </article>
  `;

  // Comments rendering & persistence
  const commentsKey = `tvn_comments_${entry.id}`;
  function loadComments() {
    try {
      const raw = localStorage.getItem(commentsKey);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }
  function saveComments(cmts) {
    localStorage.setItem(commentsKey, JSON.stringify(cmts));
  }
  function renderCommentsList() {
    const list = loadComments();
    const target = document.getElementById('comments-container');
    if (!target) return;
    if (list.length === 0) {
      target.innerHTML = '';
      return;
    }
    target.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:1.25rem;">
        ${list.map(c => `
          <div style="border-top:1px solid var(--rule);padding-top:1rem;">
            <div style="display:flex;align-items:baseline;justify-content:space-between;">
              <span class="label" style="font-weight:600;">${escapeHTML(c.author)}</span>
              <span class="label" style="font-size:0.65rem;color:var(--muted-foreground);">${escapeHTML(c.date)}</span>
            </div>
            <p style="margin-top:0.5rem;font-family:var(--font-body);font-size:1.05rem;line-height:1.5;">${escapeHTML(c.text)}</p>
          </div>
        `).join('')}
      </div>
    `;
  }
  renderCommentsList();

  // Toggle comment form
  const toggleCommentBtn = document.getElementById('toggle-comment-btn');
  const commentFormWrap = document.getElementById('comment-form-container');
  if (toggleCommentBtn && commentFormWrap) {
    toggleCommentBtn.addEventListener('click', () => {
      const isHidden = commentFormWrap.style.display === 'none';
      commentFormWrap.style.display = isHidden ? 'block' : 'none';
      toggleCommentBtn.textContent = isHidden ? 'Cancel' : 'Leave a comment';
    });
  }

  // Handle comment submit
  const newCommentForm = document.getElementById('new-comment-form');
  if (newCommentForm) {
    newCommentForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const authorInput = document.getElementById('comment-author');
      const textInput = document.getElementById('comment-text');
      const authorVal = authorInput.value.trim();
      const textVal = textInput.value.trim();
      if (!authorVal || !textVal) return;

      const currentList = loadComments();
      currentList.unshift({
        author: authorVal,
        text: textVal,
        date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      });
      saveComments(currentList);
      renderCommentsList();

      authorInput.value = '';
      textInput.value = '';
      commentFormWrap.style.display = 'none';
      if (toggleCommentBtn) toggleCommentBtn.textContent = 'Leave a comment';
    });
  }

  // Like button handling
  const likeBtn = document.getElementById('like-btn');
  const likeIcon = document.getElementById('like-icon');
  const likeCountEl = document.getElementById('like-count');
  if (likeBtn && likeIcon && likeCountEl) {
    likeBtn.addEventListener('click', () => {
      const alreadyLiked = !!localStorage.getItem(likedKey);
      if (alreadyLiked) {
        localStorage.removeItem(likedKey);
        currentLikes = Math.max(0, currentLikes - 1);
        likeIcon.textContent = '♡';
        likeBtn.style.color = 'inherit';
      } else {
        localStorage.setItem(likedKey, 'true');
        currentLikes = currentLikes + 1;
        likeIcon.textContent = '♥';
        likeBtn.style.color = 'var(--accent)';
      }
      likeCountEl.textContent = `${currentLikes} ${currentLikes === 1 ? 'like' : 'likes'}`;
    });
  }

  // Share button handling
  const shareBtn = document.getElementById('share-btn');
  const shareFeedback = document.getElementById('share-feedback');
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const shareData = {
        title: entry.title,
        text: entry.excerpt || entry.title,
        url: window.location.href,
      };
      if (navigator.share) {
        try {
          await navigator.share(shareData);
          return;
        } catch (_) {}
      }
      // Fallback: clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        if (shareFeedback) {
          shareFeedback.style.display = 'inline';
          setTimeout(() => { shareFeedback.style.display = 'none'; }, 2000);
        }
      } catch (_) {}
    });
  }

  // Reading progress and completion tracker — rAF throttled
  let completedLogged = false;
  let rafId = null;

  function updateProgress() {
    rafId = null; // reset so next scroll queues a new frame
    const body = document.getElementById('entry-body');
    const bar  = document.getElementById('reading-progress');
    if (!body) return;
    const bodyTop  = body.getBoundingClientRect().top + window.scrollY;
    const bodyEnd  = bodyTop + body.offsetHeight;
    const scrolled = window.scrollY + window.innerHeight;
    const pct      = Math.min(100, Math.max(0, ((scrolled - bodyTop) / (bodyEnd - bodyTop)) * 100));

    if (bar) {
      bar.style.width = pct + '%';
      bar.setAttribute('aria-valuenow', Math.round(pct));
    }

    if (pct >= 95 && !completedLogged) {
      completedLogged = true;
      logAnalyticsEvent('read_complete', { entryId: entry.id, title: entry.title });
      // Fade bar out after a short delay — it's done its job
      setTimeout(() => {
        if (bar) bar.classList.add('is-done');
      }, 800);
    }
  }

  function onScroll() {
    if (rafId) return; // already queued for this frame
    rafId = requestAnimationFrame(updateProgress);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  const cleanup = () => {
    window.removeEventListener('scroll', onScroll);
    if (rafId) cancelAnimationFrame(rafId);
    progressBar.remove();
    window.removeEventListener('hashchange', cleanup);
  };
  window.addEventListener('hashchange', cleanup);

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
        statusEl.style.color = 'hsl(0 60% 50%)';
        statusEl.textContent = `❌ ${err.message || 'Could not initiate payment'}`;
        unlockBtn.disabled = false;
        unlockBtn.textContent = `UNLOCK FOR KES ${Number(entry.price).toLocaleString()} →`;
      }
    });
  }

  // Footer
  app.insertAdjacentHTML('beforeend', footerHTML());
}

