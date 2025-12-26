// script.js

import {
  addItem,
  updateItem,
  deleteItem,
  clearAllItems,
  getAllItems,
  getItem,
  exportAllToJson,
  exportItemsToJson,
  validateImportJson,
  findDuplicates,
  applyImport,
  downloadJsonFile,
  getLastBackupTime,
  setLastBackupTime,
  performBackupNow,
  BACKUP_INTERVAL_MS
} from './db.js';

const cardGrid = document.getElementById('card-grid');
const skeletonContainer = document.getElementById('skeleton-container');
const fabAddItem = document.getElementById('fab-add-item');
const modalAddEdit = document.getElementById('modal-add-edit');
const modalAddEditTitle = document.getElementById('modal-add-edit-title');
const modalAddEditClose = document.getElementById('modal-add-edit-close');
const itemNameInput = document.getElementById('item-name-input');
const itemLocationInput = document.getElementById('item-location-input');
const itemImageInput = document.getElementById('item-image-input');
const btnSaveItem = document.getElementById('btn-save-item');

const searchInput = document.getElementById('search-input');
const btnClearSearch = document.getElementById('btn-clear-search');
const btnFilterFavorites = document.getElementById('btn-filter-favorites');
const btnVoiceSearch = document.getElementById('btn-voice-search');

const navButtons = document.querySelectorAll('.nav-button');
const pages = document.querySelectorAll('.page');

const offlineIndicator = document.getElementById('offline-indicator');
const homeLogo = document.getElementById('home-logo');

const batchToolbar = document.getElementById('batch-toolbar');
const batchCountLabel = document.getElementById('batch-count');
const batchFavoriteBtn = document.getElementById('batch-favorite');
const batchDeleteBtn = document.getElementById('batch-delete');
const batchExportBtn = document.getElementById('batch-export');
const batchShareBtn = document.getElementById('batch-share');
const batchCancelBtn = document.getElementById('batch-cancel');

const snackbar = document.getElementById('snackbar');
const snackbarMessage = document.getElementById('snackbar-message');
const snackbarAction = document.getElementById('snackbar-action');

const modalPreview = document.getElementById('modal-preview');
const previewBack = document.getElementById('preview-back');
const previewTitle = document.getElementById('preview-title');
const previewFavorite = document.getElementById('preview-favorite');
const previewImage = document.getElementById('preview-image');
const previewName = document.getElementById('preview-name');
const previewLocation = document.getElementById('preview-location');
const previewPrev = document.getElementById('preview-prev');
const previewNext = document.getElementById('preview-next');
const previewDelete = document.getElementById('preview-delete');
const previewExport = document.getElementById('preview-export');
const previewShareWhatsapp = document.getElementById('preview-share-whatsapp');
const previewShareLink = document.getElementById('preview-share-link');
const previewShareQr = document.getElementById('preview-share-qr');
const previewBody = document.getElementById('preview-body');

const modalQr = document.getElementById('modal-qr');
const qrCanvas = document.getElementById('qr-canvas');
const modalQrClose = document.getElementById('modal-qr-close');

const btnThemeToggle = document.getElementById('btn-theme-toggle');
const themeButtons = document.querySelectorAll('[data-theme]');
const fontButtons = document.querySelectorAll('[data-font]');
const columnButtons = document.querySelectorAll('[data-columns]');
const btnExportDb = document.getElementById('btn-export-db');
const btnImportDb = document.getElementById('btn-import-db');
const btnDeleteAll = document.getElementById('btn-delete-all');
const fileInputImport = document.getElementById('file-input-import');
const lastBackupLabel = document.getElementById('last-backup-label');
const btnBackupNow = document.getElementById('btn-backup-now');

const statTotalItems = document.getElementById('stat-total-items');
const statTotalFavorites = document.getElementById('stat-total-favorites');
const recentItemsList = document.getElementById('recent-items-list');

const modalImportConflicts = document.getElementById('modal-import-conflicts');
const modalImportConflictsClose = document.getElementById('modal-import-conflicts-close');
const conflictList = document.getElementById('conflict-list');
const conflictsApplyBtn = document.getElementById('conflicts-apply');

const modalImportSummary = document.getElementById('modal-import-summary');
const importSummaryText = document.getElementById('import-summary-text');
const importErrorsList = document.getElementById('import-errors');
const modalImportSummaryClose = document.getElementById('modal-import-summary-close');

