// script.js

const itemsGrid = document.getElementById('itemsGrid');
const skeletonContainer = document.getElementById('skeletonContainer');
const searchInput = document.getElementById('searchInput');
const favoriteFilter = document.getElementById('favoriteFilter');
const layoutSelect = document.getElementById('layoutSelect');
const textSizeSelect = document.getElementById('textSizeSelect');
const themeToggle = document.getElementById('themeToggle');
const offlineIndicator = document.getElementById('offlineIndicator');

const fabMain = document.getElementById('fabMain');
const fabMenu = document.getElementById('fabMenu');

const pageHome = document.getElementById('pageHome');
const pagePreview = document.getElementById('pagePreview');
const pageSettings = document.getElementById('pageSettings');
const pageStats = document.getElementById('pageStats');
const pages = { home: pageHome, preview: pagePreview, settings: pageSettings, stats: pageStats };

const navButtons = document.querySelectorAll('.nav-btn');

const previewCloseBtn = document.getElementById('previewCloseBtn');
const previewImage = document.getElementById('previewImage');
const previewName = document.getElementById('previewName');
const previewLocation = document.getElementById('previewLocation');
const previewFavoriteBtn = document.getElementById('previewFavoriteBtn');
const previewExportBtn = document.getElementById('previewExportBtn');
const previewShareWhatsAppBtn = document.getElementById('previewShareWhatsAppBtn');
const previewShareQRBtn = document.getElementById('previewShareQRBtn');
const previewShareLinkBtn = document.getElementById('previewShareLinkBtn');
const previewDeleteBtn = document.getElementById('previewDeleteBtn');
const hiddenCanvas = document.getElementById('hiddenCanvas');

const qrModal = document.getElementById('qrModal');
const qrCloseBtn = document.getElementById('qrCloseBtn');
const qrContainer = document.getElementById('qrContainer');

const snackbar = document.getElementById('snackbar');

const conflictModal = document.getElementById('conflictModal');
const conflictText = document.getElementById('conflictText');
const conflictKeepExistingBtn = document.getElementById('conflictKeepExistingBtn');
const conflictKeepImportedBtn = document.getElementById('conflictKeepImportedBtn');
const conflictSkipBtn = document.getElementById('conflictSkipBtn');

const importModeModal = document.getElementById('importModeModal');
const importSelectModal = document.getElementById('importSelectModal');
const importSelectList = document.getElementById('importSelectList');
const importSelectConfirmBtn = document.getElementById('importSelectConfirmBtn');
const importSelectCancelBtn = document.getElementById('importSelectCancelBtn');

const exportAllBtn = document.getElementById('exportAllBtn');
const importBtn = document.getElementById('importBtn');
const importFileInput = document.getElementById('importFileInput');

const backupNowBtn = document.getElementById('backupNowBtn');
const backupDaysInput = document.getElementById('backupDaysInput');
const lastBackupInfo = document.getElementById('lastBackupInfo');

const statTotalItems = document.getElementById('statTotalItems');
const recentTimeline = document.getElementById('recentTimeline');

const batchToolbar = document.getElementById('batchToolbar');
const batchCount = document.getElementById('batchCount');
const batchClearBtn = document.getElementById('batchClearBtn');

const voiceSearchBtn = document.getElementById('voiceSearchBtn');
const homeLogo = document.getElementById('homeLogo');

// State
let items = [];
let filteredItems = [];
let currentPreviewIndex = -1;
let lastPreviewCardId = null;
let isPreviewOpen = false;
let batchMode = false;
let batchSelectedIds = new Set();
let importConflictResolver = null;
let pendingImportParsed = null;
let pendingImportMode = 'merge';
let pendingImportSelectedIds = null;

// Local storage keys for preferences
const PREF_KEY_THEME = 'catalog-theme';
const PREF_KEY_TEXT_SIZE = 'catalog-text-size';
const PREF_KEY_LAYOUT = 'catalog-layout';
const PREF_KEY_BACKUP_DAYS = 'catalog-backup-days';

