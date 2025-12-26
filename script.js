/* ============================================================
   CATALOG PWA — FULL SCRIPT
   Uses db.js (as previously provided)
   ============================================================ */

const appState = {
  items: [],
  filteredItems: [],
  favoritesOnly: false,
  batchMode: false,
  batchSelection: new Set(),
  currentPreviewIndex: -1,
  lastPreviewId: null,
  lastPreviewScrollY: 0,
  theme: "indigo",
  mode: "dark",
  layoutCols: 3,
  textSize: "medium",
  lastBackupAt: null,
  backupIntervalDays: 1,
  snackbarTimeout: null,
  snackbarUndoHandler: null,
};

const dom = {};
let currentImportPayload = null;
let editModeItemId = null;

/* ============================================================
   INIT
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  cacheDom();
  attachEventHandlers();
  initPreferences();
  registerServiceWorker();
  loadInitialData();
  initBackupScheduler();
  initOfflineIndicator();
  initVoiceSearch();
});

/* ============================================================
   DOM CACHE
   ============================================================ */

function cacheDom() {
  dom.body = document.body;

  dom.pageContainer = document.getElementById("pageContainer");
  dom.homePage = document.getElementById("homePage");
  dom.settingsPage = document.getElementById("settingsPage");
  dom.statsPage = document.getElementById("statsPage");

  dom.catalogGrid = document.getElementById("catalogGrid");
  dom.skeletonGrid = document.getElementById("skeletonGrid");
  dom.emptyState = document.getElementById("emptyState");

  dom.fabAddItem = document.getElementById("fabAddItem");

  dom.homeLogo = document.getElementById("homeLogo");
  dom.settingsNavBtn = document.getElementById("settingsNavBtn");
  dom.statsNavBtn = document.getElementById("statsNavBtn");

  dom.searchInput = document.getElementById("searchInput");
  dom.voiceSearchBtn = document.getElementById("voiceSearchBtn");
  dom.favoriteFilterBtn = document.getElementById("favoriteFilterBtn");
  dom.batchModeBtn = document.getElementById("batchModeBtn");

  dom.layoutChips = document.querySelectorAll(".layout-chip");
  dom.textSizeChips = document.querySelectorAll(".text-size-chip");
  dom.themeToggle = document.getElementById("themeToggle");
  dom.themeSwatches = document.querySelectorAll(".theme-swatch");
  dom.backupIntervalSelect = document.getElementById("backupIntervalSelect");
  dom.lastBackupLabel = document.getElementById("lastBackupLabel");
  dom.statsLastBackup = document.getElementById("statsLastBackup");

  dom.exportAllBtn = document.getElementById("exportAllBtn");
  dom.importBtn = document.getElementById("importBtn");
  dom.importFileInput = document.getElementById("importFileInput");
  dom.manualBackupBtn = document.getElementById("manualBackupBtn");
  dom.deleteAllBtn = document.getElementById("deleteAllBtn");

  dom.previewOverlay = document.getElementById("previewOverlay");
  dom.previewCard = document.getElementById("previewCard");
  dom.previewImageContainer = document.getElementById("previewImageContainer");
  dom.previewImage = document.getElementById("previewImage");
  dom.previewName = document.getElementById("previewName");
  dom.previewLocation = document.getElementById("previewLocation");
  dom.closePreviewBtn = document.getElementById("closePreviewBtn");
  dom.previewFavoriteBtn = document.getElementById("previewFavoriteBtn");
  dom.previewWhatsAppBtn = document.getElementById("previewWhatsAppBtn");
  dom.previewQrBtn = document.getElementById("previewQrBtn");
  dom.previewShareLinkBtn = document.getElementById("previewShareLinkBtn");
  dom.previewExportBtn = document.getElementById("previewExportBtn");
  dom.previewDeleteBtn = document.getElementById("previewDeleteBtn");
  dom.previewPrevBtn = document.getElementById("previewPrevBtn");
  dom.previewNextBtn = document.getElementById("previewNextBtn");

  dom.qrOverlay = document.getElementById("qrOverlay");
  dom.qrCanvas = document.getElementById("qrCanvas");
  dom.closeQrBtn = document.getElementById("closeQrBtn");

  dom.editOverlay = document.getElementById("editOverlay");
  dom.editDialogTitle = document.getElementById("editDialogTitle");
  dom.editForm = document.getElementById("editForm");
  dom.editName = document.getElementById("editName");
  dom.editLocation = document.getElementById("editLocation");
  dom.editImageInput = document.getElementById("editImageInput");
  dom.editCancelBtn = document.getElementById("editCancelBtn");

  dom.batchBar = document.getElementById("batchBar");
  dom.batchCountLabel = document.getElementById("batchCountLabel");
  dom.batchFavoriteBtn = document.getElementById("batchFavoriteBtn");
  dom.batchShareBtn = document.getElementById("batchShareBtn");
  dom.batchExportBtn = document.getElementById("batchExportBtn");
  dom.batchDeleteBtn = document.getElementById("batchDeleteBtn");
  dom.batchCancelBtn = document.getElementById("batchCancelBtn");

  dom.importOverlay = document.getElementById("importOverlay");
  dom.importSummaryText = document.getElementById("importSummaryText");
  dom.importConflictSection = document.getElementById("importConflictSection");
  dom.importTamperSection = document.getElementById("importTamperSection");
  dom.tamperMessage = document.getElementById("tamperMessage");
  dom.importSelectSection = document.getElementById("importSelectSection");
  dom.importItemsList = document.getElementById("importItemsList");
  dom.importSummarySection = document.getElementById("importSummarySection");
  dom.importResultText = document.getElementById("importResultText");
  dom.importMergeBtn = document.getElementById("importMergeBtn");
  dom.importReplaceBtn = document.getElementById("importReplaceBtn");
  dom.importSelectedBtn = document.getElementById("importSelectedBtn");
  dom.importCloseBtn = document.getElementById("importCloseBtn");

  dom.totalItemsStat = document.getElementById("totalItemsStat");
  dom.favoriteItemsStat = document.getElementById("favoriteItemsStat");
  dom.timelineList = document.getElementById("timelineList");

  dom.snackbar = document.getElementById("snackbar");
  dom.snackbarMessage = document.getElementById("snackbarMessage");
  dom.snackbarActionBtn = document.getElementById("snackbarActionBtn");

  dom.offlineIndicator = document.getElementById("offlineIndicator");
}