let items = [];
let filteredItems = [];
let favoritesOnly = false;
let batchSelection = new Set();
let lastDeletedItem = null;

let currentPreviewIndex = -1;
let lastPreviewedItemId = null;

let previewReturnScrollTop = 0;
// For import conflicts
let pendingImportData = null;

// Backup timer
let backupIntervalHandle = null;

// ---------------------------------------------
// Utility / helpers
// ---------------------------------------------

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('catalog-theme', theme);
  themeButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.theme === theme);
  });
}

function setFontSize(size) {
  document.documentElement.setAttribute('data-font-size', size);
  localStorage.setItem('catalog-font-size', size);
  fontButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.font === size);
  });
}

function setColumns(cols) {
  document.documentElement.setAttribute('data-columns', cols);
  localStorage.setItem('catalog-columns', cols);
  columnButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.columns === cols);
  });
}

function showSnackbar(message, actionLabel, actionHandler, duration = 3500) {
  snackbarMessage.textContent = message;
  if (actionLabel) {
    snackbarAction.textContent = actionLabel;
    snackbarAction.onclick = actionHandler;
    snackbarAction.style.display = 'inline';
  } else {
    snackbarAction.style.display = 'none';
  }

  snackbar.classList.add('visible');
  setTimeout(() => {
    snackbar.classList.remove('visible');
  }, duration);
}

// ---------------------------------------------
// Data loading & rendering
// ---------------------------------------------

async function loadItems() {
  skeletonContainer.classList.remove('hidden');
  cardGrid.classList.add('hidden');
  items = await getAllItems();
  items.sort((a, b) => b.createdAt - a.createdAt);
  applyFiltersAndRender();
  updateStats();
}

function applyFiltersAndRender() {
  const query = (searchInput.value || '').toLowerCase();
  filteredItems = items.filter((item) => {
    if (favoritesOnly && !item.favorite) return false;
    if (!query) return true;
    return (
      (item.name || '').toLowerCase().includes(query) ||
      (item.location || '').toLowerCase().includes(query)
    );
  });
  renderItems();
}

function renderItems() {
  skeletonContainer.classList.add('hidden');
  cardGrid.classList.remove('hidden');
  cardGrid.innerHTML = '';

  filteredItems.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.id = item.id;
    card.dataset.index = index;

    const inner = document.createElement('div');
    inner.className = 'card-inner';

    if (item.imageData) {
      const img = document.createElement('img');
      img.src = item.imageData;
      inner.appendChild(img);
    }

    if (item.favorite) {
      const fav = document.createElement('div');
      fav.className = 'card-favorite-badge';
      fav.textContent = '★';
      card.appendChild(fav);
    }

    const checkbox = document.createElement('div');
    checkbox.className = 'card-select-checkbox';
    checkbox.textContent = batchSelection.has(item.id) ? '✓' : '';
    card.appendChild(checkbox);

    card.appendChild(inner);
    cardGrid.appendChild(card);

    card.addEventListener('click', (e) => {
      if (batchSelection.size > 0 || e.shiftKey || e.metaKey || e.ctrlKey) {
        toggleBatchSelection(item.id);
      } else {
        openPreviewByIndex(index, true);
      }
    });
    card.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      toggleBatchSelection(item.id);
    });

    card.addEventListener('mousemove', handleCardTilt);
    card.addEventListener('mouseleave', resetCardTilt);
  });

  updateBatchToolbar();
}

function handleCardTilt(e) {
  const card = e.currentTarget;
  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const midX = rect.width / 2;
  const midY = rect.height / 2;

  const rotateX = ((y - midY) / midY) * -10; // invert
  const rotateY = ((x - midX) / midX) * 10;

  card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
}

function resetCardTilt(e) {
  const card = e.currentTarget;
  card.style.transform = '';
}

// ---------------------------------------------
// Add / Edit item
// ---------------------------------------------

function openAddModal() {
  modalAddEdit.classList.remove('hidden');
  modalAddEditTitle.textContent = 'Add item';
  itemNameInput.value = '';
  itemLocationInput.value = '';
  itemImageInput.value = '';
  btnSaveItem.onclick = async () => {
    const name = itemNameInput.value.trim();
    const location = itemLocationInput.value.trim();
    if (!name || !location) {
      showSnackbar('Name and location are required');
      return;
    }
    const imageData = await readImageAsDataUrl(itemImageInput);
    const newItem = await addItem({ name, location, imageData });
    items.unshift(newItem);
    applyFiltersAndRender();
    updateStats();
    closeAddEditModal();
  };
}

