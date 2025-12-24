/* Minimal SaaS PWA Catalog logic (vanilla JS)
   - Mocked auth (email/password), optional OAuth stubs
   - Roles: admin/user
   - Multi-tenant mock
   - Catalog CRUD w/ localStorage per user+tenant
   - Search, filters, pagination
   - Dark/light toggle
   - Install prompt
   - Notification permission stub
   - Accessibility cues (aria-live updates)
*/

const state = {
  user: null, // { email, role, tenant, plan }
  items: [], // current tenant+user scope
  page: 1,
  pageSize: 6,
  search: '',
  filterCategory: '',
  filterTag: '',
  deferredPrompt: null,
  usageLimitByPlan: { Free: 50, Pro: 500, Business: 5000 }
};

const qs = (sel) => document.querySelector(sel);

// UI elements
const authScreen = qs('#authScreen');
const dashboard = qs('#dashboard');
const loginForm = qs('#loginForm');
const roleSelect = qs('#role');
const tenantSelect = qs('#tenant');
const logoutBtn = qs('#logoutBtn');
const googleBtn = qs('#googleBtn');
const microsoftBtn = qs('#microsoftBtn');
const themeToggle = qs('#themeToggle');
const installBtn = qs('#installBtn');
const notifyBtn = qs('#notifyBtn');

const addItemBtn = qs('#addItemBtn');
const itemsGrid = qs('#itemsGrid');
const searchInput = qs('#searchInput');
const categoryFilter = qs('#categoryFilter');
const tagFilter = qs('#tagFilter');
const prevPageBtn = qs('#prevPageBtn');
const nextPageBtn = qs('#nextPageBtn');
const pageLabel = qs('#pageLabel');

const itemModal = qs('#itemModal');
const itemForm = qs('#itemForm');
const modalTitle = qs('#modalTitle');
const itemIdEl = qs('#itemId');
const itemTitleEl = qs('#itemTitle');
const itemDescEl = qs('#itemDesc');
const itemCatEl = qs('#itemCat');
const itemTagsEl = qs('#itemTags');
const itemImageEl = qs('#itemImage');
const cancelModalBtn = qs('#cancelModalBtn');
const saveItemBtn = qs('#saveItemBtn');

const planLabel = qs('#planLabel');
const usageLabel = qs('#usageLabel');
const usageLimitLabel = qs('#usageLimitLabel');
const statusLabel = qs('#statusLabel');

// Persist helpers
const keyForScope = (email, tenant) => `catalog:${email}:${tenant}`;
const saveItems = () => {
  if (!state.user) return;
  localStorage.setItem(keyForScope(state.user.email, state.user.tenant), JSON.stringify(state.items));
  updateUsage();
};
const loadItems = () => {
  if (!state.user) return [];
  const raw = localStorage.getItem(keyForScope(state.user.email, state.user.tenant));
  return raw ? JSON.parse(raw) : [];
};

// Auth
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = qs('#email').value.trim().toLowerCase();
  const password = qs('#password').value;
  const role = roleSelect.value;
  const tenant = tenantSelect.value;

  // Mock email+password check — replace with Firebase/Supabase
  if (!email || !password) {
    alert('Enter email & password.');
    return;
  }

  state.user = { email, role, tenant, plan: 'Free' };
  state.items = loadItems();
  state.page = 1;

  planLabel.textContent = state.user.plan;
  usageLimitLabel.textContent = state.usageLimitByPlan[state.user.plan];

  authScreen.classList.add('hidden');
  dashboard.classList.remove('hidden');
  render();
});

// OAuth stubs
googleBtn.addEventListener('click', () => alert('Google OAuth: integrate with Firebase/Supabase OAuth.'));
microsoftBtn.addEventListener('click', () => alert('Microsoft OAuth: integrate with Firebase/Supabase OAuth.'));
logoutBtn.addEventListener('click', () => {
  state.user = null;
  authScreen.classList.remove('hidden');
  dashboard.classList.add('hidden');
});

