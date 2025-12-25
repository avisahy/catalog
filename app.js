// Storage keys
const STORAGE_KEY_ITEMS = "itemCatalogItems";
const STORAGE_KEY_THEME = "itemCatalogTheme";

let viewOnlyMode = false;
let importedItems = [];

// Elements
const fab = document.getElementById("fab-add");
const addModal = document.getElementById("add-modal");
const closeModal = document.getElementById("close-modal");
const filePicker = document.getElementById("file-picker");
const fileInput = document.getElementById("item-image");
const itemForm = document.getElementById("item-form");
const itemNameInput = document.getElementById("item-name");
const itemsGrid = document.getElementById("items-grid");
const search = document.getElementById("search");
const previewModal = document.getElementById("preview-modal");
const previewImg = document.getElementById("preview-img");

const menuBtn = document.getElementById("menu-btn");
const menuDropdown = document.getElementById("menu-dropdown");
const importBtn = document.getElementById("import-btn");
const exportBtn = document.getElementById("export-btn");
const deleteAllBtn = document.getElementById("delete-all-btn");
const toggleDarkBtn = document.getElementById("toggle-dark");
const returnBtn = document.getElementById("return-btn");
const installBtn = document.getElementById("install-btn");

const mergeBtn = document.getElementById("merge-btn");
const makeMineBtn = document.getElementById("make-mine-btn");

// Confirmation modal elements
const confirmModal = document.getElementById("confirm-modal");
const confirmTitle = document.getElementById("confirm-title");
const confirmMessage = document.getElementById("confirm-message");
const confirmCancel = document.getElementById("confirm-cancel");
const confirmOk = document.getElementById("confirm-ok");

// ---------- CONFIRMATION MODAL ----------
function showConfirm({ title, message, danger = false }) {
  return new Promise((resolve) => {
    confirmTitle.textContent = title;
    confirmMessage.textContent = message;

    confirmOk.textContent = danger ? "Delete" : "OK";
    confirmOk.classList.toggle("danger", danger);

    confirmModal.classList.remove("hidden");

    const handleCancel = () => {
      cleanup();
      resolve(false);
    };

    const handleOk = () => {
      cleanup();
      resolve(true);
    };

    function cleanup() {
      confirmModal.classList.add("hidden");
      confirmCancel.removeEventListener("click", handleCancel);
      confirmOk.removeEventListener("click", handleOk);
    }

    confirmCancel.addEventListener("click", handleCancel);
    confirmOk.addEventListener("click", handleOk);
  });
}

// ---------- THEME ----------
function applyTheme(theme) {
  document.body.classList.toggle("dark", theme === "dark");
}

function loadTheme() {
  const saved = localStorage.getItem(STORAGE_KEY_THEME);
  applyTheme(saved || "light");
}

toggleDarkBtn.onclick = () => {
  const newTheme = document.body.classList.contains("dark") ? "light" : "dark";
  applyTheme(newTheme);
  localStorage.setItem(STORAGE_KEY_THEME, newTheme);
};

// ---------- MENU ----------
menuBtn.onclick = (e) => {
  e.stopPropagation();
  menuDropdown.classList.toggle("hidden");
};

document.addEventListener("click", (e) => {
  if (!menuBtn.contains(e.target) && !menuDropdown.contains(e.target)) {
    menuDropdown.classList.add("hidden");
  }
});

// ---------- MODAL ----------
fab.onclick = () => {
  if (viewOnlyMode) {
    showConfirm({
      title: "View Only Mode",
      message: "You cannot add items while viewing an imported database.",
      danger: false
    });
    return;
  }
  addModal.classList.remove("hidden");
};

closeModal.onclick = () => addModal.classList.add("hidden");

// ---------- CUSTOM FILE PICKER ----------
filePicker.onclick = () => fileInput.click();

fileInput.onchange = () => {
  filePicker.textContent = fileInput.files.length
    ? "File selected"
    : "Click here to choose file";
};

// ---------- LOAD & SAVE ----------
function loadItems() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY_ITEMS) || "[]");
}

function saveItems(items) {
  localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(items));
}

// ---------- DELETE ITEM ----------
async function deleteItem(id) {
  if (viewOnlyMode) return;

  const ok = await showConfirm({
    title: "Delete Item",
    message: "Are you sure you want to delete this item?",
    danger: true
  });

  if (!ok) return;

  const items = loadItems().filter(item => item.id !== id);
  saveItems(items);
  renderItems();
}

// ---------- RENDER ----------
function renderItems() {
  const items = viewOnlyMode ? importedItems : loadItems();
  itemsGrid.innerHTML = "";

  items.forEach(item => {
    const card = document.createElement("div");
    card.className = "item-card";

    const img = document.createElement("img");
    img.src = item.imageData;
    img.alt = item.name || "Item image";
    img.onclick = () => showPreview(item.imageData);

    const body = document.createElement("div");
    body.className = "item-card-body";

    const name = document.createElement("p");
    name.className = "item-name";
    name.textContent = item.name;

    body.appendChild(name);

    if (!viewOnlyMode) {
      const del = document.createElement("button");
      del.className = "item-delete";
      del.textContent = "×";
      del.onclick = (e) => {
        e.stopPropagation();
        deleteItem(item.id);
      };
      card.appendChild(del);
    }

    card.appendChild(img);
    card.appendChild(body);
    itemsGrid.appendChild(card);
  });
}