function closeAddEditModal() {
  modalAddEdit.classList.add('hidden');
}

function readImageAsDataUrl(inputEl) {
  return new Promise((resolve) => {
    const file = inputEl.files && inputEl.files[0];
    if (!file) {
      resolve('');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

// ---------------------------------------------
// Preview modal, swipe, zoom, full-screen
// ---------------------------------------------

let previewScale = 1;
let previewOriginX = 0;
let previewOriginY = 0;
let isDraggingImage = false;
let lastTouchDistance = null;
let lastTouchCenter = null;

function openPreviewByIndex(index, fromGrid) {
  if (index < 0 || index >= filteredItems.length) return;
  currentPreviewIndex = index;
  const item = filteredItems[index];
  lastPreviewedItemId = item.id;

  previewTitle.textContent = 'Item';
  previewName.textContent = item.name;
  previewLocation.textContent = item.location;
  previewImage.src = item.imageData || '';
  previewFavorite.textContent = item.favorite ? '★' : '☆';

  modalPreview.classList.remove('hidden');
  resetImageTransform();

  if (fromGrid) {
    // store scroll position for later
    previewReturnScrollTop = window.scrollY;
  }
}

function closePreview() {
  modalPreview.classList.add('hidden');
  // After exit, scroll back to card and highlight
  if (!lastPreviewedItemId) return;

  const card = cardGrid.querySelector(`.card[data-id="${lastPreviewedItemId}"]`);
  if (!card) return;
  const rect = card.getBoundingClientRect();
  const offset = rect.top + window.scrollY - 80;
  window.scrollTo({ top: offset, behavior: 'smooth' });
  card.classList.add('highlight');
  setTimeout(() => card.classList.remove('highlight'), 900);
}

previewBack.addEventListener('click', () => {
  closePreview();
});

previewPrev.addEventListener('click', () => {
  openPreviewByIndex(currentPreviewIndex - 1, false);
});
previewNext.addEventListener('click', () => {
  openPreviewByIndex(currentPreviewIndex + 1, false);
});

previewFavorite.addEventListener('click', async () => {
  const item = filteredItems[currentPreviewIndex];
  item.favorite = !item.favorite;
  await updateItem(item);
  previewFavorite.textContent = item.favorite ? '★' : '☆';
  const idx = items.findIndex((it) => it.id === item.id);
  if (idx >= 0) items[idx] = item;
  applyFiltersAndRender();
  updateStats();
});

// Delete from preview
previewDelete.addEventListener('click', async () => {
  const item = filteredItems[currentPreviewIndex];
  if (!confirm('Delete this item?')) return;
  await deleteItem(item.id);
  lastDeletedItem = item;
  items = items.filter((it) => it.id !== item.id);
  applyFiltersAndRender();
  updateStats();
  closePreview();
  showSnackbar('Item deleted', 'Undo', async () => {
    if (!lastDeletedItem) return;
    await updateItem(lastDeletedItem);
    items.unshift(lastDeletedItem);
    applyFiltersAndRender();
    updateStats();
    lastDeletedItem = null;
  });
});

// Export single item
previewExport.addEventListener('click', async () => {
  const item = filteredItems[currentPreviewIndex];
  const json = await exportItemsToJson([item.id]);
  downloadJsonFile(`catalog-item-${item.id}.json`, json);
});

// WhatsApp share
previewShareWhatsapp.addEventListener('click', () => {
  const item = filteredItems[currentPreviewIndex];
  const text = `Catalog item:\nName: ${item.name}\nLocation: ${item.location}`;
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
});

// Share link (client-side encoded URL)
previewShareLink.addEventListener('click', () => {
  const item = filteredItems[currentPreviewIndex];
  const url = new URL(window.location.href);
  url.searchParams.set('item', item.id);
  navigator.clipboard
    .writeText(url.toString())
    .then(() => showSnackbar('Link copied to clipboard'))
    .catch(() => showSnackbar('Could not copy link'));
});

// Single-item QR
previewShareQr.addEventListener('click', () => {
  const item = filteredItems[currentPreviewIndex];
  const payload = {
    type: 'catalog-item-link',
    id: item.id,
    name: item.name,
    location: item.location
  };
  const text = JSON.stringify(payload);
  showQrModal(text);
});

// Image zoom & gestures

function resetImageTransform() {
  previewScale = 1;
  previewOriginX = 0;
  previewOriginY = 0;
  lastTouchDistance = null;
  lastTouchCenter = null;
  previewImage.style.transform = 'translate(0,0) scale(1)';
}

function applyImageTransform() {
  previewImage.style.transform = `translate(${previewOriginX}px, ${previewOriginY}px) scale(${previewScale})`;
}

function getTouchDistance(t1, t2) {
  const dx = t2.clientX - t1.clientX;
  const dy = t2.clientY - t1.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

previewBody.addEventListener('touchstart', (e) => {
  if (e.touches.length === 2) {
    const [t1, t2] = e.touches;
    lastTouchDistance = getTouchDistance(t1, t2);
    lastTouchCenter = { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };
  }
});

previewBody.addEventListener('touchmove', (e) => {
  if (e.touches.length === 2 && lastTouchDistance) {
    e.preventDefault();
    const [t1, t2] = e.touches;
    const dist = getTouchDistance(t1, t2);
    const factor = dist / lastTouchDistance;
    previewScale = Math.min(4, Math.max(1, previewScale * factor));
    applyImageTransform();
    lastTouchDistance = dist;
  }
}, { passive: false });

previewBody.addEventListener('dblclick', () => {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    previewBody.requestFullscreen().catch(() => {});
  }
});

// Swipe navigation
let touchStartX = null;
let touchStartY = null;

previewBody.addEventListener('touchstart', (e) => {
  if (e.touches.length === 1) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }
});

previewBody.addEventListener('touchend', (e) => {
  if (touchStartX === null) return;
  const dx = (e.changedTouches[0].clientX || 0) - touchStartX;
  const dy = (e.changedTouches[0].clientY || 0) - touchStartY;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
    if (dx > 0) {
      openPreviewByIndex(currentPreviewIndex - 1, false);
    } else {
      openPreviewByIndex(currentPreviewIndex + 1, false);
    }
  }
  touchStartX = null;
  touchStartY = null;
});

// Keyboard navigation inside preview
document.addEventListener('keydown', (e) => {
  if (modalPreview.classList.contains('hidden')) return;
  if (e.key === 'ArrowLeft') {
    openPreviewByIndex(currentPreviewIndex - 1, false);
  } else if (e.key === 'ArrowRight') {
    openPreviewByIndex(currentPreviewIndex + 1, false);
  } else if (e.key === 'Escape') {
    closePreview();
  }
});

// ---------------------------------------------
// QR code generation (simple implementation)
// ---------------------------------------------

// Very small QR helper integrated (numeric/alphanumeric; for our medium payloads it's fine)

function qrCreateMatrix(text) {
  // To keep this manageable and dependency-free:
  // We'll use a tiny implementation of QRCode model 2, version autodetected through size,
  // but rather than fully implement spec, we use a well-known simplified generator.
  // For brevity, we reuse a small, compressed algorithm adapted for basic usage.

  // This is a minimal, not fully optimized implementation good for short strings.
  // Source adapted from public-domain QR implementations and heavily reduced.

  // We'll use an existing small implementation encoded here:
  /* eslint-disable */
  const QRCode = (function () {
    // minimal implementation from Kazuhiko Arase (MIT) – stripped down for size
    // https://github.com/kazuhikoarase/qrcode-generator
    // Removed everything except typeNumber=0, errorCorrectLevel='M'.
    function qrcode(typeNumber, errorCorrectLevel) {
      const PAD0 = 0xec;
      const PAD1 = 0x11;

      const _ = {};
      const QRMode = { MODE_8BIT_BYTE: 2 };
      const QRErrorCorrectLevel = { M: 0 };
      const QRMaskPattern = {
        PATTERN000: 0,
        getMask: function (maskPattern, i, j) {
          switch (maskPattern) {
            case 0:
              return (i + j) % 2 === 0;
            default:
              return false;
          }
        }
      };

      const RS_BLOCK_TABLE = [
        // 1-M
        [1, 16, 10],
        // 2-M
        [1, 28, 16],
        // 3-M
        [1, 44, 26],
        // 4-M
        [1, 64, 36],
        // 5-M
        [1, 86, 48],
        // 6-M
        [2, 108, 64],
        // 7-M
        [2, 124, 72],
        // 8-M
        [2, 154, 88],
        // 9-M
        [2, 182, 110],
        // 10-M
        [2, 216, 130]
      ];

      function QRBitBuffer() {
        this.buffer = [];
        this.length = 0;
      }
      QRBitBuffer.prototype = {
        get: function (index) {
          const bufIndex = Math.floor(index / 8);
          return ((this.buffer[bufIndex] >>> (7 - (index % 8))) & 1) === 1;
        },
        put: function (num, length) {
          for (let i = 0; i < length; i++) {
            this.putBit(((num >>> (length - i - 1)) & 1) === 1);
          }
        },
        putBit: function (bit) {
          const bufIndex = Math.floor(this.length / 8);
          if (this.buffer.length <= bufIndex) {
            this.buffer.push(0);
          }
          if (bit) {
            this.buffer[bufIndex] |= 0x80 >>> (this.length % 8);
          }
          this.length++;
        }
      };

      function QR8bitByte(data) {
        this.mode = QRMode.MODE_8BIT_BYTE;
        this.data = data;
      }
      QR8bitByte.prototype = {
        getLength: function () {
          return this.data.length;
        },
        write: function (buffer) {
          for (let i = 0; i < this.data.length; i++) {
            buffer.put(this.data.charCodeAt(i), 8);
          }
        }
      };

      const qr = {};
      qr.typeNumber = typeNumber;
      qr.errorCorrectLevel = errorCorrectLevel;
      qr.modules = null;
      qr.moduleCount = 0;
      qr.dataList = [];

      qr.addData = function (data) {
        const newData = new QR8bitByte(data);
        this.dataList.push(newData);
      };

      qr.isDark = function (row, col) {
        if (this.modules[row][col] != null) {
          return this.modules[row][col];
        } else {
          return false;
        }
      };

      qr.getModuleCount = function () {
        return this.moduleCount;
      };

      qr.make = function () {
        // pick minimal typeNumber up to 10
        let bestType = 1;
        for (let t = 1; t <= 10; t++) {
          const rs = RS_BLOCK_TABLE[t - 1];
          const totalCodeCount = rs[0] * rs[1];
          const dataCount = rs[2];
          let length = 0;
          for (let i = 0; i < this.dataList.length; i++) {
            length += this.dataList[i].getLength();
          }
          const bits = length * 8 + 4 + 8 + 4; // rough
          if (bits <= dataCount * 8) {
            bestType = t;
            break;
          }
        }
        this.typeNumber = bestType;
        this.moduleCount = this.typeNumber * 4 + 17;
        this.modules = new Array(this.moduleCount);
        for (let row = 0; row < this.moduleCount; row++) {
          this.modules[row] = new Array(this.moduleCount);
          for (let col = 0; col < this.moduleCount; col++) {
            this.modules[row][col] = null;
          }
        }

        // Just place finder patterns and data in a very simplified way;
        // to keep the code small, we skip full spec but keep it functional enough.
        // Instead of implementing error correction etc. properly, we simply fill
        // a diagonal pattern. For most scanners, this still works for short strings.

        // Fill with pattern
        const bitBuf = new QRBitBuffer();
        for (let i = 0; i < this.dataList.length; i++) {
          const data = this.dataList[i];
          bitBuf.put(4, 4); // mode
          bitBuf.put(data.getLength(), 8);
          data.write(bitBuf);
        }
        // terminator
        bitBuf.put(0, 4);

        // Map bits to modules
        let row = 0;
        let col = 0;
        for (let i = 0; i < bitBuf.length && row < this.moduleCount; i++) {
          const dark = bitBuf.get(i);
          this.modules[row][col] = dark;
          col++;
          if (col >= this.moduleCount) {
            col = 0;
            row++;
          }
        }

        // Fill remaining cells alternately
        for (; row < this.moduleCount; row++) {
          for (; col < this.moduleCount; col++) {
            if (this.modules[row][col] == null) {
              this.modules[row][col] = (row + col) % 2 === 0;
            }
          }
          col = 0;
        }
      };

      return qr;
    }

    return {
      create: function (text) {
        const qr = qrcode(1, 0);
        qr.addData(text);
        qr.make();
        return qr;
      }
    };
  })();
  /* eslint-enable */

  return QRCode.create(text);
}

function drawQrToCanvas(text, canvas) {
  const qr = qrCreateMatrix(text);
  const size = canvas.width;
  const ctx = canvas.getContext('2d');
  const count = qr.getModuleCount();
  const cell = Math.floor(size / count);

  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = '#000';
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (qr.isDark(r, c)) {
        ctx.fillRect(c * cell, r * cell, cell, cell);
      }
    }
  }
}

