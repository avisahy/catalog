// script.js
// UI logic, interaction, swipe, voice search, QR, backup, etc.

import {
  addItem,
  updateItem,
  deleteItem,
  clearAllItems,
  getAllItems,
  getItemById,
  exportAllToJson,
  exportItemsSubset,
  exportSingleItem,
  triggerDownloadJson,
  validateAndParseImport,
  importItems,
  setMeta,
  getMeta,
} from "./db.js";

/* State */

let items = [];
let filteredItems = [];
let favoritesOnly = false;
let batchMode = false;
let batchSelection = new Set();
let lastDeleted = null;
let lastDeletedTimeout = null;

let currentPreviewId = null;
let previewIndex = -1;

let touchStartX = null;
let touchStartY = null;

/* DOM */

const catalogGrid = document.getElementById("catalog-grid");
const skeletonContainer = document.getElementById("skeleton-container");
const emptyState = document.getElementById("empty-state");

const fabAdd = document.getElementById("fab-add");
const itemModal = document.getElementById("item-modal");
const itemModalClose = document.getElementById("item-modal-close");
const itemModalTitle = document.getElementById("item-modal-title");
const itemForm = document.getElementById("item-form");
const itemNameInput = document.getElementById("item-name");
const itemLocationInput = document.getElementById("item-location");
const itemImageInput = document.getElementById("item-image");
const itemSaveBtn = document.getElementById("item-save-btn");

const previewModal = document.getElementById("preview-modal");
const previewBackBtn = document.getElementById("preview-back-btn");
const previewImage = document.getElementById("preview-image");
const previewName = document.getElementById("preview-name");
const previewLocation = document.getElementById("preview-location");
const previewTitle = document.getElementById("preview-title");
const previewFavoriteBtn = document.getElementById("preview-favorite-btn");
const previewExportItemBtn = document.getElementById(
  "preview-export-item-btn"
);
const previewShareWhatsAppBtn = document.getElementById(
  "preview-share-whatsapp-btn"
);
const previewShareQrBtn = document.getElementById("preview-share-qr-btn");
const previewShareLinkBtn = document.getElementById("preview-share-link-btn");
const previewDeleteBtn = document.getElementById("preview-delete-btn");
const previewFullscreenBtn = document.getElementById(
  "preview-fullscreen-btn"
);

const qrModal = document.getElementById("qr-modal");
const qrCloseBtn = document.getElementById("qr-close-btn");
const qrCanvas = document.getElementById("qr-canvas");

const favoritesToggle = document.getElementById("favorites-toggle");
const batchToggle = document.getElementById("batch-toggle");
const batchBar = document.getElementById("batch-bar");
const batchCount = document.getElementById("batch-count");
const batchFavoriteBtn = document.getElementById("batch-favorite-btn");
const batchExportBtn = document.getElementById("batch-export-btn");
const batchShareBtn = document.getElementById("batch-share-btn");
const batchDeleteBtn = document.getElementById("batch-delete-btn");

const offlineIndicator = document.getElementById("offline-indicator");

const snackbar = document.getElementById("snackbar");
const snackbarMessage = document.getElementById("snackbar-message");
const snackbarUndoBtn = document.getElementById("snackbar-undo-btn");

const searchInput = document.getElementById("search-input");
const voiceSearchBtn = document.getElementById("voice-search-btn");

const bottomNavButtons = document.querySelectorAll(".bottom-nav-btn");
const pages = document.querySelectorAll(".page");
const logoButton = document.getElementById("logo-button");

const settingsOpenBtn = document.getElementById("settings-open-btn");
const themeSelect = document.getElementById("theme-select");
const darkModeToggle = document.getElementById("dark-mode-toggle");
const textSizeSelect = document.getElementById("text-size-select");
const layoutSelect = document.getElementById("layout-select");