// Utils
function showSnackbar(message, withUndo = false, onUndo = null) {
  snackbar.textContent = '';
  snackbar.classList.remove('show');

  const textSpan = document.createElement('span');
  textSpan.textContent = message;
  snackbar.appendChild(textSpan);

  if (withUndo && onUndo) {
    const undoBtn = document.createElement('button');
    undoBtn.textContent = 'Undo';
    undoBtn.addEventListener('click', () => {
      onUndo();
      snackbar.classList.remove('show');
    });
    snackbar.appendChild(undoBtn);
  }

  requestAnimationFrame(() => {
    snackbar.classList.add('show');
  });

  setTimeout(() => {
    snackbar.classList.remove('show');
  }, 3500);
}

function setActivePage(name) {
  Object.values(pages).forEach(p => p.classList.remove('active'));
  pages[name].classList.add('active');

  navButtons.forEach(b => {
    b.classList.toggle('active', b.dataset.nav === name);
  });
}

// Offline indicator
function updateOfflineIndicator() {
  if (!navigator.onLine) {
    offlineIndicator.classList.add('offline');
    offlineIndicator.title = 'Offline';
  } else {
    offlineIndicator.classList.remove('offline');
    offlineIndicator.title = 'Online';
  }
}

// Rendering
function renderItemsList() {
  itemsGrid.innerHTML = '';
  filteredItems.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.id = item.id;
    card.dataset.index = index;

    const img = document.createElement('img');
    img.src = item.imageDataUrl;
    img.loading = 'lazy';

    const fav = document.createElement('div');
    fav.className = 'card-favorite' + (item.favorite ? ' active' : '');
    fav.innerHTML = item.favorite ? '★' : '☆';

    const checkboxWrap = document.createElement('div');
    checkboxWrap.className = 'card-checkbox';
    const checkboxSpan = document.createElement('span');
    checkboxSpan.textContent = batchSelectedIds.has(item.id) ? '✓' : '';
    checkboxWrap.appendChild(checkboxSpan);

    card.appendChild(img);
    card.appendChild(fav);
    card.appendChild(checkboxWrap);

    card.addEventListener('click', e => {
      if (batchMode) {
        toggleBatchSelection(item.id);
      } else {
        openPreviewByIndex(index);
      }
    });

    itemsGrid.appendChild(card);
  });

  skeletonContainer.classList.add('hidden');
  itemsGrid.classList.remove('hidden');
}

function applyFilters() {
  const q = (searchInput.value || '').toLowerCase();
  const favMode = favoriteFilter.value;

  filteredItems = items.filter(item => {
    let ok = true;
    if (q) {
      ok =
        item.name.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q);
    }
    if (favMode === 'favorites') {
      ok = ok && !!item.favorite;
    }
    return ok;
  });

  renderItemsList();
  updateStats();
}

async function loadItemsInitial() {
  skeletonContainer.classList.remove('hidden');
  itemsGrid.classList.add('hidden');

  items = await window.CatalogDB.getAllItems();
  filteredItems = items.slice();
  renderItemsList();
}

// Preview
function openPreviewByIndex(idx) {
  if (idx < 0 || idx >= filteredItems.length) return;
  const item = filteredItems[idx];
  currentPreviewIndex = idx;
  lastPreviewCardId = item.id;

  previewImage.src = item.imageDataUrl;
  previewName.textContent = item.name;
  previewLocation.textContent = item.location;
  previewFavoriteBtn.textContent = item.favorite ? 'Unfavorite' : 'Favorite';

  isPreviewOpen = true;
  setActivePage('preview');
}

function closePreview() {
  isPreviewOpen = false;
  setActivePage('home');

  if (lastPreviewCardId) {
    const card = itemsGrid.querySelector(`.card[data-id="${lastPreviewCardId}"]`);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('highlight');
      setTimeout(() => card.classList.remove('highlight'), 900);
    }
  }
}