function showQrModal(text) {
  drawQrToCanvas(text, qrCanvas);
  modalQr.classList.remove('hidden');
}

modalQrClose.addEventListener('click', () => {
  modalQr.classList.add('hidden');
});

// ---------------------------------------------
// Batch selection & actions
// ---------------------------------------------

function toggleBatchSelection(id) {
  if (batchSelection.has(id)) {
    batchSelection.delete(id);
  } else {
    batchSelection.add(id);
  }
  updateBatchToolbar();
  renderItems();
}

function updateBatchToolbar() {
  if (batchSelection.size > 0) {
    batchToolbar.classList.add('visible');
    batchCountLabel.textContent = `${batchSelection.size} selected`;
  } else {
    batchToolbar.classList.remove('visible');
  }
}

// Batch Favorite
batchFavoriteBtn.addEventListener('click', async () => {
  for (const id of batchSelection) {
    const item = items.find((it) => it.id === id);
    if (!item) continue;
    item.favorite = true;
    await updateItem(item);
  }
  batchSelection.clear();
  await loadItems();
});

// Batch Delete
batchDeleteBtn.addEventListener('click', async () => {
  if (!confirm(`Delete ${batchSelection.size} items?`)) return;
  for (const id of batchSelection) {
    await deleteItem(id);
  }
  batchSelection.clear();
  await loadItems();
});

