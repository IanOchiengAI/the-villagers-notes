import {
  getEntriesFromDB, upsertEntryToDB, deleteEntryFromDB, getEntryFullBodyFromDB,
  listCommentsAdmin, deleteCommentAdmin, setOrderStatusAdmin, getStatsAdmin, getCounters,
} from '../lib/supabase.js';
import { invalidateEntryList } from '../lib/store.js';
import { esc } from '../lib/html.js';

const CATEGORIES = ['Fiction', 'Random Thoughts', 'Shorts', 'Essay', 'Article', 'Reflections'];
const MIN_PRICE = 50; // IntaSend STK floor — a lower price could never be paid
const ORDER_STATUSES = ['Awaiting payment', 'Paid', 'Dispatched', 'Delivered'];

const LABEL_CSS = 'font-size:0.72rem;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);display:block;margin-bottom:6px;';
const FIELD_CSS = 'width:100%;padding:10px 14px;border:1.5px solid var(--border);border-radius:8px;font-size:0.9rem;box-sizing:border-box;background:var(--white);color:var(--text);';
const CARD_CSS = 'background:var(--white);border:1px solid var(--border);border-radius:12px;padding:28px;margin-bottom:32px;box-sizing:border-box;';
const EYEBROW_CSS = 'font-size:0.72rem;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-muted);margin-bottom:4px;';
const H2_CSS = 'font-family:var(--font-hand);font-size:2.4rem;font-weight:600;line-height:1;';
const H3_CSS = 'font-family:var(--font-hand);font-size:1.6rem;font-weight:600;';

// ── Session helpers ──────────────────────────────────────────────────────────
function checkAuth() {
  try { return sessionStorage.getItem('tvn_auth') === 'ok'; } catch { return false; }
}
function clearAuth() {
  try { sessionStorage.removeItem('tvn_auth'); sessionStorage.removeItem('tvn_auth_token'); } catch (_) {}
}

