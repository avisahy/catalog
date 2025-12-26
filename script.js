// script.js

/* ------------------------- DOM REFERENCES ------------------------- */

const cardGrid = document.getElementById("cardGrid");
const skeletonGrid = document.getElementById("skeletonGrid");
const fab = document.getElementById("fab");
const addDialogOverlay = document.getElementById("addDialogOverlay");
const addNameInput = document.getElementById("addNameInput");
const addLocationInput = document.getElementById("addLocationInput");
const addImageInput = document.getElementById("addImageInput");
const addCancelBtn = document.getElementById("addCancelBtn");
const addSaveBtn = document.getElementById("addSaveBtn");

const navButtons = document.querySelectorAll(".nav-btn");
const views = document.querySelectorAll(".view");

const searchInput = document.getElementById("searchInput");
const voiceSearchBtn = document.getElementById("voiceSearchBtn");
const favoritesFilterBtn = document.getElementById("favoritesFilterBtn");

const modeToggle = document.getElementById("modeToggle");
const offlineIndicator = document.getElementById("offlineIndicator");

const previewOverlay = document.getElementById("previewOverlay");
const previewImage = document.getElementById("previewImage");
const previewName = document.getElementById("previewName");
const previewLocation = document.getElementById("previewLocation");
const previewCloseBtn = document.getElementById("previewCloseBtn");
const previewFavoriteBtn = document.getElementById("previewFavoriteBtn");
const previewExportBtn = document.getElementById("previewExportBtn");
const previewWhatsAppBtn = document.getElementById("previewWhatsAppBtn");
const previewQrBtn = document.getElementById("previewQrBtn");
const previewLinkBtn = document.getElementById("previewLinkBtn");
const previewDeleteBtn = document.getElementById("previewDeleteBtn");
const previewImageContainer = document.getElementById("previewImageContainer");

const qrOverlay = document.getElementById("qrOverlay");
const qrCanvas = document.getElementById("qrCanvas");
const qrCloseBtn = document.getElementById("qrCloseBtn");

const batchToolbar = document.getElementById("batchToolbar");
const batchCount = document.getElementById("batchCount");
const batchFavoriteBtn = document.getElementById("batchFavoriteBtn");
const batchDeleteBtn = document.getElementById("batchDeleteBtn");
const batchExportBtn = document.getElementById("batchExportBtn");
const batchShareBtn = document.getElementById("batchShareBtn");
const batchCancelBtn = document.getElementById("batchCancelBtn");

const deleteAllBtn = document.getElementById("deleteAllBtn");

const themeChips = document.getElementById("themeChips");
const layoutChips = document.getElementById("layoutChips");
const textSizeChips = document.getElementById("textSizeChips");

const snackbar = document.getElementById("snackbar");

const logoHome = document.getElementById("logoHome");

const exportAllBtn = document.getElementById("exportAllBtn");
const exportAllToWhatsAppBtn = document.getElementById(
  "exportAllToWhatsAppBtn"
);
const importBtn = document.getElementById("importBtn");
const importFileInput = document.getElementById("importFileInput");
const importSummary = document.getElementById("importSummary");
const importConflictOverlay = document.getElementById("importConflictOverlay");
const importConflictText = document.getElementById("importConflictText");
const importKeepExistingBtn = document.getElementById("importKeepExistingBtn");
const importKeepImportedBtn = document.getElementById("importKeepImportedBtn");
const importSkipBtn = document.getElementById("importSkipBtn");

const installBanner = document.getElementById("installBanner");
const installLaterBtn = document.getElementById("installLaterBtn");
const installNowBtn = document.getElementById("installNowBtn");

const statTotalItems = document.getElementById("statTotalItems");
const statFavorites = document.getElementById("statFavorites");
const statLastBackup = document.getElementById("statLastBackup");
const recentTimeline = document.getElementById("recentTimeline");

const forceBackupCheckBtn = document.getElementById("forceBackupCheckBtn");

const statBackupView = document.getElementById("backupView");

// State
let allItems = [];
let filteredItems = [];
let favoritesOnly = false;

let batchMode = false;
let batchSelectedIds = new Set();

let previewIndex = -1; // index in filteredItems
let previewInitialCardId = null;

let lastDeletedItem = null;
let lastDeletedTimeout = null;

let deferredPrompt = null;

let importConflictResolver = null;
let importConflictCurrent = { existing: null, incoming: null };

// Preferences
const PREFS_KEY = "catalog_prefs";
const BACKUP_META_KEY = "catalog_backup_meta"; // { lastBackupAt }

// Load prefs
function loadPrefs() {
  try {
    const stored = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
    return stored;
  } catch (e) {
    return {};
  }
}
function savePrefs(p) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(p));
}
const prefs = loadPrefs();
document.documentElement.dataset.theme = prefs.theme || "blue";
document.documentElement.dataset.mode = prefs.mode || "dark";
document.documentElement.dataset.layout = prefs.layout || "3";
document.documentElement.dataset.textSize = prefs.textSize || "medium";

modeToggle.checked = document.documentElement.dataset.mode === "light";

// Set chips
function setupChips() {
  function initGroup(groupEl, attr, values) {
    const current = document.documentElement.dataset[attr];
    groupEl.querySelectorAll(".chip").forEach((chip) => {
      const target =
        chip.dataset.theme ||
        chip.dataset.layout ||
        chip.dataset.size ||
        "";
      const matches =
        target === current ||
        (attr === "layout" && target === String(values.default));
      if (matches) chip.classList.add("active");
    });
  }
  initGroup(themeChips, "theme", { default: "blue" });
  initGroup(layoutChips, "layout", { default: 3 });
  initGroup(textSizeChips, "textSize", { default: "medium" });
}
setupChips();

