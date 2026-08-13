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
  return d?.entries ?? DEFAULT_ENTRIES;
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
    const raw = localStorage.getItem(ORDERS_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_ORDERS;
  } catch { return DEFAULT_ORDERS; }
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
    const raw = localStorage.getItem(SUBSCRIBERS_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_SUBSCRIBERS;
  } catch { return DEFAULT_SUBSCRIBERS; }
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
    const raw = localStorage.getItem(TIPS_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_TIPS;
  } catch { return DEFAULT_TIPS; }
}

export function saveTips(tips) {
  localStorage.setItem(TIPS_KEY, JSON.stringify(tips));
}

export function addTip(tip) {
  const tips = getTips();
  tips.unshift({
    date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    ...tip,
  });
  saveTips(tips);
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
    <div style="min-height:80vh;display:flex;align-items:center;justify-content:center;padding:var(--space-6);">
      <div style="width:100%;max-width:360px;">
        <p style="font-family:var(--font-hand);font-size:2rem;color:var(--accent);margin-bottom:var(--space-2);">
          The Villager's Notes
        </p>
        <p style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-muted);margin-bottom:var(--space-8);">
          Admin Access
        </p>
        <form id="login-form">
          <input type="password" id="pass-input" placeholder="Enter password"
            style="width:100%;padding:var(--space-3) var(--space-4);border:1.5px solid var(--border);
                   border-radius:var(--radius);font-size:1rem;font-family:var(--font-sans);
                   background:var(--white);color:var(--text);outline:none;margin-bottom:var(--space-4);
                   box-sizing:border-box;" />
          <button type="submit"
            style="width:100%;padding:var(--space-3);background:var(--text);color:var(--white);
                   border:none;border-radius:var(--radius);font-size:0.9rem;font-weight:600;cursor:pointer;">
            Enter
          </button>
          <p id="login-err" style="color:hsl(0 60% 55%);font-size:0.82rem;margin-top:var(--space-3);display:none;">
            Wrong password.
          </p>
        </form>
      </div>
    </div>`;

  document.getElementById('login-form').addEventListener('submit', e => {
    e.preventDefault();
    const val = document.getElementById('pass-input').value;
    if (val === ADMIN_PASS) {
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
        <!-- Admin top bar -->
        <div style="background:var(--white);border-bottom:1px solid var(--border);
                    padding:0 var(--space-6);display:flex;align-items:center;
                    justify-content:space-between;height:56px;position:sticky;top:64px;z-index:50;">
          <div style="display:flex;gap:var(--space-1);overflow-x:auto;">
            ${[
              { id: 'people', label: `People (${orders.length + subs.length})` },
              { id: 'entries', label: 'Entries' },
              { id: 'book', label: 'Book' },
              { id: 'logout', label: 'Log out' },
            ].map(tab => `
              <button data-tab="${tab.id}"
                style="padding:var(--space-2) var(--space-4);border-radius:999px;border:none;cursor:pointer;
                       font-size:0.75rem;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;
                       white-space:nowrap;
                       background:${section===tab.id ? 'var(--text)' : 'transparent'};
                       color:${section===tab.id ? 'var(--white)' : 'var(--text-muted)'};">
                ${tab.label}
              </button>`).join('')}
          </div>
          <span style="font-size:0.75rem;color:var(--text-muted);display:none;sm:inline;">
            The Villager's Notes
          </span>
        </div>

        <div style="max-width:860px;margin:0 auto;padding:var(--space-8) var(--space-6);">
          ${section === 'people'  ? renderPeopleSection(orders, subs, tips) : ''}
          ${section === 'entries' ? renderEntriesSection(entries) : ''}
          ${section === 'book'    ? renderBookSection(data.book) : ''}
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
  }

  render();
}

// ── People & Customers Section ───────────────────────────────────────────────
function renderPeopleSection(orders, subs, tips) {
  const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.amount) || 1500), 0);
  const totalTips = tips.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  return `
    <div>
      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:var(--space-6);">
        <div>
          <p style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-muted);margin-bottom:4px;">Audience &amp; Direct Sales</p>
          <h2 style="font-family:var(--font-hand);font-size:2.2rem;font-weight:600;line-height:1;">Readers &amp; Customers</h2>
        </div>
      </div>

      <!-- Stat Cards -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:var(--space-4);margin-bottom:var(--space-8);">
        <div style="background:var(--white);border:1px solid var(--border);border-radius:var(--radius-lg);padding:var(--space-5);">
          <div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);margin-bottom:6px;">Book Orders</div>
          <div style="font-family:var(--font-hand);font-size:2rem;font-weight:700;color:var(--accent);">${orders.length}</div>
          <div style="font-size:0.8rem;color:var(--text-muted);margin-top:2px;">Gross: <strong>KES ${totalRevenue.toLocaleString()}</strong></div>
        </div>

        <div style="background:var(--white);border:1px solid var(--border);border-radius:var(--radius-lg);padding:var(--space-5);">
          <div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);margin-bottom:6px;">Newsletter Subscribers</div>
          <div style="font-family:var(--font-hand);font-size:2rem;font-weight:700;color:var(--text);">${subs.length}</div>
          <div style="font-size:0.8rem;color:var(--text-muted);margin-top:2px;">Direct email audience</div>
        </div>

        <div style="background:var(--white);border:1px solid var(--border);border-radius:var(--radius-lg);padding:var(--space-5);">
          <div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);margin-bottom:6px;">Soda Supporters</div>
          <div style="font-family:var(--font-hand);font-size:2rem;font-weight:700;color:hsl(143 60% 40%);">${tips.length}</div>
          <div style="font-size:0.8rem;color:var(--text-muted);margin-top:2px;">Tips: <strong>KES ${totalTips.toLocaleString()}</strong></div>
        </div>
      </div>

      <!-- 1. Book Orders Table -->
      <div style="background:var(--white);border:1px solid var(--border);border-radius:var(--radius-lg);padding:var(--space-6);margin-bottom:var(--space-8);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-4);flex-wrap:wrap;gap:var(--space-2);">
          <h3 style="font-family:var(--font-hand);font-size:1.4rem;font-weight:600;">Book Orders (${orders.length})</h3>
          <button id="copy-orders-phone" style="padding:4px 12px;border:1px solid var(--border);border-radius:999px;background:none;font-size:0.72rem;color:var(--text-muted);cursor:pointer;">
            Copy Customer Phones
          </button>
        </div>

        ${orders.length === 0 ? `<p style="color:var(--text-muted);font-size:0.85rem;">No orders yet.</p>` : `
          <div style="display:flex;flex-direction:column;gap:var(--space-3);">
            ${orders.map((o) => `
              <div style="border:1px solid var(--border);border-radius:var(--radius);padding:var(--space-4);display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:var(--space-3);">
                <div style="flex:1;min-width:240px;">
                  <div style="display:flex;align-items:center;gap:var(--space-2);margin-bottom:4px;">
                    <strong>${o.name}</strong>
                    <span style="font-size:0.7rem;color:var(--text-muted);background:var(--bg-subtle);padding:1px 6px;border-radius:4px;">${o.id}</span>
                    ${o.signed ? `<span style="font-size:0.68rem;background:hsl(44 95% 90%);color:hsl(44 95% 30%);padding:1px 6px;border-radius:4px;font-weight:600;">Signed Copy</span>` : ''}
                  </div>
                  <div style="font-size:0.85rem;color:var(--text-muted);line-height:1.5;">
                    📍 ${o.address}<br/>
                    📞 <a href="https://wa.me/${o.phone.replace(/[^0-9]/g, '')}" target="_blank" style="color:var(--accent);text-decoration:none;font-weight:500;">${o.phone}</a> &middot; ${o.date} &middot; KES ${Number(o.amount).toLocaleString()}
                  </div>
                </div>

                <div style="display:flex;align-items:center;gap:var(--space-2);">
                  <select data-order-status="${o.id}" style="padding:4px 8px;border-radius:6px;border:1px solid var(--border);font-size:0.78rem;font-weight:600;
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
      <div style="background:var(--white);border:1px solid var(--border);border-radius:var(--radius-lg);padding:var(--space-6);margin-bottom:var(--space-8);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-4);flex-wrap:wrap;gap:var(--space-2);">
          <h3 style="font-family:var(--font-hand);font-size:1.4rem;font-weight:600;">Newsletter Audience (${subs.length})</h3>
          <button id="copy-emails-btn" style="padding:4px 12px;border:1px solid var(--border);border-radius:999px;background:none;font-size:0.72rem;color:var(--text-muted);cursor:pointer;">
            Copy All Emails (CSV)
          </button>
        </div>

        <div style="max-height:220px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius);padding:var(--space-2) var(--space-4);">
          ${subs.map(s => `
            <div style="padding:var(--space-2) 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;font-size:0.85rem;">
              <span>${s.email}</span>
              <span style="color:var(--text-muted);font-size:0.75rem;">${s.date}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- 3. Soda Supporters Log -->
      <div style="background:var(--white);border:1px solid var(--border);border-radius:var(--radius-lg);padding:var(--space-6);">
        <h3 style="font-family:var(--font-hand);font-size:1.4rem;font-weight:600;margin-bottom:var(--space-4);">Soda Tips &amp; Support (${tips.length})</h3>
        <div style="max-height:200px;overflow-y:auto;">
          ${tips.map(t => `
            <div style="padding:var(--space-2) 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;font-size:0.85rem;">
              <span>🥤 KES ${Number(t.amount).toLocaleString()} &middot; ${t.phone}</span>
              <span style="color:var(--text-muted);font-size:0.75rem;">${t.date}</span>
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
}

// ── Entries section ──────────────────────────────────────────────────────────
function renderEntriesSection(entries) {
  return `
    <div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-6);">
        <h2 style="font-family:var(--font-hand);font-size:2rem;font-weight:600;">Entries</h2>
        <button id="new-entry-btn" style="padding:var(--space-2) var(--space-5);background:var(--accent);
          color:var(--white);border:none;border-radius:999px;font-size:0.8rem;font-weight:600;cursor:pointer;">
          + New Entry
        </button>
      </div>

      <!-- New entry form (hidden by default) -->
      <div id="new-entry-form" style="display:none;background:var(--white);border:1px solid var(--border);
           border-radius:var(--radius-lg);padding:var(--space-6);margin-bottom:var(--space-6);">
        ${entryFormHTML({ id: '', meta:'', category:'Essay', date:'', title:'', excerpt:'', body:[] }, true)}
      </div>

      <!-- Entry list -->
      <div style="display:flex;flex-direction:column;gap:var(--space-3);">
        ${entries.map((e, i) => `
          <div class="admin-entry-card" data-idx="${i}"
               style="background:var(--white);border:1px solid var(--border);border-radius:var(--radius-lg);
                      padding:var(--space-5) var(--space-6);">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:var(--space-4);">
              <div style="flex:1;">
                <div style="font-size:0.68rem;text-transform:uppercase;letter-spacing:0.1em;
                            color:var(--text-muted);margin-bottom:var(--space-1);">${e.meta}</div>
                <div style="font-family:var(--font-hand);font-size:1.3rem;color:var(--accent);">${e.title}</div>
              </div>
              <div style="display:flex;gap:var(--space-2);flex-shrink:0;">
                <button data-edit="${i}"
                  style="padding:var(--space-1) var(--space-3);border:1.5px solid var(--border);
                         border-radius:999px;font-size:0.72rem;font-weight:600;cursor:pointer;background:none;
                         color:var(--text-muted);">Edit</button>
                <button data-delete="${i}"
                  style="padding:var(--space-1) var(--space-3);border:1.5px solid hsl(0 60% 90%);
                         border-radius:999px;font-size:0.72rem;font-weight:600;cursor:pointer;background:none;
                         color:hsl(0 60% 55%);">Delete</button>
              </div>
            </div>
            <!-- Inline edit form -->
            <div id="edit-form-${i}" style="display:none;margin-top:var(--space-5);padding-top:var(--space-5);
                 border-top:1px solid var(--border);">
              ${entryFormHTML(e, false, i)}
            </div>
          </div>
        `).join('')}
      </div>
    </div>`;
}

function entryFormHTML(e, isNew, idx = '') {
  const bodyText = Array.isArray(e.body) ? e.body.join('\n\n') : '';
  const prefix = isNew ? 'new' : `edit-${idx}`;
  return `
    <div style="display:flex;flex-direction:column;gap:var(--space-4);">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);">
        <div>
          <label style="font-size:0.7rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);display:block;margin-bottom:4px;">Category</label>
          <select id="${prefix}-category" style="width:100%;padding:var(--space-2) var(--space-3);border:1.5px solid var(--border);border-radius:var(--radius);font-size:0.9rem;background:var(--white);color:var(--text);">
            ${['Essay','Teaser','Review','Article'].map(c => `<option ${e.category===c?'selected':''}>${c}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="font-size:0.7rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);display:block;margin-bottom:4px;">Date (e.g. 2 July 2026)</label>
          <input id="${prefix}-date" value="${e.date||''}" placeholder="2 July 2026"
            style="width:100%;padding:var(--space-2) var(--space-3);border:1.5px solid var(--border);border-radius:var(--radius);font-size:0.9rem;box-sizing:border-box;" />
        </div>
      </div>
      <div>
        <label style="font-size:0.7rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);display:block;margin-bottom:4px;">Title</label>
        <input id="${prefix}-title" value="${e.title||''}" placeholder="Entry title"
          style="width:100%;padding:var(--space-2) var(--space-3);border:1.5px solid var(--border);border-radius:var(--radius);font-size:0.9rem;box-sizing:border-box;" />
      </div>
      <div>
        <label style="font-size:0.7rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);display:block;margin-bottom:4px;">Excerpt (one line)</label>
        <input id="${prefix}-excerpt" value="${e.excerpt||''}" placeholder="Short teaser sentence"
          style="width:100%;padding:var(--space-2) var(--space-3);border:1.5px solid var(--border);border-radius:var(--radius);font-size:0.9rem;box-sizing:border-box;" />
      </div>
      <div>
        <label style="font-size:0.7rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);display:block;margin-bottom:4px;">Body (separate paragraphs with a blank line)</label>
        <textarea id="${prefix}-body" rows="8" placeholder="First paragraph...&#10;&#10;Second paragraph..."
          style="width:100%;padding:var(--space-3);border:1.5px solid var(--border);border-radius:var(--radius);
                 font-size:0.9rem;font-family:var(--font-sans);line-height:1.7;resize:vertical;box-sizing:border-box;">${bodyText}</textarea>
      </div>
      <div style="display:flex;gap:var(--space-3);">
        <button data-save="${isNew ? 'new' : idx}"
          style="padding:var(--space-2) var(--space-6);background:var(--text);color:var(--white);
                 border:none;border-radius:999px;font-size:0.82rem;font-weight:600;cursor:pointer;">
          ${isNew ? 'Publish Entry' : 'Save Changes'}
        </button>
        <button data-cancel="${isNew ? 'new' : idx}"
          style="padding:var(--space-2) var(--space-5);border:1.5px solid var(--border);background:none;
                 border-radius:999px;font-size:0.82rem;color:var(--text-muted);cursor:pointer;">
          Cancel
        </button>
      </div>
    </div>`;
}

function wireEntriesEvents(app, data, render) {
  const entries = data.entries ?? [...DEFAULT_ENTRIES];

  app.querySelector('#new-entry-btn')?.addEventListener('click', () => {
    const form = app.querySelector('#new-entry-form');
    if (form) form.style.display = form.style.display === 'none' ? 'block' : 'none';
  });

  app.querySelector('[data-save="new"]')?.addEventListener('click', () => {
    const e = readEntryForm(app, 'new');
    if (!e.title) return;
    const newId = String(Date.now());
    entries.unshift({ ...e, id: newId });
    saveData({ ...data, entries });
    render();
  });

  app.querySelector('[data-cancel="new"]')?.addEventListener('click', () => {
    const form = app.querySelector('#new-entry-form');
    if (form) form.style.display = 'none';
  });

  entries.forEach((_, i) => {
    app.querySelector(`[data-edit="${i}"]`)?.addEventListener('click', () => {
      const form = app.querySelector(`#edit-form-${i}`);
      if (form) form.style.display = form.style.display === 'none' ? 'block' : 'none';
    });

    app.querySelector(`[data-delete="${i}"]`)?.addEventListener('click', () => {
      if (!confirm(`Delete "${entries[i].title}"?`)) return;
      entries.splice(i, 1);
      saveData({ ...data, entries });
      render();
    });

    app.querySelector(`[data-save="${i}"]`)?.addEventListener('click', () => {
      const updated = readEntryForm(app, `edit-${i}`);
      entries[i] = { ...entries[i], ...updated };
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
  const cat  = app.querySelector(`#${prefix}-category`)?.value ?? 'Essay';
  const date = app.querySelector(`#${prefix}-date`)?.value?.trim() ?? '';
  const title   = app.querySelector(`#${prefix}-title`)?.value?.trim() ?? '';
  const excerpt = app.querySelector(`#${prefix}-excerpt`)?.value?.trim() ?? '';
  const bodyRaw = app.querySelector(`#${prefix}-body`)?.value?.trim() ?? '';
  const body    = bodyRaw.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const meta    = `${cat} · ${date}`;
  return { meta, category: cat, date, title, excerpt, body };
}

// ── Book section ─────────────────────────────────────────────────────────────
function renderBookSection(book) {
  const b = book ?? { price: 1500, description: 'A novel about losing yourself and trying to find your way back home.', excerpt: '' };
  return `
    <div>
      <h2 style="font-family:var(--font-hand);font-size:2rem;font-weight:600;margin-bottom:var(--space-6);">Book Settings</h2>
      <div style="background:var(--white);border:1px solid var(--border);border-radius:var(--radius-lg);padding:var(--space-6);">
        <div style="display:flex;flex-direction:column;gap:var(--space-5);">
          <div>
            <label style="font-size:0.7rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);display:block;margin-bottom:4px;">Price (KES)</label>
            <input id="book-price" type="number" value="${b.price}"
              style="width:100%;padding:var(--space-2) var(--space-3);border:1.5px solid var(--border);border-radius:var(--radius);font-size:0.9rem;box-sizing:border-box;" />
          </div>
          <div>
            <label style="font-size:0.7rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);display:block;margin-bottom:4px;">Description</label>
            <textarea id="book-desc" rows="3"
              style="width:100%;padding:var(--space-3);border:1.5px solid var(--border);border-radius:var(--radius);font-size:0.9rem;font-family:var(--font-sans);line-height:1.6;resize:vertical;box-sizing:border-box;">${b.description}</textarea>
          </div>
          <div>
            <label style="font-size:0.7rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);display:block;margin-bottom:4px;">Chapter 1 Excerpt (paste here when ready — leave blank to hide)</label>
            <textarea id="book-excerpt" rows="6" placeholder="Paste the opening of Chapter 1 here..."
              style="width:100%;padding:var(--space-3);border:1.5px solid var(--border);border-radius:var(--radius);font-size:0.9rem;font-family:var(--font-sans);line-height:1.8;resize:vertical;box-sizing:border-box;">${b.excerpt||''}</textarea>
          </div>
          <button id="save-book"
            style="align-self:flex-start;padding:var(--space-2) var(--space-6);background:var(--text);color:var(--white);
                   border:none;border-radius:999px;font-size:0.82rem;font-weight:600;cursor:pointer;">
            Save Book Settings
          </button>
          <p id="book-saved" style="display:none;font-size:0.82rem;color:hsl(130 50% 40%);">Saved.</p>
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