// Swipe handling for preview
(function initSwipe() {
  let startX = null;

  pagePreview.addEventListener('touchstart', e => {
    if (!isPreviewOpen) return;
    if (e.touches.length === 1) {
      startX = e.touches[0].clientX;
    }
  });

  pagePreview.addEventListener('touchend', e => {
    if (!isPreviewOpen || startX == null) return;
    const endX = e.changedTouches[0].clientX;
    const dx = endX - startX;
    if (Math.abs(dx) > 40) {
      if (dx < 0 && currentPreviewIndex < filteredItems.length - 1) {
        openPreviewByIndex(currentPreviewIndex + 1);
      } else if (dx > 0 && currentPreviewIndex > 0) {
        openPreviewByIndex(currentPreviewIndex - 1);
      }
    }
    startX = null;
  });
})();

// Simple pinch-zoom / full-screen behavior
(function initImageInteraction() {
  let scale = 1;
  let isFullscreen = false;

  previewImage.addEventListener('click', () => {
    isFullscreen = !isFullscreen;
    if (isFullscreen) {
      previewImage.style.maxHeight = '100vh';
      previewImage.style.cursor = 'zoom-out';
    } else {
      previewImage.style.maxHeight = '280px';
      previewImage.style.cursor = 'zoom-in';
      previewImage.style.transform = 'scale(1)';
      scale = 1;
    }
  });

  previewImage.addEventListener('wheel', e => {
    if (!isFullscreen) return;
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    scale = Math.max(1, Math.min(3, scale + delta));
    previewImage.style.transform = `scale(${scale})`;
  }, { passive: false });
})();

// QR generation (very simple: draw text on canvas; you can later swap with real QR library)
function generateFakeQR(data) {
  qrContainer.innerHTML = '';
  const canvas = hiddenCanvas;
  const ctx = canvas.getContext('2d');
  const size = 220;
  canvas.width = size;
  canvas.height = size;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#000000';
  ctx.font = '12px monospace';
  ctx.fillText('QR DATA:', 10, 20);
  const lines = data.match(/.{1,22}/g) || [];
  lines.slice(0, 10).forEach((line, i) => {
    ctx.fillText(line, 10, 40 + i * 16);
  });
  const img = document.createElement('img');
  img.src = canvas.toDataURL('image/png');
  img.alt = 'QR code';
  img.style.width = '220px';
  img.style.height = '220px';
  qrContainer.appendChild(img);
}

// File helpers
function downloadJson(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Add item via prompt (simplified for now)
async function handleAddItem() {
  const name = prompt('Item name:');
  if (!name) return;
  const location = prompt('Location:') || '';
  const imageFile = await pickImageFile();
  if (!imageFile) return;

  const imageDataUrl = await fileToDataURL(imageFile);
  const item = await window.CatalogDB.addItem({ name, location, imageDataUrl });
  items.unshift(item);
  applyFilters();
  showSnackbar('Item added');
}

function pickImageFile() {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => resolve(input.files[0] || null);
    input.click();
  });
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Batch selection
function toggleBatchSelection(id) {
  if (batchSelectedIds.has(id)) {
    batchSelectedIds.delete(id);
  } else {
    batchSelectedIds.add(id);
  }
  updateBatchUI();
}

function updateBatchUI() {
  const count = batchSelectedIds.size;
  if (count > 0) {
    batchMode = true;
    batchToolbar.classList.remove('hidden');
  } else {
    batchMode = false;
    batchToolbar.classList.add('hidden');
  }
  batchCount.textContent = `${count} selected`;
  itemsGrid.querySelectorAll('.card').forEach(card => {
    const id = card.dataset.id;
    const checkbox = card.querySelector('.card-checkbox span');
    if (batchSelectedIds.has(id)) {
      card.classList.add('selected');
      checkbox.textContent = '✓';
    } else {
      card.classList.remove('selected');
      checkbox.textContent = '';
    }
  });
}

function clearBatchSelection() {
  batchSelectedIds.clear();
  updateBatchUI();
}