const exportAllBtn = document.getElementById("export-all-btn");
const importBtn = document.getElementById("import-btn");
const importFileInput = document.getElementById("import-file-input");
const deleteAllBtn = document.getElementById("delete-all-btn");
const backupDriveBtn = document.getElementById("backup-drive-btn");
const backupIntervalSelect = document.getElementById(
  "backup-interval-select"
);

const statTotalItems = document.getElementById("stat-total-items");
const statFavorites = document.getElementById("stat-favorites");
const recentList = document.getElementById("recent-list");

const importConflictModal = document.getElementById("import-conflict-modal");
const conflictNameSpan = document.getElementById("conflict-name");
const conflictLocationSpan = document.getElementById("conflict-location");
const conflictKeepExistingBtn = document.getElementById(
  "conflict-keep-existing-btn"
);
const conflictKeepImportedBtn = document.getElementById(
  "conflict-keep-imported-btn"
);
const conflictSkipBtn = document.getElementById("conflict-skip-btn");

const importSummaryModal = document.getElementById("import-summary-modal");
const importSummaryImportedSpan = document.getElementById(
  "import-summary-imported"
);
const importSummarySkippedSpan = document.getElementById(
  "import-summary-skipped"
);
const importSummaryReplacedSpan = document.getElementById(
  "import-summary-replaced"
);
const importSummaryErrorsDiv = document.getElementById(
  "import-summary-errors"
);
const importSummaryCloseBtn = document.getElementById(
  "import-summary-close-btn"
);

/* Utility */

function showElement(el) {
  el.classList.remove("hidden");
}
function hideElement(el) {
  el.classList.add("hidden");
}

function openModal(el) {
  el.classList.remove("hidden");
}
function closeModal(el) {
  el.classList.add("hidden");
}

function showSnackbar(message, undoCallback) {
  snackbarMessage.textContent = message;
  snackbar.classList.remove("hidden");
  if (lastDeletedTimeout) {
    clearTimeout(lastDeletedTimeout);
  }
  lastDeletedTimeout = setTimeout(() => {
    snackbar.classList.add("hidden");
    lastDeleted = null;
  }, 4000);

  snackbarUndoBtn.onclick = () => {
    if (undoCallback) undoCallback();
    snackbar.classList.add("hidden");
    lastDeleted = null;
  };
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

/* Load and render items */

async function loadItems() {
  showElement(skeletonContainer);
  items = await getAllItems();
  hideElement(skeletonContainer);
  applyFiltersAndRender();
}

function applyFiltersAndRender() {
  const query = (searchInput.value || "").trim().toLowerCase();
  filteredItems = items.filter((item) => {
    if (favoritesOnly && !item.favorite) return false;
    if (!query) return true;
    const name = item.name.toLowerCase();
    const loc = item.location.toLowerCase();
    return name.includes(query) || loc.includes(query);
  });
  renderGrid();
  updateStats();
}

function renderGrid() {
  catalogGrid.innerHTML = "";
  if (!filteredItems.length) {
    showElement(emptyState);
    return;
  }
  hideElement(emptyState);

  filteredItems.forEach((item) => {
    const card = document.createElement("div");
    card.className = "card";
    card.dataset.id = item.id;

    const inner = document.createElement("div");
    inner.className = "card-inner";

    const img = document.createElement("img");
    img.loading = "lazy";
    img.src = item.image;
    img.alt = item.name || "Item";

    inner.appendChild(img);

    if (item.favorite) {
      const favTag = document.createElement("div");
      favTag.className = "card-favorite";
      favTag.textContent = "★ Fav";
      inner.appendChild(favTag);
    }

    if (batchMode) {
      const sel = document.createElement("div");
      sel.className = "card-select";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = batchSelection.has(item.id);
      checkbox.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleBatchSelection(item.id);
      });
      sel.appendChild(checkbox);
      inner.appendChild(sel);
    }

    card.appendChild(inner);

    // 3D tilt for pointer
    card.addEventListener("mousemove", (e) => handleCardTilt(e, card));
    card.addEventListener("mouseleave", () => resetCardTilt(card));

    card.addEventListener("click", () => {
      if (batchMode) {
        toggleBatchSelection(item.id);
      } else {
        openPreview(item.id);
      }
    });

    catalogGrid.appendChild(card);
  });

  updateBatchBar();
}