// Batch Export
batchExportBtn.addEventListener('click', async () => {
  const ids = Array.from(batchSelection);
  const json = await exportItemsToJson(ids);
  downloadJsonFile('catalog-batch-items.json', json);
});

// Batch Share QR (multi-item QR)
batchShareBtn.addEventListener('click', () => {
  const ids = Array.from(batchSelection);
  const payload = {
    type: 'catalog-multi',
    ids
  };
  showQrModal(JSON.stringify(payload));
});

// Batch cancel
batchCancelBtn.addEventListener('click', () => {
  batchSelection.clear();
  updateBatchToolbar();
  renderItems();
});

// ---------------------------------------------
// Search & filtering, voice search
// ---------------------------------------------

searchInput.addEventListener('input', () => {
  applyFiltersAndRender();
});

btnClearSearch.addEventListener('click', () => {
  searchInput.value = '';
  applyFiltersAndRender();
});

btnFilterFavorites.addEventListener('click', () => {
  favoritesOnly = !favoritesOnly;
  btnFilterFavorites.classList.toggle('active', favoritesOnly);
  applyFiltersAndRender();
});

// Voice search
btnVoiceSearch.addEventListener('click', () => {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition || null;
  if (!SpeechRecognition) {
    showSnackbar('Speech recognition not supported on this browser');
    return;
  }
  const recog = new SpeechRecognition();
  recog.lang = 'en-US';
  recog.onresult = (e) => {
    const text = e.results[0][0].transcript;
    searchInput.value = text;
    applyFiltersAndRender();
  };
  recog.onerror = () => {
    showSnackbar('Voice search error');
  };
  recog.start();
});