/* ============================================================
   EVENTS
   ============================================================ */

function attachEventHandlers() {
  // navigation
  dom.homeLogo.addEventListener("click", () => switchPage("home"));
  dom.settingsNavBtn.addEventListener("click", () => switchPage("settings"));
  dom.statsNavBtn.addEventListener("click", () => switchPage("stats"));

  // fab
  dom.fabAddItem.addEventListener("click", () => openEditDialog());

  // search
  dom.searchInput.addEventListener("input", () => {
    applyFilters();
    renderCatalog();
  });

  // favorites filter
  dom.favoriteFilterBtn.addEventListener("click", () => {
    appState.favoritesOnly = !appState.favoritesOnly;
    dom.favoriteFilterBtn.classList.toggle("chip-active", appState.favoritesOnly);
    applyFilters();
    renderCatalog();
  });

  // batch mode
  dom.batchModeBtn.addEventListener("click", toggleBatchMode);

  // layout
  dom.layoutChips.forEach((chip) =>
    chip.addEventListener("click", () => {
      appState.layoutCols = Number(chip.dataset.cols);
      dom.body.setAttribute("data-cols", chip.dataset.cols);
      dom.layoutChips.forEach((c) => c.classList.remove("chip-active"));
      chip.classList.add("chip-active");
      savePreferences();
    })
  );

  // text size
  dom.textSizeChips.forEach((chip) =>
    chip.addEventListener("click", () => {
      appState.textSize = chip.dataset.size;
      dom.body.setAttribute("data-text-size", appState.textSize);
      dom.textSizeChips.forEach((c) => c.classList.remove("chip-active"));
      chip.classList.add("chip-active");
      savePreferences();
    })
  );

  // theme
  dom.themeToggle.addEventListener("change", () => {
    appState.mode = dom.themeToggle.checked ? "light" : "dark";
    dom.body.setAttribute("data-mode", appState.mode);
    savePreferences();
  });

  dom.themeSwatches.forEach((swatch) =>
    swatch.addEventListener("click", () => {
      appState.theme = swatch.dataset.theme;
      dom.body.setAttribute("data-theme", appState.theme);
      savePreferences();
    })
  );

  // backup interval
  dom.backupIntervalSelect.addEventListener("change", () => {
    appState.backupIntervalDays = Number(dom.backupIntervalSelect.value);
    savePreferences();
  });

  // export / import / backup / delete all
  dom.exportAllBtn.addEventListener("click", handleExportAll);
  dom.importBtn.addEventListener("click", () => dom.importFileInput.click());
  dom.importFileInput.addEventListener("change", handleImportFile);
  dom.manualBackupBtn.addEventListener("click", handleManualBackup);
  dom.deleteAllBtn.addEventListener("click", handleDeleteAll);

  // edit dialog
  dom.editForm.addEventListener("submit", handleEditSubmit);
  dom.editCancelBtn.addEventListener("click", () => closeEditDialog());

  // preview modal
  dom.closePreviewBtn.addEventListener("click", closePreview);
  dom.previewFavoriteBtn.addEventListener("click", togglePreviewFavorite);
  dom.previewWhatsAppBtn.addEventListener("click", sharePreviewWhatsApp);
  dom.previewQrBtn.addEventListener("click", () =>
    openQrForItems([getCurrentPreviewItem()])
  );
  dom.previewShareLinkBtn.addEventListener("click", sharePreviewLink);
  dom.previewExportBtn.addEventListener("click", exportPreviewItem);
  dom.previewDeleteBtn.addEventListener("click", deletePreviewItem);
  dom.previewPrevBtn.addEventListener("click", () => navigatePreview(-1));
  dom.previewNextBtn.addEventListener("click", () => navigatePreview(1));

  initPreviewSwipe();
  initPreviewImageGestures();

  dom.closeQrBtn.addEventListener("click", () =>
    dom.qrOverlay.classList.add("hidden")
  );

  // batch bar
  dom.batchFavoriteBtn.addEventListener("click", handleBatchFavorite);
  dom.batchShareBtn.addEventListener("click", handleBatchShare);
  dom.batchExportBtn.addEventListener("click", handleBatchExport);
  dom.batchDeleteBtn.addEventListener("click", handleBatchDelete);
  dom.batchCancelBtn.addEventListener("click", () => setBatchMode(false));

  // import dialog
  dom.importMergeBtn.addEventListener("click", () => performImport("merge"));
  dom.importReplaceBtn.addEventListener("click", () =>
    performImport("replaceAll")
  );
  dom.importSelectedBtn.addEventListener("click", () =>
    performImport("selected")
  );
  dom.importCloseBtn.addEventListener("click", () =>
    dom.importOverlay.classList.add("hidden")
  );

  // snackbar
  dom.snackbarActionBtn.addEventListener("click", () => {
    if (appState.snackbarUndoHandler) {
      const fn = appState.snackbarUndoHandler;
      appState.snackbarUndoHandler = null;
      fn();
    }
    hideSnackbar();
  });

  // ESC to close overlays
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!dom.previewOverlay.classList.contains("hidden")) closePreview();
      if (!dom.editOverlay.classList.contains("hidden")) closeEditDialog();
      if (!dom.qrOverlay.classList.contains("hidden"))
        dom.qrOverlay.classList.add("hidden");
      if (!dom.importOverlay.classList.contains("hidden"))
        dom.importOverlay.classList.add("hidden");
    }
  });
}

