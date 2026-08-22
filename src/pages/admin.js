import { ENTRIES as DEFAULT_ENTRIES } from '../data/entries.js';

const ADMIN_PASS = 'village2026';
const STORAGE_KEY = 'tvn_admin_data';
const ORDERS_KEY = 'tvn_orders_data';
const SUBSCRIBERS_KEY = 'tvn_subscribers_data';
const TIPS_KEY = 'tvn_tips_data';

// ── Default Mock / Seed Data for Tracking ────────────────────────────────────
const DEFAULT_ORDERS = [
  { id: 'ORD-1001', name: 'Wanjiku Kamau', phone: '0722123456', address: 'Kilimani, Nairobi (Near Yaya Centre)', amount: 1500, signed: true, date: '11 Aug 2026', status: 'Delivered' },
  { id: 'ORD-1002', name: 'David Omondi', phone: '0711987654', address: 'Milimani, Nakuru', amount: 1500, signed: true, date: '12 Aug 2026', status: 'Dispatched' },
  { id: 'ORD-1003', name: 'Faith Kiprono', phone: '0733456789', address: 'Westlands, Nairobi (Rhapta Rd)', amount: 1500, signed: false, date: '13 Aug 2026', status: 'Paid' },
];

const DEFAULT_SUBSCRIBERS = [
  { email: 'sarah.mwangi@gmail.com', date: '08 Aug 2026' },
  { email: 'brian.ochieng@yahoo.com', date: '11 Aug 2026' },
  { email: 'njeri.writer@outlook.com', date: '13 Aug 2026' },
];

const DEFAULT_TIPS = [
  { phone: '0722445566', amount: 250, date: '10 Aug 2026' },
  { phone: '0710889900', amount: 100, date: '12 Aug 2026' },
  { phone: '0799112233', amount: 500, date: '13 Aug 2026' },
];

// ── Content Data helpers ─────────────────────────────────────────────────────
export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
export function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
export function getEntries() {
  const d = loadData();
  if (d?.entries && d.entries.length > 0 && d.entries[0].id !== '1') {
    return d.entries;
  }
  return DEFAULT_ENTRIES;
}
export function getProjects() {
  const d = loadData();
  return d?.projects ?? null;
}
export function getBookData() {
  const d = loadData();
  return d?.book ?? null;
}

// ── People & Customer Tracking Helpers ───────────────────────────────────────
export function getOrders() {
  try {
    const cleared = localStorage.getItem('tvn_cleared_mock_data') === 'true';
    const raw = localStorage.getItem(ORDERS_KEY);
    if (raw) return JSON.parse(raw);
    return cleared ? [] : DEFAULT_ORDERS;
  } catch { return []; }
}