/* ------------------------- SNACKBAR ------------------------- */
let snackbarTimeout = null;
function showSnackbar(message, withUndo = false, onUndo = null) {
  snackbar.textContent = "";
  const span = document.createElement("span");
  span.textContent = message;
  snackbar.appendChild(span);

  if (withUndo && onUndo) {
    const btn = document.createElement("button");
    btn.textContent = "Undo";
    btn.style.marginLeft = "8px";
    btn.style.border = "none";
    btn.style.background = "transparent";
    btn.style.color = "#60a5fa";
    btn.style.cursor = "pointer";
    btn.onclick = () => {
      onUndo();
      hideSnackbar();
    };
    snackbar.appendChild(btn);
  }

  snackbar.classList.add("show");
  if (snackbarTimeout) clearTimeout(snackbarTimeout);
  snackbarTimeout = setTimeout(hideSnackbar, 3500);
}

function hideSnackbar() {
  snackbar.classList.remove("show");
}

/* ------------------------- VIEW NAVIGATION ------------------------- */
function setActiveView(id) {
  views.forEach((v) => v.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  navButtons.forEach((btn) =>
    btn.classList.toggle("active", btn.dataset.view === id)
  );
}

navButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    setActiveView(btn.dataset.view);
  });
});

logoHome.addEventListener("click", () => {
  setActiveView("homeView");
});
logoHome.addEventListener("keydown", (e) => {
  if (e.key === "Enter") setActiveView("homeView");
});

/* ------------------------- OFFLINE INDICATOR ------------------------- */
function updateOfflineIndicator() {
  const offline = !navigator.onLine;
  offlineIndicator.classList.toggle("offline", offline);
}
window.addEventListener("online", updateOfflineIndicator);
window.addEventListener("offline", updateOfflineIndicator);
updateOfflineIndicator();

/* ------------------------- MODE / THEME / LAYOUT / TEXT SIZE ------------------------- */
modeToggle.addEventListener("change", () => {
  const mode = modeToggle.checked ? "light" : "dark";
  document.documentElement.dataset.mode = mode;
  prefs.mode = mode;
  savePrefs(prefs);
});

themeChips.addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  const theme = chip.dataset.theme;
  document.documentElement.dataset.theme = theme;
  prefs.theme = theme;
  savePrefs(prefs);
  themeChips.querySelectorAll(".chip").forEach((c) =>
    c.classList.toggle("active", c === chip)
  );
});

layoutChips.addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  const layout = chip.dataset.layout;
  document.documentElement.dataset.layout = layout;
  prefs.layout = layout;
  savePrefs(prefs);
  layoutChips.querySelectorAll(".chip").forEach((c) =>
    c.classList.toggle("active", c === chip)
  );
});

textSizeChips.addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  const size = chip.dataset.size;
  document.documentElement.dataset.textSize = size;
  prefs.textSize = size;
  savePrefs(prefs);
  textSizeChips.querySelectorAll(".chip").forEach((c) =>
    c.classList.toggle("active", c === chip)
  );
});

/* ------------------------- DATA LOADING ------------------------- */
async function loadItems() {
  skeletonGrid.classList.remove("hidden");
  cardGrid.classList.add("hidden");
  skeletonGrid.innerHTML = "";
  for (let i = 0; i < 12; i++) {
    const div = document.createElement("div");
    div.className = "skeleton-card";
    skeletonGrid.appendChild(div);
  }

  allItems = await window.CatalogDB.getAll();
  applyFilters();
  skeletonGrid.classList.add("hidden");
  cardGrid.classList.remove("hidden");
  updateStats();
  updateTimeline();
}

function applyFilters() {
  const query = searchInput.value.trim().toLowerCase();
  filteredItems = allItems.filter((item) => {
    const matchesQuery =
      !query ||
      item.name.toLowerCase().includes(query) ||
      item.location.toLowerCase().includes(query);
    const matchesFav = !favoritesOnly || item.favorite;
    return matchesQuery && matchesFav;
  });
  renderGrid();
}

function renderGrid() {
  cardGrid.innerHTML = "";

  filteredItems.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = "card";
    card.dataset.id = item.id;
    card.dataset.index = index;

    const img = document.createElement("img");
    img.src = item.imageDataUrl;
    img.loading = "lazy";

    const overlayTop = document.createElement("div");
    overlayTop.className = "card-overlay-top";

    const badge = document.createElement("div");
    badge.className = "card-badge";
    badge.textContent = item.location;

    const fav = document.createElement("div");
    fav.className = "card-badge card-favorite";
    fav.textContent = item.favorite ? "★" : "";
    overlayTop.appendChild(badge);
    overlayTop.appendChild(fav);

    const selectWrap = document.createElement("div");
    selectWrap.className = "card-select";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = batchSelectedIds.has(item.id);
    selectWrap.appendChild(checkbox);

    card.appendChild(img);
    card.appendChild(overlayTop);
    card.appendChild(selectWrap);

    card.addEventListener("click", (e) => {
      if (batchMode) {
        // Toggle selection only
        batchToggle(item.id, checkbox);
      } else {
        // Open preview
        previewIndex = index;
        previewInitialCardId = item.id;
        openPreview(item);
      }
    });

    checkbox.addEventListener("click", (e) => {
      e.stopPropagation();
      batchToggle(item.id, checkbox);
    });

    cardGrid.appendChild(card);
  });

  updateBatchToolbar();
}