function handleCardTilt(e, card) {
  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const pctX = (x / rect.width) * 2 - 1;
  const pctY = (y / rect.height) * 2 - 1;
  const rx = (-pctY * 8).toFixed(2) + "deg";
  const ry = (pctX * 8).toFixed(2) + "deg";
  card.style.setProperty("--rx", rx);
  card.style.setProperty("--ry", ry);
}

function resetCardTilt(card) {
  card.style.setProperty("--rx", "0deg");
  card.style.setProperty("--ry", "0deg");
}

/* Preview logic */

function openPreview(id) {
  currentPreviewId = id;
  previewIndex = filteredItems.findIndex((it) => it.id === id);
  const item = items.find((it) => it.id === id);
  if (!item) return;

  previewImage.src = item.image;
  previewName.textContent = item.name;
  previewLocation.textContent = item.location;
  previewTitle.textContent = item.name || "Item";
  previewFavoriteBtn.textContent = item.favorite ? "★" : "☆";

  openModal(previewModal);

  // Scroll to card and highlight after closing
}

function closePreview() {
  const id = currentPreviewId;
  closeModal(previewModal);
  if (!id) return;
  setTimeout(() => scrollAndHighlightCard(id), 150);
}

function scrollAndHighlightCard(id) {
  const card = catalogGrid.querySelector(`.card[data-id="${id}"]`);
  if (!card) return;
  card.scrollIntoView({ behavior: "smooth", block: "center" });
  card.classList.add("card-highlight");
  setTimeout(() => card.classList.remove("card-highlight"), 800);
}

/* Swipe navigation in preview */

function onPreviewTouchStart(e) {
  if (!e.touches || e.touches.length !== 1) return;
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
}

function onPreviewTouchMove(e) {
  if (touchStartX == null || touchStartY == null) return;
  const dx = e.touches[0].clientX - touchStartX;
  const dy = e.touches[0].clientY - touchStartY;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
    if (dx > 0) {
      // swipe right -> previous
      goPrevPreview();
    } else {
      // swipe left -> next
      goNextPreview();
    }
    touchStartX = null;
    touchStartY = null;
  }
}

function onPreviewTouchEnd() {
  touchStartX = null;
  touchStartY = null;
}

function goPrevPreview() {
  if (previewIndex <= 0) return;
  previewIndex -= 1;
  const item = filteredItems[previewIndex];
  openPreview(item.id);
}

function goNextPreview() {
  if (previewIndex >= filteredItems.length - 1) return;
  previewIndex += 1;
  const item = filteredItems[previewIndex];
  openPreview(item.id);
}

/* Pinch-to-zoom + fullscreen (simple) */

let lastScale = 1;
let initialDistance = null;

function handlePreviewTouchGesture(e) {
  if (e.touches.length === 2) {
    e.preventDefault();
    const [t1, t2] = e.touches;
    const dx = t2.clientX - t1.clientX;
    const dy = t2.clientY - t1.clientY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (!initialDistance) {
      initialDistance = dist;
      return;
    }
    const scale = Math.min(3, Math.max(1, (dist / initialDistance) * lastScale));
    previewImage.style.transform = `scale(${scale})`;
  }
}

function handlePreviewTouchEndGesture(e) {
  if (e.touches.length < 2) {
    lastScale = 1;
    initialDistance = null;
    setTimeout(() => {
      previewImage.style.transform = "scale(1)";
    }, 150);
  }
}

function enterFullscreen() {
  if (previewImage.requestFullscreen) {
    previewImage.requestFullscreen();
  } else if (previewImage.webkitRequestFullscreen) {
    previewImage.webkitRequestFullscreen();
  }
}

/* Add/edit item */

let editingItemId = null;