// Batch actions
async function performBatchAction(action) {
  const ids = Array.from(batchSelectedIds);
  if (!ids.length) return;

  if (action === 'delete') {
    if (!confirm(`Delete ${ids.length} items?`)) return;
    const backups = [];
    for (const id of ids) {
      const item = items.find(it => it.id === id);
      if (item) backups.push(item);
      await window.CatalogDB.deleteItem(id);
    }
    items = items.filter(it => !ids.includes(it.id));
    clearBatchSelection();
    applyFilters();
    showSnackbar(`${ids.length} items deleted`, true, async () => {
      // Simple restore
      for (const item of backups) {
        await window.CatalogDB.updateItem(item);
      }
      items = await window.CatalogDB.getAllItems();
      applyFilters();
    });
  } else if (action === 'favorite') {
    for (const id of ids) {
      const item = items.find(it => it.id === id);
      if (!item) continue;
      const newFav = !item.favorite;
      item.favorite = newFav;
      await window.CatalogDB.toggleFavorite(id, newFav);
    }
    applyFilters();
  } else if (action === 'export') {
    const subset = items.filter(it => ids.includes(it.id));
    downloadJson(
      {
        version: 1,
        exportedAt: Date.now(),
        items: subset
      },
      `catalog-selected-${Date.now()}.json`
    );
  } else if (action === 'share') {
    const subset = items.filter(it => ids.includes(it.id));
    const text = subset.map(it => `${it.name} @ ${it.location}`).join('\n');
    shareText(text);
  }
}

// Share helpers
function shareText(text) {
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
  if (navigator.share) {
    navigator.share({ text }).catch(() => {
      window.open(whatsappUrl, '_blank');
    });
  } else {
    window.open(whatsappUrl, '_blank');
  }
}

function shareLink(link, title = 'Catalog item') {
  if (navigator.share) {
    navigator.share({ title, url: link }).catch(() => {
      navigator.clipboard?.writeText(link);
      showSnackbar('Link copied to clipboard');
    });
  } else {
    navigator.clipboard?.writeText(link);
    showSnackbar('Link copied to clipboard');
  }
}

// Voice search
function initVoiceSearch() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    voiceSearchBtn.disabled = true;
    return;
  }

  const recog = new SpeechRecognition();
  recog.lang = 'en-US';
  recog.interimResults = false;
  recog.maxAlternatives = 1;

  voiceSearchBtn.addEventListener('click', () => {
    try {
      recog.start();
    } catch {}
  });

  recog.onresult = e => {
    const text = e.results[0][0].transcript;
    searchInput.value = text;
    applyFilters();
  };
}

// Import / export / conflicts / tamper detection
function openImportModeDialog(parsed) {
  pendingImportParsed = parsed;
  importModeModal.classList.remove('hidden');
}

function closeImportModeDialog() {
  importModeModal.classList.add('hidden');
}

function openImportSelectDialog(itemsList) {
  importSelectList.innerHTML = '';
  itemsList.forEach(item => {
    const div = document.createElement('div');
    div.className = 'import-select-item';
    div.dataset.id = item.id;

    const img = document.createElement('img');
    img.src = item.imageDataUrl;
    const span = document.createElement('span');
    span.textContent = `${item.name} @ ${item.location}`;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = true;

    div.appendChild(checkbox);
    div.appendChild(img);
    div.appendChild(span);

    importSelectList.appendChild(div);
  });
  importSelectModal.classList.remove('hidden');
}

function closeImportSelectDialog() {
  importSelectModal.classList.add('hidden');
}

function openConflictDialog(existing, incoming) {
  return new Promise(resolve => {
    conflictText.textContent = `Item "${incoming.name}" at "${incoming.location}" already exists.`;
    conflictModal.classList.remove('hidden');

    const handler = choice => {
      conflictModal.classList.add('hidden');
      resolve(choice);
      conflictKeepExistingBtn.removeEventListener('click', onKeepExisting);
      conflictKeepImportedBtn.removeEventListener('click', onKeepImported);
      conflictSkipBtn.removeEventListener('click', onSkip);
    };

    const onKeepExisting = () => handler('keepExisting');
    const onKeepImported = () => handler('keepImported');
    const onSkip = () => handler('skip');

    conflictKeepExistingBtn.addEventListener('click', onKeepExisting);
    conflictKeepImportedBtn.addEventListener('click', onKeepImported);
    conflictSkipBtn.addEventListener('click', onSkip);
  });
}

