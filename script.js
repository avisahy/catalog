// Main UI logic, animations, QR, sharing, voice search, swipe, backup

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
let currentImportPayload = null; // used by import dialog
let editModeItemId = null;       // null = add, otherwise edit existing

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

/* DOM cache */
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

/* events */
function attachEventHandlers() {
  // Navigation
  dom.homeLogo.addEventListener("click", () => switchPage("home"));
  dom.settingsNavBtn.addEventListener("click", () => switchPage("settings"));
  dom.statsNavBtn.addEventListener("click", () => switchPage("stats"));

  // FAB
  dom.fabAddItem.addEventListener("click", () => openEditDialog());

  // Search & filters
  dom.searchInput.addEventListener("input", () => {
    applyFilters();
    renderCatalog();
  });

  dom.favoriteFilterBtn.addEventListener("click", () => {
    appState.favoritesOnly = !appState.favoritesOnly;
    dom.favoriteFilterBtn.classList.toggle(
      "chip-active",
      appState.favoritesOnly
    );
    applyFilters();
    renderCatalog();
  });

  dom.batchModeBtn.addEventListener("click", toggleBatchMode);

  // Layout + text size
  dom.layoutChips.forEach((chip) =>
    chip.addEventListener("click", () => {
      appState.layoutCols = Number(chip.dataset.cols);
      dom.body.setAttribute("data-cols", chip.dataset.cols);
      dom.layoutChips.forEach((c) => c.classList.remove("chip-active"));
      chip.classList.add("chip-active");
      savePreferences();
    })
  );

  dom.textSizeChips.forEach((chip) =>
    chip.addEventListener("click", () => {
      appState.textSize = chip.dataset.size;
      dom.body.setAttribute("data-text-size", appState.textSize);
      dom.textSizeChips.forEach((c) => c.classList.remove("chip-active"));
      chip.classList.add("chip-active");
      savePreferences();
    })
  );

  // Theme
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

  // Backup settings
  dom.backupIntervalSelect.addEventListener("change", () => {
    appState.backupIntervalDays = Number(dom.backupIntervalSelect.value);
    savePreferences();
  });

  // Export / Import / Backup / Delete all
  dom.exportAllBtn.addEventListener("click", handleExportAll);
  dom.importBtn.addEventListener("click", () => dom.importFileInput.click());
  dom.importFileInput.addEventListener("change", handleImportFile);
  dom.manualBackupBtn.addEventListener("click", handleManualBackup);
  dom.deleteAllBtn.addEventListener("click", handleDeleteAll);

  // Preview modal
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

  // Swipe and gestures in preview
  initPreviewSwipe();
  initPreviewImageGestures();

  // QR overlay
  dom.closeQrBtn.addEventListener("click", () =>
    dom.qrOverlay.classList.add("hidden")
  );

  // Add/Edit dialog
  dom.editForm.addEventListener("submit", handleEditSubmit);
  dom.editCancelBtn.addEventListener("click", () => closeEditDialog());

  // Batch bar
  dom.batchFavoriteBtn.addEventListener("click", handleBatchFavorite);
  dom.batchShareBtn.addEventListener("click", handleBatchShare);
  dom.batchExportBtn.addEventListener("click", handleBatchExport);
  dom.batchDeleteBtn.addEventListener("click", handleBatchDelete);
  dom.batchCancelBtn.addEventListener("click", () => setBatchMode(false));

  // Import dialog actions
  dom.importMergeBtn.addEventListener("click", () =>
    performImport("merge")
  );
  dom.importReplaceBtn.addEventListener("click", () =>
    performImport("replaceAll")
  );
  dom.importSelectedBtn.addEventListener("click", () =>
    performImport("selected")
  );
  dom.importCloseBtn.addEventListener("click", () =>
    dom.importOverlay.classList.add("hidden")
  );

  // Snackbar
  dom.snackbarActionBtn.addEventListener("click", () => {
    if (appState.snackbarUndoHandler) {
      const handler = appState.snackbarUndoHandler;
      appState.snackbarUndoHandler = null;
      handler();
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

/* preferences */
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
    } catch {
      // ignore parse errors
    }
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

/* service worker */
function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  }
}

/* offline indicator */
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

/* backup scheduler + reminders */
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

/* data load + render */
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

/* filtering */
function applyFilters() {
  const q = dom.searchInput.value.trim().toLowerCase();
  appState.filteredItems = appState.items.filter((item) => {
    if (appState.favoritesOnly && !item.favorite) return false;
    if (!q) return true;
    const n = item.name.toLowerCase();
    const l = item.location.toLowerCase();
    return n.includes(q) || l.includes(q);
  });
}

/* catalog render */
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
    card.dataset.index = index;

    const imgWrap = document.createElement("div");
    imgWrap.className = "card-image-wrapper";

    const img = document.createElement("img");
    img.loading = "lazy";
    img.src = item.imageData || "";
    img.alt = item.name;
    imgWrap.appendChild(img);

    const fav = document.createElement("div");
    fav.className = "card-favorite";
    fav.textContent = item.favorite ? "⭐" : "";
    if (!item.favorite) fav.style.display = "none";

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

/* stats */
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

/* page navigation */
function switchPage(page) {
  const map = {
    home: dom.homePage,
    settings: dom.settingsPage,
    stats: dom.statsPage,
  };
  Object.values(map).forEach((p) => p.classList.remove("page-active"));
  map[page].classList.add("page-active");
}

/* edit dialog */
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

/* preview modal */
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

/* swipe navigation in preview */
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
      if (dx > 0) {
        navigatePreview(-1);
      } else {
        navigatePreview(1);
      }
      active = false;
    }
  });

  dom.previewCard.addEventListener("touchend", () => {
    active = false;
  });
}