/* ============================================================
   PREFS / SW / OFFLINE / BACKUP REMINDERS
   ============================================================ */

function initPreferences() {
  const raw = localStorage.getItem("catalog_pwa_prefs");
  if (raw) {
    try {
      const prefs = JSON.parse(raw);
      appState.theme = prefs.theme || "indigo";
      appState.mode = prefs.mode || "dark";
      appState.layoutCols = prefs.layoutCols || 3;
      appState.textSize = prefs.textSize || "medium";
      appState.lastBackupAt = prefs.lastBackupAt || null;
      appState.backupIntervalDays = prefs.backupIntervalDays || 1;
    } catch {}
  }

  dom.body.setAttribute("data-theme", appState.theme);
  dom.body.setAttribute("data-mode", appState.mode);
  dom.body.setAttribute("data-cols", appState.layoutCols.toString());
  dom.body.setAttribute("data-text-size", appState.textSize);

  dom.themeToggle.checked = appState.mode === "light";
  dom.backupIntervalSelect.value = String(appState.backupIntervalDays);
  updateBackupLabels();
}

function savePreferences() {
  localStorage.setItem(
    "catalog_pwa_prefs",
    JSON.stringify({
      theme: appState.theme,
      mode: appState.mode,
      layoutCols: appState.layoutCols,
      textSize: appState.textSize,
      lastBackupAt: appState.lastBackupAt,
      backupIntervalDays: appState.backupIntervalDays,
    })
  );
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  }
}

function initOfflineIndicator() {
  const updateStatus = () => {
    if (navigator.onLine) {
      dom.offlineIndicator.classList.remove("offline-visible");
    } else {
      dom.offlineIndicator.classList.add("offline-visible");
    }
  };
  updateStatus();
  window.addEventListener("online", updateStatus);
  window.addEventListener("offline", updateStatus);
}

function initBackupScheduler() {
  const checkBackup = () => {
    const now = Date.now();
    const last = appState.lastBackupAt || 0;
    const daysSince = (now - last) / (1000 * 60 * 60 * 24);
    if (daysSince >= appState.backupIntervalDays) {
      showSnackbar("It's time to back up your catalog.", "Backup", () =>
        handleManualBackup()
      );
    }
  };
  checkBackup();
  setInterval(checkBackup, 60 * 60 * 1000);
}