function openAddModal() {
  editingItemId = null;
  itemModalTitle.textContent = "Add item";
  itemForm.reset();
  openModal(itemModal);
}

async function openEditModal(id) {
  const item = items.find((it) => it.id === id);
  if (!item) return;
  editingItemId = id;
  itemModalTitle.textContent = "Edit item";
  itemNameInput.value = item.name;
  itemLocationInput.value = item.location;
  itemImageInput.value = "";
  openModal(itemModal);
}

async function saveItem() {
  const name = itemNameInput.value.trim();
  const location = itemLocationInput.value.trim();
  if (!name || !location) return;

  let base64Image = null;
  const file = itemImageInput.files[0];
  if (file) {
    base64Image = await readFileAsBase64(file);
  }

  if (!editingItemId && !base64Image) {
    alert("Image is required for new items.");
    return;
  }

  if (editingItemId) {
    const existing = await getItemById(editingItemId);
    if (!existing) return;
    const updated = { ...existing, name, location };
    if (base64Image) {
      updated.image = base64Image;
    }
    updated.updatedAt = new Date().toISOString();
    updated.checksum = await cryptoChecksumItem(updated);
    await updateItem(updated);
  } else {
    const id = crypto.randomUUID();
    const item = {
      id,
      name,
      location,
      image: base64Image,
      favorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    item.checksum = await cryptoChecksumItem(item);
    await addItem(item);
  }

  closeModal(itemModal);
  await loadItems();
}

/* Item checksum based on content (for duplicate detection) */

async function cryptoChecksumItem(item) {
  const minimal = {
    name: item.name,
    location: item.location,
    image: item.image,
  };
  const str = JSON.stringify(minimal);
  const enc = new TextEncoder();
  const bytes = enc.encode(str);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const arr = Array.from(new Uint8Array(digest));
  return arr.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* Favorites */

async function toggleFavorite(id) {
  const it = await getItemById(id);
  if (!it) return;
  it.favorite = !it.favorite;
  it.updatedAt = new Date().toISOString();
  await updateItem(it);
  await loadItems();
}

/* Delete + undo */

async function deleteItemWithUndo(id) {
  const item = await getItemById(id);
  if (!item) return;
  lastDeleted = item;
  await deleteItem(id);
  await loadItems();
  showSnackbar("Item deleted", async () => {
    if (lastDeleted) {
      await addItem(lastDeleted);
      await loadItems();
    }
  });
}

async function deleteMultiple(ids) {
  for (const id of ids) {
    await deleteItem(id);
  }
  await loadItems();
}

/* Batch actions */

function setBatchMode(enabled) {
  batchMode = enabled;
  batchSelection.clear();
  if (batchMode) {
    showElement(batchBar);
  } else {
    hideElement(batchBar);
  }
  renderGrid();
}

function toggleBatchSelection(id) {
  if (batchSelection.has(id)) {
    batchSelection.delete(id);
  } else {
    batchSelection.add(id);
  }
  updateBatchBar();
  // re-render to update checkbox states
  renderGrid();
}

function updateBatchBar() {
  if (!batchMode) return;
  batchCount.textContent = `${batchSelection.size} selected`;
}

async function batchFavorite() {
  for (const id of batchSelection) {
    const it = await getItemById(id);
    if (it) {
      it.favorite = true;
      await updateItem(it);
    }
  }
  await loadItems();
}

async function batchExport() {
  const selectedItems = items.filter((it) => batchSelection.has(it.id));
  if (!selectedItems.length) return;
  const payload = await exportItemsSubset(selectedItems);
  triggerDownloadJson("catalog-selected.json", payload);
}

async function batchShare() {
  const selectedItems = items.filter((it) => batchSelection.has(it.id));
  if (!selectedItems.length) return;
  // share via QR multi-item code
  await showQrForItems(selectedItems);
}

async function batchDelete() {
  const ids = Array.from(batchSelection);
  if (!ids.length) return;
  if (!confirm(`Delete ${ids.length} items?`)) return;
  await deleteMultiple(ids);
  setBatchMode(false);
}

/* Favorites filter */

function toggleFavoritesFilter() {
  favoritesOnly = !favoritesOnly;
  favoritesToggle.style.color = favoritesOnly ? "#facc15" : "";
  applyFiltersAndRender();
}

/* Search + voice search */

searchInput.addEventListener("input", () => applyFiltersAndRender());

function startVoiceSearch() {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Voice recognition not supported in this browser.");
    return;
  }
  const rec = new SpeechRecognition();
  rec.lang = "en-US";
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  rec.onresult = (e) => {
    const transcript = e.results[0][0].transcript;
    searchInput.value = transcript;
    applyFiltersAndRender();
  };
  rec.start();
}

/* Navigation + animated pages */

function setActivePage(name) {
  pages.forEach((page) => {
    if (page.dataset.page === name) {
      page.classList.add("page-active");
    } else {
      page.classList.remove("page-active");
    }
  });

  bottomNavButtons.forEach((btn) => {
    const nav = btn.getAttribute("data-nav");
    if (nav === name) {
      btn.classList.add("bottom-nav-btn-active");
    } else {
      btn.classList.remove("bottom-nav-btn-active");
    }
  });
}

bottomNavButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const nav = btn.getAttribute("data-nav");
    setActivePage(nav);
  });
});