/* pinch zoom & full screen */
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

/* batch mode */
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

  showSnackbar(
    `${items.length} item(s) deleted.`,
    "Undo",
    async () => {
      for (const item of deleted) {
        await window.dbApi.addItem(item);
      }
      appState.items = await window.dbApi.getAllItems();
      applyFilters();
      renderCatalog();
      updateStats();
    }
  );
}

/* preview actions - share, export, delete */

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
      .share({
        title: item.name,
        text: "Catalog item",
        url: link,
      })
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

/* export all */
async function handleExportAll() {
  const payload = await window.dbApi.exportAllItems();
  downloadJson(payload, "catalog-export.json");
}

/* manual backup */
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

/* delete all */
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

/* import (no DB writes before user chooses action) */
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

  // Build selection list
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

  // conflict strategy section stays visible to choose default behavior
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
    const checks = dom.importItemsList.querySelectorAll("input[type='checkbox']");
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

  // Show tamper/validation errors and summary
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

/* QR code generation (multi-item support, pseudo QR) */
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
  drawQr(url);
  dom.qrOverlay.classList.remove("hidden");
}

// NOTE: this is a pseudo-QR generator (for demo).
// For real scannable QR, plug in a proper QR library.
function drawQr(text) {
  const canvas = dom.qrCanvas;
  const ctx = canvas.getContext("2d");
  const size = canvas.width;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);

  const hash = pseudoHash(text, 1024);
  const cells = 32;
  const cellSize = size / cells;
  ctx.fillStyle = "#000000";
  for (let i = 0; i < cells; i++) {
    for (let j = 0; j < cells; j++) {
      const idx = (i * cells + j) % hash.length;
      if (hash[idx] % 2 === 0) {
        ctx.fillRect(j * cellSize, i * cellSize, cellSize, cellSize);
      }
    }
  }
}

function pseudoHash(str, length) {
  const result = new Array(length).fill(0);
  let h1 = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h1 ^= str.charCodeAt(i);
    h1 = (h1 * 0x01000193) >>> 0;
    const idx = i % length;
    result[idx] = (result[idx] + (h1 & 0xff)) % 256;
  }
  return result;
}

/* utilities */
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

/* voice search */
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

/* SHA-256 helper */
async function sha256String(str) {
  const enc = new TextEncoder();
  const buf = enc.encode(str);
  const hashBuf = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(hashBuf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