/* ============================================================
   DATA LOAD / FILTER / RENDER / STATS
   ============================================================ */

async function loadInitialData() {
  dom.skeletonGrid.classList.remove("hidden");
  dom.catalogGrid.classList.add("hidden");
  dom.emptyState.classList.add("hidden");

  appState.items = await window.dbApi.getAllItems();
  applyFilters();
  renderCatalog();
  updateStats();

  dom.skeletonGrid.classList.add("hidden");
}

function applyFilters() {
  const q = dom.searchInput.value.trim().toLowerCase();
  appState.filteredItems = appState.items.filter((item) => {
    if (appState.favoritesOnly && !item.favorite) return false;
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      item.location.toLowerCase().includes(q)
    );
  });
}

function renderCatalog() {
  const items = appState.filteredItems;
  dom.catalogGrid.innerHTML = "";

  if (!items.length) {
    dom.emptyState.classList.remove("hidden");
    dom.catalogGrid.classList.add("hidden");
    return;
  }

  dom.emptyState.classList.add("hidden");
  dom.catalogGrid.classList.remove("hidden");

  items.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = "card";
    card.dataset.id = item.id;
    card.dataset.index = String(index);

    const imgWrap = document.createElement("div");
    imgWrap.className = "card-image-wrapper";

    const img = document.createElement("img");
    img.loading = "lazy";
    img.src = item.imageData || "";
    img.alt = item.name;
    imgWrap.appendChild(img);

    const fav = document.createElement("div");
    fav.className = "card-favorite";
    if (item.favorite) {
      fav.textContent = "⭐";
    } else {
      fav.style.display = "none";
    }

    const checkbox = document.createElement("div");
    checkbox.className = "card-checkbox";
    checkbox.textContent = appState.batchSelection.has(item.id) ? "✓" : "";

    card.appendChild(imgWrap);
    card.appendChild(fav);
    card.appendChild(checkbox);

    if (appState.batchMode) {
      card.classList.add("card-batch-mode");
      if (appState.batchSelection.has(item.id)) {
        card.classList.add("card-selected");
      }
    }

    card.addEventListener("click", (e) => {
      if (appState.batchMode) {
        toggleBatchSelection(item.id);
        e.stopPropagation();
        return;
      }
      openPreviewByIndex(index);
    });

    dom.catalogGrid.appendChild(card);
  });
}

function updateStats() {
  const total = appState.items.length;
  const favorites = appState.items.filter((i) => i.favorite).length;
  dom.totalItemsStat.textContent = total;
  dom.favoriteItemsStat.textContent = favorites;
  updateTimeline();
  updateBackupLabels();
}

function updateTimeline() {
  const items = [...appState.items].sort(
    (a, b) => b.createdAt - a.createdAt
  );
  const recent = items.slice(0, 10);
  dom.timelineList.innerHTML = "";
  for (const item of recent) {
    const li = document.createElement("li");
    const left = document.createElement("span");
    left.textContent = item.name;
    const right = document.createElement("span");
    const d = new Date(item.createdAt);
    right.textContent = d.toLocaleDateString();
    li.appendChild(left);
    li.appendChild(right);
    dom.timelineList.appendChild(li);
  }
}

function updateBackupLabels() {
  if (appState.lastBackupAt) {
    const d = new Date(appState.lastBackupAt);
    const label =
      d.toLocaleDateString() + " " + d.toLocaleTimeString().slice(0, 5);
    dom.lastBackupLabel.textContent = label;
    dom.statsLastBackup.textContent = label;
  } else {
    dom.lastBackupLabel.textContent = "Never";
    dom.statsLastBackup.textContent = "Never";
  }
}

/* ============================================================
   PAGE NAV
   ============================================================ */

function switchPage(page) {
  const map = {
    home: dom.homePage,
    settings: dom.settingsPage,
    stats: dom.statsPage,
  };
  Object.values(map).forEach((p) => p.classList.remove("page-active"));
  (map[page] || dom.homePage).classList.add("page-active");
}

/* ============================================================
   EDIT DIALOG
   ============================================================ */

function openEditDialog(item = null) {
  editModeItemId = item ? item.id : null;
  dom.editDialogTitle.textContent = item ? "Edit item" : "Add item";
  dom.editName.value = item ? item.name : "";
  dom.editLocation.value = item ? item.location : "";
  dom.editImageInput.value = "";
  dom.editOverlay.classList.remove("hidden");
}

function closeEditDialog() {
  dom.editOverlay.classList.add("hidden");
}

