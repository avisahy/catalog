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

// FULL SCREEN VIEWER
const fullscreenViewer = document.getElementById("fullscreenViewer");
const fullscreenImage = document.getElementById("fullscreenImage");

// Load items
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
  applyTheme(stored || "light");
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
      button.className = "catalog-card-button";
      button.addEventListener("click", () => openDetailModal(item.id));

      const imageWrapper = document.createElement("div");
      imageWrapper.className = "catalog-card-image-wrapper";

      const img = document.createElement("img");
      img.className = "catalog-card-image";
      img.src = item.imageDataUrl;

      imageWrapper.appendChild(img);
      button.appendChild(imageWrapper);
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
}

function openItemModal(mode, item) {
  resetForm();
  document.getElementById("modalTitle").textContent =
    mode === "edit" ? "Edit item" : "Add item";

  if (item) {
    itemIdInput.value = item.id;
    itemNameInput.value = item.name;
    imagePreview.src = item.imageDataUrl;
    imagePreviewContainer.hidden = false;
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

  const imgWrapper = document.createElement("div");
  imgWrapper.className = "detail-image-wrapper";

  const img = document.createElement("img");
  img.src = item.imageDataUrl;

  // FULL SCREEN VIEWER
  img.addEventListener("click", () => {
    fullscreenImage.src = item.imageDataUrl;
    fullscreenViewer.hidden = false;
  });

  imgWrapper.appendChild(img);

  const nameEl = document.createElement("p");
  nameEl.className = "detail-name";
  nameEl.textContent = item.name;

  detailBody.appendChild(imgWrapper);
  detailBody.appendChild(nameEl);

  detailModalBackdrop.dataset.itemId = id;
  detailModalBackdrop.hidden = false;
}

function closeDetailModal() {
  detailModalBackdrop.hidden = true;
}

// Full screen viewer close
fullscreenViewer.addEventListener("click", () => {
  fullscreenViewer.hidden = true;
});

// Image preview
itemImageInput.addEventListener("change", async () => {
  const file = itemImageInput.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    imagePreview.src = reader.result;
    imagePreviewContainer.hidden = false;
  };
  reader.readAsDataURL(file);
});

// Search
searchInput.addEventListener("input", (e) => {
  const q = e.target.value.toLowerCase();
  renderCatalog(items.filter((i) => i.name.toLowerCase().includes(q)));
});

// Save item
itemForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = itemIdInput.value;
  const name = itemNameInput.value.trim();

  if (!name) return;

  let imageDataUrl = null;

  const file = itemImageInput.files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      imageDataUrl = reader.result;
      finalizeSave();
    };
    reader.readAsDataURL(file);
  } else {
    const existing = items.find((i) => i.id == id);
    imageDataUrl = existing?.imageDataUrl;
    finalizeSave();
  }

  function finalizeSave() {
    if (!imageDataUrl) {
      formError.textContent = "Please select a picture.";
      formError.hidden = false;
      setTimeout(() => (formError.hidden = true), 5000);
      return;
    }

    if (id) {
      const item = items.find((i) => i.id == id);
      item.name = name;
      item.imageDataUrl = imageDataUrl;
    } else {
      items.push({
        id: Date.now(),
        name,
        imageDataUrl,
        createdAt: Date.now(),
      });
    }

    saveItems();
    renderCatalog();
    closeItemModal();
  }
});

// Edit
editButton.addEventListener("click", () => {
  const id = detailModalBackdrop.dataset.itemId;
  const item = items.find((i) => i.id == id);
  closeDetailModal();
  openItemModal("edit", item);
});

// Delete
deleteButton.addEventListener("click", () => {
  const id = detailModalBackdrop.dataset.itemId;
  items = items.filter((i) => i.id != id);
  saveItems();
  renderCatalog();
  closeDetailModal();
});

// Theme toggle
themeToggle.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  applyTheme(current === "light" ? "dark" : "light");
});

// FAB
fabAdd.addEventListener("click", () => openItemModal("add"));

// Init
function init() {
  initTheme();
  loadItems();
  renderCatalog();
}

document.addEventListener("DOMContentLoaded", init);