export function saveOrders(orders) {
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

export function addOrder(order) {
  const orders = getOrders();
  const newOrder = {
    id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
    date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    status: 'Paid',
    ...order,
  };
  orders.unshift(newOrder);
  saveOrders(orders);
  return newOrder;
}

export function updateOrderStatus(id, newStatus) {
  const orders = getOrders();
  const idx = orders.findIndex(o => o.id === id);
  if (idx !== -1) {
    orders[idx].status = newStatus;
    saveOrders(orders);
  }
}

export function getSubscribers() {
  try {
    const cleared = localStorage.getItem('tvn_cleared_mock_data') === 'true';
    const raw = localStorage.getItem(SUBSCRIBERS_KEY);
    if (raw) return JSON.parse(raw);
    return cleared ? [] : DEFAULT_SUBSCRIBERS;
  } catch { return []; }
}

export function saveSubscribers(subs) {
  localStorage.setItem(SUBSCRIBERS_KEY, JSON.stringify(subs));
}

export function addSubscriber(email) {
  const subs = getSubscribers();
  if (!subs.some(s => s.email.toLowerCase() === email.toLowerCase())) {
    subs.unshift({
      email,
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    });
    saveSubscribers(subs);
  }
}

export function getTips() {
  try {
    const cleared = localStorage.getItem('tvn_cleared_mock_data') === 'true';
    const raw = localStorage.getItem(TIPS_KEY);
    if (raw) return JSON.parse(raw);
    return cleared ? [] : DEFAULT_TIPS;
  } catch { return []; }
}

export function saveTips(tips) {
  localStorage.setItem(TIPS_KEY, JSON.stringify(tips));
}

export function clearDemoData() {
  localStorage.setItem('tvn_cleared_mock_data', 'true');
  saveOrders([]);
  saveSubscribers([]);
  saveTips([]);
}

export function addTip(tip) {
  const tips = getTips();
  tips.unshift({
    date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    ...tip,
  });
  saveTips(tips);
}

// ── Analytics Helpers ────────────────────────────────────────────────────────
export function getAnalytics() {
  try {
    const raw = localStorage.getItem('tvn_analytics');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function clearAnalytics() {
  localStorage.removeItem('tvn_analytics');
}


export function getAdminPass() {
  return localStorage.getItem('tvn_custom_admin_pass') || ADMIN_PASS;
}

export function setAdminPass(newPass) {
  localStorage.setItem('tvn_custom_admin_pass', newPass);
}

// ── Admin page ───────────────────────────────────────────────────────────────
export function renderAdmin(app) {
  if (!checkAuth()) { renderLogin(app); return; }
  renderDashboard(app);
}

function checkAuth() {
  return sessionStorage.getItem('tvn_auth') === 'ok';
}

// ── Login screen ─────────────────────────────────────────────────────────────
function renderLogin(app) {
  document.title = "Admin — The Villager's Notes";
  app.innerHTML = `
    <div style="min-height:80vh;display:flex;align-items:center;justify-content:center;padding:24px;">
      <div style="width:100%;max-width:380px;background:var(--white);border:1px solid var(--border);border-radius:16px;padding:32px;box-shadow:0 4px 20px rgba(0,0,0,0.04);">
        <p style="font-family:var(--font-hand);font-size:2.2rem;color:var(--accent);margin-bottom:4px;line-height:1.1;">
          The Villager's Notes
        </p>
        <p style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-muted);margin-bottom:28px;">
          Private Author Admin
        </p>
        <form id="login-form">
          <input type="password" id="pass-input" placeholder="Password" autocomplete="current-password"
            style="width:100%;padding:12px 16px;border:1.5px solid var(--border);
                   border-radius:8px;font-size:1rem;font-family:var(--font-sans);
                   background:var(--white);color:var(--text);outline:none;margin-bottom:16px;
                   box-sizing:border-box;" />
          <button type="submit"
            style="width:100%;padding:12px;background:var(--text);color:var(--white);
                   border:none;border-radius:8px;font-size:0.9rem;font-weight:600;cursor:pointer;">
            Enter Dashboard
          </button>
          <p id="login-err" style="color:hsl(0 60% 55%);font-size:0.82rem;margin-top:12px;display:none;">
            Wrong password.
          </p>
        </form>
      </div>
    </div>`;

  document.getElementById('login-form').addEventListener('submit', e => {
    e.preventDefault();
    const val = document.getElementById('pass-input').value;
    if (val === getAdminPass()) {
      sessionStorage.setItem('tvn_auth', 'ok');
      renderDashboard(app);
    } else {
      document.getElementById('login-err').style.display = 'block';
    }
  });
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function renderDashboard(app) {
  document.title = "Admin — The Villager's Notes";
  let section = 'people'; // default to people/orders

  function render() {
    const data = loadData() || { entries: [...DEFAULT_ENTRIES], projects: null, book: null };
    const entries = data.entries ?? [...DEFAULT_ENTRIES];
    const orders = getOrders();
    const subs = getSubscribers();
    const tips = getTips();

    app.innerHTML = `
      <div style="min-height:100vh;background:var(--bg-subtle);">
        <!-- Admin top bar (Sticky top: 0 with solid opaque background) -->
        <div style="background:var(--background);border-bottom:1px solid var(--border);
                    padding:0 16px;display:flex;align-items:center;
                    justify-content:space-between;height:56px;position:sticky;top:0;z-index:999;gap:8px;box-shadow:0 1px 4px rgba(0,0,0,0.04);">
          <div style="display:flex;align-items:center;gap:10px;overflow-x:auto;flex-shrink:1;min-width:0;">
            <a href="#/" class="label" style="text-decoration:none;font-size:0.72rem;color:var(--text-muted);white-space:nowrap;padding:4px 10px;border:1px solid var(--border);border-radius:999px;transition:all 0.15s ease;"
               onmouseover="this.style.color='var(--accent)';this.style.borderColor='var(--accent)'"
               onmouseout="this.style.color='var(--text-muted)';this.style.borderColor='var(--border)'">
              ← View Site
            </a>
            ${[
              { id: 'people',    short: 'People',    full: `People (${orders.length + subs.length})` },
              { id: 'entries',   short: 'Entries',   full: `Entries (${entries.length})` },
              { id: 'book',      short: 'Book',      full: 'Book' },
              { id: 'analytics', short: 'Stats',     full: 'Analytics' },
              { id: 'settings',  short: 'Settings',  full: 'Settings' },
              { id: 'logout',    short: 'Log out',   full: 'Log out' },
            ].map(tab => `
              <button data-tab="${tab.id}"
                style="padding:6px 10px;border-radius:999px;border:none;cursor:pointer;
                       font-size:0.72rem;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;
                       white-space:nowrap;flex-shrink:0;
                       background:${section===tab.id ? 'var(--text)' : 'transparent'};
                       color:${section===tab.id ? 'var(--white)' : 'var(--text-muted)'};">
                ${section===tab.id ? tab.full : tab.short}
              </button>`).join('')}
          </div>
          <span class="admin-owner-name" style="font-size:0.72rem;color:var(--text-muted);font-weight:500;white-space:nowrap;flex-shrink:0;">Vic Munala</span>
          <style>.admin-owner-name{display:none}@media(min-width:540px){.admin-owner-name{display:inline}}</style>
        </div>

        <div style="max-width:880px;margin:0 auto;padding:40px 24px 80px;">
          ${section === 'people'    ? renderPeopleSection(orders, subs, tips) : ''}
          ${section === 'entries'   ? renderEntriesSection(entries) : ''}
          ${section === 'book'      ? renderBookSection(data.book) : ''}
          ${section === 'analytics' ? renderAnalyticsSection() : ''}
          ${section === 'settings'  ? renderSettingsSection() : ''}
        </div>
      </div>`;

    // Tab buttons
    app.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.tab === 'logout') {
          sessionStorage.removeItem('tvn_auth');
          window.location.hash = '#/';
          return;
        }
        section = btn.dataset.tab;
        render();
      });
    });

    if (section === 'people') wirePeopleEvents(app, render);
    if (section === 'entries') wireEntriesEvents(app, data, render);
    if (section === 'book') wireBookEvents(app, data, render);
    if (section === 'analytics') wireAnalyticsEvents(app, render);
    if (section === 'settings') wireSettingsEvents(app, render);
  }

  render();
}