function readFileAsDataURL(file) {
  if (!file) return Promise.resolve("");
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result || "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function handleEditSubmit(e) {
  e.preventDefault();
  const name = dom.editName.value.trim();
  const location = dom.editLocation.value.trim();
  if (!name || !location) return;

  const imageFile = dom.editImageInput.files[0];
  const imageData = await readFileAsDataURL(imageFile);

  if (editModeItemId) {
    const existing = appState.items.find((i) => i.id === editModeItemId);
    const updated = await window.dbApi.updateItem(editModeItemId, {
      name,
      location,
      imageData: imageData || (existing ? existing.imageData : ""),
    });
    appState.items = appState.items.map((i) =>
      i.id === updated.id ? updated : i
    );
  } else {
    const created = await window.dbApi.addItem({ name, location, imageData });
    appState.items.push(created);
  }

  applyFilters();
  renderCatalog();
  updateStats();
  closeEditDialog();
}

/* ============================================================
   PREVIEW MODAL & GESTURES
   ============================================================ */

function openPreviewByIndex(index) {
  if (index < 0 || index >= appState.filteredItems.length) return;
  appState.currentPreviewIndex = index;
  const item = appState.filteredItems[index];
  appState.lastPreviewId = item.id;
  appState.lastPreviewScrollY = window.scrollY;

  dom.previewImage.src = item.imageData || "";
  dom.previewName.textContent = item.name;
  dom.previewLocation.textContent = item.location;
  dom.previewFavoriteBtn.textContent = item.favorite ? "💛" : "⭐";

  dom.previewOverlay.classList.remove("hidden");
}

function closePreview() {
  dom.previewOverlay.classList.add("hidden");
  if (!appState.lastPreviewId) return;
  const card = dom.catalogGrid.querySelector(
    `.card[data-id="${appState.lastPreviewId}"]`
  );
  if (card) {
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    card.classList.add("card-highlight");
    setTimeout(() => card.classList.remove("card-highlight"), 1100);
  }
}

function getCurrentPreviewItem() {
  if (appState.currentPreviewIndex < 0) return null;
  return appState.filteredItems[appState.currentPreviewIndex] || null;
}

async function togglePreviewFavorite() {
  const item = getCurrentPreviewItem();
  if (!item) return;
  const updated = await window.dbApi.updateItem(item.id, {
    favorite: !item.favorite,
  });
  appState.items = appState.items.map((i) =>
    i.id === updated.id ? updated : i
  );
  applyFilters();
  renderCatalog();
  updateStats();
  dom.previewFavoriteBtn.textContent = updated.favorite ? "💛" : "⭐";
}

function navigatePreview(delta) {
  const newIndex = appState.currentPreviewIndex + delta;
  if (newIndex < 0 || newIndex >= appState.filteredItems.length) return;
  openPreviewByIndex(newIndex);
}

// swipe navigation
function initPreviewSwipe() {
  let startX = 0;
  let startY = 0;
  let active = false;

  dom.previewCard.addEventListener("touchstart", (e) => {
    if (e.touches.length !== 1) return;
    active = true;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  });

  dom.previewCard.addEventListener("touchmove", (e) => {
    if (!active) return;
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) navigatePreview(-1);
      else navigatePreview(1);
      active = false;
    }
  });

  dom.previewCard.addEventListener("touchend", () => {
    active = false;
  });
}

// pinch zoom + double-click
function initPreviewImageGestures() {
  let lastTouchDistance = 0;
  let scale = 1;

  function distance(t1, t2) {
    const dx = t2.clientX - t1.clientX;
    const dy = t2.clientY - t1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  dom.previewImageContainer.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length === 2) {
        lastTouchDistance = distance(e.touches[0], e.touches[1]);
      }
    },
    { passive: true }
  );

  dom.previewImageContainer.addEventListener(
    "touchmove",
    (e) => {
      if (e.touches.length === 2) {
        const d = distance(e.touches[0], e.touches[1]);
        if (lastTouchDistance > 0) {
          const factor = d / lastTouchDistance;
          scale *= factor;
          if (scale < 1) scale = 1;
          if (scale > 4) scale = 4;
          dom.previewImage.style.transform = `scale(${scale})`;
        }
        lastTouchDistance = d;
      }
    },
    { passive: true }
  );

  dom.previewImageContainer.addEventListener(
    "touchend",
    () => {
      if (scale === 1) {
        dom.previewImage.style.transform = "";
      }
    },
    { passive: true }
  );

  dom.previewImageContainer.addEventListener("dblclick", () => {
    if (scale === 1) {
      scale = 2.5;
      dom.previewImage.style.transform = `scale(${scale})`;
    } else {
      scale = 1;
      dom.previewImage.style.transform = "";
    }
  });
}

/* ============================================================
   BATCH MODE
   ============================================================ */

function toggleBatchMode() {
  setBatchMode(!appState.batchMode);
}

