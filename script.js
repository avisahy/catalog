// Simple localStorage-based catalog with image data URLs
const STORAGE_KEY = "catalog_items_v1";
const THEME_KEY = "catalog_theme";

let items = [];
let deferredInstallPrompt = null;

// DOM elements
const catalogList = document.getElementById("catalogList");
const emptyState = document.getElementById("emptyState");
const addItemButton = document.getElementById("addItemButton");
const itemModalBackdrop = document.getElementById("itemModalBackdrop");
const detailModalBackdrop = document.getElementById("detailModalBackdrop");
const closeModalButton = document.getElementById("closeModalButton");
const closeDetailButton = document.getElementById("closeDetailButton");
const cancelButton = document.getElementById("cancelButton");
const itemForm = document.getElementById("itemForm");
const itemIdInput = document.getElementById("itemId");
const itemNameInput = document.getElementById("itemName");
const itemImageInput = document.getElementById("itemImage");
const imagePreviewContainer = document.getElementById("imagePreviewContainer");
const imagePreview = document.getElementById("imagePreview");
const formError = document.getElementById("formError");
const detailBody = document.getElementById("detailBody");
const deleteButton = document.getElementById("deleteButton");
const editButton = document.getElementById("editButton");
const themeToggle = document.getElementById("themeToggle");
const installButton = document.getElementById("installButton");

// ---- Storage helpers ----

function loadItems() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    items = raw ? JSON.parse(raw) : [];
  } catch {
    items = [];
  }
}

function saveItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

// ---- Theme ----

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_KEY, theme);
  themeToggle.querySelector(".icon").textContent =
    theme === "dark" ? "☀️" : "🌙";
}

function initTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") {
    applyTheme(stored);
  } else {
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    applyTheme(prefersDark ? "dark" : "light");
  }
}

// ---- UI rendering ----

function renderCatalog() {
  catalogList.innerHTML = "";
  if (!items.length) {
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  items
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .forEach((item) => {
      const card = document.createElement("article");
      card.className = "catalog-card";

      const button = document.createElement("button");
      button.className = "catalog-card-button";
      button.type = "button";
      button.addEventListener("click", () => openDetailModal(item.id));

      const imageWrapper = document.createElement("div");
      imageWrapper.className = "catalog-card-image-wrapper";

      const img = document.createElement("img");
      img.className = "catalog-card-image";
      img.src = item.imageDataUrl;
      img.alt = item.name || "Catalog item";

      const body = document.createElement("div");
      body.className = "catalog-card-body";

      const nameEl = document.createElement("p");
      nameEl.className = "catalog-card-name";
      nameEl.textContent = item.name || "Untitled item";

      imageWrapper.appendChild(img);
      body.appendChild(nameEl);
      button.appendChild(imageWrapper);
      button.appendChild(body);
      card.appendChild(button);
      catalogList.appendChild(card);
    });
}

// ---- Modal helpers ----

function resetForm() {
  itemIdInput.value = "";
  itemNameInput.value = "";
  itemImageInput.value = "";
  imagePreviewContainer.hidden = true;
  imagePreview.src = "";
  formError.hidden = true;
  formError.textContent = "";
}

function openItemModal(mode, item) {
  resetForm();
  const modalTitle = document.getElementById("modalTitle");
  modalTitle.textContent = mode === "edit" ? "Edit item" : "Add item";

  if (mode === "edit" && item) {
    itemIdInput.value = item.id;
    itemNameInput.value = item.name;
    if (item.imageDataUrl) {
      imagePreview.src = item.imageDataUrl;
      imagePreviewContainer.hidden = false;
    }
  }

  itemModalBackdrop.hidden = false;
}

function closeItemModal() {
  itemModalBackdrop.hidden = true;
}

function openDetailModal(id) {
  const item = items.find((i) => i.id === id);
  if (!item) return;

  detailBody.innerHTML = "";

  const imageWrapper = document.createElement("div");
  imageWrapper.className = "detail-image-wrapper";

  const img = document.createElement("img");
  img.src = item.imageDataUrl;
  img.alt = item.name || "Catalog item";

  imageWrapper.appendChild(img);

  const nameEl = document.createElement("p");
  nameEl.className = "detail-name";
  nameEl.textContent = item.name || "Untitled item";

  const metaEl = document.createElement("p");
  metaEl.className = "detail-meta";
  const date = item.createdAt ? new Date(item.createdAt) : null;
  metaEl.textContent = date
    ? `Created: ${date.toLocaleString()}`
    : "Created: unknown";

  detailBody.appendChild(imageWrapper);
  detailBody.appendChild(nameEl);
  detailBody.appendChild(metaEl);

  detailModalBackdrop.dataset.itemId = String(item.id);
  detailModalBackdrop.hidden = false;
}

function closeDetailModal() {
  detailModalBackdrop.hidden = true;
  delete detailModalBackdrop.dataset.itemId;
}

// ---- Image handling ----

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

// ---- Event handlers ----

addItemButton.addEventListener("click", () => openItemModal("add"));

closeModalButton.addEventListener("click", closeItemModal);
cancelButton.addEventListener("click", closeItemModal);

itemModalBackdrop.addEventListener("click", (e) => {
  if (e.target === itemModalBackdrop) {
    closeItemModal();
  }
});

detailModalBackdrop.addEventListener("click", (e) => {
  if (e.target === detailModalBackdrop) {
    closeDetailModal();
  }
});

closeDetailButton.addEventListener("click", closeDetailModal);

themeToggle.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  applyTheme(current === "light" ? "dark" : "light");
});