async function handleExportAll() {
  const data = await window.CatalogDB.exportAllItems();
  downloadJson(data, `catalog-export-${Date.now()}.json`);
}

function handleImportStart() {
  importFileInput.value = '';
  importFileInput.click();
}

function handleFileImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async ev => {
    try {
      const parsed = JSON.parse(ev.target.result);
      openImportModeDialog(parsed);
    } catch {
      alert('Invalid JSON file');
    }
  };
  reader.readAsText(file);
}

async function runImport(mode, selectedIds) {
  closeImportModeDialog();
  closeImportSelectDialog();

  if (!pendingImportParsed) return;

  importConflictResolver = (existing, incoming) => openConflictDialog(existing, incoming);

  const result = await window.CatalogDB.importItemsFromJson(
    pendingImportParsed,
    {
      mode,
      selectedIds,
      conflictResolver: importConflictResolver
    }
  );

  if (result.tampered || result.tamperedItems.length > 0) {
    alert(
      `Warning: Some imported items may be corrupted or manually modified.\n` +
      `Tampered count: ${result.tamperedItems.length}`
    );
  }

  showSnackbar(
    `Imported: ${result.imported}, skipped: ${result.skipped}, replaced: ${result.replaced}`
  );

  items = await window.CatalogDB.getAllItems();
  applyFilters();
  pendingImportParsed = null;
}

// Settings: theme / text size / layout
function applyTheme(theme) {
  const body = document.body;
  if (theme === 'light') {
    body.classList.remove('theme-dark');
    body.classList.add('theme-light');
    themeToggle.checked = false;
  } else {
    body.classList.add('theme-dark');
    body.classList.remove('theme-light');
    themeToggle.checked = true;
  }
  localStorage.setItem(PREF_KEY_THEME, theme);
}

function applyTextSize(size) {
  const body = document.body;
  body.classList.remove('text-size-small', 'text-size-medium', 'text-size-large');
  body.classList.add(`text-size-${size}`);
  localStorage.setItem(PREF_KEY_TEXT_SIZE, size);
}

function applyLayout(cols) {
  const body = document.body;
  body.classList.remove('layout-2cols', 'layout-3cols', 'layout-4cols');
  body.classList.add(`layout-${cols}cols`);
  localStorage.setItem(PREF_KEY_LAYOUT, cols);
}

// Backup info & reminders
async function refreshBackupInfo() {
  const info = await window.CatalogDB.getBackupInfo();
  if (!info) {
    lastBackupInfo.textContent = 'No backups yet.';
    return;
  }
  const dt = new Date(info.lastBackupAt);
  lastBackupInfo.textContent = `Last backup: ${dt.toLocaleString()}`;
}

async function performBackupNow() {
  const data = await window.CatalogDB.exportAllItems();
  downloadJson(data, `catalog-backup-${Date.now()}.json`);
  await window.CatalogDB.setBackupInfo({
    lastBackupAt: Date.now()
  });
  await refreshBackupInfo();
  showSnackbar('Backup exported');
}

async function checkBackupReminder() {
  const days = parseInt(backupDaysInput.value || '1', 10);
  localStorage.setItem(PREF_KEY_BACKUP_DAYS, String(days));

  const info = await window.CatalogDB.getBackupInfo();
  if (!info || !info.lastBackupAt) {
    showSnackbar('You have no backups yet. Consider exporting one.');
    return;
  }
  const diffDays = (Date.now() - info.lastBackupAt) / (1000 * 60 * 60 * 24);
  if (diffDays >= days) {
    showSnackbar('Reminder: It is time to backup your catalog again.');
  }
}