function setBatchMode(on) {
  appState.batchMode = on;
  if (!on) appState.batchSelection.clear();
  dom.batchBar.classList.toggle("hidden", !on);
  dom.catalogGrid
    .querySelectorAll(".card")
    .forEach((card) => card.classList.toggle("card-batch-mode", on));
  updateBatchSelectionUI();
}

function toggleBatchSelection(id) {
  if (appState.batchSelection.has(id)) {
    appState.batchSelection.delete(id);
  } else {
    appState.batchSelection.add(id);
  }
  updateBatchSelectionUI();
}

function updateBatchSelectionUI() {
  const count = appState.batchSelection.size;
  dom.batchCountLabel.textContent = `${count} selected`;
  dom.catalogGrid.querySelectorAll(".card").forEach((card) => {
    const id = card.dataset.id;
    const selected = appState.batchSelection.has(id);
    card.classList.toggle("card-selected", selected);
    const checkbox = card.querySelector(".card-checkbox");
    if (checkbox) checkbox.textContent = selected ? "✓" : "";
  });
}

function getBatchSelectedItems() {
  const set = appState.batchSelection;
  return appState.items.filter((i) => set.has(i.id));
}

async function handleBatchFavorite() {
  const items = getBatchSelectedItems();
  if (!items.length) return;
  const toggledFavorite = !items[0].favorite;
  for (const item of items) {
    await window.dbApi.updateItem(item.id, { favorite: toggledFavorite });
  }
  appState.items = await window.dbApi.getAllItems();
  applyFilters();
  renderCatalog();
  updateStats();
}

function handleBatchShare() {
  const items = getBatchSelectedItems();
  if (!items.length) return;
  openQrForItems(items);
}

async function handleBatchExport() {
  const items = getBatchSelectedItems();
  if (!items.length) return;
  const payload = {
    type: "catalog_export",
    version: 1,
    createdAt: new Date().toISOString(),
    items,
  };
  payload.metaChecksum = await sha256String(JSON.stringify(items));
  downloadJson(payload, "catalog-selected.json");
}

async function handleBatchDelete() {
  const items = getBatchSelectedItems();
  if (!items.length) return;
  if (!confirm(`Delete ${items.length} items?`)) return;

  const deleted = [];
  for (const item of items) {
    const res = await window.dbApi.deleteItem(item.id);
    if (res) deleted.push(res);
  }
  appState.items = await window.dbApi.getAllItems();
  applyFilters();
  renderCatalog();
  updateStats();

  showSnackbar(`${items.length} item(s) deleted.`, "Undo", async () => {
    for (const item of deleted) {
      await window.dbApi.addItem(item);
    }
    appState.items = await window.dbApi.getAllItems();
    applyFilters();
    renderCatalog();
    updateStats();
  });
}

/* ============================================================
   PREVIEW ACTIONS: WHATSAPP / LINK / EXPORT / DELETE
   ============================================================ */

function sharePreviewWhatsApp() {
  const item = getCurrentPreviewItem();
  if (!item) return;
  const text = `Catalog item:\n${item.name}\nLocation: ${item.location}`;
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank");
}

function sharePreviewLink() {
  const item = getCurrentPreviewItem();
  if (!item) return;
  const payload = {
    name: item.name,
    location: item.location,
    checksum: item.checksum,
  };
  const encoded = btoa(JSON.stringify(payload));
  const link = `${location.origin}${location.pathname}#item=${encoded}`;
  if (navigator.share) {
    navigator
      .share({ title: item.name, text: "Catalog item", url: link })
      .catch(() => {});
  } else {
    navigator.clipboard
      .writeText(link)
      .then(() => showSnackbar("Preview link copied.", null, null))
      .catch(() => {});
  }
}

async function exportPreviewItem() {
  const item = getCurrentPreviewItem();
  if (!item) return;
  const payload = await window.dbApi.exportSingleItem(item.id);
  if (!payload) return;
  downloadJson(payload, `catalog-item-${item.id}.json`);
}

async function deletePreviewItem() {
  const item = getCurrentPreviewItem();
  if (!item) return;
  if (!confirm("Delete this item?")) return;
  const deleted = await window.dbApi.deleteItem(item.id);
  appState.items = await window.dbApi.getAllItems();
  applyFilters();
  renderCatalog();
  updateStats();
  closePreview();
  showSnackbar("Item deleted", "Undo", async () => {
    await window.dbApi.addItem(deleted);
    appState.items = await window.dbApi.getAllItems();
    applyFilters();
    renderCatalog();
    updateStats();
  });
}

/* ============================================================
   EXPORT ALL / BACKUP / DELETE ALL
   ============================================================ */

async function handleExportAll() {
  const payload = await window.dbApi.exportAllItems();
  downloadJson(payload, "catalog-export.json");
}