// ── People & Customers Section ───────────────────────────────────────────────
function renderPeopleSection(orders, subs, tips) {
  const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.amount) || 1500), 0);
  const totalTips = tips.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  return `
    <div>
      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:28px;flex-wrap:wrap;gap:12px;">
        <div>
          <p style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-muted);margin-bottom:4px;">Audience &amp; Direct Sales</p>
          <h2 style="font-family:var(--font-hand);font-size:2.4rem;font-weight:600;line-height:1;">Readers &amp; Customers</h2>
        </div>
        <button id="clear-demo-data-btn" style="padding:7px 16px;border:1px solid hsl(0 60% 85%);border-radius:999px;background:none;font-size:0.75rem;font-weight:600;color:hsl(0 60% 55%);cursor:pointer;transition:all 0.15s ease;"
          onmouseover="this.style.background='hsl(0 60% 95%)'" onmouseout="this.style.background='none'">
          Clear Demo Stats
        </button>
      </div>

      <!-- Stat Cards -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:16px;margin-bottom:32px;">
        <div style="background:var(--white);border:1px solid var(--border);border-radius:12px;padding:24px;box-sizing:border-box;">
          <div style="font-size:0.7rem;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);margin-bottom:8px;">Book Orders</div>
          <div style="font-family:var(--font-hand);font-size:2.4rem;font-weight:700;color:var(--accent);line-height:1;margin-bottom:8px;">${orders.length}</div>
          <div style="font-size:0.85rem;color:var(--text-muted);">Gross: <strong style="color:var(--text)">KES ${totalRevenue.toLocaleString()}</strong></div>
        </div>

        <div style="background:var(--white);border:1px solid var(--border);border-radius:12px;padding:24px;box-sizing:border-box;">
          <div style="font-size:0.7rem;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);margin-bottom:8px;">Newsletter Subscribers</div>
          <div style="font-family:var(--font-hand);font-size:2.4rem;font-weight:700;color:var(--text);line-height:1;margin-bottom:8px;">${subs.length}</div>
          <div style="font-size:0.85rem;color:var(--text-muted);">Direct email audience</div>
        </div>

        <div style="background:var(--white);border:1px solid var(--border);border-radius:12px;padding:24px;box-sizing:border-box;">
          <div style="font-size:0.7rem;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);margin-bottom:8px;">Soda Supporters</div>
          <div style="font-family:var(--font-hand);font-size:2.4rem;font-weight:700;color:hsl(143 60% 40%);line-height:1;margin-bottom:8px;">${tips.length}</div>
          <div style="font-size:0.85rem;color:var(--text-muted);">Tips: <strong style="color:var(--text)">KES ${totalTips.toLocaleString()}</strong></div>
        </div>
      </div>

      <!-- 1. Book Orders Table -->
      <div style="background:var(--white);border:1px solid var(--border);border-radius:12px;padding:28px;margin-bottom:32px;box-sizing:border-box;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
          <h3 style="font-family:var(--font-hand);font-size:1.6rem;font-weight:600;">Book Orders (${orders.length})</h3>
          <button id="copy-orders-phone" style="padding:6px 14px;border:1px solid var(--border);border-radius:999px;background:none;font-size:0.75rem;font-weight:500;color:var(--text-muted);cursor:pointer;">
            Copy Customer Phones
          </button>
        </div>

        ${orders.length === 0 ? `<p style="color:var(--text-muted);font-size:0.9rem;">No orders yet.</p>` : `
          <div style="display:flex;flex-direction:column;gap:14px;">
            ${orders.map((o) => `
              <div style="border:1px solid var(--border);border-radius:10px;padding:18px 20px;display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px;background:var(--bg-subtle);">
                <div style="flex:1;min-width:260px;">
                  <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                    <strong style="font-size:1.05rem;">${o.name}</strong>
                    <span style="font-size:0.7rem;color:var(--text-muted);background:var(--white);border:1px solid var(--border);padding:2px 8px;border-radius:4px;">${o.id}</span>
                    ${o.signed ? `<span style="font-size:0.7rem;background:hsl(44 95% 90%);color:hsl(44 95% 30%);padding:2px 8px;border-radius:4px;font-weight:600;">Signed Copy</span>` : ''}
                  </div>
                  <div style="font-size:0.88rem;color:var(--text-muted);line-height:1.6;">
                    📍 ${o.address}<br/>
                    📞 <a href="https://wa.me/${o.phone.replace(/[^0-9]/g, '')}" target="_blank" style="color:var(--accent-dark);text-decoration:none;font-weight:600;">${o.phone}</a> &middot; ${o.date} &middot; KES ${Number(o.amount).toLocaleString()}
                  </div>
                </div>

                <div style="display:flex;align-items:center;gap:8px;">
                  <select data-order-status="${o.id}" style="padding:6px 12px;border-radius:8px;border:1px solid var(--border);font-size:0.8rem;font-weight:600;cursor:pointer;
                    background:${o.status==='Delivered' ? 'hsl(143 60% 92%)' : (o.status==='Dispatched' ? 'hsl(200 80% 92%)' : 'hsl(44 95% 92%)')};
                    color:${o.status==='Delivered' ? 'hsl(143 80% 25%)' : (o.status==='Dispatched' ? 'hsl(200 80% 25%)' : 'hsl(44 95% 25%)')};">
                    <option value="Paid" ${o.status==='Paid'?'selected':''}>Paid</option>
                    <option value="Dispatched" ${o.status==='Dispatched'?'selected':''}>Dispatched</option>
                    <option value="Delivered" ${o.status==='Delivered'?'selected':''}>Delivered</option>
                  </select>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>

      <!-- 2. Newsletter Subscribers -->
      <div style="background:var(--white);border:1px solid var(--border);border-radius:12px;padding:28px;margin-bottom:32px;box-sizing:border-box;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
          <h3 style="font-family:var(--font-hand);font-size:1.6rem;font-weight:600;">Newsletter Audience (${subs.length})</h3>
          <button id="copy-emails-btn" style="padding:6px 14px;border:1px solid var(--border);border-radius:999px;background:none;font-size:0.75rem;font-weight:500;color:var(--text-muted);cursor:pointer;">
            Copy All Emails (CSV)
          </button>
        </div>

        <div style="max-height:260px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;padding:8px 16px;background:var(--bg-subtle);">
          ${subs.length === 0 ? `<p style="color:var(--text-muted);font-size:0.9rem;padding:8px 0;">No subscribers yet.</p>` : subs.map(s => `
            <div style="padding:10px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;font-size:0.9rem;">
              <span style="font-weight:500;">${s.email}</span>
              <span style="color:var(--text-muted);font-size:0.78rem;">${s.date}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- 3. Soda Supporters Log -->
      <div style="background:var(--white);border:1px solid var(--border);border-radius:12px;padding:28px;box-sizing:border-box;">
        <h3 style="font-family:var(--font-hand);font-size:1.6rem;font-weight:600;margin-bottom:18px;">Soda Tips &amp; Support (${tips.length})</h3>
        <div style="max-height:220px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;padding:8px 16px;background:var(--bg-subtle);">
          ${tips.length === 0 ? `<p style="color:var(--text-muted);font-size:0.9rem;padding:8px 0;">No tips yet.</p>` : tips.map(t => `
            <div style="padding:10px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;font-size:0.9rem;">
              <span>🥤 <strong>KES ${Number(t.amount).toLocaleString()}</strong> &middot; <span style="color:var(--text-muted)">${t.phone}</span></span>
              <span style="color:var(--text-muted);font-size:0.78rem;">${t.date}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>`;
}

function wirePeopleEvents(app, render) {
  // Status dropdown change
  app.querySelectorAll('[data-order-status]').forEach(select => {
    select.addEventListener('change', () => {
      updateOrderStatus(select.dataset.orderStatus, select.value);
      render();
    });
  });

  // Copy customer phones
  app.querySelector('#copy-orders-phone')?.addEventListener('click', () => {
    const orders = getOrders();
    const phones = orders.map(o => `${o.name}: ${o.phone}`).join('\n');
    navigator.clipboard.writeText(phones);
    alert('Customer contacts copied to clipboard!');
  });

  // Copy newsletter emails
  app.querySelector('#copy-emails-btn')?.addEventListener('click', () => {
    const subs = getSubscribers();
    const emails = subs.map(s => s.email).join(', ');
    navigator.clipboard.writeText(emails);
    alert('Subscriber emails copied to clipboard!');
  });

  // Clear demo data button
  app.querySelector('#clear-demo-data-btn')?.addEventListener('click', () => {
    if (confirm('Clear all placeholder/demo orders, subscribers, and tips to start fresh?')) {
      clearDemoData();
      render();
    }
  });
}

// ── Analytics Section ───────────────────────────────────────────────────────
function renderAnalyticsSection() {
  const events = getAnalytics();
  const visits = events.filter(e => e.type === 'visit');
  const reads = events.filter(e => e.type === 'read_complete');
  const subs = getSubscribers();

  // Page breakdowns
  const pageCounts = {};
  visits.forEach(v => {
    const p = v.path || 'home';
    pageCounts[p] = (pageCounts[p] || 0) + 1;
  });

  const sortedPages = Object.entries(pageCounts).sort((a, b) => b[1] - a[1]);

  return `
    <div>
      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:28px;flex-wrap:wrap;gap:12px;">
        <div>
          <p style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-muted);margin-bottom:4px;">Readership &amp; Engagement</p>
          <h2 style="font-family:var(--font-hand);font-size:2.4rem;font-weight:600;line-height:1;">Site Analytics</h2>
        </div>
        <button id="clear-analytics-btn" style="padding:6px 14px;border:1px solid hsl(0 60% 88%);border-radius:999px;background:none;font-size:0.75rem;font-weight:600;color:hsl(0 60% 55%);cursor:pointer;">
          Reset Logs
        </button>
      </div>

      <!-- Stat Cards -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:16px;margin-bottom:32px;">
        <div style="background:var(--white);border:1px solid var(--border);border-radius:12px;padding:24px;box-sizing:border-box;">
          <div style="font-size:0.7rem;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);margin-bottom:8px;">Total Page Views</div>
          <div style="font-family:var(--font-hand);font-size:2.4rem;font-weight:700;color:var(--text);line-height:1;margin-bottom:8px;">${visits.length}</div>
          <div style="font-size:0.82rem;color:var(--text-muted);">Across ${sortedPages.length} unique routes</div>
        </div>

        <div style="background:var(--white);border:1px solid var(--border);border-radius:12px;padding:24px;box-sizing:border-box;">
          <div style="font-size:0.7rem;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);margin-bottom:8px;">Completed Reads</div>
          <div style="font-family:var(--font-hand);font-size:2.4rem;font-weight:700;color:var(--accent);line-height:1;margin-bottom:8px;">${reads.length}</div>
          <div style="font-size:0.82rem;color:var(--text-muted);">Reached end of articles</div>
        </div>

        <div style="background:var(--white);border:1px solid var(--border);border-radius:12px;padding:24px;box-sizing:border-box;">
          <div style="font-size:0.7rem;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);margin-bottom:8px;">Subscribers</div>
          <div style="font-family:var(--font-hand);font-size:2.4rem;font-weight:700;color:hsl(143 60% 40%);line-height:1;margin-bottom:8px;">${subs.length}</div>
          <div style="font-size:0.82rem;color:var(--text-muted);">Audience conversion</div>
        </div>
      </div>

      <!-- Page Views Breakdown -->
      <div style="background:var(--white);border:1px solid var(--border);border-radius:12px;padding:28px;margin-bottom:32px;box-sizing:border-box;">
        <h3 style="font-family:var(--font-hand);font-size:1.6rem;font-weight:600;margin-bottom:18px;">Page Popularity</h3>
        ${sortedPages.length === 0 ? `<p style="color:var(--text-muted);font-size:0.9rem;">No page views logged yet.</p>` : `
          <div style="display:flex;flex-direction:column;gap:10px;">
            ${sortedPages.map(([page, count]) => `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:var(--bg-subtle);border-radius:6px;font-size:0.88rem;">
                <span style="font-family:monospace;color:var(--text);">/${page === 'home' ? '' : page}</span>
                <span style="font-weight:600;color:var(--accent-dark);">${count} view${count > 1 ? 's' : ''}</span>
              </div>
            `).join('')}
          </div>
        `}
      </div>

      <!-- Recent Activity Log -->
      <div style="background:var(--white);border:1px solid var(--border);border-radius:12px;padding:28px;box-sizing:border-box;">
        <h3 style="font-family:var(--font-hand);font-size:1.6rem;font-weight:600;margin-bottom:18px;">Recent Activity (${events.length})</h3>
        ${events.length === 0 ? `<p style="color:var(--text-muted);font-size:0.9rem;">No activity logged yet.</p>` : `
          <div style="max-height:320px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;padding:8px 16px;background:var(--bg-subtle);">
            ${events.slice().reverse().slice(0, 30).map(e => `
              <div style="padding:10px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;font-size:0.85rem;flex-wrap:wrap;gap:8px;">
                <span>
                  ${e.type === 'visit' 
                    ? `👁️ Visited <code style="background:var(--white);padding:2px 6px;border-radius:4px;border:1px solid var(--border);">/${e.path || ''}</code>` 
                    : `📖 Finished reading <strong>${e.title || 'entry'}</strong>`}
                </span>
                <span style="color:var(--text-muted);font-size:0.75rem;">${new Date(e.time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}, ${new Date(e.time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    </div>`;
}

function wireAnalyticsEvents(app, render) {
  app.querySelector('#clear-analytics-btn')?.addEventListener('click', () => {
    if (confirm('Reset all site analytics logs?')) {
      clearAnalytics();
      render();
    }
  });
}

// ── Entries section ──────────────────────────────────────────────────────────
function renderEntriesSection(entries) {
  return `
    <div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:28px;">
        <div>
          <p style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-muted);margin-bottom:4px;">Published Works</p>
          <h2 style="font-family:var(--font-hand);font-size:2.4rem;font-weight:600;line-height:1;">Entries (${entries.length})</h2>
        </div>
        <button id="new-entry-btn" style="padding:10px 22px;background:var(--accent);
          color:var(--text);border:none;border-radius:999px;font-size:0.85rem;font-weight:700;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
          + New Entry
        </button>
      </div>

      <!-- New entry form (hidden by default) -->
      <div id="new-entry-form" style="display:none;background:var(--white);border:1px solid var(--border);
           border-radius:14px;padding:28px;margin-bottom:28px;box-sizing:border-box;">
        ${entryFormHTML({ id: '', meta:'', category:'Essay', date:'', title:'', excerpt:'', body:[] }, true)}
      </div>

      <!-- Entry list -->
      <div style="display:flex;flex-direction:column;gap:16px;">
        ${entries.map((e, i) => `
          <div class="admin-entry-card" data-idx="${i}"
               style="background:var(--white);border:1px solid var(--border);border-radius:12px;
                      padding:24px 28px;box-sizing:border-box;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;">
              <div style="flex:1;">
                <div style="font-size:0.72rem;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;
                            color:var(--text-muted);margin-bottom:6px;">${e.meta}</div>
                <div style="font-family:var(--font-hand);font-size:1.6rem;font-weight:600;color:var(--accent-dark);line-height:1.25;margin-bottom:8px;">${e.title}</div>
                <p style="font-size:0.88rem;color:var(--text-muted);line-height:1.5;margin:0;">${e.excerpt || ''}</p>
              </div>
              <div style="display:flex;gap:8px;flex-shrink:0;">
                <button data-edit="${i}"
                  style="padding:6px 16px;border:1.5px solid var(--border);
                         border-radius:999px;font-size:0.75rem;font-weight:600;cursor:pointer;background:var(--bg-subtle);
                         color:var(--text);">Edit</button>
                <button data-delete="${i}"
                  style="padding:6px 14px;border:1.5px solid hsl(0 60% 88%);
                         border-radius:999px;font-size:0.75rem;font-weight:600;cursor:pointer;background:none;
                         color:hsl(0 60% 55%);">Delete</button>
              </div>
            </div>
            <!-- Inline edit form -->
            <div id="edit-form-${i}" style="display:none;margin-top:24px;padding-top:24px;
                 border-top:1px solid var(--border);">
              ${entryFormHTML(e, false, i)}
            </div>
          </div>
        `).join('')}
      </div>
    </div>`;
}

function insertAtCursor(textarea, text) {
  if (!textarea) return;
  const start = textarea.selectionStart || 0;
  const end = textarea.selectionEnd || 0;
  const val = textarea.value;
  textarea.value = val.substring(0, start) + text + val.substring(end);
  textarea.selectionStart = textarea.selectionEnd = start + text.length;
  textarea.focus();
}

function wrapSelection(textarea, before, after) {
  if (!textarea) return;
  const start = textarea.selectionStart || 0;
  const end = textarea.selectionEnd || 0;
  const val = textarea.value;
  const selected = val.substring(start, end) || 'text';
  textarea.value = val.substring(0, start) + before + selected + after + val.substring(end);
  textarea.selectionStart = start + before.length;
  textarea.selectionEnd = start + before.length + selected.length;
  textarea.focus();
}

const CATEGORIES = ['Fiction', 'Random Thoughts', 'Shorts', 'Essay', 'Article', 'Reflections'];

function entryFormHTML(e, isNew, idx = '') {
  let bodyList = Array.isArray(e.body) ? e.body : [];
  if (e.id && Number(e.price) > 0) {
    try {
      const privateBody = localStorage.getItem(`tvn_paid_${e.id}`);
      if (privateBody) bodyList = JSON.parse(privateBody);
    } catch (_) {}
  }
  const bodyText = bodyList.join('\n\n');
  const prefix = isNew ? 'new' : `edit-${idx}`;
  const authorVal = e.author || 'Vic Munala';
  const priceVal = e.price !== undefined ? e.price : 0;
  const todayFormatted = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const displayDate = isNew ? todayFormatted : (e.date || todayFormatted);

  const previewCountVal = e.previewCount !== undefined ? e.previewCount : 2;

  return `
    <div style="display:flex;flex-direction:column;gap:18px;">
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(160px, 1fr));gap:16px;">
        <div>
          <label style="font-size:0.72rem;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);display:block;margin-bottom:6px;">Category</label>
          <select id="${prefix}-category" style="width:100%;padding:10px 14px;border:1.5px solid var(--border);border-radius:8px;font-size:0.9rem;background:var(--white);color:var(--text);cursor:pointer;">
            ${CATEGORIES.map(c => `<option ${e.category===c?'selected':''}>${c}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="font-size:0.72rem;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);display:block;margin-bottom:6px;">Publish Date</label>
          <div style="padding:10px 14px;background:var(--bg-subtle);border:1.5px solid var(--border);border-radius:8px;font-size:0.9rem;color:var(--text);font-weight:500;">
            ${isNew ? `Today (${todayFormatted})` : displayDate}
          </div>
          <input type="hidden" id="${prefix}-date" value="${displayDate}" />
        </div>
        <div>
          <label style="font-size:0.72rem;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);display:block;margin-bottom:6px;">Author</label>
          <input id="${prefix}-author" value="${authorVal}" placeholder="Vic Munala"
            style="width:100%;padding:10px 14px;border:1.5px solid var(--border);border-radius:8px;font-size:0.9rem;box-sizing:border-box;" />
        </div>
        <div>
          <label style="font-size:0.72rem;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);display:block;margin-bottom:6px;">Price (KES) — 0 = Free</label>
          <input id="${prefix}-price" type="number" min="0" value="${priceVal}" placeholder="0"
            style="width:100%;padding:10px 14px;border:1.5px solid var(--border);border-radius:8px;font-size:0.9rem;box-sizing:border-box;" />
        </div>
        <div>
          <label style="font-size:0.72rem;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);display:block;margin-bottom:6px;">Free Preview (Paragraphs)</label>
          <input id="${prefix}-preview-count" type="number" min="1" max="10" value="${previewCountVal}" placeholder="2" title="How many paragraphs readers see before the paywall"
            style="width:100%;padding:10px 14px;border:1.5px solid var(--border);border-radius:8px;font-size:0.9rem;box-sizing:border-box;" />
        </div>
      </div>
      <div>
        <label style="font-size:0.72rem;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);display:block;margin-bottom:6px;">Title</label>
        <input id="${prefix}-title" value="${e.title||''}" placeholder="Entry title"
          style="width:100%;padding:10px 14px;border:1.5px solid var(--border);border-radius:8px;font-size:0.95rem;box-sizing:border-box;" />
      </div>
      <div>
        <label style="font-size:0.72rem;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);display:block;margin-bottom:6px;">Excerpt (teaser sentence)</label>
        <input id="${prefix}-excerpt" value="${e.excerpt||''}" placeholder="Short teaser sentence"
          style="width:100%;padding:10px 14px;border:1.5px solid var(--border);border-radius:8px;font-size:0.9rem;box-sizing:border-box;" />
      </div>
      <div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:8px;">
          <label style="font-size:0.72rem;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);margin:0;">Body (separate paragraphs with a blank line)</label>
          <div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap;">
            <button type="button" data-format-bold="${prefix}" title="Bold" style="padding:4px 10px;border:1px solid var(--border);border-radius:6px;background:var(--bg-subtle);font-size:0.8rem;font-weight:700;color:var(--text);cursor:pointer;">
              B
            </button>
            <button type="button" data-format-italic="${prefix}" title="Italic" style="padding:4px 10px;border:1px solid var(--border);border-radius:6px;background:var(--bg-subtle);font-size:0.8rem;font-style:italic;font-family:serif;color:var(--text);cursor:pointer;">
              I
            </button>
            <button type="button" data-format-underline="${prefix}" title="Underline" style="padding:4px 10px;border:1px solid var(--border);border-radius:6px;background:var(--bg-subtle);font-size:0.8rem;text-decoration:underline;color:var(--text);cursor:pointer;">
              U
            </button>
            <button type="button" data-format-quote="${prefix}" title="Quote" style="padding:4px 10px;border:1px solid var(--border);border-radius:6px;background:var(--bg-subtle);font-size:0.8rem;color:var(--text);cursor:pointer;">
              “ ” Quote
            </button>
            <button type="button" data-format-hr="${prefix}" title="Divider" style="padding:4px 10px;border:1px solid var(--border);border-radius:6px;background:var(--bg-subtle);font-size:0.8rem;color:var(--text);cursor:pointer;">
              — Divider
            </button>
          </div>
        </div>
        <textarea id="${prefix}-body" rows="18" placeholder="First paragraph...&#10;&#10;Second paragraph..."
          style="width:100%;min-height:380px;padding:16px;border:1.5px solid var(--border);border-radius:8px;
                 font-size:0.95rem;font-family:var(--font-sans);line-height:1.75;resize:vertical;box-sizing:border-box;">${bodyText}</textarea>
      </div>
      <div style="display:flex;gap:12px;">
        <button data-save="${isNew ? 'new' : idx}"
          style="padding:10px 24px;background:var(--text);color:var(--white);
                 border:none;border-radius:999px;font-size:0.85rem;font-weight:600;cursor:pointer;">
          ${isNew ? 'Publish Entry' : 'Save Changes'}
        </button>
        <button data-cancel="${isNew ? 'new' : idx}"
          style="padding:10px 20px;border:1.5px solid var(--border);background:none;
                 border-radius:999px;font-size:0.85rem;color:var(--text-muted);cursor:pointer;">
          Cancel
        </button>
      </div>
    </div>`;
}

function wireEntriesEvents(app, data, render) {
  const entries = data.entries ?? [...DEFAULT_ENTRIES];

  // Wire text formatting buttons
  app.querySelectorAll('[data-format-bold]').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = btn.dataset.formatBold;
      const ta = app.querySelector(`#${p}-body`);
      wrapSelection(ta, '**', '**');
    });
  });

  app.querySelectorAll('[data-format-italic]').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = btn.dataset.formatItalic;
      const ta = app.querySelector(`#${p}-body`);
      wrapSelection(ta, '*', '*');
    });
  });

  app.querySelectorAll('[data-format-underline]').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = btn.dataset.formatUnderline;
      const ta = app.querySelector(`#${p}-body`);
      wrapSelection(ta, '<u>', '</u>');
    });
  });

  app.querySelectorAll('[data-format-quote]').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = btn.dataset.formatQuote;
      const ta = app.querySelector(`#${p}-body`);
      wrapSelection(ta, '> ', '');
    });
  });

  app.querySelectorAll('[data-format-hr]').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = btn.dataset.formatHr;
      const ta = app.querySelector(`#${p}-body`);
      insertAtCursor(ta, '\n\n---\n\n');
    });
  });

  app.querySelector('#new-entry-btn')?.addEventListener('click', () => {
    const form = app.querySelector('#new-entry-form');
    if (form) form.style.display = form.style.display === 'none' ? 'block' : 'none';
  });

  app.querySelector('[data-save="new"]')?.addEventListener('click', () => {
    const e = readEntryForm(app, 'new');
    if (!e.title) return;
    const newId = String(Date.now());
    const count = Number(e.previewCount) > 0 ? Number(e.previewCount) : 2;
    
    // If paid entry, save full body in private store & specified paragraphs as free preview
    if (e.price > 0) {
      localStorage.setItem(`tvn_paid_${newId}`, JSON.stringify(e.body));
      const previewParagraphs = e.body.slice(0, count);
      entries.unshift({ ...e, id: newId, previewCount: count, body: previewParagraphs });
    } else {
      localStorage.removeItem(`tvn_paid_${newId}`);
      entries.unshift({ ...e, id: newId });
    }
    
    saveData({ ...data, entries });
    render();
  });

  app.querySelector('[data-cancel="new"]')?.addEventListener('click', () => {
    const form = app.querySelector('#new-entry-form');
    if (form) form.style.display = 'none';
  });

  entries.forEach((entry, i) => {
    app.querySelector(`[data-edit="${i}"]`)?.addEventListener('click', () => {
      const form = app.querySelector(`#edit-form-${i}`);
      if (form) form.style.display = form.style.display === 'none' ? 'block' : 'none';
    });

    app.querySelector(`[data-delete="${i}"]`)?.addEventListener('click', () => {
      if (!confirm(`Delete "${entries[i].title}"?`)) return;
      localStorage.removeItem(`tvn_paid_${entries[i].id}`);
      entries.splice(i, 1);
      saveData({ ...data, entries });
      render();
    });

    app.querySelector(`[data-save="${i}"]`)?.addEventListener('click', () => {
      const updated = readEntryForm(app, `edit-${i}`);
      const entryId = entries[i].id;
      const count = Number(updated.previewCount) > 0 ? Number(updated.previewCount) : 2;
      
      // If paid entry, save full body in private store & specified paragraphs as free preview
      if (updated.price > 0) {
        localStorage.setItem(`tvn_paid_${entryId}`, JSON.stringify(updated.body));
        const previewParagraphs = updated.body.slice(0, count);
        entries[i] = { ...entries[i], ...updated, previewCount: count, body: previewParagraphs };
      } else {
        localStorage.removeItem(`tvn_paid_${entryId}`);
        entries[i] = { ...entries[i], ...updated };
      }
      
      saveData({ ...data, entries });
      render();
    });

    app.querySelector(`[data-cancel="${i}"]`)?.addEventListener('click', () => {
      const form = app.querySelector(`#edit-form-${i}`);
      if (form) form.style.display = 'none';
    });
  });
}