// Preview image on file select
itemImageInput.addEventListener("change", async () => {
  const file = itemImageInput.files && itemImageInput.files[0];
  if (!file) {
    imagePreviewContainer.hidden = true;
    imagePreview.src = "";
    return;
  }
  try {
    const dataUrl = await readFileAsDataUrl(file);
    imagePreview.src = dataUrl;
    imagePreviewContainer.hidden = false;
  } catch (err) {
    console.error(err);
    imagePreviewContainer.hidden = true;
    imagePreview.src = "";
  }
});

// Add/edit submit
itemForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  formError.hidden = true;
  formError.textContent = "";

  const id = itemIdInput.value.trim();
  const name = itemNameInput.value.trim();

  if (!name) {
    formError.textContent = "Please enter a name.";
    formError.hidden = false;
    return;
  }

  const existing = id ? items.find((i) => String(i.id) === id) : null;

  let newImageDataUrl = existing ? existing.imageDataUrl : null;

  const file = itemImageInput.files && itemImageInput.files[0];
  if (!file && !existing) {
    formError.textContent = "Please select a picture.";
    formError.hidden = false;
    return;
  }
  if (file) {
    try {
      newImageDataUrl = await readFileAsDataUrl(file);
    } catch (err) {
      console.error(err);
      formError.textContent = "Failed to read image. Please try again.";
      formError.hidden = false;
      return;
    }
  }

  if (existing) {
    existing.name = name;
    existing.imageDataUrl = newImageDataUrl;
  } else {
    const item = {
      id: Date.now(),
      name,
      imageDataUrl: newImageDataUrl,
      createdAt: Date.now(),
    };
    items.push(item);
  }

  saveItems();
  renderCatalog();
  closeItemModal();
});

// Edit from detail
editButton.addEventListener("click", () => {
  const idAttr = detailModalBackdrop.dataset.itemId;
  if (!idAttr) return;
  const id = Number(idAttr);
  const item = items.find((i) => i.id === id);
  if (!item) return;

  closeDetailModal();
  openItemModal("edit", item);
});

// Delete from detail
deleteButton.addEventListener("click", () => {
  const idAttr = detailModalBackdrop.dataset.itemId;
  if (!idAttr) return;
  const id = Number(idAttr);

  const confirmDelete = window.confirm(
    "Delete this item? This cannot be undone."
  );
  if (!confirmDelete) return;

  items = items.filter((i) => i.id !== id);
  saveItems();
  renderCatalog();
  closeDetailModal();
});

// ---- PWA install handling ----

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  installButton.hidden = false;
});

installButton.addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;
  installButton.hidden = true;
  deferredInstallPrompt.prompt();
  const result = await deferredInstallPrompt.userChoice;
  if (result.outcome !== "accepted") {
    installButton.hidden = false;
  }
  deferredInstallPrompt = null;
});

// ---- Service worker registration ----

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./service-worker.js")
      .catch((err) => console.error("SW registration failed", err));
  });
}

// ---- Init ----

function init() {
  initTheme();
  loadItems();
  renderCatalog();
}

document.addEventListener("DOMContentLoaded", init);
