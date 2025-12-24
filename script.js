/* ============================================================
   STATE & STORAGE
============================================================ */
let items = JSON.parse(localStorage.getItem("catalogItems") || "[]");

function saveItems() {
  localStorage.setItem("catalogItems", JSON.stringify(items));
}

/* ============================================================
   ELEMENTS
============================================================ */
const catalogList = document.getElementById("catalogList");
const emptyState = document.getElementById("emptyState");

const fabAdd = document.getElementById("fabAdd");

const itemModalBackdrop = document.getElementById("itemModalBackdrop");
const itemForm = document.getElementById("itemForm");
const modalTitle = document.getElementById("modalTitle");
const closeModalButton = document.getElementById("closeModalButton");
const cancelButton = document.getElementById("cancelButton");

const itemIdField = document.getElementById("itemId");
const itemNameField = document.getElementById("itemName");
const itemImageField = document.getElementById("itemImage");

const uploadArea = document.getElementById("uploadArea");
const imagePreviewContainer = document.getElementById("imagePreviewContainer");
const imagePreview = document.getElementById("imagePreview");

const formError = document.getElementById("formError");

const detailModalBackdrop = document.getElementById("detailModalBackdrop");
const detailTitle = document.getElementById("detailTitle");
const detailBody = document.getElementById("detailBody");
const closeDetailButton = document.getElementById("closeDetailButton");
const deleteButton = document.getElementById("deleteButton");
const editButton = document.getElementById("editButton");

const fullscreenViewer = document.getElementById("fullscreenViewer");
const fullscreenImage = document.getElementById("fullscreenImage");
const zoomSlider = document.getElementById("zoomSlider");

const searchInput = document.getElementById("searchInput");
const themeToggle = document.getElementById("themeToggle");

/* ============================================================
   RENDERING
============================================================ */
function renderItems() {
  catalogList.innerHTML = "";

  const query = searchInput.value.toLowerCase();
  const filtered = items.filter(i => i.name.toLowerCase().includes(query));

  if (filtered.length === 0) {
    emptyState.style.display = "block";
    return;
  }

  emptyState.style.display = "none";

  filtered.forEach(item => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <img src="${item.image}" alt="${item.name}" />
      <div class="card-title">${item.name}</div>
    `;
    card.onclick = () => openDetailModal(item.id);
    catalogList.appendChild(card);
  });
}

/* ============================================================
   ADD / EDIT MODAL
============================================================ */
function openItemModal(editItem = null) {
  itemModalBackdrop.hidden = false;

  if (editItem) {
    modalTitle.textContent = "Edit Item";
    itemIdField.value = editItem.id;
    itemNameField.value = editItem.name;
    imagePreview.src = editItem.image;
    imagePreviewContainer.hidden = false;
  } else {
    modalTitle.textContent = "Add Item";
    itemIdField.value = "";
    itemNameField.value = "";
    itemImageField.value = "";
    imagePreviewContainer.hidden = true;
  }
}

function closeItemModal() {
  itemModalBackdrop.hidden = true;
  formError.hidden = true;
  formError.classList.remove("visible");
}

/* ============================================================
   DETAIL MODAL
============================================================ */
let currentDetailId = null;

function openDetailModal(id) {
  const item = items.find(i => i.id === id);
  if (!item) return;

  currentDetailId = id;

  detailTitle.textContent = item.name;
  detailBody.innerHTML = `
    <img src="${item.image}" alt="${item.name}" style="width:100%; border-radius:16px; margin-bottom:16px;" />
  `;

  detailModalBackdrop.hidden = false;
}

function closeDetailModal() {
  detailModalBackdrop.hidden = true;
}

/* ============================================================
   FULLSCREEN VIEWER
============================================================ */
function openFullscreen(src) {
  fullscreenImage.src = src;
  fullscreenViewer.hidden = false;
  zoomSlider.value = 1;
  fullscreenImage.style.transform = "scale(1)";
}

fullscreenViewer.addEventListener("click", e => {
  if (e.target === fullscreenViewer) {
    fullscreenViewer.hidden = true;
    zoomSlider.value = 1;
    fullscreenImage.style.transform = "scale(1)";
  }
});

zoomSlider.addEventListener("input", () => {
  fullscreenImage.style.transform = `scale(${zoomSlider.value})`;
});

/* ============================================================
   UPLOAD AREA
============================================================ */
uploadArea.addEventListener("click", () => itemImageField.click());

itemImageField.addEventListener("change", () => {
  const file = itemImageField.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    imagePreview.src = reader.result;
    imagePreviewContainer.hidden = false;
  };
  reader.readAsDataURL(file);
});

/* ============================================================
   FORM SUBMIT
============================================================ */
itemForm.addEventListener("submit", e => {
  e.preventDefault();

  const id = itemIdField.value;
  const name = itemNameField.value.trim();

  let imageData = imagePreview.src || "";

  if (!id && (!itemImageField.files[0] || !imageData)) {
    showFormError("Please select a picture.");
    return;
  }

  if (id) {
    const item = items.find(i => i.id === id);
    item.name = name;
    item.image = imageData;
  } else {
    items.push({
      id: crypto.randomUUID(),
      name,
      image: imageData
    });
  }

  saveItems();
  renderItems();
  closeItemModal();
});

/* ============================================================
   TOOLTIP FADE
============================================================ */
function showFormError(msg) {
  formError.textContent = msg;
  formError.hidden = false;

  requestAnimationFrame(() => {
    formError.classList.add("visible");
  });

  setTimeout(() => {
    formError.classList.remove("visible");
    setTimeout(() => (formError.hidden = true), 400);
  }, 2500);
}

/* ============================================================
   DELETE / EDIT
============================================================ */
deleteButton.addEventListener("click", () => {
  items = items.filter(i => i.id !== currentDetailId);
  saveItems();
  renderItems();
  closeDetailModal();
});

editButton.addEventListener("click", () => {
  const item = items.find(i => i.id === currentDetailId);
  closeDetailModal();
  openItemModal(item);
});

/* ============================================================
   SEARCH
============================================================ */
searchInput.addEventListener("input", renderItems);

/* ============================================================
   THEME TOGGLE
============================================================ */
themeToggle.addEventListener("click", () => {
  const isDark = document.body.getAttribute("data-theme") === "dark";
  document.body.setAttribute("data-theme", isDark ? "light" : "dark");
});

/* ============================================================
   EVENT LISTENERS
============================================================ */
fabAdd.addEventListener("click", () => openItemModal());
closeModalButton.addEventListener("click", closeItemModal);
cancelButton.addEventListener("click", closeItemModal);

closeDetailButton.addEventListener("click", closeDetailModal);

detailBody.addEventListener("click", e => {
  if (e.target.tagName === "IMG") {
    openFullscreen(e.target.src);
  }
});

/* ============================================================
   INIT
============================================================ */
renderItems();