// ── Drafts: everything typed into an entry form is autosaved locally ─────────
// so a tab switch, refresh, expired session or dead network never costs Vic his writing.
const draftKey = (k) => `tvn_draft_${k}`;
function loadDraft(k) {
  try { const raw = localStorage.getItem(draftKey(k)); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function saveDraft(k, d) { try { localStorage.setItem(draftKey(k), JSON.stringify(d)); } catch (_) {} }
function clearDraft(k) { try { localStorage.removeItem(draftKey(k)); } catch (_) {} }
function anyDraft() {
  try { for (let i = 0; i < localStorage.length; i++) if (localStorage.key(i).startsWith('tvn_draft_')) return true; } catch (_) {}
  return false;
}

// Warn before closing the tab while an unsaved draft exists.
let beforeUnloadBound = false;
function bindBeforeUnload() {
  if (beforeUnloadBound) return;
  beforeUnloadBound = true;
  window.addEventListener('beforeunload', (e) => {
    if (checkAuth() && location.hash.replace(/^#\/?/, '') === 'admin' && anyDraft()) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
}

// ── Admin page ───────────────────────────────────────────────────────────────
export async function renderAdmin(app) {
  if (!checkAuth()) { renderLogin(app); return; }
  bindBeforeUnload();
  renderDashboard(app);
}

function renderLogin(app, notice) {
  document.title = "Admin — The Villager's Notes";
  app.innerHTML = `
    <div style="min-height:80vh;display:flex;align-items:center;justify-content:center;padding:24px;">
      <div style="width:100%;max-width:380px;background:var(--white);border:1px solid var(--border);border-radius:16px;padding:32px;box-shadow:0 4px 20px rgba(0,0,0,0.04);">
        <p style="font-family:var(--font-hand);font-size:2.2rem;color:var(--accent);margin-bottom:4px;line-height:1.1;">The Villager's Notes</p>
        <p style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-muted);margin-bottom:28px;">Private Author Admin</p>
        ${notice ? `<p role="alert" style="background:#FFF3CD;border:1px solid #FFC107;color:#7A5000;font-size:0.85rem;padding:10px 12px;border-radius:8px;margin-bottom:16px;line-height:1.4;">${esc(notice)}</p>` : ''}
        <form id="login-form">
          <label for="pass-input" style="${LABEL_CSS}">Password</label>
          <input type="password" id="pass-input" autocomplete="current-password" style="${FIELD_CSS}margin-bottom:16px;padding:12px 16px;font-size:1rem;" />
          <button type="submit" style="width:100%;padding:12px;background:var(--text);color:var(--white);border:none;border-radius:8px;font-size:0.9rem;font-weight:600;cursor:pointer;">Enter Dashboard</button>
          <p id="login-err" role="alert" style="color:hsl(0 60% 42%);font-size:0.85rem;margin-top:12px;display:none;"></p>
        </form>
      </div>
    </div>`;

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const errEl = document.getElementById('login-err');
    const val = document.getElementById('pass-input').value;
    errEl.style.display = 'none';
    btn.disabled = true;
    btn.textContent = 'Verifying…';
    try {
      const res = await fetch('/api/admin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: val }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok) {
        try {
          sessionStorage.setItem('tvn_auth', 'ok');
          sessionStorage.setItem('tvn_auth_token', data.token || '');
        } catch (_) {}
        renderAdmin(app);
        return;
      }
      errEl.textContent = data?.error || 'Wrong password.';
      errEl.style.display = 'block';
    } catch (_) {
      errEl.textContent = 'Could not reach the server. Check your connection and try again.';
      errEl.style.display = 'block';
    }
    btn.disabled = false;
    btn.textContent = 'Enter Dashboard';
  });
}

/** A write came back 401: the 12-hour token expired. Drafts are already autosaved, so just go back to login. */
function handleSessionExpired(app) {
  clearAuth();
  renderLogin(app, 'Your session expired. Log in again — anything you were writing has been kept and will be waiting for you.');
}

// ── Dashboard shell ──────────────────────────────────────────────────────────
function renderDashboard(app) {
  document.title = "Admin — The Villager's Notes";

  // Data lives here; switching tabs re-uses it instead of re-fetching everything.
  const store = {
    entries: null, entriesErr: null,
    stats: null, statsErr: null,
    comments: null, commentsErr: null,
  };
  let section = anyDraft() ? 'entries' : 'people';
  const openForms = new Set(); // 'new' | entry ids — forms the user has open, kept across tab switches

  const TABS = [
    { id: 'people', label: 'People' },
    { id: 'entries', label: 'Entries' },
    { id: 'comments', label: 'Comments' },
    { id: 'analytics', label: 'Stats' },
    { id: 'logout', label: 'Log out' },
  ];

  function shell(body) {
    return `
      <div style="min-height:100vh;background:var(--bg-subtle);">
        <div style="background:var(--background);border-bottom:1px solid var(--border);padding:0 16px;display:flex;align-items:center;justify-content:space-between;height:56px;position:sticky;top:0;z-index:999;gap:8px;box-shadow:0 1px 4px rgba(0,0,0,0.04);">
          <div style="display:flex;align-items:center;gap:10px;overflow-x:auto;flex-shrink:1;min-width:0;">
            <a href="#/" class="label" style="text-decoration:none;font-size:0.72rem;color:var(--text-muted);white-space:nowrap;padding:4px 10px;border:1px solid var(--border);border-radius:999px;">← View Site</a>
            ${TABS.map((t) => `
              <button type="button" data-tab="${t.id}" style="padding:6px 10px;border-radius:999px;border:none;cursor:pointer;font-size:0.72rem;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;white-space:nowrap;flex-shrink:0;background:${section === t.id ? 'var(--text)' : 'transparent'};color:${section === t.id ? 'var(--white)' : 'var(--text-muted)'};">${t.label}</button>`).join('')}
          </div>
          <span class="admin-owner-name" style="font-size:0.72rem;color:var(--text-muted);font-weight:500;white-space:nowrap;flex-shrink:0;">Vic Munala</span>
        </div>
        <div style="max-width:880px;margin:0 auto;padding:40px 24px 80px;">${body}</div>
      </div>`;
  }

  const loadingBlock = (what) => `<p style="color:var(--text-muted);padding:40px 0;" role="status">Loading ${what}…</p>`;
  const errorBlock = (msg, retryId) => `
    <div role="alert" style="${CARD_CSS}border-color:hsl(0 60% 80%);">
      <p style="color:hsl(0 60% 38%);margin-bottom:14px;">${esc(msg)}</p>
      <button type="button" id="${retryId}" style="padding:8px 18px;border:1.5px solid var(--border);border-radius:999px;background:var(--bg-subtle);font-weight:600;cursor:pointer;">Try again</button>
    </div>`;

  // ── Data loaders ───────────────────────────────────────────────────────────
  async function loadEntries(force) {
    if (store.entries && !force) return;
    store.entriesErr = null;
    const list = await getEntriesFromDB();
    if (list === null) { store.entriesErr = "Couldn't load your entries. Nothing has been changed — check your connection and try again."; return; }
    store.entries = list;
  }
  async function loadStats(force) {
    if (store.stats && !force) return;
    store.statsErr = null;
    const r = await getStatsAdmin();
    if (r.status === 401) { handleSessionExpired(app); return 'expired'; }
    if (!r.ok) { store.statsErr = r.error || "Couldn't load the numbers."; return; }
    store.stats = r.data;
  }
  async function loadComments(force) {
    if (store.comments && !force) return;
    store.commentsErr = null;
    const r = await listCommentsAdmin();
    if (r.status === 401) { handleSessionExpired(app); return 'expired'; }
    if (!r.ok) { store.commentsErr = r.error || "Couldn't load comments."; return; }
    store.comments = r.data.comments || [];
  }

  async function show(nextSection, { force = false } = {}) {
    section = nextSection;
    // Paint the shell immediately with a loading line; never leave a blank screen.
    app.innerHTML = shell(loadingBlock(section === 'people' ? 'the numbers' : section));
    wireShell();

    let expired;
    if (section === 'people') expired = await loadStats(force);
    else if (section === 'entries') await loadEntries(force);
    else if (section === 'comments') expired = await loadComments(force);
    if (expired === 'expired') return;
    if (section !== nextSection) return; // user clicked another tab meanwhile

    let body = '';
    if (section === 'people') body = store.statsErr ? errorBlock(store.statsErr, 'retry-btn') : renderPeople(store.stats);
    else if (section === 'entries') body = store.entriesErr ? errorBlock(store.entriesErr, 'retry-btn') : renderEntriesSection(store.entries);
    else if (section === 'comments') body = store.commentsErr ? errorBlock(store.commentsErr, 'retry-btn') : renderCommentsSection(store.comments);
    else if (section === 'analytics') body = renderAnalyticsSection();
    app.innerHTML = shell(body);
    wireShell();
    app.querySelector('#retry-btn')?.addEventListener('click', () => show(section, { force: true }));

    if (section === 'people' && !store.statsErr) wirePeople();
    if (section === 'entries' && !store.entriesErr) wireEntries();
    if (section === 'comments' && !store.commentsErr) wireComments();
    if (section === 'analytics') wireAnalytics();
  }

  function wireShell() {
    app.querySelectorAll('[data-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.dataset.tab === 'logout') {
          clearAuth();
          window.location.hash = '#/';
          return;
        }
        show(btn.dataset.tab);
      });
    });
  }

  // ── People ─────────────────────────────────────────────────────────────────
  function renderPeople(stats) {
    const { orders = [], subscribers: subs = [], tips = [] } = stats;
    const paidOrders = orders.filter((o) => o.status !== 'Awaiting payment');
    const totalRevenue = paidOrders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
    const totalTips = tips.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const stat = (label, value, sub, color = 'var(--text)') => `
      <div style="${CARD_CSS.replace('margin-bottom:32px;', 'margin-bottom:0;padding:24px;')}">
        <div style="font-size:0.7rem;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);margin-bottom:8px;">${label}</div>
        <div style="font-family:var(--font-hand);font-size:2.4rem;font-weight:700;color:${color};line-height:1;margin-bottom:8px;">${value}</div>
        <div style="font-size:0.85rem;color:var(--text-muted);">${sub}</div>
      </div>`;

    const statusColors = { Delivered: ['hsl(143 60% 92%)', 'hsl(143 80% 25%)'], Dispatched: ['hsl(200 80% 92%)', 'hsl(200 80% 25%)'], 'Awaiting payment': ['hsl(0 0% 92%)', 'hsl(0 0% 30%)'] };

    return `
      <div>
        <div style="margin-bottom:28px;">
          <p style="${EYEBROW_CSS}">Audience &amp; Direct Sales</p>
          <h2 style="${H2_CSS}">Readers &amp; Customers</h2>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:16px;margin-bottom:32px;">
          ${stat('Orders (paid)', paidOrders.length, `Gross: <strong style="color:var(--text)">KES ${totalRevenue.toLocaleString()}</strong>`, 'var(--accent)')}
          ${stat('Newsletter Subscribers', subs.length, 'Direct email audience')}
          ${stat('Soda Supporters', tips.length, `Tips: <strong style="color:var(--text)">KES ${totalTips.toLocaleString()}</strong>`, 'hsl(143 60% 32%)')}
        </div>

        <div style="${CARD_CSS}">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
            <h3 style="${H3_CSS}">Orders (${orders.length})</h3>
            <button type="button" id="copy-orders-phone" style="padding:6px 14px;border:1px solid var(--border);border-radius:999px;background:none;font-size:0.75rem;font-weight:500;color:var(--text-muted);cursor:pointer;">Copy customer phones</button>
          </div>
          ${orders.length === 0 ? `<p style="color:var(--text-muted);font-size:0.9rem;">No orders yet.</p>` : `
            <div style="display:flex;flex-direction:column;gap:14px;">
              ${orders.map((o) => {
                const [bg, fg] = statusColors[o.status] || ['hsl(44 95% 92%)', 'hsl(44 95% 25%)'];
                return `
                <div style="border:1px solid var(--border);border-radius:10px;padding:18px 20px;display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px;background:var(--bg-subtle);">
                  <div style="flex:1;min-width:240px;">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;">
                      <strong style="font-size:1.05rem;">${esc(o.name)}</strong>
                      ${o.signed ? `<span style="font-size:0.7rem;background:hsl(44 95% 90%);color:hsl(44 95% 30%);padding:2px 8px;border-radius:4px;font-weight:600;">Signed copy</span>` : ''}
                    </div>
                    <div style="font-size:0.88rem;color:var(--text-muted);line-height:1.6;overflow-wrap:anywhere;">
                      ${esc(o.address)}<br/>
                      <a href="https://wa.me/${esc(String(o.phone).replace(/\D/g, ''))}" target="_blank" rel="noopener noreferrer" style="color:var(--accent);text-decoration:none;font-weight:600;">${esc(o.phone)}</a> &middot; ${esc(o.date)} &middot; KES ${Number(o.amount).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <select data-order-status="${esc(o.order_id)}" aria-label="Order status" style="padding:6px 12px;border-radius:8px;border:1px solid var(--border);font-size:0.8rem;font-weight:600;cursor:pointer;background:${bg};color:${fg};">
                      ${ORDER_STATUSES.map((s) => `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                    </select>
                    <div data-order-msg="${esc(o.order_id)}" role="status" style="font-size:0.75rem;margin-top:4px;min-height:1em;"></div>
                  </div>
                </div>`;
              }).join('')}
            </div>`}
        </div>

        <div style="${CARD_CSS}">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
            <h3 style="${H3_CSS}">Newsletter Audience (${subs.length})</h3>
            <button type="button" id="copy-emails-btn" style="padding:6px 14px;border:1px solid var(--border);border-radius:999px;background:none;font-size:0.75rem;font-weight:500;color:var(--text-muted);cursor:pointer;">Copy all emails</button>
          </div>
          <div style="max-height:260px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;padding:8px 16px;background:var(--bg-subtle);">
            ${subs.length === 0 ? `<p style="color:var(--text-muted);font-size:0.9rem;padding:8px 0;">No subscribers yet.</p>` : subs.map((s) => `
              <div style="padding:10px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:0.9rem;">
                <span style="font-weight:500;overflow-wrap:anywhere;">${esc(s.email)}</span>
                <span style="color:var(--text-muted);font-size:0.78rem;white-space:nowrap;">${esc(s.date)}</span>
              </div>`).join('')}
          </div>
          <div id="copy-msg" role="status" style="font-size:0.8rem;margin-top:10px;min-height:1em;color:var(--text-muted);"></div>
        </div>

        <div style="${CARD_CSS.replace('margin-bottom:32px;', '')}">
          <h3 style="${H3_CSS}margin-bottom:18px;">Soda Tips &amp; Support (${tips.length})</h3>
          <div style="max-height:220px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;padding:8px 16px;background:var(--bg-subtle);">
            ${tips.length === 0 ? `<p style="color:var(--text-muted);font-size:0.9rem;padding:8px 0;">No tips yet.</p>` : tips.map((t) => `
              <div style="padding:10px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:0.9rem;">
                <span><strong>KES ${Number(t.amount).toLocaleString()}</strong> &middot; <span style="color:var(--text-muted)">${esc(t.phone)}</span></span>
                <span style="color:var(--text-muted);font-size:0.78rem;white-space:nowrap;">${esc(t.date)}</span>
              </div>`).join('')}
          </div>
        </div>
      </div>`;
  }

  async function copyText(text, okMsg) {
    const msg = app.querySelector('#copy-msg');
    const say = (m, ok) => { if (msg) { msg.textContent = m; msg.style.color = ok ? 'hsl(143 55% 28%)' : 'hsl(0 60% 42%)'; } };
    try {
      await navigator.clipboard.writeText(text);
      say(okMsg, true);
    } catch (_) {
      say("Couldn't copy automatically — select the text and copy it by hand.", false);
    }
  }

  function wirePeople() {
    const { orders = [], subscribers: subs = [] } = store.stats;
    app.querySelectorAll('[data-order-status]').forEach((select) => {
      const orderId = select.dataset.orderStatus;
      const original = orders.find((o) => o.order_id === orderId)?.status;
      select.addEventListener('change', async () => {
        const msg = app.querySelector(`[data-order-msg="${CSS.escape(orderId)}"]`);
        select.disabled = true;
        if (msg) { msg.style.color = 'var(--text-muted)'; msg.textContent = 'Saving…'; }
        const r = await setOrderStatusAdmin(orderId, select.value);
        if (r.status === 401) { handleSessionExpired(app); return; }
        select.disabled = false;
        if (r.ok) {
          const o = orders.find((x) => x.order_id === orderId);
          if (o) o.status = select.value;
          if (msg) { msg.style.color = 'hsl(143 55% 28%)'; msg.textContent = 'Saved ✓'; }
        } else {
          select.value = original || select.value;
          if (msg) { msg.style.color = 'hsl(0 60% 42%)'; msg.textContent = r.error || "Couldn't save"; }
        }
      });
    });
    app.querySelector('#copy-orders-phone')?.addEventListener('click', () =>
      copyText(orders.map((o) => `${o.name}: ${o.phone}`).join('\n'), 'Customer contacts copied.'));
    app.querySelector('#copy-emails-btn')?.addEventListener('click', () =>
      copyText(subs.map((s) => s.email).join(', '), 'Subscriber emails copied.'));
  }

  // ── Comments moderation ────────────────────────────────────────────────────
  function renderCommentsSection(list) {
    const titleOf = (id) => (store.entries || []).find((e) => e.id === id)?.title || 'Unknown entry';
    return `
      <div>
        <div style="margin-bottom:28px;">
          <p style="${EYEBROW_CSS}">Moderation</p>
          <h2 style="${H2_CSS}">Comments (${list.length})</h2>
        </div>
        <div style="${CARD_CSS.replace('margin-bottom:32px;', '')}">
          ${list.length === 0 ? `<p style="color:var(--text-muted);">No comments yet.</p>` : list.map((c) => `
            <div data-comment-row="${esc(c.id)}" style="padding:16px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;gap:16px;align-items:flex-start;">
              <div style="min-width:0;">
                <div style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);margin-bottom:4px;">${esc(c.author)} &middot; ${esc(new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }))} &middot; ${esc(titleOf(c.entry_id))}</div>
                <div style="font-size:0.95rem;line-height:1.55;overflow-wrap:anywhere;">${esc(c.comment)}</div>
                <div data-comment-msg="${esc(c.id)}" role="status" style="font-size:0.78rem;margin-top:4px;color:hsl(0 60% 42%);"></div>
              </div>
              <button type="button" data-del-comment="${esc(c.id)}" style="padding:6px 14px;border:1.5px solid hsl(0 60% 88%);border-radius:999px;font-size:0.75rem;font-weight:600;cursor:pointer;background:none;color:hsl(0 60% 45%);flex-shrink:0;">Delete</button>
            </div>`).join('')}
        </div>
      </div>`;
  }

  async function wireComments() {
    // Entry titles make the list readable; fetch them quietly if we don't have them yet.
    if (!store.entries) { await loadEntries(); if (section === 'comments') { app.innerHTML = shell(renderCommentsSection(store.comments)); wireShell(); } }
    app.querySelectorAll('[data-del-comment]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this comment permanently?')) return;
        const id = btn.dataset.delComment;
        const msg = app.querySelector(`[data-comment-msg="${CSS.escape(id)}"]`);
        btn.disabled = true;
        btn.textContent = 'Deleting…';
        const r = await deleteCommentAdmin(id);
        if (r.status === 401) { handleSessionExpired(app); return; }
        if (!r.ok) {
          btn.disabled = false;
          btn.textContent = 'Delete';
          if (msg) msg.textContent = r.error || "Couldn't delete this comment.";
          return;
        }
        store.comments = store.comments.filter((c) => c.id !== id);
        show('comments');
      });
    });
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  function renderAnalyticsSection() {
    const box = (label, id, color, sub) => `
      <div style="padding:16px;background:var(--bg-subtle);border-radius:8px;">
        <div style="font-size:0.65rem;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);margin-bottom:6px;">${label}</div>
        <div id="${id}" style="font-family:var(--font-hand);font-size:1.8rem;font-weight:700;color:${color};line-height:1;">…</div>
        <div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px;">${sub}</div>
      </div>`;
    return `
      <div>
        <div style="margin-bottom:28px;">
          <p style="${EYEBROW_CSS}">Readership &amp; Engagement</p>
          <h2 style="${H2_CSS}">Stats</h2>
        </div>
        <div style="${CARD_CSS}">
          <h3 style="${H3_CSS}margin-bottom:6px;">Where the real readership numbers are</h3>
          <p style="font-size:0.92rem;line-height:1.6;color:var(--text-muted);">Page views, readers and where they come from are in <strong>Google Analytics</strong> (your Viewer access on the site's property). This page only shows counters that live in the database, so the numbers here are the same for everyone, not just this browser.</p>
        </div>
        <div style="${CARD_CSS.replace('margin-bottom:32px;', '')}">
          <h3 style="${H3_CSS}margin-bottom:4px;">Project &amp; creative engagement</h3>
          <p id="counter-note" style="font-size:0.75rem;color:var(--text-muted);margin:0 0 18px;">Live counters for Beneath the Surface</p>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:14px;">
            ${box('Projects page views', 'stat-play-views', 'var(--text)', 'Unique visitor sessions')}
            ${box('Trailer plays', 'stat-trailer-plays', 'var(--accent)', 'Clicks to watch trailer')}
            ${box('Stream intent', 'stat-stream-clicks', 'hsl(143 60% 32%)', 'Clicks on stream checkout')}
          </div>
        </div>
      </div>`;
  }

  function wireAnalytics() {
    getCounters(['play_views', 'trailer_clicks', 'play_watch_clicks']).then((stats) => {
      const set = (id, v) => { const el = app.querySelector(id); if (el) el.textContent = Number(v ?? 0).toLocaleString(); };
      set('#stat-play-views', stats.play_views);
      set('#stat-trailer-plays', stats.trailer_clicks);
      set('#stat-stream-clicks', stats.play_watch_clicks);
    }).catch(() => {
      const n = app.querySelector('#counter-note');
      if (n) { n.textContent = "Couldn't load the counters right now."; n.style.color = 'hsl(0 60% 42%)'; }
    });
  }

  // ── Entries ────────────────────────────────────────────────────────────────
  function renderEntriesSection(entries) {
    return `
      <div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:28px;flex-wrap:wrap;gap:12px;">
          <div>
            <p style="${EYEBROW_CSS}">Published Works</p>
            <h2 style="${H2_CSS}">Entries (${entries.length})</h2>
          </div>
          <button type="button" id="new-entry-btn" style="padding:10px 22px;background:var(--accent);color:var(--white);border:none;border-radius:999px;font-size:0.85rem;font-weight:700;cursor:pointer;">+ New Entry</button>
        </div>

        <div id="new-entry-form" style="display:none;background:var(--white);border:1px solid var(--border);border-radius:14px;padding:28px;margin-bottom:28px;box-sizing:border-box;">
          ${entryFormHTML({ id: '', category: 'Essay', date: '', title: '', excerpt: '', body: [] }, 'new')}
        </div>

        <div style="display:flex;flex-direction:column;gap:16px;">
          ${entries.map((e) => `
            <div style="background:var(--white);border:1px solid var(--border);border-radius:12px;padding:24px 28px;box-sizing:border-box;">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;">
                <div style="flex:1;min-width:200px;">
                  <div style="font-size:0.72rem;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-muted);margin-bottom:6px;">${esc(e.category)} · ${esc(e.date)}${Number(e.price) > 0 ? ` · KES ${Number(e.price).toLocaleString()}` : ' · Free'}</div>
                  <div style="font-family:var(--font-hand);font-size:1.6rem;font-weight:600;color:var(--text);line-height:1.25;margin-bottom:8px;">${esc(e.title)}</div>
                  <p style="font-size:0.88rem;color:var(--text-muted);line-height:1.5;margin:0;">${esc(e.excerpt || '')}</p>
                </div>
                <div style="display:flex;gap:8px;flex-shrink:0;">
                  <button type="button" data-edit="${esc(e.id)}" style="padding:6px 16px;border:1.5px solid var(--border);border-radius:999px;font-size:0.75rem;font-weight:600;cursor:pointer;background:var(--bg-subtle);color:var(--text);">Edit</button>
                  <button type="button" data-delete="${esc(e.id)}" style="padding:6px 14px;border:1.5px solid hsl(0 60% 88%);border-radius:999px;font-size:0.75rem;font-weight:600;cursor:pointer;background:none;color:hsl(0 60% 45%);">Delete</button>
                </div>
              </div>
              <div data-delete-status="${esc(e.id)}" role="status" style="display:none;margin-top:12px;font-size:0.85rem;padding:8px 12px;border-radius:8px;background:var(--bg-subtle);"></div>
              <div data-edit-form="${esc(e.id)}" style="display:none;margin-top:24px;padding-top:24px;border-top:1px solid var(--border);"></div>
            </div>`).join('')}
        </div>
      </div>`;
  }

  /** Form markup. `key` is 'new' or the entry id; ids are `f-<key>-<field>` (key is [\w-] only). */
  function entryFormHTML(e, key, opts = {}) {
    const todayFormatted = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const displayDate = key === 'new' ? todayFormatted : (e.date || todayFormatted);
    const priceVal = e.price !== undefined ? e.price : 0;
    const previewWordsVal = e.previewWords || 100;
    const bodyText = (Array.isArray(e.body) ? e.body : []).join('\n\n');
    const p = `f-${key}`;
    const btn = (attr, title, css, label) => `<button type="button" ${attr}="${p}" title="${title}" style="padding:4px 10px;border:1px solid var(--border);border-radius:6px;background:var(--bg-subtle);font-size:0.8rem;color:var(--text);cursor:pointer;${css}">${label}</button>`;
    return `
      <div style="display:flex;flex-direction:column;gap:18px;" data-form="${key}">
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(160px, 1fr));gap:16px;">
          <div>
            <label for="${p}-category" style="${LABEL_CSS}">Category</label>
            <select id="${p}-category" style="${FIELD_CSS}cursor:pointer;">${CATEGORIES.map((c) => `<option ${e.category === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
          </div>
          <div>
            <span style="${LABEL_CSS}">Publish Date</span>
            <div style="padding:10px 14px;background:var(--bg-subtle);border:1.5px solid var(--border);border-radius:8px;font-size:0.9rem;font-weight:500;">${key === 'new' ? `Today (${esc(todayFormatted)})` : esc(displayDate)}</div>
            <input type="hidden" id="${p}-date" value="${esc(displayDate)}" />
          </div>
          <div>
            <label for="${p}-author" style="${LABEL_CSS}">Author</label>
            <input id="${p}-author" value="${esc(e.author || 'Vic Munala')}" placeholder="Vic Munala" style="${FIELD_CSS}" />
          </div>
          <div>
            <label for="${p}-price" style="${LABEL_CSS}">Price (KES) — 0 = Free</label>
            <input id="${p}-price" type="number" min="0" value="${esc(priceVal)}" inputmode="numeric" style="${FIELD_CSS}" />
            <div id="${p}-price-warn" style="display:${priceVal > 0 ? 'block' : 'none'};margin-top:6px;padding:7px 10px;background:#FFF3CD;border:1px solid #FFC107;border-radius:6px;font-size:0.75rem;color:#7A5000;font-weight:500;">⚠️ Any price above 0 locks this article behind an M-Pesa paywall (minimum KES ${MIN_PRICE}). Set to 0 to make it free.</div>
          </div>
          <div>
            <label for="${p}-preview" style="${LABEL_CSS}">Free Preview (Words)</label>
            <input id="${p}-preview" type="number" min="10" step="10" value="${esc(previewWordsVal)}" style="${FIELD_CSS}" />
          </div>
        </div>
        <div>
          <label for="${p}-title" style="${LABEL_CSS}">Title</label>
          <input id="${p}-title" value="${esc(e.title || '')}" placeholder="Entry title" style="${FIELD_CSS}" />
        </div>
        <div>
          <label for="${p}-excerpt" style="${LABEL_CSS}">Excerpt (teaser sentence)</label>
          <input id="${p}-excerpt" value="${esc(e.excerpt || '')}" placeholder="Short teaser sentence" style="${FIELD_CSS}" />
        </div>
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:8px;">
            <label for="${p}-body" style="${LABEL_CSS}margin:0;">Body (separate paragraphs with a blank line)</label>
            <div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap;">
              ${btn('data-fmt-bold', 'Bold', 'font-weight:700;', 'B')}
              ${btn('data-fmt-italic', 'Italic', 'font-style:italic;font-family:serif;', 'I')}
              ${btn('data-fmt-underline', 'Underline', 'text-decoration:underline;', 'U')}
              ${btn('data-fmt-quote', 'Quote', '', '“ ” Quote')}
              ${btn('data-fmt-hr', 'Scene break', '', '⁂ Scene break')}
            </div>
          </div>
          <textarea id="${p}-body" rows="18" ${opts.bodyLocked ? 'disabled' : ''} placeholder="First paragraph...&#10;&#10;Second paragraph..." style="${FIELD_CSS}min-height:380px;padding:16px;font-size:0.95rem;line-height:1.75;resize:vertical;">${esc(bodyText)}</textarea>
        </div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;">
          <button type="button" data-save="${key}" ${opts.bodyLocked ? 'disabled' : ''} style="padding:10px 24px;background:var(--text);color:var(--white);border:none;border-radius:999px;font-size:0.85rem;font-weight:600;cursor:pointer;">${key === 'new' ? 'Publish Entry' : 'Save Changes'}</button>
          <button type="button" data-cancel="${key}" style="padding:10px 20px;border:1.5px solid var(--border);background:none;border-radius:999px;font-size:0.85rem;color:var(--text-muted);cursor:pointer;">Cancel</button>
          <span data-draft-note="${key}" style="font-size:0.75rem;color:var(--text-muted);"></span>
        </div>
        <div id="${p}-status" role="status" aria-live="polite" style="display:none;font-size:0.85rem;padding:8px 12px;border-radius:8px;background:var(--bg-subtle);"></div>
      </div>`;
  }

  function readForm(key) {
    const g = (f) => app.querySelector(`#f-${key}-${f}`);
    const bodyRaw = g('body')?.value?.trim() ?? '';
    return {
      category: g('category')?.value ?? 'Essay',
      date: g('date')?.value?.trim() ?? '',
      author: g('author')?.value?.trim() || 'Vic Munala',
      price: Number(g('price')?.value) || 0,
      previewWords: Math.max(10, parseInt(g('preview')?.value || '100', 10) || 100),
      title: g('title')?.value?.trim() ?? '',
      excerpt: g('excerpt')?.value?.trim() ?? '',
      body: bodyRaw.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean),
      bodyRaw: g('body')?.value ?? '',
    };
  }

  function setStatus(key, type, msg) {
    const el = app.querySelector(`#f-${key}-status`);
    if (!el) return;
    if (!msg) { el.style.display = 'none'; el.textContent = ''; return; }
    el.style.display = 'block';
    el.style.color = type === 'error' ? 'hsl(0 60% 38%)' : type === 'success' ? 'hsl(143 55% 28%)' : 'var(--text-muted)';
    el.textContent = msg;
  }

  function previewByWords(paragraphs, maxWords) {
    const out = [];
    let count = 0;
    for (const para of paragraphs) {
      if (count >= maxWords) break;
      const words = para.trim().split(/\s+/).filter(Boolean);
      if (count + words.length <= maxWords) { out.push(para); count += words.length; }
      else {
        const rest = maxWords - count;
        if (rest > 0) out.push(words.slice(0, rest).join(' '));
        break;
      }
    }
    return out.length ? out : [paragraphs[0]];
  }

  function wrapSelection(ta, before, after) {
    if (!ta) return;
    const s = ta.selectionStart || 0, e = ta.selectionEnd || 0;
    const sel = ta.value.substring(s, e) || 'text';
    ta.value = ta.value.substring(0, s) + before + sel + after + ta.value.substring(e);
    ta.selectionStart = s + before.length;
    ta.selectionEnd = s + before.length + sel.length;
    ta.focus();
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }

  /** Wire formatting buttons, price warning and autosave for the form with this key. */
  function wireFormCommon(key, draftId) {
    const p = `f-${key}`;
    const ta = app.querySelector(`#${p}-body`);
    const fmt = (attr, before, after, insert) => app.querySelector(`[${attr}="${p}"]`)?.addEventListener('click', () => {
      if (insert) {
        const s = ta.selectionStart || 0;
        ta.value = ta.value.slice(0, s) + insert + ta.value.slice(ta.selectionEnd || s);
        ta.selectionStart = ta.selectionEnd = s + insert.length;
        ta.focus();
        ta.dispatchEvent(new Event('input', { bubbles: true }));
      } else wrapSelection(ta, before, after);
    });
    fmt('data-fmt-bold', '**', '**');
    fmt('data-fmt-italic', '*', '*');
    fmt('data-fmt-underline', '<u>', '</u>');
    fmt('data-fmt-quote', '> ', '');
    fmt('data-fmt-hr', '', '', '\n\n---\n\n');

    const priceEl = app.querySelector(`#${p}-price`);
    priceEl?.addEventListener('input', () => {
      const warn = app.querySelector(`#${p}-price-warn`);
      if (warn) warn.style.display = Number(priceEl.value) > 0 ? 'block' : 'none';
    });

    // Autosave: 600ms after the last keystroke, kept until the entry is actually saved.
    let t = null;
    const note = app.querySelector(`[data-draft-note="${key}"]`);
    const form = app.querySelector(`[data-form="${key}"]`);
    form?.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(() => {
        saveDraft(draftId, readForm(key));
        if (note) note.textContent = 'Draft autosaved on this device';
      }, 600);
    });
  }

  function hydrateFromDraft(key, draft) {
    const set = (f, v) => { const el = app.querySelector(`#f-${key}-${f}`); if (el) el.value = v ?? ''; };
    set('category', draft.category); set('author', draft.author); set('price', draft.price);
    set('preview', draft.previewWords); set('title', draft.title); set('excerpt', draft.excerpt);
    set('body', draft.bodyRaw ?? (draft.body || []).join('\n\n'));
    app.querySelector(`#f-${key}-price`)?.dispatchEvent(new Event('input'));
    const note = app.querySelector(`[data-draft-note="${key}"]`);
    if (note) note.textContent = 'Restored your unsaved draft';
  }

  async function save(key, entryOrNull) {
    const btn = app.querySelector(`[data-save="${key}"]`);
    if (!btn || btn.disabled) return;
    const f = readForm(key);
    if (!f.title) { setStatus(key, 'error', 'Give the entry a title first.'); return; }
    if (f.body.length === 0) { setStatus(key, 'error', 'The body is empty.'); return; }
    if (f.price > 0 && f.price < MIN_PRICE) { setStatus(key, 'error', `The lowest price M-Pesa can charge is KES ${MIN_PRICE}. Use 0 for free.`); return; }

    const isPaid = f.price > 0;
    const id = entryOrNull ? entryOrNull.id : String(Date.now());
    const entry = {
      ...(entryOrNull || {}),
      id, slug: entryOrNull ? entryOrNull.slug : id,
      category: f.category, date: f.date || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      author: f.author, price: f.price, previewWords: f.previewWords, title: f.title, excerpt: f.excerpt,
      // Paid entries publish only the preview; the full text goes to full_body IN THE SAME REQUEST.
      body: isPaid ? previewByWords(f.body, f.previewWords) : f.body,
    };

    btn.disabled = true;
    const label = btn.textContent;
    btn.textContent = key === 'new' ? 'Publishing…' : 'Saving…';
    setStatus(key, 'info', 'Saving…');

    const r = await upsertEntryToDB(entry, isPaid ? f.body : undefined);
    if (r.status === 401) { handleSessionExpired(app); return; }
    if (!r.ok) {
      setStatus(key, 'error', `${r.error || "Couldn't save."} Nothing was lost — your text is still here and autosaved. Try again.`);
      btn.disabled = false;
      btn.textContent = label;
      return;
    }
    clearDraft(key === 'new' ? 'new' : id);
    openForms.delete(key);
    invalidateEntryList();
    setStatus(key, 'success', key === 'new' ? '✓ Published.' : '✓ Saved.');
    store.entries = null;
    setTimeout(() => show('entries', { force: true }), 600);
  }

  function wireEntries() {
    const entries = store.entries;
    const newForm = app.querySelector('#new-entry-form');

    function openNew() {
      newForm.style.display = 'block';
      openForms.add('new');
    }
    wireFormCommon('new', 'new');
    const nd = loadDraft('new');
    if (nd || openForms.has('new')) { openNew(); if (nd) hydrateFromDraft('new', nd); }

    app.querySelector('#new-entry-btn')?.addEventListener('click', () => {
      if (newForm.style.display === 'none') openNew();
      else { newForm.style.display = 'none'; openForms.delete('new'); }
    });
    app.querySelector('[data-save="new"]')?.addEventListener('click', () => save('new', null));
    app.querySelector('[data-cancel="new"]')?.addEventListener('click', () => {
      if (loadDraft('new') && !confirm('Discard this unsaved entry?')) return;
      clearDraft('new');
      newForm.style.display = 'none';
      openForms.delete('new');
    });

    entries.forEach((entry) => {
      const host = app.querySelector(`[data-edit-form="${CSS.escape(entry.id)}"]`);
      if (!host) return;
      const key = entry.id;
      let loaded = false;

      async function openEdit() {
        host.style.display = 'block';
        openForms.add(key);
        if (loaded) return;
        // Locked until the TRUE saved text has loaded, so the preview can never be saved over the full article.
        host.innerHTML = entryFormHTML(entry, key, { bodyLocked: true });
        wireFormCommon(key, key);
        wireEditButtons();
        setStatus(key, 'info', 'Loading the full saved text…');

        const res = await getEntryFullBodyFromDB(entry.id);
        if (res.status === 401) { handleSessionExpired(app); return; }
        const bodyEl = app.querySelector(`#f-${key}-body`);
        if (!res.ok) {
          setStatus(key, 'error', `${res.error || "Couldn't load the full text."} Editing is locked so nothing gets overwritten.`);
          const retry = document.createElement('button');
          retry.type = 'button';
          retry.textContent = 'Try again';
          retry.style.cssText = 'margin-left:10px;padding:4px 12px;border:1.5px solid var(--border);border-radius:999px;font-weight:600;cursor:pointer;';
          retry.addEventListener('click', () => { loaded = false; openEdit(); });
          app.querySelector(`#f-${key}-status`)?.appendChild(retry);
          return;
        }
        const full = Array.isArray(res.data?.fullBody) ? res.data.fullBody : [];
        // The real text: the server's full_body when there is one, otherwise the public body.
        const realBody = full.length > 0 ? full : entry.body;
        if (bodyEl) bodyEl.value = realBody.join('\n\n');
        const draft = loadDraft(key);
        if (draft) hydrateFromDraft(key, draft);
        if (bodyEl) bodyEl.disabled = false;
        const saveBtn = app.querySelector(`[data-save="${CSS.escape(key)}"]`);
        if (saveBtn) saveBtn.disabled = false;
        loaded = true;
        if (Number(entry.price) <= 0 && full.length > 0 && !draft) {
          setStatus(key, 'info', 'This entry is Free, but the server has a longer saved version (likely from when it was paid). It has been loaded below — check it, then Save to publish it.');
        } else {
          setStatus(key, null, null);
        }
      }

      function wireEditButtons() {
        app.querySelector(`[data-save="${CSS.escape(key)}"]`)?.addEventListener('click', () => save(key, entry));
        app.querySelector(`[data-cancel="${CSS.escape(key)}"]`)?.addEventListener('click', () => {
          if (loadDraft(key) && !confirm('Discard your unsaved changes to this entry?')) return;
          clearDraft(key);
          host.style.display = 'none';
          host.innerHTML = '';
          loaded = false;
          openForms.delete(key);
        });
      }

      app.querySelector(`[data-edit="${CSS.escape(key)}"]`)?.addEventListener('click', () => {
        if (host.style.display === 'block') { host.style.display = 'none'; openForms.delete(key); return; }
        openEdit();
      });
      // A saved draft or an open form survives tab switches: reopen it.
      if (openForms.has(key) || loadDraft(key)) openEdit();

      app.querySelector(`[data-delete="${CSS.escape(key)}"]`)?.addEventListener('click', async (ev) => {
        if (!confirm(`Delete "${entry.title}"?\n\nThis removes it, including any paid full text, and can't be undone.`)) return;
        const btn = ev.currentTarget;
        const statusEl = app.querySelector(`[data-delete-status="${CSS.escape(key)}"]`);
        const say = (color, m) => { if (statusEl) { statusEl.style.display = 'block'; statusEl.style.color = color; statusEl.textContent = m; } };
        btn.disabled = true;
        btn.textContent = 'Deleting…';
        const r = await deleteEntryFromDB(entry.id);
        if (r.status === 401) { handleSessionExpired(app); return; }
        if (!r.ok) {
          say('hsl(0 60% 38%)', r.error || "Couldn't delete this entry. Please try again.");
          btn.disabled = false;
          btn.textContent = 'Delete';
          return;
        }
        clearDraft(entry.id);
        invalidateEntryList();
        say('hsl(143 55% 28%)', 'Deleted.');
        store.entries = null;
        setTimeout(() => show('entries', { force: true }), 400);
      });
    });
  }

  show(section);
}