// Auto-backup scheduler (simple: run on load and once a day via setTimeout; real scheduling is limited in PWA)
async function autoBackupScheduler() {
  const days = parseInt(backupDaysInput.value || '1', 10);
  const ms = days * 24 * 60 * 60 * 1000;

  const info = await window.CatalogDB.getBackupInfo();
  const last = info?.lastBackupAt || 0;
  const diff = Date.now() - last;

  if (diff >= ms && items.length > 0) {
    // Auto backup
    const data = await window.CatalogDB.exportAllItems();
    // Save only oldest exports: for static offline app we just trigger download
    downloadJson(data, `catalog-auto-backup-${Date.now()}.json`);
    await window.CatalogDB.setBackupInfo({ lastBackupAt: Date.now() });
    await refreshBackupInfo();
  }

  // schedule a simple next check (not persistent if app closed)
  setTimeout(autoBackupScheduler, ms);
}

// Stats
function updateStats() {
  statTotalItems.textContent = String(items.length);
  recentTimeline.innerHTML = '';
  const recent = items
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 10);

  recent.forEach(item => {
    const li = document.createElement('li');
    const dt = new Date(item.createdAt).toLocaleString();
    li.textContent = `${item.name} @ ${item.location} • ${dt}`;
    recentTimeline.appendChild(li);
  });
}

// Page navigation
navButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.nav;
    setActivePage(target);
  });
});

// Home logo -> home page
homeLogo.addEventListener('click', e => {
  e.preventDefault();
  setActivePage('home');
});

// FAB
fabMain.addEventListener('click', () => {
  fabMenu.classList.toggle('open');
});

fabMenu.addEventListener('click', e => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const action = btn.dataset.fabAction;
  fabMenu.classList.remove('open');

  if (action === 'add') {
    handleAddItem();
  } else if (action === 'import') {
    handleImportStart();
  } else if (action === 'export') {
    handleExportAll();
  } else if (action === 'deleteAll') {
    if (confirm('Delete ALL items? This cannot be undone (except latest undo).')) {
      const backup = items.slice();
      window.CatalogDB.deleteAllItems().then(() => {
        items = [];
        applyFilters();
        showSnackbar('All items deleted', true, async () => {
          for (const it of backup) {
            await window.CatalogDB.updateItem(it);
          }
          items = await window.CatalogDB.getAllItems();
          applyFilters();
        });
      });
    }
  }
});

// Filters
searchInput.addEventListener('input', applyFilters);
favoriteFilter.addEventListener('change', applyFilters);
layoutSelect.addEventListener('change', () => {
  applyLayout(layoutSelect.value);
});
textSizeSelect.addEventListener('change', () => {
  applyTextSize(textSizeSelect.value);
});

// Theme toggle
themeToggle.addEventListener('change', () => {
  applyTheme(themeToggle.checked ? 'dark' : 'light');
});

// Preview buttons
previewCloseBtn.addEventListener('click', closePreview);
previewFavoriteBtn.addEventListener('click', async () => {
  if (currentPreviewIndex < 0) return;
  const item = filteredItems[currentPreviewIndex];
  const newFav = !item.favorite;
  await window.CatalogDB.toggleFavorite(item.id, newFav);
  item.favorite = newFav;
  const idxReal = items.findIndex(i => i.id === item.id);
  if (idxReal >= 0) items[idxReal].favorite = newFav;
  previewFavoriteBtn.textContent = newFav ? 'Unfavorite' : 'Favorite';
  applyFilters();
});
previewDeleteBtn.addEventListener('click', async () => {
  if (currentPreviewIndex < 0) return;
  const item = filteredItems[currentPreviewIndex];
  if (!confirm(`Delete "${item.name}"?`)) return;

  const backupItem = { ...item };
  await window.CatalogDB.deleteItem(item.id);
  items = items.filter(i => i.id !== item.id);
  applyFilters();
  closePreview();
  showSnackbar('Item deleted', true, async () => {
    await window.CatalogDB.updateItem(backupItem);
    items = await window.CatalogDB.getAllItems();
    applyFilters();
  });
});