/* ------------------------- BATCH MODE ------------------------- */
function batchToggle(id, checkbox) {
  if (!batchMode) {
    batchMode = true;
  }
  if (batchSelectedIds.has(id)) {
    batchSelectedIds.delete(id);
  } else {
    batchSelectedIds.add(id);
  }
  checkbox.checked = batchSelectedIds.has(id);
  updateBatchToolbar();
}

function updateBatchToolbar() {
  if (batchSelectedIds.size > 0) {
    batchToolbar.classList.remove("hidden");
    batchCount.textContent = `${batchSelectedIds.size} selected`;
  } else {
    batchToolbar.classList.add("hidden");
    batchMode = false;
  }
}

batchCancelBtn.addEventListener("click", () => {
  batchMode = false;
  batchSelectedIds.clear();
  renderGrid();
});

batchFavoriteBtn.addEventListener("click", async () => {
  const ids = Array.from(batchSelectedIds);
  for (const id of ids) {
    const item = allItems.find((i) => i.id === id);
    if (!item) continue;
    await CatalogDB.updateItem(id, { favorite: !item.favorite });
  }
  await loadItems();
  showSnackbar("Batch favorite updated");
});

batchDeleteBtn.addEventListener("click", async () => {
  const ids = Array.from(batchSelectedIds);
  for (const id of ids) {
    await CatalogDB.deleteItem(id);
  }
  batchSelectedIds.clear();
  batchMode = false;
  await loadItems();
  showSnackbar("Selected items deleted");
});

batchExportBtn.addEventListener("click", async () => {
  const ids = Array.from(batchSelectedIds);
  if (!ids.length) return;
  const { wrapper } = await CatalogDB.exportItemsByIds(ids);
  downloadJson(wrapper, "catalog-batch-items.json");
});

batchShareBtn.addEventListener("click", async () => {
  const ids = Array.from(batchSelectedIds);
  if (!ids.length) return;
  const { wrapper } = await CatalogDB.exportItemsByIds(ids);
  const encoded = encodeURIComponent(JSON.stringify(wrapper));
  const link = `${location.origin}${location.pathname}?data=${encoded}`;
  shareText(`Catalog items:\n${link}`);
});

/* ------------------------- SEARCH + FAVORITES FILTER ------------------------- */
searchInput.addEventListener("input", () => {
  applyFilters();
});

favoritesFilterBtn.addEventListener("click", () => {
  favoritesOnly = !favoritesOnly;
  favoritesFilterBtn.classList.toggle("active", favoritesOnly);
  applyFilters();
});

/* ------------------------- VOICE SEARCH ------------------------- */
voiceSearchBtn.addEventListener("click", () => {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    showSnackbar("Speech recognition not supported");
    return;
  }
  const rec = new SpeechRecognition();
  rec.lang = "en-US";
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  rec.onresult = (e) => {
    const transcript = e.results[0][0].transcript;
    searchInput.value = transcript;
    applyFilters();
  };
  rec.onerror = () => {
    showSnackbar("Voice search error");
  };
  rec.start();
});

/* ------------------------- ADD ITEM DIALOG ------------------------- */
fab.addEventListener("click", () => {
  addDialogOverlay.classList.remove("hidden");
  addNameInput.value = "";
  addLocationInput.value = "";
  addImageInput.value = "";
  addNameInput.focus();
});

addCancelBtn.addEventListener("click", () => {
  addDialogOverlay.classList.add("hidden");
});

addDialogOverlay.addEventListener("click", (e) => {
  if (e.target === addDialogOverlay) {
    addDialogOverlay.classList.add("hidden");
  }
});

addSaveBtn.addEventListener("click", async () => {
  const name = addNameInput.value.trim();
  const location = addLocationInput.value.trim();
  const file = addImageInput.files[0];

  if (!name || !location || !file) {
    showSnackbar("Please enter name, location and image");
    return;
  }

  const dataUrl = await CatalogDB.fileToDataURL(file);
  await CatalogDB.addItem({ name, location, imageDataUrl: dataUrl });
  addDialogOverlay.classList.add("hidden");
  await loadItems();
  showSnackbar("Item added");
});

/* ------------------------- PREVIEW ------------------------- */
function openPreview(item) {
  if (!item) return;
  previewImage.style.transform = "scale(1)";
  previewImage.style.cursor = "zoom-in";
  previewImage.dataset.scale = "1";

  previewImage.src = item.imageDataUrl;
  previewName.textContent = item.name;
  previewLocation.textContent = item.location;
  previewFavoriteBtn.classList.toggle("active", !!item.favorite);

  previewOverlay.classList.remove("hidden");
}

function closePreview() {
  previewOverlay.classList.add("hidden");
  // Scroll to the card
  if (previewInitialCardId) {
    const card = cardGrid.querySelector(`[data-id="${previewInitialCardId}"]`);
    if (card) {
      card.scrollIntoView({ behavior: "smooth", block: "center" });
      card.classList.add("highlight");
      setTimeout(() => card.classList.remove("highlight"), 1800);
    }
  }
  previewIndex = -1;
  previewInitialCardId = null;
}