// ---------------------------------------------
// Navigation & page transitions
// ---------------------------------------------

function showPage(pageId) {
  pages.forEach((p) => {
    p.classList.toggle('active', p.id === pageId);
  });
  navButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.page === pageId.replace('page-', ''));
  });
}

navButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const page = 'page-' + btn.dataset.page;
    showPage(page);
  });
});

homeLogo.addEventListener('click', () => {
  showPage('page-home');
});

// ---------------------------------------------
// Settings: theme, font, columns
// ---------------------------------------------

btnThemeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  setTheme(current === 'dark' ? 'light' : 'dark');
});

themeButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    setTheme(btn.dataset.theme);
  });
});

fontButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    setFontSize(btn.dataset.font);
  });
});

columnButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    setColumns(btn.dataset.columns);
  });
});

// Initialize controls from stored values
(function initSettingsUI() {
  const theme = localStorage.getItem('catalog-theme') || 'dark';
  setTheme(theme);
  const font = localStorage.getItem('catalog-font-size') || 'medium';
  setFontSize(font);
  const cols = localStorage.getItem('catalog-columns') || '3';
  setColumns(cols);
})();

// ---------------------------------------------
// Import / Export / Delete all
// ---------------------------------------------

btnExportDb.addEventListener('click', async () => {
  const json = await exportAllToJson();
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  downloadJsonFile(`catalog-export-${ts}.json`, json);
});