previewExportBtn.addEventListener('click', async () => {
  if (currentPreviewIndex < 0) return;
  const item = filteredItems[currentPreviewIndex];
  const data = await window.CatalogDB.exportSingleItem(item.id);
  if (!data) return;
  downloadJson(data, `catalog-item-${item.id}.json`);
});

previewShareWhatsAppBtn.addEventListener('click', () => {
  if (currentPreviewIndex < 0) return;
  const item = filteredItems[currentPreviewIndex];
  const text = `${item.name} @ ${item.location}`;
  shareText(text);
});

previewShareLinkBtn.addEventListener('click', () => {
  if (currentPreviewIndex < 0) return;
  const item = filteredItems[currentPreviewIndex];
  const data = btoa(JSON.stringify({ id: item.id, n: item.name, l: item.location }));
  const link = `${location.origin}${location.pathname}?item=${encodeURIComponent(data)}`;
  shareLink(link, item.name);
});

previewShareQRBtn.addEventListener('click', () => {
  if (currentPreviewIndex < 0) return;
  const item = filteredItems[currentPreviewIndex];
  const data = JSON.stringify({ id: item.id, name: item.name, location: item.location });
  generateFakeQR(data);
  qrModal.classList.remove('hidden');
});

qrCloseBtn.addEventListener('click', () => {
  qrModal.classList.add('hidden');
});

// Batch toolbar actions
batchClearBtn.addEventListener('click', () => {
  clearBatchSelection();
});

batchToolbar.addEventListener('click', e => {
  const btn = e.target.closest('button[data-batch-action]');
  if (!btn) return;
  const action = btn.dataset.batchAction;
  performBatchAction(action);
});

// Settings events
exportAllBtn.addEventListener('click', handleExportAll);
importBtn.addEventListener('click', handleImportStart);
importFileInput.addEventListener('change', handleFileImport);

backupNowBtn.addEventListener('click', () => {
  performBackupNow();
  checkBackupReminder();
});

backupDaysInput.addEventListener('change', () => {
  localStorage.setItem(PREF_KEY_BACKUP_DAYS, backupDaysInput.value);
});

// Import mode modal buttons
document.getElementById('importMergeBtn').addEventListener('click', () => {
  runImport('merge', null);
});
document.getElementById('importReplaceBtn').addEventListener('click', () => {
  if (confirm('Replace all existing items with imported ones?')) {
    runImport('replace', null);
  }
});
document.getElementById('importSelectBtn').addEventListener('click', () => {
  if (!pendingImportParsed || !Array.isArray(pendingImportParsed.items)) return;
  openImportSelectDialog(pendingImportParsed.items);
});

// Import selection confirm/cancel
importSelectConfirmBtn.addEventListener('click', () => {
  if (!pendingImportParsed) return;
  const ids = [];
  importSelectList.querySelectorAll('.import-select-item').forEach(div => {
    const checkbox = div.querySelector('input[type="checkbox"]');
    if (checkbox && checkbox.checked) {
      ids.push(div.dataset.id);
    }
  });
  runImport('merge', ids);
});
importSelectCancelBtn.addEventListener('click', () => {
  closeImportSelectDialog();
});

// Voice search
initVoiceSearch();

// Online/offline
window.addEventListener('online', updateOfflineIndicator);
window.addEventListener('offline', updateOfflineIndicator);

// Load preferences
function loadPreferences() {
  const theme = localStorage.getItem(PREF_KEY_THEME) || 'dark';
  applyTheme(theme);

  const size = localStorage.getItem(PREF_KEY_TEXT_SIZE) || 'medium';
  textSizeSelect.value = size;
  applyTextSize(size);

  const cols = localStorage.getItem(PREF_KEY_LAYOUT) || '3';
  layoutSelect.value = cols;
  applyLayout(cols);

  const backupDays = localStorage.getItem(PREF_KEY_BACKUP_DAYS) || '1';
  backupDaysInput.value = backupDays;
}

// Init
(async function init() {
  updateOfflineIndicator();
  loadPreferences();
  await loadItemsInitial();
  await refreshBackupInfo();
  await checkBackupReminder();
  autoBackupScheduler();
})();
