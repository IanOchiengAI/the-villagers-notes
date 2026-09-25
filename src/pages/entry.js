import { getEntryList, getEntry } from '../lib/store.js';
import { getCommentsFromDB, addCommentToDB } from '../lib/supabase.js';
import { esc, loadErrorHTML, wireRetry } from '../lib/html.js';
import { postJson } from '../lib/net.js';
import { cleanPhone, pollInvoice } from '../lib/pay.js';
import { footerHTML } from '../components/footer.js';

// ── Module state: one entry page is live at a time ───────────────────────────
let disposeCurrent = null; // removes document-level listeners + stops polling from the previous render

const invoiceKey = (id) => `tvn_invoice_${id}`;
const contentKey = (id) => `tvn_content_${id}`;

function lsGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (_) {} }
function lsDel(k) { try { localStorage.removeItem(k); } catch (_) {} }

// Inline formatting with XSS protection: escape first, then re-introduce a tiny safe subset.
function formatInline(text) {
  if (!text) return '';
  return esc(text)
    .replace(/&lt;br\s*\/?&gt;/gi, '<br />')
    .replace(/&lt;u&gt;([\s\S]+?)&lt;\/u&gt;/g, '<u>$1</u>')
    .replace(/\n/g, '<br />')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/__(.+?)__/g, '<u>$1</u>');
}

function formatParagraph(p) {
  if (!p) return '';
  const trimmed = p.trim();
  if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
    return `<div class="scene-break" role="separator" aria-label="Scene break">⁂</div>`;
  }
  if (trimmed.startsWith('>')) {
    return `<blockquote>${formatInline(trimmed.replace(/^>\s*/, ''))}</blockquote>`;
  }
  return `<p>${formatInline(p)}</p>`;
}

// Preview paragraphs for the paywalled state: N words (author-set previewWords, default 100)
function getPreviewContent(paragraphs, entryObj) {
  if (!Array.isArray(paragraphs) || paragraphs.length === 0) return [];
  const maxWords = Number(entryObj.previewWords) > 0 ? Number(entryObj.previewWords) : 100;
  const result = [];
  let currentWords = 0;
  for (const para of paragraphs) {
    if (currentWords >= maxWords) break;
    const words = para.trim().split(/\s+/).filter(Boolean);
    if (currentWords + words.length <= maxWords) {
      result.push(para);
      currentWords += words.length;
    } else {
      const remaining = maxWords - currentWords;
      // No trailing "..." — the fade-out overlay signals there's more.
      if (remaining > 0) result.push(words.slice(0, remaining).join(' '));
      break;
    }
  }
  return result.length > 0 ? result : [paragraphs[0]];
}

/**
 * Ask the server to verify an invoice and return the full text.
 * `definitive` is true only when the server gave a real verdict against the invoice
 * (so it is safe to forget it). Outages, timeouts and "still pending" are NOT verdicts:
 * the reader keeps their proof of payment and can simply try again.
 */
async function unlockWithInvoice(entryId, invoiceId) {
  const { ok, status, data, network } = await postJson('/api/get-content', { entry_id: entryId, invoice_id: invoiceId }, 20000);
  if (ok && data.ok && Array.isArray(data.body)) return { unlocked: true, body: data.body };
  if (network) return { unlocked: false, definitive: false, message: 'No connection. Check your network and try again.' };
  const badState = ['FAILED', 'CANCELLED', 'MISMATCH', 'AMOUNT_MISMATCH'].includes(data.state);
  const definitive = status === 402 && badState;
  return { unlocked: false, definitive, state: data.state, message: data.error || 'Could not fetch article content.' };
}