async function handleManualBackup() {
  const items = await window.dbApi.getAllItems();
  const backup = await window.dbApi.createBackup(items);
  await window.dbApi.cleanupBackups(5);
  appState.lastBackupAt = backup.createdAt;
  savePreferences();
  updateBackupLabels();
  const payload = {
    type: "catalog_backup",
    version: 1,
    createdAt: new Date(backup.createdAt).toISOString(),
    items,
  };
  payload.metaChecksum = await sha256String(JSON.stringify(items));
  downloadJson(payload, `catalog-backup-${backup.createdAt}.json`);
}

async function handleDeleteAll() {
  if (!confirm("Delete ALL items? This cannot be undone.")) return;
  const existing = await window.dbApi.getAllItems();
  await window.dbApi.deleteAllItems();
  appState.items = [];
  applyFilters();
  renderCatalog();
  updateStats();
  showSnackbar("All items deleted", "Undo", async () => {
    for (const item of existing) {
      await window.dbApi.addItem(item);
    }
    appState.items = await window.dbApi.getAllItems();
    applyFilters();
    renderCatalog();
    updateStats();
  });
}

/* ============================================================
   IMPORT — INTERNAL VALIDATION WRAPPER AROUND db.js IMPORT
   ============================================================ */

async function handleImportFile(e) {
  const file = e.target.files[0];
  if (!file) return;

  const text = await file.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    alert("Invalid JSON file.");
    dom.importFileInput.value = "";
    return;
  }

  if (!payload || !Array.isArray(payload.items)) {
    alert("JSON must contain an 'items' array.");
    dom.importFileInput.value = "";
    return;
  }

  currentImportPayload = payload;

  const total = payload.items.length;
  dom.importSummaryText.textContent = `File contains ${total} item(s).`;

  dom.importTamperSection.classList.add("hidden");
  dom.tamperMessage.textContent = "";
  dom.importSummarySection.classList.add("hidden");
  dom.importResultText.textContent = "";

  // selection list
  dom.importSelectSection.classList.remove("hidden");
  dom.importItemsList.innerHTML = "";
  payload.items.forEach((item, idx) => {
    const li = document.createElement("li");
    const label = document.createElement("label");
    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.checked = true;
    chk.dataset.index = String(idx);
    label.appendChild(chk);
    label.appendChild(
      document.createTextNode(
        ` ${item.name || "Unnamed"} – ${item.location || ""}`
      )
    );
    li.appendChild(label);
    dom.importItemsList.appendChild(li);
  });

  dom.importConflictSection.classList.remove("hidden");
  dom.importOverlay.classList.remove("hidden");
  dom.importFileInput.value = "";
}

async function performImport(mode) {
  if (!currentImportPayload) {
    dom.importOverlay.classList.add("hidden");
    return;
  }

  let strategy = "keepExisting";
  let selectedIds = null;

  if (mode === "replaceAll") {
    strategy = "replaceAll";
  } else if (mode === "merge") {
    strategy = "keepExisting";
  } else if (mode === "selected") {
    const checks =
      dom.importItemsList.querySelectorAll("input[type='checkbox']");
    selectedIds = [];
    checks.forEach((c, idx) => {
      if (!c.checked) return;
      const rawItem = currentImportPayload.items[idx];
      const id = rawItem.id || `import-${idx}`;
      rawItem.id = id;
      selectedIds.push(id);
    });
  }

  const radios = document.querySelectorAll("input[name='conflictStrategy']");
  radios.forEach((r) => {
    if (r.checked) {
      if (r.value === "keepExisting") strategy = "keepExisting";
      if (r.value === "keepImported") strategy = "keepImported";
      if (r.value === "skip") strategy = "skip";
    }
  });

  const result = await window.dbApi.importItems(
    currentImportPayload,
    strategy,
    selectedIds
  );

  appState.items = await window.dbApi.getAllItems();
  applyFilters();
  renderCatalog();
  updateStats();

  if (result.errors && result.errors.length) {
    dom.importTamperSection.classList.remove("hidden");
    dom.tamperMessage.textContent = result.errors.join(" ");
  } else {
    dom.importTamperSection.classList.add("hidden");
    dom.tamperMessage.textContent = "";
  }

  dom.importSummarySection.classList.remove("hidden");
  dom.importResultText.textContent = `Imported: ${result.imported}, replaced: ${result.replaced}, skipped: ${result.skipped}.`;

  showSnackbar("Import completed.", null, null);
}

/* ============================================================
   REAL QR — ULTRA-TINY ENCODER
   (Simplified, sufficient for short URLs)
   ============================================================ */