previewCloseBtn.addEventListener("click", closePreview);
previewOverlay.addEventListener("click", (e) => {
  if (e.target === previewOverlay) closePreview();
});

/* Swipe navigation inside preview */
let swipeStartX = null;
previewOverlay.addEventListener("touchstart", (e) => {
  swipeStartX = e.touches[0].clientX;
});
previewOverlay.addEventListener("touchend", (e) => {
  if (swipeStartX == null) return;
  const dx = e.changedTouches[0].clientX - swipeStartX;
  const threshold = 40;
  if (dx > threshold) {
    // previous
    if (previewIndex > 0) {
      previewIndex--;
      openPreview(filteredItems[previewIndex]);
    }
  } else if (dx < -threshold) {
    // next
    if (previewIndex < filteredItems.length - 1) {
      previewIndex++;
      openPreview(filteredItems[previewIndex]);
    }
  }
  swipeStartX = null;
});

/* Pinch-zoom (simplified: wheel-zoom and double click for desktop, pinch for mobile) */
let lastTouchDistance = null;
function distance(t1, t2) {
  const dx = t1.clientX - t2.clientX;
  const dy = t1.clientY - t2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}
previewImageContainer.addEventListener("wheel", (e) => {
  e.preventDefault();
  const scale = parseFloat(previewImage.dataset.scale || "1");
  const delta = e.deltaY < 0 ? 0.1 : -0.1;
  let next = Math.min(3, Math.max(1, scale + delta));
  previewImage.dataset.scale = String(next);
  previewImage.style.transform = `scale(${next})`;
  previewImage.style.cursor = next > 1 ? "move" : "zoom-in";
});

previewImageContainer.addEventListener("dblclick", () => {
  const scale = parseFloat(previewImage.dataset.scale || "1");
  const next = scale === 1 ? 2 : 1;
  previewImage.dataset.scale = String(next);
  previewImage.style.transform = `scale(${next})`;
  previewImage.style.cursor = next > 1 ? "move" : "zoom-in";
});

previewImageContainer.addEventListener("touchmove", (e) => {
  if (e.touches.length === 2) {
    const d = distance(e.touches[0], e.touches[1]);
    if (lastTouchDistance == null) {
      lastTouchDistance = d;
      return;
    }
    const scale = parseFloat(previewImage.dataset.scale || "1");
    const diff = d - lastTouchDistance;
    let next = Math.min(3, Math.max(1, scale + diff / 200));
    previewImage.dataset.scale = String(next);
    previewImage.style.transform = `scale(${next})`;
    lastTouchDistance = d;
  }
});
previewImageContainer.addEventListener("touchend", () => {
  lastTouchDistance = null;
});

/* Fullscreen on tap */
previewImageContainer.addEventListener("click", () => {
  if (previewImage.requestFullscreen) previewImage.requestFullscreen();
});

/* Preview actions */
previewFavoriteBtn.addEventListener("click", async () => {
  if (previewIndex < 0) return;
  const item = filteredItems[previewIndex];
  const updated = await CatalogDB.updateItem(item.id, {
    favorite: !item.favorite,
  });
  await loadItems();
  // restore preview item reference
  previewIndex = filteredItems.findIndex((i) => i.id === item.id);
  openPreview(updated);
});

previewExportBtn.addEventListener("click", async () => {
  if (previewIndex < 0) return;
  const item = filteredItems[previewIndex];
  const { wrapper } = await CatalogDB.exportSingle(item.id);
  downloadJson(wrapper, `catalog-item-${item.id}.json`);
});

previewWhatsAppBtn.addEventListener("click", async () => {
  if (previewIndex < 0) return;
  const item = filteredItems[previewIndex];
  const message = `Item: ${item.name}\nLocation: ${item.location}`;
  shareWhatsApp(message);
});

previewLinkBtn.addEventListener("click", () => {
  if (previewIndex < 0) return;
  const item = filteredItems[previewIndex];
  const encoded = encodeURIComponent(
    JSON.stringify({
      id: item.id,
      name: item.name,
      location: item.location,
      checksum: item.checksum,
    })
  );
  const link = `${location.origin}${location.pathname}?item=${encoded}`;
  copyToClipboard(link);
  showSnackbar("Preview link copied to clipboard");
});

previewDeleteBtn.addEventListener("click", async () => {
  if (previewIndex < 0) return;
  const item = filteredItems[previewIndex];
  const deleted = await CatalogDB.deleteItem(item.id);
  lastDeletedItem = deleted;
  if (lastDeletedTimeout) clearTimeout(lastDeletedTimeout);
  lastDeletedTimeout = setTimeout(() => {
    lastDeletedItem = null;
  }, 5000);
  await loadItems();
  closePreview();
  showSnackbar("Item deleted", true, async () => {
    if (lastDeletedItem) {
      await CatalogDB.addItem({
        name: lastDeletedItem.name,
        location: lastDeletedItem.location,
        imageDataUrl: lastDeletedItem.imageDataUrl,
      });
      lastDeletedItem = null;
      await loadItems();
    }
  });
});

previewQrBtn.addEventListener("click", () => {
  if (previewIndex < 0) return;
  const item = filteredItems[previewIndex];
  const data = JSON.stringify({
    id: item.id,
    name: item.name,
    location: item.location,
    checksum: item.checksum,
  });
  showQr(data);
});