export async function renderEntry(app, id) {
  if (disposeCurrent) { disposeCurrent(); disposeCurrent = null; }

  const nav = app.dataset.nav;
  const [list, entry] = await Promise.all([getEntryList(), getEntry(id)]);
  if (app.dataset.nav !== nav) return; // a newer navigation took over while we were loading

  if (entry === null) {
    // Supabase failed — never claim the entry doesn't exist.
    app.innerHTML = loadErrorHTML("We couldn't load this entry. Check your connection and try again.");
    wireRetry(app, () => renderEntry(app, id));
    return;
  }
  if (!entry) {
    app.innerHTML = `
      <div class="container" style="padding:var(--space-24) 0;text-align:center;">
        <p style="color:var(--muted-foreground)">Entry not found.</p>
        <a href="#/entries" class="label" style="margin-top:var(--space-6);display:inline-flex;text-decoration:none;">← Back to Entries</a>
      </div>`;
    return;
  }

  const idx = Array.isArray(list) ? list.findIndex((e) => e.id === entry.id) : -1;
  const prev = idx >= 0 ? list[idx + 1] ?? null : null; // older entry (list is newest-first)
  const next = idx > 0 ? list[idx - 1] : null;           // newer entry

  const entryId = entry.id;
  const isPaid = Number(entry.price) > 0;
  const priceLabel = `KES ${Number(entry.price).toLocaleString()}`;
  let unlockedBody = null;

  // A page is "current" only while THIS entry is what's on screen. Guards every async callback.
  app.dataset.entryId = entryId;
  const stillHere = () => app.dataset.entryId === entryId && !!document.getElementById('entry-body');

  if (isPaid) {
    try {
      const cached = sessionStorage.getItem(contentKey(entryId));
      const parsed = cached ? JSON.parse(cached) : null;
      if (Array.isArray(parsed) && parsed.length > 0) unlockedBody = parsed;
    } catch (_) {}
  }
  const isUnlocked = !isPaid || !!unlockedBody;
  const storedInvoice = isPaid && !isUnlocked ? lsGet(invoiceKey(entryId)) : null;

  const bodyParagraphs = isUnlocked && unlockedBody ? unlockedBody : (Array.isArray(entry.body) ? entry.body : []);
  const previewParagraphs = getPreviewContent(bodyParagraphs, entry);

  // Reading time — average 200 wpm (paid entries: based on what we can see)
  const wordCount = bodyParagraphs.join(' ').split(/\s+/).filter(Boolean).length;
  const readMins = Math.max(1, Math.ceil(wordCount / 200));

  const metaParts = [];
  if (entry.category) metaParts.push(entry.category.toUpperCase());
  else if (entry.meta) metaParts.push(entry.meta.split('·')[0].trim().toUpperCase());
  else metaParts.push('ESSAY');
  if (entry.date) metaParts.push(entry.date.toUpperCase());
  metaParts.push(`${readMins} MIN READ`); // header format is a logged client decision (2026-08-24): always shown
  metaParts.push(`BY ${(entry.author || 'Vic Munala').toUpperCase()}`);
  const metaText = esc(metaParts.join(' · '));

  // Likes (personal, this-device only)
  const likedKey = `tvn_liked_${entryId}`;
  const isLiked = !!lsGet(likedKey);
  let currentLikes = (typeof entry.likes === 'number' ? entry.likes : 0) + (isLiked ? 1 : 0);

  document.title = `${entry.title} — The Villager's Notes`;

  const slug = entry.slug || entry.id;
  const linkFor = (e) => `#/entries/${encodeURIComponent(e.slug || e.id)}`;

  app.innerHTML = `
    <article class="entry-page" data-cat="${esc(entry.category)}">
      <div class="container">

        <div>
          <a href="#/entries" class="label back-link">← ENTRIES</a>
        </div>

        <div class="label entry-meta">${metaText}</div>

        <h1 class="entry-title">${esc(entry.title)}</h1>

        <p class="entry-standfirst">${esc(entry.excerpt || '')}</p>

        <div class="prose-note entry-body" id="entry-body">
          ${isPaid && !isUnlocked ? `
            <div style="position:relative;">
              ${previewParagraphs.map(formatParagraph).join('')}
              <div aria-hidden="true" class="paywall-fade"></div>
            </div>
            <div class="paywall-card">
              <div class="label" style="margin-bottom:0.75rem;">Rest of this one is paid</div>
              <h2>Read the whole thing — ${priceLabel}</h2>
              <div class="paywall-form">
                <div>
                  <label class="label" for="paywall-phone" style="display:block;margin-bottom:0.5rem;">M-Pesa Number</label>
                  <input type="tel" id="paywall-phone" class="paywall-input" placeholder="07XX XXX XXX" inputmode="tel" autocomplete="tel" />
                </div>
                <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap;">
                  <button class="label paywall-btn" id="paywall-unlock-btn" type="button">Pay ${priceLabel}</button>
                  <button class="label paywall-btn paywall-btn--quiet" id="paywall-check-btn" type="button" style="${storedInvoice ? '' : 'display:none;'}">I've already paid — check</button>
                </div>
                <div id="paywall-status" role="status" aria-live="polite" style="font-size:0.9rem;line-height:1.5;"></div>
              </div>
            </div>
          ` : bodyParagraphs.map(formatParagraph).join('')}
        </div>

        <!-- Likes & Share -->
        <div class="entry-actions">
          <button id="like-btn" class="label like-btn" type="button" aria-pressed="${isLiked}" style="color:${isLiked ? 'var(--accent)' : 'inherit'};">
            <span id="like-icon" aria-hidden="true" style="font-size:1.1rem;line-height:1;">${isLiked ? '♥' : '♡'}</span>
            <span id="like-count">${currentLikes} ${currentLikes === 1 ? 'like' : 'likes'}</span>
          </button>

          <div class="share-btn-wrap">
            <button id="share-btn" class="share-btn" type="button" aria-haspopup="true" aria-expanded="false">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              Share
            </button>
            <div id="share-dropdown" class="share-dropdown" style="display:none;">
              <a id="share-twitter" class="share-dropdown__item" href="#" target="_blank" rel="noopener noreferrer">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/></svg>
                Twitter
              </a>
              <a id="share-facebook" class="share-dropdown__item" href="#" target="_blank" rel="noopener noreferrer">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                Facebook
              </a>
              <a id="share-whatsapp" class="share-dropdown__item" href="#" target="_blank" rel="noopener noreferrer">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                WhatsApp
              </a>
              <button id="share-copy-btn" class="share-dropdown__item" type="button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                Copy link
              </button>
            </div>
          </div>
          <span id="share-feedback" class="label" role="status" style="display:none;color:var(--accent);">Link copied ✓</span>
        </div>

        <!-- Prev / Next navigation -->
        <nav class="entry-nav-grid" aria-label="More entries">
          <div>
            ${prev ? `
              <a href="${linkFor(prev)}" class="entry-link-group">
                <div class="label">← Previous entry</div>
                <div class="entry-nav-title">${esc(prev.title)}</div>
              </a>` : ''}
          </div>
          <div style="text-align:right;">
            ${next ? `
              <a href="${linkFor(next)}" class="entry-link-group">
                <div class="label">Next entry →</div>
                <div class="entry-nav-title">${esc(next.title)}</div>
              </a>` : ''}
          </div>
        </nav>

        <!-- Comments -->
        <section class="comments-section" id="comments-section">
          <h2 class="comments-title">Comments</h2>

          <div id="comment-form-container" style="margin-bottom:2.5rem;">
            <form id="new-comment-form">
              <div style="margin-bottom:1.75rem;">
                <input type="text" id="comment-author" required maxlength="100" placeholder="Your name" autocomplete="nickname" class="comment-author-input" />
              </div>
              <div style="margin-bottom:1.25rem;">
                <textarea id="comment-text" required rows="5" maxlength="500" placeholder="Say something" class="comment-textarea"></textarea>
                <div style="display:flex;justify-content:flex-end;margin-top:0.4rem;">
                  <span id="comment-char-counter" class="label" style="font-size:0.65rem;color:var(--muted-foreground);"><span id="comment-chars-left">500</span> characters remaining</span>
                </div>
              </div>
              <div>
                <button type="submit" id="comment-submit-btn" class="comment-submit-btn">LEAVE A COMMENT</button>
              </div>
              <div id="comment-status" role="status" aria-live="polite" style="margin-top:0.75rem;font-size:0.9rem;display:none;"></div>
            </form>
          </div>

          <div id="comments-container" aria-live="polite"><p class="label" style="color:var(--muted-foreground);">Loading comments…</p></div>
        </section>

      </div>
    </article>
  `;

  // ── Comments ───────────────────────────────────────────────────────────────
  let commentList = [];
  function paintComments() {
    const target = document.getElementById('comments-container');
    if (!target) return;
    if (commentList.length === 0) { target.innerHTML = ''; return; }
    target.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:1.25rem;">
        ${commentList.map((c) => `
          <div style="border-top:1px solid var(--rule);padding-top:1rem;">
            <div style="display:flex;align-items:baseline;justify-content:space-between;gap:1rem;">
              <span class="label" style="font-weight:600;color:var(--foreground);">${esc(c.author)}</span>
              <span class="label" style="font-size:0.65rem;color:var(--muted-foreground);">${esc(c.date)}</span>
            </div>
            <p style="margin-top:0.5rem;font-family:var(--font-body);font-size:1.05rem;line-height:1.5;color:var(--foreground);">${esc(c.text)}</p>
          </div>`).join('')}
      </div>`;
  }
  async function loadComments() {
    const target = document.getElementById('comments-container');
    if (!target) return;
    try {
      commentList = await getCommentsFromDB(entryId);
      if (!stillHere()) return;
      paintComments();
    } catch (_) {
      if (!stillHere()) return;
      target.innerHTML = `<p style="color:var(--muted-foreground);font-size:0.95rem;">Couldn't load comments. <button type="button" id="comments-retry" class="label" style="text-decoration:underline;color:var(--accent);">Try again</button></p>`;
      document.getElementById('comments-retry')?.addEventListener('click', () => {
        target.innerHTML = '<p class="label" style="color:var(--muted-foreground);">Loading comments…</p>';
        loadComments();
      });
    }
  }
  loadComments();

  const authorInput = document.getElementById('comment-author');
  const commentTextarea = document.getElementById('comment-text');
  const charsLeftEl = document.getElementById('comment-chars-left');
  const rememberedName = lsGet('tvn_commenter');
  if (authorInput && rememberedName) authorInput.value = rememberedName;
  commentTextarea?.addEventListener('input', () => {
    if (charsLeftEl) charsLeftEl.textContent = String(Math.max(0, 500 - commentTextarea.value.length));
  });

  document.getElementById('new-comment-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('comment-submit-btn');
    const statusEl = document.getElementById('comment-status');
    const authorVal = authorInput?.value.trim();
    const textVal = commentTextarea?.value.trim();
    if (!authorVal || !textVal) return;
    if (submitBtn.disabled) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'POSTING…';
    statusEl.style.display = 'none';

    const added = await addCommentToDB(entryId, authorVal, textVal);
    submitBtn.disabled = false;
    submitBtn.textContent = 'LEAVE A COMMENT';
    statusEl.style.display = 'block';

    if (added) {
      lsSet('tvn_commenter', authorVal);
      commentTextarea.value = '';
      if (charsLeftEl) charsLeftEl.textContent = '500';
      // Show it immediately from the server's response — a slow refetch can't make it vanish.
      commentList = [added, ...commentList];
      paintComments();
      statusEl.style.color = 'hsl(143 60% 32%)';
      statusEl.textContent = '✓ Comment posted!';
      setTimeout(() => { if (statusEl) statusEl.style.display = 'none'; }, 3000);
    } else {
      // Text stays in the box so nothing they typed is lost.
      statusEl.style.color = 'hsl(0 60% 42%)';
      statusEl.textContent = navigator.onLine === false
        ? "You're offline. Your comment is still here — try again when you're back online."
        : "Couldn't post your comment — it's still in the box, so just try again.";
    }
  });

  // ── Likes ──────────────────────────────────────────────────────────────────
  const likeBtn = document.getElementById('like-btn');
  const likeIcon = document.getElementById('like-icon');
  const likeCountEl = document.getElementById('like-count');
  likeBtn?.addEventListener('click', () => {
    const already = !!lsGet(likedKey);
    if (already) { lsDel(likedKey); currentLikes = Math.max(0, currentLikes - 1); }
    else { lsSet(likedKey, 'true'); currentLikes += 1; }
    likeIcon.textContent = already ? '♡' : '♥';
    likeBtn.style.color = already ? 'inherit' : 'var(--accent)';
    likeBtn.setAttribute('aria-pressed', String(!already));
    likeCountEl.textContent = `${currentLikes} ${currentLikes === 1 ? 'like' : 'likes'}`;
  });

  // ── Share ──────────────────────────────────────────────────────────────────
  const shareBtn = document.getElementById('share-btn');
  const shareDropdown = document.getElementById('share-dropdown');
  const canonicalUrl = `${window.location.origin}/entries/${encodeURIComponent(slug)}`;
  const outsideClick = (e) => {
    if (shareDropdown && !shareDropdown.contains(e.target) && e.target !== shareBtn && !shareBtn.contains(e.target)) {
      shareDropdown.style.display = 'none';
      shareBtn.setAttribute('aria-expanded', 'false');
    }
  };
  if (shareBtn && shareDropdown) {
    shareBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = shareDropdown.style.display === 'flex';
      const url = encodeURIComponent(canonicalUrl);
      const title = encodeURIComponent(entry.title);
      document.getElementById('share-twitter').href = `https://twitter.com/intent/tweet?text=${title}&url=${url}`;
      document.getElementById('share-facebook').href = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
      document.getElementById('share-whatsapp').href = `https://wa.me/?text=${title}%20${url}`;
      shareDropdown.style.display = isOpen ? 'none' : 'flex';
      shareBtn.setAttribute('aria-expanded', String(!isOpen));
    });
    document.getElementById('share-copy-btn')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      const fb = document.getElementById('share-feedback');
      try {
        await navigator.clipboard.writeText(canonicalUrl);
        if (fb) fb.textContent = 'Link copied ✓';
      } catch (_) {
        if (fb) fb.textContent = canonicalUrl; // clipboard blocked: show the link so it can be copied by hand
      }
      shareDropdown.style.display = 'none';
      if (fb) { fb.style.display = 'inline'; setTimeout(() => { fb.style.display = 'none'; }, 3500); }
    });
    document.addEventListener('click', outsideClick);
  }

  // ── Paywall ────────────────────────────────────────────────────────────────
  let activePoll = null;
  disposeCurrent = () => {
    document.removeEventListener('click', outsideClick);
    if (activePoll) activePoll.cancel();
  };

  const unlockBtn = document.getElementById('paywall-unlock-btn');
  const checkBtn = document.getElementById('paywall-check-btn');
  const phoneInput = document.getElementById('paywall-phone');
  const statusEl = document.getElementById('paywall-status');

  if (unlockBtn && phoneInput && statusEl) {
    const say = (type, msg) => {
      statusEl.style.color = type === 'error' ? 'hsl(0 60% 42%)' : type === 'ok' ? 'hsl(143 60% 30%)' : 'var(--muted-foreground)';
      statusEl.textContent = msg;
    };
    const resetButtons = () => {
      unlockBtn.disabled = false;
      unlockBtn.textContent = `Pay ${priceLabel}`;
      if (checkBtn) checkBtn.disabled = false;
    };
    const showCheck = () => { if (checkBtn) checkBtn.style.display = ''; };

    // Verify an invoice, retrying quickly on transient failures, then unlock the page.
    async function verifyAndUnlock(invoiceId, { retries = 2 } = {}) {
      for (let attempt = 0; attempt <= retries; attempt++) {
        if (!stillHere()) return false;
        const r = await unlockWithInvoice(entryId, invoiceId);
        if (r.unlocked) {
          try { sessionStorage.setItem(contentKey(entryId), JSON.stringify(r.body)); } catch (_) {}
          lsSet(invoiceKey(entryId), invoiceId);
          say('ok', '✅ Unlocked! Loading the story…');
          setTimeout(() => { if (stillHere()) renderEntry(app, id); }, 500);
          return true;
        }
        if (r.definitive) {
          lsDel(invoiceKey(entryId)); // a real "no" — safe to forget
          if (checkBtn) checkBtn.style.display = 'none';
          say('error', `❌ ${r.message}`);
          return false;
        }
        if (attempt < retries) { await new Promise((res) => setTimeout(res, 2500)); continue; }
        // Not a verdict: keep the invoice so they can retry.
        showCheck();
        say('info', `${r.message} Your payment is safe — tap "I've already paid — check" to try again.`);
      }
      return false;
    }

    // A previously-started payment (same browser): verify quietly on load, never destroy the invoice.
    if (storedInvoice) {
      say('info', 'Checking your earlier payment…');
      verifyAndUnlock(storedInvoice, { retries: 0 }).then((done) => {
        if (!done && statusEl && !statusEl.textContent) say('info', '');
      });
    }

    checkBtn?.addEventListener('click', async () => {
      const inv = lsGet(invoiceKey(entryId));
      if (!inv) { checkBtn.style.display = 'none'; return; }
      checkBtn.disabled = true;
      say('info', 'Checking your payment…');
      await verifyAndUnlock(inv);
      checkBtn.disabled = false;
    });

    unlockBtn.addEventListener('click', async () => {
      const phone = cleanPhone(phoneInput.value);
      if (!phone) {
        say('error', '⚠ Enter a valid Kenyan phone number (e.g. 0712345678).');
        phoneInput.focus();
        return;
      }

      unlockBtn.disabled = true;
      if (checkBtn) checkBtn.disabled = true;
      unlockBtn.textContent = 'Sending prompt…';
      say('info', 'Sending the payment prompt…');

      const push = await postJson('/api/stk-push', {
        phone, purpose: 'entry', entry_id: entryId, narrative: `Unlock: ${entry.title}`,
      }, 20000);

      if (!push.ok || push.data.error) {
        say('error', `❌ ${push.network ? 'No connection. Check your network and try again.' : (push.data.error || 'Could not start the payment.')}`);
        resetButtons();
        return;
      }

      const invoiceId = push.data.invoice_id || push.data.CheckoutRequestID;
      // Save the invoice the moment the prompt is out: even if they close the tab or refresh
      // mid-payment, coming back re-verifies it instead of losing their money.
      lsSet(invoiceKey(entryId), invoiceId);
      say('info', '📲 Prompt sent — enter your M-Pesa PIN on your phone.');

      activePoll = pollInvoice(invoiceId, {
        maxMs: 150000,
        cancelOnNavigate: true,
        onTick: ({ elapsed, offline }) => {
          if (!stillHere()) return;
          if (offline) say('info', '📶 Waiting for a connection… your prompt is still active on your phone.');
          else if (elapsed > 45000) say('info', '⏳ Still waiting for M-Pesa to confirm. Enter your PIN if you haven’t yet.');
        },
      });
      const result = await activePoll.promise;
      activePoll = null;
      if (result.state === 'CANCELLED' || !stillHere()) return;

      if (result.state === 'COMPLETE') {
        say('info', '✅ Payment confirmed — fetching your article…');
        const ok = await verifyAndUnlock(invoiceId, { retries: 3 });
        if (!ok) resetButtons();
      } else if (result.state === 'FAILED') {
        lsDel(invoiceKey(entryId));
        say('error', `❌ Payment didn't go through${result.desc ? ` (${result.desc})` : ''}. You haven't been charged.`);
        resetButtons();
      } else {
        // Timed out: they may still have paid. Keep the invoice and offer a manual re-check.
        showCheck();
        say('info', "We haven't heard back from M-Pesa yet. If you entered your PIN, tap \"I've already paid — check\" in a minute.");
        resetButtons();
      }
    });
  }

  app.insertAdjacentHTML('beforeend', footerHTML());
}