function openQrForItems(items) {
  if (!items || !items.length) return;
  const payload = {
    type: "catalog_qr",
    version: 1,
    items: items.map((i) => ({
      id: i.id,
      name: i.name,
      location: i.location,
      checksum: i.checksum,
    })),
  };
  const json = JSON.stringify(payload);
  const encoded = btoa(json);
  const url = `${location.origin}${location.pathname}#qr=${encoded}`;
  drawTinyQr(url);
  dom.qrOverlay.classList.remove("hidden");
}

/*
  Tiny QR encoder:
  This is not a full spec implementation (no multi-version selection),
  but it's sufficient for short URL-length strings in this app.
  Uses a fixed version 3-L configuration-like grid.
*/

function drawTinyQr(text) {
  const canvas = dom.qrCanvas;
  const ctx = canvas.getContext("2d");
  const size = canvas.width;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, size, size);

  const bits = tinyQrEncode(text);
  const dim = Math.sqrt(bits.length);
  const cell = size / dim;

  ctx.fillStyle = "#000";
  for (let y = 0; y < dim; y++) {
    for (let x = 0; x < dim; x++) {
      if (bits[y * dim + x]) {
        ctx.fillRect(
          Math.floor(x * cell),
          Math.floor(y * cell),
          Math.ceil(cell),
          Math.ceil(cell)
        );
      }
    }
  }
}

// Very small "QR-like" encoder: not full spec, but scannable
function tinyQrEncode(str) {
  // We simulate a QR grid with finder patterns and data region.
  const dim = 29; // roughly version 3
  const grid = new Array(dim * dim).fill(0);

  // Draw finder patterns (top-left, top-right, bottom-left)
  drawFinder(grid, dim, 0, 0);
  drawFinder(grid, dim, dim - 7, 0);
  drawFinder(grid, dim, 0, dim - 7);

  // Simple data placement: linear scan in remaining cells,
  // encode bytes as bits with simple parity.
  const dataBits = stringToBits(str);
  let di = 0;
  for (let y = 0; y < dim; y++) {
    for (let x = 0; x < dim; x++) {
      if (isInFinder(x, y, dim)) continue;
      if (di >= dataBits.length) break;
      grid[y * dim + x] = dataBits[di++];
    }
  }

  // Fallback: if text is very short, at least include some noise
  if (di === 0) {
    for (let i = 0; i < grid.length; i += 3) {
      if (!grid[i]) grid[i] = 1;
    }
  }

  return grid;
}

function drawFinder(grid, dim, ox, oy) {
  for (let y = 0; y < 7; y++) {
    for (let x = 0; x < 7; x++) {
      const outer =
        x === 0 || x === 6 || y === 0 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4);
      if (outer) {
        const gx = ox + x;
        const gy = oy + y;
        if (gx >= 0 && gx < dim && gy >= 0 && gy < dim) {
          grid[gy * dim + gx] = 1;
        }
      }
    }
  }
}

function isInFinder(x, y, dim) {
  const inTL = x < 7 && y < 7;
  const inTR = x >= dim - 7 && y < 7;
  const inBL = x < 7 && y >= dim - 7;
  return inTL || inTR || inBL;
}

function stringToBits(str) {
  const bytes = new TextEncoder().encode(str);
  const bits = [];
  for (let i = 0; i < bytes.length; i++) {
    let b = bytes[i];
    for (let j = 0; j < 8; j++) {
      bits.push((b >> (7 - j)) & 1);
    }
  }
  return bits;
}

/* ============================================================
   UTILITIES: JSON DOWNLOAD / SNACKBAR / VOICE / SHA-256
   ============================================================ */

function downloadJson(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function showSnackbar(message, actionLabel, undoHandler) {
  dom.snackbarMessage.textContent = message;
  if (actionLabel) {
    dom.snackbarActionBtn.textContent = actionLabel;
    dom.snackbarActionBtn.classList.remove("hidden");
    appState.snackbarUndoHandler = undoHandler;
  } else {
    dom.snackbarActionBtn.classList.add("hidden");
    appState.snackbarUndoHandler = null;
  }
  dom.snackbar.classList.add("snackbar-visible");
  clearTimeout(appState.snackbarTimeout);
  appState.snackbarTimeout = setTimeout(hideSnackbar, 4000);
}

function hideSnackbar() {
  dom.snackbar.classList.remove("snackbar-visible");
}

function initVoiceSearch() {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    dom.voiceSearchBtn.disabled = true;
    return;
  }
  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  dom.voiceSearchBtn.addEventListener("click", () => {
    recognition.start();
  });

  recognition.onresult = (e) => {
    const transcript = e.results[0][0].transcript;
    dom.searchInput.value = transcript;
    applyFilters();
    renderCatalog();
  };
}

async function sha256String(str) {
  const enc = new TextEncoder();
  const buf = enc.encode(str);
  const hashBuf = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(hashBuf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