function readEntryForm(app, prefix) {
  const cat          = app.querySelector(`#${prefix}-category`)?.value ?? 'Essay';
  const rawDate      = app.querySelector(`#${prefix}-date`)?.value?.trim() ?? '';
  let date = '';
  if (rawDate) {
    if (rawDate.includes('-')) {
      const [y, m, d] = rawDate.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      date = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    } else {
      date = rawDate;
    }
  }
  const author       = app.querySelector(`#${prefix}-author`)?.value?.trim() || 'Vic Munala';
  const price        = Number(app.querySelector(`#${prefix}-price`)?.value) || 0;
  const previewCount = Math.max(1, parseInt(app.querySelector(`#${prefix}-preview-count`)?.value || '2', 10));
  const title        = app.querySelector(`#${prefix}-title`)?.value?.trim() ?? '';
  const excerpt      = app.querySelector(`#${prefix}-excerpt`)?.value?.trim() ?? '';
  const bodyRaw      = app.querySelector(`#${prefix}-body`)?.value?.trim() ?? '';
  const body         = bodyRaw.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const meta         = `${cat} · ${date} · ${author}`;
  return { meta, category: cat, date, author, price, previewCount, title, excerpt, body };
}

function toDateInputValue(dateStr) {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return new Date().toISOString().split('T')[0];
}