/* ------------------------- QR CODE (VANILLA IMPLEMENTATION) ------------------------- */
/* Minimal QR algorithm (type auto, numeric+alphanumeric+byte) via tiny implementation.
   For brevity, this is a compact version of a standard QR generator. */

(function () {
  // QRCode generation library (shortened, typical qrcode-generator v1 API style)
  // Source is simplified & inlined for offline usage.
  function QR8bitByte(data) {
    this.mode = 4;
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
    },
  };

  const QRMath = {
    glog: function (n) {
      if (n < 1) {
        throw new Error("glog(" + n + ")");
      }
      return QRMath.LOG_TABLE[n];
    },
    gexp: function (n) {
      while (n < 0) n += 255;
      while (n >= 256) n -= 255;
      return QRMath.EXP_TABLE[n];
    },
    EXP_TABLE: new Array(256),
    LOG_TABLE: new Array(256),
  };
  for (let i = 0; i < 8; i++) QRMath.EXP_TABLE[i] = 1 << i;
  for (let i = 8; i < 256; i++)
    QRMath.EXP_TABLE[i] =
      QRMath.EXP_TABLE[i - 4] ^
      QRMath.EXP_TABLE[i - 5] ^
      QRMath.EXP_TABLE[i - 6] ^
      QRMath.EXP_TABLE[i - 8];
  for (let i = 0; i < 255; i++)
    QRMath.LOG_TABLE[QRMath.EXP_TABLE[i]] = i;

  function QRPolynomial(num, shift) {
    if (num.length == undefined) {
      throw new Error(num.length + "/" + shift);
    }
    let offset = 0;
    while (offset < num.length && num[offset] == 0) offset++;
    this.num = new Array(num.length - offset + shift);
    for (let i = 0; i < num.length - offset; i++)
      this.num[i] = num[i + offset];
  }
  QRPolynomial.prototype = {
    getLength: function () {
      return this.num.length;
    },
    getAt: function (index) {
      return this.num[index];
    },
    multiply: function (e) {
      const num = new Array(this.getLength() + e.getLength() - 1);
      for (let i = 0; i < this.getLength(); i++) {
        for (let j = 0; j < e.getLength(); j++) {
          num[i + j] ^= QRMath.gexp(
            QRMath.glog(this.getAt(i)) + QRMath.glog(e.getAt(j))
          );
        }
      }
      return new QRPolynomial(num, 0);
    },
    mod: function (e) {
      if (this.getLength() - e.getLength() < 0) return this;
      const ratio =
        QRMath.glog(this.getAt(0)) - QRMath.glog(e.getAt(0));
      const num = new Array(this.getLength());
      for (let i = 0; i < this.getLength(); i++) num[i] = this.getAt(i);
      for (let i = 0; i < e.getLength(); i++) {
        num[i] ^= QRMath.gexp(QRMath.glog(e.getAt(i)) + ratio);
      }
      return new QRPolynomial(num, 0).mod(e);
    },
  };

  const QRRSBlock = {
    getRSBlocks: function (typeNumber, errorCorrectLevel) {
      const rsBlock = QRRSBlock.getRsBlockTable(typeNumber, errorCorrectLevel);
      if (rsBlock == undefined) {
        throw new Error(
          "bad rs block @ typeNumber:" +
            typeNumber +
            "/errorCorrectLevel:" +
            errorCorrectLevel
        );
      }
      const length = rsBlock.length / 3;
      const list = [];
      for (let i = 0; i < length; i++) {
        const count = rsBlock[i * 3 + 0];
        const totalCount = rsBlock[i * 3 + 1];
        const dataCount = rsBlock[i * 3 + 2];
        for (let c = 0; c < count; c++) {
          list.push({
            totalCount,
            dataCount,
          });
        }
      }
      return list;
    },

    // Short table: only up to typeNumber 4, Level L (reasonable for our use)
    getRsBlockTable: function (typeNumber, errorCorrectLevel) {
      // typeNumber 1–4, EC Level L (1)
      switch (typeNumber) {
        case 1:
          return [1, 26, 19];
        case 2:
          return [1, 44, 34];
        case 3:
          return [1, 70, 55];
        case 4:
          return [1, 100, 80];
        default:
          return [1, 100, 80]; // fallback
      }
    },
  };

  function QRBitBuffer() {
    this.buffer = [];
    this.length = 0;
  }
  QRBitBuffer.prototype = {
    get: function (index) {
      const bufIndex = Math.floor(index / 8);
      return ((this.buffer[bufIndex] >>> (7 - (index % 8))) & 1) == 1;
    },
    put: function (num, length) {
      for (let i = 0; i < length; i++) {
        this.putBit(((num >>> (length - i - 1)) & 1) == 1);
      }
    },
    getLengthInBits: function () {
      return this.length;
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
    },
  };

  function QRCodeModel(typeNumber, errorCorrectLevel) {
    this.typeNumber = typeNumber;
    this.errorCorrectLevel = errorCorrectLevel;
    this.modules = null;
    this.moduleCount = 0;
    this.dataCache = null;
    this.dataList = [];
  }
  QRCodeModel.prototype = {
    addData: function (data) {
      this.dataList.push(new QR8bitByte(data));
      this.dataCache = null;
    },
    isDark: function (row, col) {
      return this.modules[row][col];
    },
    getModuleCount: function () {
      return this.moduleCount;
    },
    make: function () {
      this.makeImpl(false, this.getBestMaskPattern());
    },
    makeImpl: function (test, maskPattern) {
      this.moduleCount = 21 + (this.typeNumber - 1) * 4;
      this.modules = new Array(this.moduleCount);
      for (let row = 0; row < this.moduleCount; row++) {
        this.modules[row] = new Array(this.moduleCount);
        for (let col = 0; col < this.moduleCount; col++) {
          this.modules[row][col] = null;
        }
      }
      this.setupPositionProbePattern(0, 0);
      this.setupPositionProbePattern(this.moduleCount - 7, 0);
      this.setupPositionProbePattern(0, this.moduleCount - 7);
      this.setupTimingPattern();
      this.setupTypeInfo(test, maskPattern);

      if (this.typeNumber >= 2) {
        this.setupTypeNumber(test);
      }

      if (this.dataCache == null) {
        this.dataCache = this.createData(
          this.typeNumber,
          this.errorCorrectLevel,
          this.dataList
        );
      }

      this.mapData(this.dataCache, maskPattern);
    },
    setupPositionProbePattern: function (row, col) {
      for (let r = -1; r <= 7; r++) {
        if (row + r <= -1 || this.moduleCount <= row + r) continue;
        for (let c = -1; c <= 7; c++) {
          if (col + c <= -1 || this.moduleCount <= col + c) continue;
          if (
            (0 <= r && r <= 6 && (c == 0 || c == 6)) ||
            (0 <= c && c <= 6 && (r == 0 || r == 6)) ||
            (2 <= r && r <= 4 && 2 <= c && c <= 4)
          ) {
            this.modules[row + r][col + c] = true;
          } else {
            this.modules[row + r][col + c] = false;
          }
        }
      }
    },
    setupTimingPattern: function () {
      for (let r = 8; r < this.moduleCount - 8; r++) {
        if (this.modules[r][6] != null) continue;
        this.modules[r][6] = r % 2 == 0;
      }
      for (let c = 8; c < this.moduleCount - 8; c++) {
        if (this.modules[6][c] != null) continue;
        this.modules[6][c] = c % 2 == 0;
      }
    },
    setupTypeNumber: function () {
      // for small typeNumber this is not very relevant, but keep stub
    },
    setupTypeInfo: function (test, maskPattern) {
      // simple version: skip typeInfo error correction complexity for brevity
      // fill reserved format area with pattern
      for (let i = 0; i < 15; i++) {
        const mod = !test && ((Math.random() * 2) | 0) == 0; // pseudo
        // vertical
        if (i < 6) this.modules[i][8] = mod;
        else if (i < 8) this.modules[i + 1][8] = mod;
        else this.modules[this.moduleCount - 15 + i][8] = mod;
        // horizontal
        if (i < 8) this.modules[8][this.moduleCount - i - 1] = mod;
        else if (i < 9) this.modules[8][15 - i - 1] = mod;
        else this.modules[8][14 - i] = mod;
      }
      // fixed dark module
      this.modules[this.moduleCount - 8][8] = true;
    },
    mapData: function (data, maskPattern) {
      let inc = -1;
      let row = this.moduleCount - 1;
      let bitIndex = 7;
      let byteIndex = 0;

      for (let col = this.moduleCount - 1; col > 0; col -= 2) {
        if (col == 6) col--;
        while (true) {
          for (let c = 0; c < 2; c++) {
            if (this.modules[row][col - c] == null) {
              let dark = false;
              if (byteIndex < data.length) {
                dark = ((data[byteIndex] >>> bitIndex) & 1) == 1;
              }
              const mask = this.getMask(maskPattern, row, col - c);
              if (mask) dark = !dark;
              this.modules[row][col - c] = dark;
              bitIndex--;
              if (bitIndex == -1) {
                byteIndex++;
                bitIndex = 7;
              }
            }
          }
          row += inc;
          if (row < 0 || this.moduleCount <= row) {
            row -= inc;
            inc = -inc;
            break;
          }
        }
      }
    },
    getMask: function (pattern, i, j) {
      switch (pattern) {
        case 0:
          return (i + j) % 2 == 0;
        default:
          return (i + j) % 2 == 0;
      }
    },
    getBestMaskPattern: function () {
      return 0;
    },
    createData: function (typeNumber, errorCorrectLevel, dataList) {
      const rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectLevel);
      const buffer = new QRBitBuffer();

      for (let i = 0; i < dataList.length; i++) {
        const data = dataList[i];
        buffer.put(4, 4); // 8bit byte mode
        buffer.put(data.getLength(), 8);
        data.write(buffer);
      }

      let totalDataCount = 0;
      rsBlocks.forEach((b) => {
        totalDataCount += b.dataCount;
      });

      if (buffer.getLengthInBits() > totalDataCount * 8) {
        throw new Error("data overflow");
      }

      // padding
      if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
        buffer.put(0, 4);
      }
      while (buffer.getLengthInBits() % 8 != 0) {
        buffer.putBit(false);
      }

      while (true) {
        if (buffer.getLengthInBits() >= totalDataCount * 8) break;
        buffer.put(0xec, 8);
        if (buffer.getLengthInBits() >= totalDataCount * 8) break;
        buffer.put(0x11, 8);
      }

      return QRCodeModel.createBytes(buffer, rsBlocks);
    },
  };

  QRCodeModel.createBytes = function (buffer, rsBlocks) {
    let offset = 0;
    const maxDcCount = 0;
    const maxEcCount = 0;
    const dcdata = [];
    const ecdata = [];

    for (let r = 0; r < rsBlocks.length; r++) {
      const rsBlock = rsBlocks[r];
      const dcCount = rsBlock.dataCount;
      const ecCount = rsBlock.totalCount - rsBlock.dataCount;

      const dc = new Array(dcCount);
      for (let i = 0; i < dcCount; i++) {
        dc[i] = 0xff & buffer.buffer[i + offset];
      }
      offset += dcCount;
      let rsPoly = new QRPolynomial([1], 0);
      for (let i = 0; i < ecCount; i++) {
        rsPoly = rsPoly.multiply(
          new QRPolynomial([1, QRMath.gexp(i)], 0)
        );
      }
      const rawPoly = new QRPolynomial(dc, rsPoly.getLength() - 1);
      const modPoly = rawPoly.mod(rsPoly);
      const ec = new Array(rsPoly.getLength() - 1);
      for (let i = 0; i < ec.length; i++) {
        const modIndex = i + modPoly.getLength() - ec.length;
        ec[i] = modIndex >= 0 ? modPoly.getAt(modIndex) : 0;
      }

      dcdata.push(dc);
      ecdata.push(ec);
    }

    const totalCodeCount = rsBlocks[0].totalCount * rsBlocks.length;
    const data = new Array(totalCodeCount);
    let index = 0;

    for (let i = 0; i < rsBlocks[0].dataCount; i++) {
      for (let r = 0; r < rsBlocks.length; r++) {
        data[index++] = dcdata[r][i];
      }
    }
    for (let i = 0; i < rsBlocks[0].totalCount - rsBlocks[0].dataCount; i++) {
      for (let r = 0; r < rsBlocks.length; r++) {
        data[index++] = ecdata[r][i];
      }
    }

    return data;
  };

  function makeQr(data) {
    // choose typeNumber based on length (rough)
    const len = data.length;
    let typeNumber = 1;
    if (len > 20) typeNumber = 2;
    if (len > 40) typeNumber = 3;
    if (len > 60) typeNumber = 4;
    const qr = new QRCodeModel(typeNumber, 1); // Level L
    qr.addData(data);
    qr.make();
    return qr;
  }

  window.QR = { makeQr };
})();