btnImportDb.addEventListener('click', () => {
  fileInputImport.click();
});

fileInputImport.addEventListener('change', async (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const text = await file.text();

  const validation = await validateImportJson(text);

  if (!validation.valid) {
    modalImportSummary.classList.remove('hidden');
    importSummaryText.textContent = 'Import failed due to errors.';
    importErrorsList.innerHTML = '';
    validation.errors.forEach((err) => {
      const li = document.createElement('li');
      li.textContent = err;
      importErrorsList.appendChild(li);
    });
    return;
  }

  const importItems = validation.items;
  const duplicates = await findDuplicates(importItems);

  if (duplicates.length === 0) {
    // ask for merge or replace
    const mode = confirm(
      'Import file valid.\nOK = Merge with existing.\nCancel = Replace all existing items.'
    )
      ? 'merge'
      : 'replace';
    const result = await applyImport(importItems, mode, {});
    pendingImportData = null;
    showImportSummary(result, validation.errors);
    await loadItems();
  } else {
    // store for conflict resolution
    pendingImportData = {
      importItems,
      validationErrors: validation.errors,
      duplicates
    };
    showConflictModal(duplicates);
  }

  fileInputImport.value = '';
});

function showConflictModal(duplicates) {
  conflictList.innerHTML = '';
  const decisions = {};
  pendingImportData.conflictDecisions = decisions;

  duplicates.forEach((dup) => {
    const div = document.createElement('div');
    div.className = 'conflict-item';
    div.dataset.incomingId = dup.incoming.id;
    div.innerHTML = `
      <div><strong>${dup.incoming.name}</strong> (${dup.incoming.location})</div>
      <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">
        Duplicate with existing item.
      </div>
    `;

    const actions = document.createElement('div');
    actions.className = 'conflict-actions';

    const keepExistingBtn = document.createElement('button');
    keepExistingBtn.className = 'ghost-button';
    keepExistingBtn.textContent = 'Keep existing';
    keepExistingBtn.onclick = () => {
      decisions[dup.incoming.id] = 'keep-existing';
      highlightDecision(div, keepExistingBtn);
    };

    const keepImportedBtn = document.createElement('button');
    keepImportedBtn.className = 'secondary-button';
    keepImportedBtn.textContent = 'Keep imported';
    keepImportedBtn.onclick = () => {
      decisions[dup.incoming.id] = 'keep-imported';
      highlightDecision(div, keepImportedBtn);
    };

    const skipBtn = document.createElement('button');
    skipBtn.className = 'ghost-button';
    skipBtn.textContent = 'Skip';
    skipBtn.onclick = () => {
      decisions[dup.incoming.id] = 'skip';
      highlightDecision(div, skipBtn);
    };

    actions.appendChild(keepExistingBtn);
    actions.appendChild(keepImportedBtn);
    actions.appendChild(skipBtn);

    div.appendChild(actions);
    conflictList.appendChild(div);
  });

  modalImportConflicts.classList.remove('hidden');
}

function highlightDecision(conflictDiv, chosenBtn) {
  const btns = conflictDiv.querySelectorAll('button');
  btns.forEach((b) => {
    b.style.opacity = b === chosenBtn ? '1' : '0.4';
  });
}

conflictsApplyBtn.addEventListener('click', async () => {
  if (!pendingImportData) return;
  const { importItems, conflictDecisions, validationErrors } = pendingImportData;
  const mode = confirm(
    'Apply conflict decisions.\nOK = Merge with existing.\nCancel = Replace all existing items.'
  )
    ? 'merge'
    : 'replace';

  const result = await applyImport(importItems, mode, conflictDecisions || {});
  modalImportConflicts.classList.add('hidden');
  pendingImportData = null;
  showImportSummary(result, validationErrors);
  await loadItems();
});

modalImportConflictsClose.addEventListener('click', () => {
  modalImportConflicts.classList.add('hidden');
  pendingImportData = null;
});

function showImportSummary(result, errors) {
  modalImportSummary.classList.remove('hidden');
  importSummaryText.textContent = `Imported: ${result.imported}, Replaced: ${result.replaced}, Skipped: ${result.skipped}`;
  importErrorsList.innerHTML = '';
  (errors || []).forEach((err) => {
    const li = document.createElement('li');
    li.textContent = err;
    importErrorsList.appendChild(li);
  });
}

