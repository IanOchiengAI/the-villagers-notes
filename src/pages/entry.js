import { getEntries } from './admin.js';
import { getCommentsFromDB, addCommentToDB } from '../lib/supabase.js';
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

export async function renderEntry(app, id) {
  const ENTRIES = await getEntries();
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
  let isUnlocked = !isPaid;
  let unlockedBody = null; // full body — only set after payment verification

  if (isPaid) {
    try {
      // Check if this browser/session has already paid and cached the content
      const cachedBody = sessionStorage.getItem(`tvn_content_${entry.id}`);
      if (cachedBody) {
        const parsed = JSON.parse(cachedBody);
        if (Array.isArray(parsed) && parsed.length > 0) {
          isUnlocked = true;
          unlockedBody = parsed;
        }
      }
    } catch (_) {}

    // If no sessionStorage cache, check if there's a stored invoice_id to re-verify
    // This handles page refreshes in the same browser without requiring re-payment
    if (!isUnlocked) {
      try {
        const storedInvoiceId = localStorage.getItem(`tvn_invoice_${entry.id}`);
        if (storedInvoiceId) {
          // Re-verify server-side — this runs async, will re-render if successful
          (async () => {
            try {
              const contentRes = await fetch('/api/get-content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ entry_id: entry.id, invoice_id: storedInvoiceId }),
              });
              const contentData = await contentRes.json();
              if (contentRes.ok && contentData.ok && Array.isArray(contentData.body)) {
                sessionStorage.setItem(`tvn_content_${entry.id}`, JSON.stringify(contentData.body));
                // Re-render with full content
                renderEntry(app, id);
              } else {
                // Invoice no longer verifiable — clear stored invoice
                localStorage.removeItem(`tvn_invoice_${entry.id}`);
              }
            } catch (_) {}
          })();
        }
      } catch (_) {}
    }
  }

  let bodyParagraphs = Array.isArray(entry.body) ? [...entry.body] : [];
  if (isUnlocked && unlockedBody) {
    bodyParagraphs = unlockedBody;
  }

  // Preview paragraphs for paywalled state: 100 words (or author-specified previewWords / legacy previewCount)
  function getPreviewContent(paragraphs, entryObj) {
    if (!Array.isArray(paragraphs) || paragraphs.length === 0) return [];
    // If explicit small previewCount (< 10), treat as legacy paragraph count
    if (entryObj.previewCount && Number(entryObj.previewCount) <= 10 && !entryObj.previewWords) {
      return paragraphs.slice(0, Number(entryObj.previewCount));
    }
    const maxWords = Number(entryObj.previewWords) > 0 ? Number(entryObj.previewWords) : 100;
    const result = [];
    let currentWords = 0;
    for (const para of paragraphs) {
      if (currentWords >= maxWords) break;
      const wordsInPara = para.trim().split(/\s+/).filter(Boolean);
      if (currentWords + wordsInPara.length <= maxWords) {
        result.push(para);
        currentWords += wordsInPara.length;
      } else {
        const remaining = maxWords - currentWords;
        if (remaining > 0) {
          result.push(wordsInPara.slice(0, remaining).join(' ') + '...');
          currentWords += remaining;
        }
        break;
      }
    }
    return result.length > 0 ? result : [paragraphs[0]];
  }
  const previewParagraphs = getPreviewContent(bodyParagraphs, entry);

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
      .replace(/&lt;br\s*\/?&gt;/gi, '<br />')
      .replace(/\n/g, '<br />')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^\*]+)\*/g, '<em>$1</em>')
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
  if (entry.category) {
    metaParts.push(entry.category.toUpperCase());
  } else if (entry.meta) {
    metaParts.push(entry.meta.split('·')[0].trim().toUpperCase());
  } else {
    metaParts.push('ESSAY');
  }

  if (entry.date) {
    metaParts.push(entry.date.toUpperCase());
  }

  metaParts.push(`${readMins} MIN READ`);
  metaParts.push(`BY ${(entry.author || 'Vic Munala').toUpperCase()}`);

  const metaText = metaParts.join(' · ');

  // Likes tracking
  const likedKey = `tvn_liked_${entry.id}`;
  const isLiked = !!localStorage.getItem(likedKey);
  const baseLikes = typeof entry.likes === 'number' ? entry.likes : 0;
  const storedLikeDelta = isLiked ? 1 : 0;
  let currentLikes = baseLikes + storedLikeDelta;

  // Set page title dynamically
  document.title = `${entry.title} — The Villager's Notes`;

  app.innerHTML = `
    <article style="padding:4rem 0;">
      <div class="container">

        <!-- Back link -->
        <div>
          <a href="#/entries" class="label" style="text-decoration:none;display:inline-block;transition:color 0.15s ease;letter-spacing:0.18em;" onmouseover="this.style.color='var(--accent)'" onmouseout="this.style.color='var(--muted-foreground)'">
            ← ENTRIES
          </a>
        </div>

        <!-- Meta -->
        <div class="label" style="margin-top:2.25rem;letter-spacing:0.18em;color:var(--muted-foreground);line-height:1.6;">
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

          <div class="share-btn-wrap">
            <button id="share-btn" class="share-btn" type="button">
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

        <!-- Comments Section (Live Cloud Sync via Supabase) -->
        <section style="margin-top:3.5rem;padding-top:2.5rem;border-top:1px solid var(--rule);max-width:62ch;" id="comments-section">
          <div style="margin-bottom:2rem;">
            <h2 style="font-family:var(--font-hand);font-size:2.5rem;margin:0;font-weight:400;color:var(--foreground);line-height:1.2;">Comments</h2>
          </div>

          <div id="comment-form-container" style="margin-bottom:2.5rem;">
            <form id="new-comment-form">
              <div style="margin-bottom:1.75rem;">
                <input type="text" id="comment-author" required placeholder="Your name" class="comment-author-input" style="width:100%;border:none;border-bottom:1.5px solid #8e4823;background:transparent;padding:0.4rem 0 0.5rem;font-family:var(--font-body);outline:none;font-size:1.125rem;color:var(--foreground);" />
              </div>
              <div style="margin-bottom:1.25rem;">
                <textarea id="comment-text" required rows="5" maxlength="500" placeholder="Say something" class="comment-textarea" style="width:100%;border:1px solid #c8bcaf;background:transparent;padding:1rem 1.15rem;font-family:var(--font-body);outline:none;font-size:1.0625rem;color:var(--foreground);resize:vertical;display:block;min-height:140px;box-sizing:border-box;transition:border-color 0.15s ease;" onfocus="this.style.borderColor='var(--foreground)'" onblur="this.style.borderColor='#c8bcaf'"></textarea>
                <div style="display:flex;justify-content:flex-end;margin-top:0.4rem;">
                  <span id="comment-char-counter" class="label" style="font-size:0.65rem;color:var(--muted-foreground);"><span id="comment-chars-left">500</span> characters remaining</span>
                </div>
              </div>
              <div>
                <button type="submit" id="comment-submit-btn" class="comment-submit-btn" style="background:transparent;color:var(--foreground);border:1px solid var(--foreground);padding:0.7rem 1.4rem;font-family:var(--font-mono);font-size:0.6875rem;letter-spacing:0.18em;text-transform:uppercase;cursor:pointer;transition:all 0.15s ease;" onmouseover="this.style.background='var(--foreground)';this.style.color='var(--background)';" onmouseout="this.style.background='transparent';this.style.color='var(--foreground)';">
                  LEAVE A COMMENT
                </button>
              </div>
              <div id="comment-status" style="margin-top:0.75rem;font-size:0.85rem;display:none;"></div>
            </form>
          </div>

          <div id="comments-container">
            <p style="color:var(--muted-foreground);font-size:0.9rem;font-style:italic;">Loading thoughts…</p>
          </div>
        </section>

      </div>
    </article>
  `;

  // ── Comments handling (Supabase Cloud) ─────────────────────────────────────
  async function loadAndRenderComments() {
    const target = document.getElementById('comments-container');
    if (!target) return;
    try {
      const list = await getCommentsFromDB(entry.id);
      if (list.length === 0) {
        target.innerHTML = `<p style="color:var(--muted-foreground);font-size:0.9rem;font-style:italic;">No comments yet. Be the first to share your thoughts.</p>`;
        return;
      }
      target.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:1.25rem;">
          ${list.map(c => `
            <div style="border-top:1px solid var(--rule);padding-top:1rem;">
              <div style="display:flex;align-items:baseline;justify-content:space-between;">
                <span class="label" style="font-weight:600;color:var(--foreground);">${escapeHTML(c.author)}</span>
                <span class="label" style="font-size:0.65rem;color:var(--muted-foreground);">${escapeHTML(c.date)}</span>
              </div>
              <p style="margin-top:0.5rem;font-family:var(--font-body);font-size:1.05rem;line-height:1.5;color:var(--foreground);">${escapeHTML(c.text)}</p>
            </div>
          `).join('')}
        </div>
      `;
    } catch (_) {
      target.innerHTML = `<p style="color:var(--muted-foreground);font-size:0.9rem;">Could not load comments at this time.</p>`;
    }
  }
  loadAndRenderComments();

  const commentTextarea = document.getElementById('comment-text');
  const charsLeftEl = document.getElementById('comment-chars-left');
  if (commentTextarea && charsLeftEl) {
    commentTextarea.addEventListener('input', () => {
      const remaining = 500 - commentTextarea.value.length;
      charsLeftEl.textContent = String(Math.max(0, remaining));
    });
  }

  const newCommentForm = document.getElementById('new-comment-form');
  if (newCommentForm) {
    newCommentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const authorInput = document.getElementById('comment-author');
      const textInput = document.getElementById('comment-text');
      const submitBtn = document.getElementById('comment-submit-btn');
      const statusEl = document.getElementById('comment-status');

      const authorVal = authorInput?.value.trim();
      const textVal = textInput?.value.trim();
      if (!authorVal || !textVal) return;

      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'POSTING…'; }
      if (statusEl) { statusEl.style.display = 'none'; }

      const added = await addCommentToDB(entry.id, authorVal, textVal);
      if (added) {
        authorInput.value = '';
        textInput.value = '';
        if (charsLeftEl) charsLeftEl.textContent = '500';
        if (statusEl) {
          statusEl.style.display = 'block';
          statusEl.style.color = 'hsl(143 60% 40%)';
          statusEl.textContent = '✓ Comment posted!';
          setTimeout(() => { statusEl.style.display = 'none'; }, 3000);
        }
        await loadAndRenderComments();
      } else {
        if (statusEl) {
          statusEl.style.display = 'block';
          statusEl.style.color = 'hsl(0 60% 50%)';
          statusEl.textContent = 'Could not post comment. Please try again.';
        }
      }

      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'LEAVE A COMMENT'; }
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

  // Share pill dropdown
  const shareBtn = document.getElementById('share-btn');
  const shareDropdown = document.getElementById('share-dropdown');
  const shareCopyBtn = document.getElementById('share-copy-btn');
  const shareFeedback = document.getElementById('share-feedback');
  const shareTwitter = document.getElementById('share-twitter');
  const shareFacebook = document.getElementById('share-facebook');
  const shareWhatsapp = document.getElementById('share-whatsapp');

  if (shareBtn && shareDropdown) {
    // Toggle dropdown open/close
    shareBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = shareDropdown.style.display === 'flex';
      // Build URLs fresh at click time
      const url = encodeURIComponent(window.location.href);
      const title = encodeURIComponent(entry.title);
      if (shareTwitter) shareTwitter.href = `https://twitter.com/intent/tweet?text=${title}&url=${url}`;
      if (shareFacebook) shareFacebook.href = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
      if (shareWhatsapp) shareWhatsapp.href = `https://wa.me/?text=${title}%20${url}`;
      shareDropdown.style.display = isOpen ? 'none' : 'flex';
    });

    // Copy link button
    if (shareCopyBtn) {
      shareCopyBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(window.location.href);
          shareDropdown.style.display = 'none';
          if (shareFeedback) {
            shareFeedback.style.display = 'inline';
            setTimeout(() => { shareFeedback.style.display = 'none'; }, 2000);
          }
        } catch (_) {}
      });
    }

    // Close dropdown when clicking anywhere else
    const handleOutsideClick = (e) => {
      if (!shareDropdown.contains(e.target) && e.target !== shareBtn) {
        shareDropdown.style.display = 'none';
      }
    };
    document.addEventListener('click', handleOutsideClick);
    window.addEventListener('hashchange', () => {
      document.removeEventListener('click', handleOutsideClick);
    }, { once: true });
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
        // Step 1: Initiate STK push
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

        // Step 2: Poll stk-status until confirmed
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
              statusEl.style.color = 'var(--text-muted)';
              statusEl.textContent = '✅ Payment confirmed — fetching your article…';

              // Step 3: Call /api/get-content — server verifies payment & returns full body
              try {
                const contentRes = await fetch('/api/get-content', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ entry_id: entry.id, invoice_id: invoiceId }),
                });
                const contentData = await contentRes.json();

                if (!contentRes.ok || !contentData.ok || !Array.isArray(contentData.body)) {
                  throw new Error(contentData.error || 'Could not fetch article content.');
                }

                // Cache in sessionStorage (tab-scoped, not persistent)
                try {
                  sessionStorage.setItem(`tvn_content_${entry.id}`, JSON.stringify(contentData.body));
                  // Store invoice_id in localStorage so same browser can re-verify after refresh
                  localStorage.setItem(`tvn_invoice_${entry.id}`, invoiceId);
                } catch (_) {}

                statusEl.style.color = 'hsl(143 60% 40%)';
                statusEl.textContent = '✅ Unlocked! Loading story…';
                setTimeout(() => renderEntry(app, id), 800);

              } catch (fetchErr) {
                statusEl.style.color = 'hsl(0 60% 50%)';
                statusEl.textContent = `❌ ${fetchErr.message}`;
                unlockBtn.disabled = false;
                unlockBtn.textContent = `Pay KES ${Number(entry.price).toLocaleString()}`;
              }

            } else if (check.ResultCode === '1' || check.state === 'FAILED' || check.state === 'CANCELLED') {
              clearInterval(interval);
              statusEl.style.color = 'hsl(0 60% 50%)';
              statusEl.textContent = `❌ Payment failed: ${check.ResultDesc || 'Declined'}.`;
              unlockBtn.disabled = false;
              unlockBtn.textContent = `Pay KES ${Number(entry.price).toLocaleString()}`;
            }
          } catch (_) {}

          if (tries >= 15) {
            clearInterval(interval);
            statusEl.style.color = 'var(--text-muted)';
            statusEl.textContent = 'Payment confirmation in progress. If you entered your PIN, please refresh.';
            unlockBtn.disabled = false;
            unlockBtn.textContent = `Pay KES ${Number(entry.price).toLocaleString()}`;
          }
        }, 3000);

      } catch (err) {
        statusEl.style.color = 'hsl(0 60% 50%)';
        statusEl.textContent = `❌ ${err.message || 'Could not initiate payment'}`;
        unlockBtn.disabled = false;
        unlockBtn.textContent = `Pay KES ${Number(entry.price).toLocaleString()}`;
      }
    });
  }



  // Footer
  app.insertAdjacentHTML('beforeend', footerHTML());
}