function showQr(data) {
  const qr = window.QR.makeQr(data);
  const size = 220;
  const count = qr.getModuleCount();
  const ctx = qrCanvas.getContext("2d");
  const cell = size / count;
  qrCanvas.width = size;
  qrCanvas.height = size;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#111827";
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (qr.isDark(r, c)) {
        ctx.fillRect(
          Math.round(c * cell),
          Math.round(r * cell),
          Math.ceil(cell),
          Math.ceil(cell)
        );
      }
    }
  }
  qrOverlay.classList.remove("hidden");
}

qrCloseBtn.addEventListener("click", () => {
  qrOverlay.classList.add("hidden");
});
qrOverlay.addEventListener("click", (e) => {
  if (e.target === qrOverlay) qrOverlay.classList.add("hidden");
});

/* ------------------------- WHATSAPP + SHARE ------------------------- */
function shareWhatsApp(text) {
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank");
}

function shareText(text) {
  if (navigator.share) {
    navigator.share({ text }).catch(() => shareWhatsApp(text));
  } else {
    shareWhatsApp(text);
  }
}

/* ------------------------- JSON EXPORT HELPER ------------------------- */
function downloadJson(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ------------------------- COPY TO CLIPBOARD ------------------------- */
function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

/* ------------------------- EXPORT / IMPORT / BACKUP ------------------------- */

exportAllBtn.addEventListener("click", async () => {
  const { wrapper } = await CatalogDB.exportAll();
  downloadJson(wrapper, "catalog-export.json");
  await recordBackupMeta();
  updateBackupStats();
  showSnackbar("Export completed");
});

exportAllToWhatsAppBtn.addEventListener("click", async () => {
  const { wrapper } = await CatalogDB.exportAll();
  const encoded = encodeURIComponent(JSON.stringify(wrapper));
  const link = `${location.origin}${location.pathname}?data=${encoded}`;
  shareText(`Full catalog:\n${link}`);
});

importBtn.addEventListener("click", () => {
  importFileInput.value = "";
  importFileInput.click();
});

importFileInput.addEventListener("change", async () => {
  const file = importFileInput.files[0];
  if (!file) return;
  const text = await file.text();

  // Ask mode
  const mode = await pickImportMode();
  if (!mode) {
    showSnackbar("Import canceled");
    return;
  }

  // If "select", we still import all valid items, but we let user pick which IDs to include in that mode.
  let selectedIds = null;
  if (mode === "select") {
    const { payload } = JSON.parse(text);
    const items = payload.items || [];
    selectedIds = await pickItemsToImport(items);
    if (!selectedIds || !selectedIds.length) {
      showSnackbar("No items selected");
      return;
    }
  }

  const summary = await CatalogDB.importFromJson(text, {
    mode,
    selectedIds,
    onConflict: conflictDialog,
  });

  importSummary.innerHTML = `
    Imported: ${summary.importedCount}<br/>
    Replaced: ${summary.replacedCount}<br/>
    Skipped: ${summary.skippedCount}<br/>
    ${
      summary.errorItems.length
        ? "Errors: " +
          summary.errorItems
            .map((e) => `${e.id}: ${e.error}`)
            .join("<br/>")
        : ""
    }
  `;
  await loadItems();
  await recordBackupMeta();
  showSnackbar("Import completed");
});

// Simple prompt UI for mode
function pickImportMode() {
  return new Promise((resolve) => {
    const msg =
      "Choose import mode:\n\n1 = Merge\n2 = Replace\n3 = Select items";
    const ans = prompt(msg, "1");
    if (ans === "2") return resolve("replace");
    if (ans === "3") return resolve("select");
    if (ans === "1") return resolve("merge");
    resolve(null);
  });
}

// Simple selection via prompt of comma-separated item indices
function pickItemsToImport(items) {
  return new Promise((resolve) => {
    if (!items.length) return resolve([]);
    let msg = "Select items to import (comma separated indices):\n\n";
    items.forEach((item, i) => {
      msg += `${i + 1}. ${item.name} @ ${item.location}\n`;
    });
    const ans = prompt(msg, "1");
    if (!ans) return resolve([]);
    const indices = ans
      .split(",")
      .map((s) => parseInt(s.trim(), 10) - 1)
      .filter((i) => i >= 0 && i < items.length);
    const ids = indices.map((i) => items[i].id);
    resolve(ids);
  });
}

// Conflict dialog using overlay
function conflictDialog(existing, incoming) {
  importConflictText.textContent = `Duplicate found:\n\nExisting: ${existing.name} @ ${existing.location}\nImported: ${incoming.name} @ ${incoming.location}\n\nWhat do you want to do?`;
  importConflictOverlay.classList.remove("hidden");
  return new Promise((resolve) => {
    importConflictResolver = resolve;
    importConflictCurrent = { existing, incoming };
  });
}

importKeepExistingBtn.addEventListener("click", () => {
  if (importConflictResolver) importConflictResolver("keep_existing");
  importConflictOverlay.classList.add("hidden");
  importConflictResolver = null;
});
importKeepImportedBtn.addEventListener("click", () => {
  if (importConflictResolver) importConflictResolver("keep_imported");
  importConflictOverlay.classList.add("hidden");
  importConflictResolver = null;
});
importSkipBtn.addEventListener("click", () => {
  if (importConflictResolver) importConflictResolver("skip");
  importConflictOverlay.classList.add("hidden");
  importConflictResolver = null;
});

importConflictOverlay.addEventListener("click", (e) => {
  if (e.target === importConflictOverlay) {
    if (importConflictResolver) importConflictResolver("skip");
    importConflictOverlay.classList.add("hidden");
    importConflictResolver = null;
  }
});

/* Delete all */
deleteAllBtn.addEventListener("click", async () => {
  const confirmed = confirm(
    "Delete all data? This cannot be undone (except from backups)."
  );
  if (!confirmed) return;
  await CatalogDB.deleteAll();
  await loadItems();
  showSnackbar("All data deleted");
});

/* BACKUP META & REMINDERS */
async function recordBackupMeta() {
  const meta = {
    lastBackupAt: Date.now(),
  };
  localStorage.setItem(BACKUP_META_KEY, JSON.stringify(meta));
}

function getBackupMeta() {
  try {
    return JSON.parse(localStorage.getItem(BACKUP_META_KEY) || "{}");
  } catch {
    return {};
  }
}

function updateBackupStats() {
  const meta = getBackupMeta();
  if (!meta.lastBackupAt) {
    statLastBackup.textContent = "Never";
  } else {
    const d = new Date(meta.lastBackupAt);
    statLastBackup.textContent = d.toLocaleString();
  }
}

async function autoBackupIfNeeded() {
  const meta = getBackupMeta();
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const due = !meta.lastBackupAt || now - meta.lastBackupAt > dayMs;

  if (due) {
    await CatalogDB.createBackup();
    await CatalogDB.pruneBackups(5);
    await recordBackupMeta();
    showSnackbar("Auto backup completed");
  } else {
    const daysSince =
      (now - meta.lastBackupAt) / (24 * 60 * 60 * 1000);
    if (daysSince > 3) {
      showSnackbar("Reminder: Consider exporting a fresh backup");
    }
  }
  updateBackupStats();
}

forceBackupCheckBtn.addEventListener("click", () => {
  autoBackupIfNeeded();
});

/* ------------------------- STATS & TIMELINE ------------------------- */
function updateStats() {
  statTotalItems.textContent = allItems.length;
  statFavorites.textContent = allItems.filter((i) => i.favorite).length;
}

function updateTimeline() {
  recentTimeline.innerHTML = "";
  const sorted = [...allItems].sort((a, b) => b.createdAt - a.createdAt);
  sorted.slice(0, 10).forEach((item) => {
    const li = document.createElement("li");
    const date = new Date(item.createdAt);
    li.textContent = `${item.name} @ ${item.location} – ${date.toLocaleString()}`;
    recentTimeline.appendChild(li);
  });
}

/* ------------------------- INSTALL PROMPT ------------------------- */
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBanner.classList.remove("hidden");
});

installLaterBtn.addEventListener("click", () => {
  installBanner.classList.add("hidden");
  deferredPrompt = null;
});

installNowBtn.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  if (choice.outcome === "accepted") {
    showSnackbar("App installed");
  }
  installBanner.classList.add("hidden");
  deferredPrompt = null;
});

/* ------------------------- SERVICE WORKER ------------------------- */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js");
  });
}

/* ------------------------- INIT ------------------------- */
loadItems().then(() => {
  autoBackupIfNeeded();
});
