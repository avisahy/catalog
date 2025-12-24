const STORAGE_KEY = "catalog_items_v1";
const THEME_KEY = "catalog_theme";

let items = [];
let deferredInstallPrompt = null;

// DOM
const catalogList = document.getElementById("catalogList");
const emptyState = document.getElementById("emptyState");
const itemModalBackdrop = document.getElementById("itemModalBackdrop");
const detailModalBackdrop = document.getElementById("detailModalBackdrop");
const closeModalButton = document.getElementById("closeModalButton");
const closeDetailButton = document.getElementById("closeDetailButton");
const cancelButton = document.getElementById("cancelButton");
const itemForm = document.getElementById("itemForm");
const itemIdInput = document.getElementById("itemId");
const itemNameInput = document.getElementById("itemName");
const itemImageInput = document.getElementById("itemImage");
const uploadArea = document.getElementById("uploadArea");
const imagePreviewContainer = document.getElementById("imagePreviewContainer");
const imagePreview = document.getElementById("imagePreview");
const formError = document.getElementById("formError");
const detailBody = document.getElementById("detailBody");
const deleteButton = document.getElementById("deleteButton");
const editButton = document.getElementById("editButton");
const themeToggle = document.getElementById("themeToggle");
const installButton = document.getElementById("installButton");
const fabAdd = document.getElementById("fabAdd");
const searchInput = document.getElementById("searchInput");
const fullscreenViewer = document.getElementById("fullscreenViewer");
const fullscreenImage = document.getElementById("fullscreenImage");

// Storage
function loadItems() {
  try {
    items = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    items = [];
  }
}

function saveItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

// Theme
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
    applyTheme("light");
  }
}

// Render catalog
function renderCatalog(list = items) {
  catalogList.innerHTML = "";

  if (!list.length) {
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;

  list
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .forEach((item) => {
      const card = document.createElement("article");
      card.className = "catalog-card";

      const button = document.createElement("button");
      button.type = "button";
      button.className = "catalog-card-button";
      button.addEventListener("click", () => openDetailModal(item.id));

      const imageWrapper = document.createElement("div");
      imageWrapper.className = "catalog-card-image-wrapper";

      const img = document.createElement("img");
      img.className = "catalog-card-image";
      img.src = item.imageDataUrl;
      img.alt = item.name || "Catalog item";

      imageWrapper.appendChild(img);
      const body = document.createElement("div");
      body.className = "catalog-card-body";

      button.appendChild(imageWrapper);
      button.appendChild(body);
      card.appendChild(button);
      catalogList.appendChild(card);
    });
}

// Modals
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

  // Full-screen viewer on click
  img.addEventListener("click", () => {
    fullscreenImage.src = item.imageDataUrl;
    fullscreenViewer.hidden = false;
  });

  imageWrapper.appendChild(img);

  const nameEl = document.createElement("p");
  nameEl.className = "detail-name";
  nameEl.textContent = item.name || "Untitled item";

  detailBody.appendChild(imageWrapper);
  detailBody.appendChild(nameEl);

  detailModalBackdrop.dataset.itemId = String(item.id);
  detailModalBackdrop.hidden = false;
}

function closeDetailModal() {
  detailModalBackdrop.hidden = true;
  delete detailModalBackdrop.dataset.itemId;
}

// Full-screen viewer close
fullscreenViewer.addEventListener("click", () => {
  fullscreenViewer.hidden = true;
});

// Upload area: open hidden file input
uploadArea.addEventListener("click", () => {
  itemImageInput.click();
});

// Image preview
itemImageInput.addEventListener("change", () => {
  const file = itemImageInput.files && itemImageInput.files[0];
  if (!file) {
    imagePreviewContainer.hidden = true;
    imagePreview.src = "";
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    imagePreview.src = reader.result;
    imagePreviewContainer.hidden = false;
  };
  reader.readAsDataURL(file);
});

// Search
searchInput.addEventListener("input", (event) => {
  const q = event.target.value.toLowerCase();
  const filtered = items.filter((i) =>
    (i.name || "").toLowerCase().includes(q)
  );
  renderCatalog(filtered);
});

// Add/edit submit
itemForm.addEventListener("submit", (event) => {
  event.preventDefault();
  formError.hidden = true;
  formError.textContent = "";

  const id = itemIdInput.value.trim();
  const name = itemNameInput.value.trim();

  if (!name) {
    formError.textContent = "Please enter a name.";
    formError.hidden = false;
    setTimeout(() => (formError.hidden = true), 5000);
    return;
  }

  const existing = id ? items.find((i) => String(i.id) === id) : null;
  let newImageDataUrl = existing ? existing.imageDataUrl : null;

  const file = itemImageInput.files && itemImageInput.files[0];

  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      newImageDataUrl = reader.result;
      finishSave();
    };
    reader.readAsDataURL(file);
  } else {
    finishSave();
  }

  function finishSave() {
    if (!newImageDataUrl) {
      formError.textContent = "Please select a picture.";
      formError.hidden = false;
      setTimeout(() => (formError.hidden = true), 5000);
      return;
    }

    if (existing) {
      existing.name = name;
      existing.imageDataUrl = newImageDataUrl;
    } else {
      items.push({
        id: Date.now(),
        name,
        imageDataUrl: newImageDataUrl,
        createdAt: Date.now(),
      });
    }

    saveItems();
    renderCatalog();
    closeItemModal();
  }
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

// Close buttons and backdrop clicks
closeModalButton.addEventListener("click", closeItemModal);
cancelButton.addEventListener("click", closeItemModal);

itemModalBackdrop.addEventListener("click", (e) => {
  if (e.target === itemModalBackdrop) {
    closeItemModal();
  }
});

closeDetailButton.addEventListener("click", closeDetailModal);

detailModalBackdrop.addEventListener("click", (e) => {
  if (e.target === detailModalBackdrop) {
    closeDetailModal();
  }
});

// FAB
fabAdd.addEventListener("click", () => openItemModal("add"));

// Theme toggle
themeToggle.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  applyTheme(current === "light" ? "dark" : "light");
});

// PWA install
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

// Service worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./service-worker.js")
      .catch((err) => console.error("SW registration failed", err));
  });
}

// Init
function init() {
  initTheme();
  loadItems();
  renderCatalog();
}

document.addEventListener("DOMContentLoaded", init);