// ---------- PREVIEW ----------
function showPreview(src) {
  previewImg.src = src;
  previewModal.classList.remove("hidden");
}

previewModal.onclick = () => {
  previewModal.classList.add("hidden");
};

// ---------- ADD ITEM ----------
function fileToBase64(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.readAsDataURL(file);
  });
}

itemForm.onsubmit = async (e) => {
  e.preventDefault();

  if (viewOnlyMode) return;

  const name = itemNameInput.value.trim();
  const file = fileInput.files[0];

  if (!name || !file) {
    showConfirm({
      title: "Missing Fields",
      message: "Name and picture are required.",
      danger: false
    });
    return;
  }

  const imageData = await fileToBase64(file);

  const items = loadItems();
  items.unshift({
    id: Date.now(),
    name,
    imageData
  });

  saveItems(items);
  renderItems();

  itemForm.reset();
  filePicker.textContent = "Click here to choose file";
  addModal.classList.add("hidden");
};

// ---------- SEARCH ----------
search.oninput = () => {
  const q = search.value.toLowerCase();
  document.querySelectorAll(".item-card").forEach(card => {
    const name = card.querySelector(".item-name").textContent.toLowerCase();
    card.style.display = name.includes(q) ? "" : "none";
  });
};

// ---------- EXPORT ----------
exportBtn.onclick = () => {
  const data = JSON.stringify(loadItems(), null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "my-database.json";
  a.click();

  URL.revokeObjectURL(url);
};

// ---------- IMPORT ----------
importBtn.onclick = () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json";

  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (!Array.isArray(parsed)) {
        showConfirm({
          title: "Invalid File",
          message: "This file does not contain a valid database.",
          danger: false
        });
        return;
      }

      importedItems = parsed;
      viewOnlyMode = true;

      // Switch menu
      importBtn.classList.add("hidden");
      exportBtn.classList.add("hidden");
      deleteAllBtn.classList.add("hidden");

      mergeBtn.classList.remove("hidden");
      makeMineBtn.classList.remove("hidden");

      returnBtn.classList.remove("hidden");
      fab.style.display = "none";

      renderItems();
    } catch (err) {
      showConfirm({
        title: "Import Failed",
        message: "Could not read or parse the file.",
        danger: false
      });
    }
  };

  input.click();
};

// ---------- MERGE ----------
mergeBtn.onclick = async () => {
  const ok = await showConfirm({
    title: "Merge Database",
    message: "This will add imported items to your database.",
    danger: false
  });

  if (!ok) return;

  const current = loadItems();
  const merged = [...importedItems, ...current];

  saveItems(merged);

  returnBtn.onclick();
};

// ---------- MAKE IT MY DATABASE ----------
makeMineBtn.onclick = async () => {
  const ok = await showConfirm({
    title: "Replace Database",
    message: "This will overwrite your entire database.",
    danger: true
  });

  if (!ok) return;

  saveItems(importedItems);

  returnBtn.onclick();
};

// ---------- DELETE ALL ----------
deleteAllBtn.onclick = async () => {
  const ok = await showConfirm({
    title: "Delete All Data",
    message: "This cannot be undone.",
    danger: true
  });

  if (!ok) return;

  viewOnlyMode = false;
  importedItems = [];
  returnBtn.classList.add("hidden");
  fab.style.display = "block";

  localStorage.removeItem(STORAGE_KEY_ITEMS);
  renderItems();
};

// ---------- RETURN TO MY DATABASE ----------
returnBtn.onclick = () => {
  viewOnlyMode = false;
  importedItems = [];

  returnBtn.classList.add("hidden");
  fab.style.display = "block";

  importBtn.classList.remove("hidden");
  exportBtn.classList.remove("hidden");
  deleteAllBtn.classList.remove("hidden");

  mergeBtn.classList.add("hidden");
  makeMineBtn.classList.add("hidden");

  renderItems();
};

// ---------- INSTALL BUTTON ----------
let deferredPrompt = null;

function isIOS() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isInStandaloneMode() {
  return window.matchMedia("(display-mode: standalone)").matches ||
         window.navigator.standalone === true;
}

installBtn.classList.add("hidden");

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.classList.remove("hidden");
});

installBtn.onclick = async () => {
  menuDropdown.classList.add("hidden");

  if (isIOS()) {
    showConfirm({
      title: "Install on iOS",
      message: "Tap the Share button and choose 'Add to Home Screen'.",
      danger: false
    });
    return;
  }

  if (!deferredPrompt) {
    showConfirm({
      title: "Not Available",
      message: "Installation is not available on this device.",
      danger: false
    });
    return;
  }

  deferredPrompt.prompt();
  await deferredPrompt.userChoice;

  deferredPrompt = null;
  installBtn.classList.add("hidden");
};

if (isInStandaloneMode()) {
  installBtn.classList.add("hidden");
}

// ---------- INIT ----------
loadTheme();

addModal.classList.add("hidden");
previewModal.classList.add("hidden");
menuDropdown.classList.add("hidden");
returnBtn.classList.add("hidden");

renderItems();