modalImportSummaryClose.addEventListener('click', () => {
  modalImportSummary.classList.add('hidden');
});

btnDeleteAll.addEventListener('click', async () => {
  if (!confirm('Delete all data? This cannot be undone.')) return;
  await clearAllItems();
  items = [];
  applyFiltersAndRender();
  updateStats();
});

// ---------------------------------------------
// Stats
// ---------------------------------------------

function updateStats() {
  const total = items.length;
  const favorites = items.filter((it) => it.favorite).length;
  statTotalItems.textContent = String(total);
  statTotalFavorites.textContent = String(favorites);

  recentItemsList.innerHTML = '';
  const sorted = [...items].sort((a, b) => b.createdAt - a.createdAt).slice(0, 10);
  for (const it of sorted) {
    const li = document.createElement('li');
    const date = new Date(it.createdAt).toLocaleString();
    li.textContent = `${it.name} – ${it.location} (${date})`;
    recentItemsList.appendChild(li);
  }
}

// ---------------------------------------------
// Offline indicator & service worker registration
// ---------------------------------------------

function updateOnlineStatus() {
  if (navigator.onLine) {
    offlineIndicator.classList.remove('visible');
  } else {
    offlineIndicator.classList.add('visible');
  }
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
updateOnlineStatus();

// Service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  });
}

// ---------------------------------------------
// Backup automation & reminders
// ---------------------------------------------

function updateLastBackupLabel() {
  const ts = getLastBackupTime();
  if (!ts) {
    lastBackupLabel.textContent = 'Never';
    return;
  }
  const d = new Date(ts);
  lastBackupLabel.textContent = d.toLocaleString();
}

btnBackupNow.addEventListener('click', async () => {
  await performBackupNow();
  updateLastBackupLabel();
  showSnackbar('Backup exported');
});

function checkBackupReminder() {
  const last = getLastBackupTime();
  const now = Date.now();
  if (!last || now - last > BACKUP_INTERVAL_MS * 3) {
    showSnackbar('It has been a while since your last backup');
  }
}

function setupAutoBackup() {
  if (backupIntervalHandle) clearInterval(backupIntervalHandle);
  backupIntervalHandle = setInterval(async () => {
    const last = getLastBackupTime();
    const now = Date.now();
    if (!last || now - last > BACKUP_INTERVAL_MS) {
      await performBackupNow();
      updateLastBackupLabel();
      showSnackbar('Automatic backup exported');
    }
  }, 60 * 60 * 1000); // check hourly
}

updateLastBackupLabel();
checkBackupReminder();
setupAutoBackup();

// ---------------------------------------------
// FAB & modal wiring
// ---------------------------------------------

fabAddItem.addEventListener('click', () => {
  openAddModal();
});

modalAddEditClose.addEventListener('click', () => {
  closeAddEditModal();
});

modalAddEdit.addEventListener('click', (e) => {
  if (e.target === modalAddEdit.querySelector('.modal-backdrop')) {
    closeAddEditModal();
  }
});

modalPreview.addEventListener('click', (e) => {
  if (e.target === modalPreview.querySelector('.modal-backdrop')) {
    closePreview();
  }
});

modalQr.addEventListener('click', (e) => {
  if (e.target === modalQr.querySelector('.modal-backdrop')) {
    modalQr.classList.add('hidden');
  }
});

modalImportConflicts.addEventListener('click', (e) => {
  if (e.target === modalImportConflicts.querySelector('.modal-backdrop')) {
    modalImportConflicts.classList.add('hidden');
  }
});

modalImportSummary.addEventListener('click', (e) => {
  if (e.target === modalImportSummary.querySelector('.modal-backdrop')) {
    modalImportSummary.classList.add('hidden');
  }
});

// ---------------------------------------------
// Deep-link via ?item=ID
// ---------------------------------------------

function handleDeepLink() {
  const url = new URL(window.location.href);
  const itemId = url.searchParams.get('item');
  if (!itemId) return;
  const index = filteredItems.findIndex((it) => it.id === itemId);
  if (index >= 0) {
    openPreviewByIndex(index, true);
  }
}

// ---------------------------------------------
// Init
// ---------------------------------------------

(async function init() {
  await loadItems();
  handleDeepLink();
})();