logoButton.addEventListener("click", () => setActivePage("home"));
settingsOpenBtn.addEventListener("click", () => setActivePage("settings"));

/* Appearance settings */

function loadAppearanceSettings() {
  const storedTheme = localStorage.getItem("theme") || "dark";
  const storedTextSize = localStorage.getItem("textSize") || "medium";
  const storedLayout = localStorage.getItem("layout") || "grid-3";

  themeSelect.value = storedTheme === "dark" ? "dark" : storedTheme;
  textSizeSelect.value = storedTextSize;
  layoutSelect.value = storedLayout;

  applyTheme(storedTheme);
  applyTextSize(storedTextSize);
  applyLayout(storedLayout);
}

function applyTheme(theme) {
  document.body.classList.remove("light-theme", "theme-blue", "theme-purple");
  const metaTheme = document.getElementById("meta-theme-color");

  if (theme === "light") {
    document.body.classList.add("light-theme");
    metaTheme.setAttribute("content", "#f9fafb");
    darkModeToggle.checked = false;
  } else if (theme === "blue") {
    document.body.classList.add("theme-blue");
    metaTheme.setAttribute("content", "#0f172a");
    darkModeToggle.checked = true;
  } else if (theme === "purple") {
    document.body.classList.add("theme-purple");
    metaTheme.setAttribute("content", "#0f172a");
    darkModeToggle.checked = true;
  } else {
    metaTheme.setAttribute("content", "#020617");
    darkModeToggle.checked = true;
  }

  localStorage.setItem("theme", theme);
}

function applyTextSize(size) {
  document.body.classList.remove("text-small", "text-medium", "text-large");
  document.body.classList.add(`text-${size}`);
  localStorage.setItem("textSize", size);
}

function applyLayout(layout) {
  catalogGrid.classList.remove("grid-2-col", "grid-3-col", "grid-4-col");
  if (layout === "grid-2") {
    catalogGrid.classList.add("grid-2-col");
  } else if (layout === "grid-4") {
    catalogGrid.classList.add("grid-4-col");
  } else {
    catalogGrid.classList.add("grid-3-col");
  }
  localStorage.setItem("layout", layout);
}

/* Export / Import / Backup */

exportAllBtn.addEventListener("click", async () => {
  const payload = await exportAllToJson();
  triggerDownloadJson("catalog-export.json", payload);
});

importBtn.addEventListener("click", () => {
  importFileInput.value = "";
  importFileInput.click();
});

importFileInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const content = await file.text();
  const result = await validateAndParseImport(content);

  if (!result.ok) {
    alert(`Import failed: ${result.error}`);
    return;
  }

  if (result.tampered) {
    alert(
      "Warning: The file appears to have been modified or corrupted. Proceed with caution."
    );
  }

  const invalidItems = result.invalidItems || [];
  let selectedMode = "merge";
  const choice = prompt(
    "Import mode: type 'merge', 'replace', or 'select' (default: merge)",
    "merge"
  );
  if (choice === "replace") selectedMode = "replace";
  else if (choice === "select") selectedMode = "select";

  let selectedIds = null;
  if (selectedMode === "select") {
    const idsStr = prompt(
      `Provide comma separated IDs to import.\nAvailable: ${result.items
        .map((i) => i.id)
        .join(", ")}`,
      ""
    );
    if (idsStr && idsStr.trim()) {
      selectedIds = idsStr.split(",").map((x) => x.trim());
    }
  }

  let conflictResolvePromise = null;
  let conflictResolveFn = null;

  function openConflictDialog(existing, incoming) {
    openModal(importConflictModal);
    conflictNameSpan.textContent = existing.name;
    conflictLocationSpan.textContent = existing.location;

    conflictResolvePromise = new Promise((resolve) => {
      conflictResolveFn = resolve;
    });
  }

  conflictKeepExistingBtn.addEventListener("click", () => {
    if (conflictResolveFn) conflictResolveFn("keep-existing");
    closeModal(importConflictModal);
  });

  conflictKeepImportedBtn.addEventListener("click", () => {
    if (conflictResolveFn) conflictResolveFn("keep-imported");
    closeModal(importConflictModal);
  });

  conflictSkipBtn.addEventListener("click", () => {
    if (conflictResolveFn) conflictResolveFn("skip");
    closeModal(importConflictModal);
  });

  const summary = await importItems({
    items: result.items,
    mode: selectedMode,
    selectedIds,
    conflictHandler: async (existing, incoming) => {
      openConflictDialog(existing, incoming);
      const decision = await conflictResolvePromise;
      conflictResolvePromise = null;
      conflictResolveFn = null;
      return decision;
    },
  });

  // Show import summary
  importSummaryImportedSpan.textContent = summary.imported;
  importSummarySkippedSpan.textContent = summary.skipped;
  importSummaryReplacedSpan.textContent = summary.replaced;

  if (invalidItems.length || result.tampered) {
    importSummaryErrorsDiv.innerHTML = "";
    if (result.tampered) {
      const p = document.createElement("p");
      p.textContent =
        "File tampering detected: checksum mismatch. Some items may be unreliable.";
      importSummaryErrorsDiv.appendChild(p);
    }
    if (invalidItems.length) {
      const p = document.createElement("p");
      p.textContent = `Items with invalid structure: ${invalidItems.length}`;
      importSummaryErrorsDiv.appendChild(p);
    }
    showElement(importSummaryErrorsDiv);
  } else {
    hideElement(importSummaryErrorsDiv);
  }

  openModal(importSummaryModal);
  await loadItems();
});

importSummaryCloseBtn.addEventListener("click", () =>
  closeModal(importSummaryModal)
);

deleteAllBtn.addEventListener("click", async () => {
  if (!confirm("Delete all data? This cannot be undone.")) return;
  await clearAllItems();
  await loadItems();
});

/* "Cloud" backup to Google Drive (manual export JSON) */

backupDriveBtn.addEventListener("click", async () => {
  const payload = await exportAllToJson();
  triggerDownloadJson("catalog-backup-drive.json", payload);
  const now = Date.now();
  localStorage.setItem("lastBackupAt", String(now));
});

/* Auto-backup + reminder */