// ── Book section ─────────────────────────────────────────────────────────────
function renderBookSection(book) {
  const b = book ?? { price: 1500, description: 'A novel about losing yourself and trying to find your way back home.', excerpt: '' };
  return `
    <div>
      <div style="margin-bottom:28px;">
        <p style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-muted);margin-bottom:4px;">Under the Mango Tree</p>
        <h2 style="font-family:var(--font-hand);font-size:2.4rem;font-weight:600;line-height:1;">Book &amp; Order Settings</h2>
      </div>

      <div style="background:var(--white);border:1px solid var(--border);border-radius:12px;padding:28px;box-sizing:border-box;">
        <div style="display:flex;flex-direction:column;gap:20px;">
          <div>
            <label style="font-size:0.72rem;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);display:block;margin-bottom:6px;">Price (KES)</label>
            <input id="book-price" type="number" value="${b.price}"
              style="width:100%;padding:10px 14px;border:1.5px solid var(--border);border-radius:8px;font-size:0.95rem;box-sizing:border-box;" />
          </div>
          <div>
            <label style="font-size:0.72rem;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);display:block;margin-bottom:6px;">Description</label>
            <textarea id="book-desc" rows="3"
              style="width:100%;padding:12px 14px;border:1.5px solid var(--border);border-radius:8px;font-size:0.9rem;font-family:var(--font-sans);line-height:1.6;resize:vertical;box-sizing:border-box;">${b.description}</textarea>
          </div>
          <div>
            <label style="font-size:0.72rem;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);display:block;margin-bottom:6px;">Chapter 1 Excerpt (paste here when ready — leave blank to hide)</label>
            <textarea id="book-excerpt" rows="6" placeholder="Paste the opening of Chapter 1 here..."
              style="width:100%;padding:12px 14px;border:1.5px solid var(--border);border-radius:8px;font-size:0.9rem;font-family:var(--font-sans);line-height:1.8;resize:vertical;box-sizing:border-box;">${b.excerpt||''}</textarea>
          </div>
          <button id="save-book"
            style="align-self:flex-start;padding:10px 24px;background:var(--text);color:var(--white);
                   border:none;border-radius:999px;font-size:0.85rem;font-weight:600;cursor:pointer;">
            Save Book Settings
          </button>
          <p id="book-saved" style="display:none;font-size:0.85rem;font-weight:500;color:hsl(130 50% 40%);">✓ Changes saved successfully.</p>
        </div>
      </div>
    </div>`;
}