// Theme toggle
const initTheme = () => {
  const saved = localStorage.getItem('theme') || 'light';
  document.documentElement.classList.toggle('dark', saved === 'dark');
  themeToggle.checked = saved === 'dark';
};
themeToggle.addEventListener('change', () => {
  const isDark = themeToggle.checked;
  document.documentElement.classList.toggle('dark', isDark);
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
});

// Install prompt
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  state.deferredPrompt = e;
  installBtn.disabled = false;
});
installBtn.addEventListener('click', async () => {
  if (!state.deferredPrompt) return;
  state.deferredPrompt.prompt();
  const choice = await state.deferredPrompt.userChoice;
  state.deferredPrompt = null;
  installBtn.disabled = true;
  alert(`Install result: ${choice.outcome}`);
});

// Notifications
notifyBtn.addEventListener('click', async () => {
  if (!('Notification' in window)) return alert('Notifications not supported.');
  const perm = await Notification.requestPermission();
  alert(`Notification permission: ${perm}`);
  if (perm === 'granted') new Notification('Notifications enabled for Catalog SaaS!');
});

// SaaS plan actions (Stripe stubs)
qs('#upgradeBtn').addEventListener('click', () => {
  alert('Upgrade via Stripe Checkout: integrate client+server.');
});
qs('#manageBillingBtn').addEventListener('click', () => {
  alert('Manage billing portal: Stripe customer portal integration.');
});

// Filters/search/pagination
searchInput.addEventListener('input', (e) => {
  state.search = e.target.value;
  state.page = 1;
  render();
});
categoryFilter.addEventListener('change', (e) => {
  state.filterCategory = e.target.value;
  state.page = 1;
  render();
});
tagFilter.addEventListener('change', (e) => {
  state.filterTag = e.target.value;
  state.page = 1;
  render();
});
prevPageBtn.addEventListener('click', () => {
  if (state.page > 1) {
    state.page -= 1;
    render();
  }
});
nextPageBtn.addEventListener('click', () => {
  const total = getFiltered().length;
  const maxPage = Math.max(1, Math.ceil(total / state.pageSize));
  if (state.page < maxPage) {
    state.page += 1;
    render();
  }
});

// CRUD modal
addItemBtn.addEventListener('click', () => openModal());
cancelModalBtn.addEventListener('click', () => itemModal.close());
saveItemBtn.addEventListener('click', (e) => e.preventDefault());
itemForm.addEventListener('submit', (e) => {
  e.preventDefault();
  saveItem();
});

// Helpers
function openModal(item) {
  modalTitle.textContent = item ? 'Edit item' : 'Add item';
  itemIdEl.value = item?.id || '';
  itemTitleEl.value = item?.title || '';
  itemDescEl.value = item?.desc || '';
  itemCatEl.value = item?.category || 'Books';
  itemTagsEl.value = (item?.tags || []).join(',');
  itemImageEl.value = '';

  itemModal.showModal();
}

function saveItem() {
  if (!state.user) return;
  const id = itemIdEl.value || `id_${Date.now()}`;
  const title = itemTitleEl.value.trim();
  if (!title) return alert('Title required.');
  const desc = itemDescEl.value.trim();
  const category = itemCatEl.value;
  const tags = itemTagsEl.value.split(',').map(t => t.trim()).filter(Boolean);

  let imageUrl = null;
  const file = itemImageEl.files?.[0];
  if (file) {
    // store image as object URL (prototype); in real app upload to storage bucket
    imageUrl = URL.createObjectURL(file);
  }

  const existingIdx = state.items.findIndex(it => it.id === id);
  const item = { id, title, desc, category, tags, imageUrl, owner: state.user.email, tenant: state.user.tenant };
  const limit = state.usageLimitByPlan[state.user.plan];

  if (existingIdx >= 0) {
    state.items[existingIdx] = item;
  } else {
    if (state.items.length >= limit) {
      return alert(`Usage limit reached (${limit} items). Upgrade plan to add more.`);
    }
    state.items.push(item);
  }

  saveItems();
  itemModal.close();
  render();
}