function maybeAutoBackup() {
  const lastBackupStr = localStorage.getItem("lastBackupAt");
  const intervalDays = Number(
    localStorage.getItem("backupIntervalDays") || "1"
  );
  const intervalMs = intervalDays * 24 * 60 * 60 * 1000;
  const now = Date.now();
  if (!lastBackupStr) {
    // No backup yet: remind user
    if (now - (Number(localStorage.getItem("firstUseAt")) || 0) > intervalMs) {
      alert(
        "You haven't backed up your catalog yet. Use Settings → Manual backup."
      );
    }
    return;
  }

  const lastBackup = Number(lastBackupStr);
  if (now - lastBackup >= intervalMs) {
    // Auto-export and store in browser downloads
    exportAllToJson().then((payload) => {
      triggerDownloadJson("catalog-auto-backup.json", payload);
      localStorage.setItem("lastBackupAt", String(now));
    });
  }
}

function initBackupScheduler() {
  const firstUseAt =
    Number(localStorage.getItem("firstUseAt")) || Date.now();
  localStorage.setItem("firstUseAt", String(firstUseAt));

  const intervalDays = Number(
    localStorage.getItem("backupIntervalDays") || "1"
  );
  backupIntervalSelect.value = String(intervalDays);

  setInterval(maybeAutoBackup, 60 * 1000); // check every minute
  maybeAutoBackup();
}

backupIntervalSelect.addEventListener("change", () => {
  const days = Number(backupIntervalSelect.value);
  localStorage.setItem("backupIntervalDays", String(days));
});

/* Stats */

function updateStats() {
  const total = items.length;
  const favs = items.filter((it) => it.favorite).length;
  statTotalItems.textContent = total;
  statFavorites.textContent = favs;

  const sorted = [...items].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
  const recent = sorted.slice(0, 10);
  recentList.innerHTML = "";
  for (const it of recent) {
    const li = document.createElement("li");
    const left = document.createElement("span");
    left.textContent = it.name;
    const right = document.createElement("span");
    const date = new Date(it.createdAt);
    right.textContent = date.toLocaleDateString();
    li.appendChild(left);
    li.appendChild(right);
    recentList.appendChild(li);
  }
}

/* QR code (simple, small payload) */

function drawSimpleQr(data) {
  // Minimalistic "fake" QR style grid just for demo.
  // For production you’d want a real QR implementation.
  const ctx = qrCanvas.getContext("2d");
  const size = qrCanvas.width;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#000";

  // simple hashing to distribute blocks
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = (hash * 31 + data.charCodeAt(i)) & 0xffffffff;
  }

  const cols = 21;
  const cell = size / cols;

  for (let y = 0; y < cols; y++) {
    for (let x = 0; x < cols; x++) {
      // primitive pattern
      const val = (hash + x * 13 + y * 17) & 1;
      if (val) {
        ctx.fillRect(x * cell, y * cell, cell, cell);
      }
    }
  }
}

async function showQrForItems(itemsToShare) {
  const payload = await exportItemsSubset(itemsToShare);
  const jsonStr = JSON.stringify(payload);
  const encoded = btoa(jsonStr);
  drawSimpleQr(encoded);
  openModal(qrModal);
}

/* Share features */

function shareViaWhatsApp(text) {
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank");
}

function buildItemShareText(item) {
  return `Catalog item:
Name: ${item.name}
Location: ${item.location}`;
}

function buildPreviewLink(item) {
  const base = `${location.origin}${location.pathname}`;
  const encoded = encodeURIComponent(
    btoa(JSON.stringify({ id: item.id, name: item.name }))
  );
  return `${base}?item=${encoded}`;
}

/* Offline indicator */

function updateOfflineIndicator() {
  if (navigator.onLine) {
    offlineIndicator.classList.remove("offline");
  } else {
    offlineIndicator.classList.add("offline");
  }
}

/* PWA install + service worker */

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  }
}

/* Event wiring */

window.addEventListener("online", updateOfflineIndicator);
window.addEventListener("offline", updateOfflineIndicator);

fabAdd.addEventListener("click", openAddModal);
itemModalClose.addEventListener("click", () => closeModal(itemModal));
itemSaveBtn.addEventListener("click", () => {
  saveItem().catch((err) => console.error(err));
});