function wireBookEvents(app, data, render) {
  app.querySelector('#save-book')?.addEventListener('click', () => {
    const price   = parseInt(app.querySelector('#book-price')?.value ?? '1500');
    const description = app.querySelector('#book-desc')?.value?.trim() ?? '';
    const excerpt = app.querySelector('#book-excerpt')?.value?.trim() ?? '';
    saveData({ ...data, book: { price, description, excerpt } });
    const msg = app.querySelector('#book-saved');
    if (msg) { msg.style.display = 'block'; setTimeout(() => msg.style.display = 'none', 2000); }
  });
}

// ── Settings Section ─────────────────────────────────────────────────────────
function renderSettingsSection() {
  return `
    <div>
      <div style="margin-bottom:28px;">
        <p style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-muted);margin-bottom:4px;">Security &amp; Account</p>
        <h2 style="font-family:var(--font-hand);font-size:2.4rem;font-weight:600;line-height:1;">Admin Settings</h2>
      </div>

      <div style="background:var(--white);border:1px solid var(--border);border-radius:12px;padding:28px;max-width:540px;box-sizing:border-box;">
        <h3 style="font-family:var(--font-hand);font-size:1.6rem;font-weight:600;margin-bottom:8px;">Change Password</h3>
        <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:20px;line-height:1.5;">
          Set a new private password for entering the Author Admin dashboard.
        </p>

        <form id="change-pass-form" style="display:flex;flex-direction:column;gap:16px;">
          <div>
            <label style="font-size:0.72rem;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);display:block;margin-bottom:6px;">Current Password</label>
            <input type="password" id="curr-pass" placeholder="Enter current password" required
              style="width:100%;padding:10px 14px;border:1.5px solid var(--border);border-radius:8px;font-size:0.9rem;box-sizing:border-box;" />
          </div>
          <div>
            <label style="font-size:0.72rem;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);display:block;margin-bottom:6px;">New Password</label>
            <input type="password" id="new-pass" placeholder="Enter new password" required minlength="4"
              style="width:100%;padding:10px 14px;border:1.5px solid var(--border);border-radius:8px;font-size:0.9rem;box-sizing:border-box;" />
          </div>
          <div>
            <label style="font-size:0.72rem;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);display:block;margin-bottom:6px;">Confirm New Password</label>
            <input type="password" id="confirm-pass" placeholder="Confirm new password" required minlength="4"
              style="width:100%;padding:10px 14px;border:1.5px solid var(--border);border-radius:8px;font-size:0.9rem;box-sizing:border-box;" />
          </div>

          <button type="submit" style="padding:10px 22px;background:var(--text);color:var(--white);border:none;border-radius:999px;font-size:0.85rem;font-weight:600;cursor:pointer;align-self:flex-start;margin-top:6px;">
            Update Password
          </button>
          <div id="pass-change-msg" style="font-size:0.85rem;display:none;margin-top:8px;"></div>
        </form>
      </div>
    </div>`;
}

function wireSettingsEvents(app, render) {
  app.querySelector('#change-pass-form')?.addEventListener('submit', e => {
    e.preventDefault();
    const curr = app.querySelector('#curr-pass')?.value || '';
    const next = app.querySelector('#new-pass')?.value || '';
    const conf = app.querySelector('#confirm-pass')?.value || '';
    const msg = app.querySelector('#pass-change-msg');
    if (!msg) return;

    if (curr !== getAdminPass()) {
      msg.style.display = 'block';
      msg.style.color = 'hsl(0 60% 50%)';
      msg.textContent = '❌ Current password is incorrect.';
      return;
    }

    if (next !== conf) {
      msg.style.display = 'block';
      msg.style.color = 'hsl(0 60% 50%)';
      msg.textContent = '❌ New passwords do not match.';
      return;
    }

    setAdminPass(next);
    msg.style.display = 'block';
    msg.style.color = 'hsl(143 60% 40%)';
    msg.textContent = '✅ Password updated successfully! Your new password is now active.';
    app.querySelector('#change-pass-form').reset();
  });
}