function deleteItem(id) {
  if (!state.user) return;
  const item = state.items.find(i => i.id === id);
  // Role-based access: admin can delete any; user only own items
  const canDelete = state.user.role === 'admin' || item?.owner === state.user.email;
  if (!canDelete) return alert('Insufficient permissions to delete this item.');
  state.items = state.items.filter(i => i.id !== id);
  saveItems();
  render();
}

function editItem(id) {
  const item = state.items.find(i => i.id === id);
  // Role-based access: admin can edit any; user only own items
  const canEdit = state.user.role === 'admin' || item?.owner === state.user.email;
  if (!canEdit) return alert('Insufficient permissions to edit this item.');
  openModal(item);
}

function getFiltered() {
  const s = state.search.toLowerCase();
  const cat = state.filterCategory;
  const tag = state.filterTag;
  return state.items.filter((it) => {
    const matchesSearch = !s || [it.title, it.desc, it.category, ...(it.tags || [])].some(v => String(v).toLowerCase().includes(s));
    const matchesCat = !cat || it.category === cat;
    const matchesTag = !tag || (it.tags || []).includes(tag);
    return matchesSearch && matchesCat && matchesTag;
  });
}

function render() {
  // Accessibility status
  const online = navigator.onLine;
  statusLabel.textContent = online ? 'Online' : 'Offline-ready';

  // Controls visibility
  addItemBtn.disabled = !state.user;
  itemsGrid.setAttribute('aria-busy', 'true');

  // Filtered + paginated
  const filtered = getFiltered();
  const total = filtered.length;
  const maxPage = Math.max(1, Math.ceil(total / state.pageSize));
  state.page = Math.min(state.page, maxPage);
  const start = (state.page - 1) * state.pageSize;
  const pageItems = filtered.slice(start, start + state.pageSize);

  pageLabel.textContent = `Page ${state.page} of ${maxPage}`;

  // Render cards
  itemsGrid.innerHTML = pageItems.map((it) => `
    <article class="border border-gray-200 dark:border-gray-800 rounded-lg p-3 bg-white dark:bg-gray-950">
      <div class="flex items-start justify-between">
        <h4 class="font-semibold">${escapeHTML(it.title)}</h4>
        <span class="text-xs opacity-60">${escapeHTML(it.category)}</span>
      </div>
      ${it.imageUrl ? `<img src="${it.imageUrl}" alt="" class="w-full h-40 object-cover rounded mt-2">` : ''}
      <p class="text-sm mt-2">${escapeHTML(it.desc || '')}</p>
      <div class="mt-2 flex flex-wrap gap-2">
        ${(it.tags || []).map(t => `<span class="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800">${escapeHTML(t)}</span>`).join('')}
      </div>
      <div class="mt-3 flex items-center justify-between">
        <p class="text-xs opacity-60">Owner: ${escapeHTML(it.owner)}</p>
        <div class="flex gap-2">
          <button class="px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-700" data-edit="${it.id}">Edit</button>
          <button class="px-2 py-1 text-sm rounded bg-red-600 text-white" data-delete="${it.id}">Delete</button>
        </div>
      </div>
    </article>
  `).join('');

  // Bind actions
  itemsGrid.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => editItem(btn.getAttribute('data-edit')));
  });
  itemsGrid.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', () => deleteItem(btn.getAttribute('data-delete')));
  });

  itemsGrid.setAttribute('aria-busy', 'false');
  updateUsage();
}

function updateUsage() {
  const limit = state.usageLimitByPlan[state.user?.plan || 'Free'];
  usageLabel.textContent = state.items.length;
  usageLimitLabel.textContent = limit;
}

function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

// Online/offline indicators
window.addEventListener('online', render);
window.addEventListener('offline', render);

// Init
initTheme();
render();