previewBackBtn.addEventListener("click", () => closePreview());
previewFavoriteBtn.addEventListener("click", () => {
  if (currentPreviewId) toggleFavorite(currentPreviewId);
});
previewExportItemBtn.addEventListener("click", async () => {
  if (!currentPreviewId) return;
  const payload = await exportSingleItem(currentPreviewId);
  triggerDownloadJson("catalog-item.json", payload);
});
previewShareWhatsAppBtn.addEventListener("click", async () => {
  if (!currentPreviewId) return;
  const item = items.find((it) => it.id === currentPreviewId);
  if (!item) return;
  const text = buildItemShareText(item);
  shareViaWhatsApp(text);
});
previewShareLinkBtn.addEventListener("click", () => {
  if (!currentPreviewId) return;
  const item = items.find((it) => it.id === currentPreviewId);
  if (!item) return;
  const link = buildPreviewLink(item);
  if (navigator.share) {
    navigator.share({
      title: "Catalog item",
      url: link,
    });
  } else {
    prompt("Copy link:", link);
  }
});
previewShareQrBtn.addEventListener("click", async () => {
  if (!currentPreviewId) return;
  const item = items.find((it) => it.id === currentPreviewId);
  await showQrForItems([item]);
});
previewDeleteBtn.addEventListener("click", () => {
  if (!currentPreviewId) return;
  deleteItemWithUndo(currentPreviewId);
  closePreview();
});
previewFullscreenBtn.addEventListener("click", enterFullscreen);

previewModal.addEventListener("touchstart", onPreviewTouchStart, {
  passive: true,
});
previewModal.addEventListener("touchmove", onPreviewTouchMove, {
  passive: true,
});
previewModal.addEventListener("touchend", onPreviewTouchEnd);

/* pinch */
previewImage.addEventListener("touchmove", handlePreviewTouchGesture, {
  passive: false,
});
previewImage.addEventListener("touchend", handlePreviewTouchEndGesture, {
  passive: false,
});

favoritesToggle.addEventListener("click", toggleFavoritesFilter);
batchToggle.addEventListener("click", () => setBatchMode(!batchMode));
batchFavoriteBtn.addEventListener("click", () => batchFavorite());
batchExportBtn.addEventListener("click", () => batchExport());
batchShareBtn.addEventListener("click", () => batchShare());
batchDeleteBtn.addEventListener("click", () => batchDelete());

qrCloseBtn.addEventListener("click", () => closeModal(qrModal));

voiceSearchBtn.addEventListener("click", startVoiceSearch);

/* Appearance controls */

themeSelect.addEventListener("change", () => {
  const value = themeSelect.value;
  applyTheme(value);
});

darkModeToggle.addEventListener("change", () => {
  const isDark = darkModeToggle.checked;
  if (isDark) {
    const theme = localStorage.getItem("theme") || "dark";
    if (theme === "light") {
      applyTheme("dark");
      themeSelect.value = "dark";
    } else {
      applyTheme(theme);
    }
  } else {
    applyTheme("light");
    themeSelect.value = "light";
  }
});

textSizeSelect.addEventListener("change", () =>
  applyTextSize(textSizeSelect.value)
);
layoutSelect.addEventListener("change", () =>
  applyLayout(layoutSelect.value)
);

/* Import summary close handled above */

/* Init */

(async function init() {
  loadAppearanceSettings();
  updateOfflineIndicator();
  registerServiceWorker();
  initBackupScheduler();
  await loadItems();

  // If there is a ?item= link, try to open that preview
  const urlParams = new URLSearchParams(window.location.search);
  const encoded = urlParams.get("item");
  if (encoded) {
    try {
      const decoded = JSON.parse(atob(decodeURIComponent(encoded)));
      const it = items.find((i) => i.id === decoded.id);
      if (it) openPreview(it.id);
    } catch (err) {
      console.warn("Invalid preview link");
    }
  }
})();
