/* -------------------------
   PLACEHOLDER IMAGE
-------------------------- */
const PLACEHOLDER =
"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

/* -------------------------
   LOCAL STORAGE SYSTEM
-------------------------- */
function loadItems() {
  return JSON.parse(localStorage.getItem("items") || "[]");
}

function saveItems(items) {
  localStorage.setItem("items", JSON.stringify(items));
}

let items = loadItems();

/* -------------------------
   MODE SWITCHING
-------------------------- */
const catalogUI = document.getElementById("catalogUI");
const carouselUI = document.getElementById("carouselUI");

document.getElementById("btnCatalog").onclick = () => {
  btnCatalog.classList.add("active");
  btnCarousel.classList.remove("active");
  catalogUI.classList.remove("hidden");
  carouselUI.classList.add("hidden");
};

document.getElementById("btnCarousel").onclick = () => {
  btnCarousel.classList.add("active");
  btnCatalog.classList.remove("active");
  carouselUI.classList.remove("hidden");
  catalogUI.classList.add("hidden");
};

/* -------------------------
   RENDER CATALOG
-------------------------- */
function renderCatalog() {
  catalogUI.innerHTML = "";

  items.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = "card";
    card.dataset.index = index;

    card.innerHTML = `
      <img src="${item.image || PLACEHOLDER}" />
      <div class="card-inner"><h2>${item.title}</h2></div>
    `;

    card.onclick = () => openPreview(index);
    catalogUI.appendChild(card);
  });
}

renderCatalog();

/* -------------------------
   PREVIEW POPUP
-------------------------- */
const popup = document.getElementById("previewPopup");
const previewTitle = document.getElementById("previewTitle");
const previewImage = document.getElementById("previewImage");

let selectedIndex = null;

function openPreview(index) {
  selectedIndex = index;
  const item = items[index];

  previewTitle.textContent = item.title;
  previewImage.src = item.image || PLACEHOLDER;

  popup.classList.remove("hidden");
}

document.getElementById("closePopup").onclick = () => {
  popup.classList.add("hidden");
};

/* DELETE */
document.getElementById("deleteBtn").onclick = () => {
  items.splice(selectedIndex, 1);
  saveItems(items);
  renderCatalog();
  popup.classList.add("hidden");
};

/* EDIT */
document.getElementById("editBtn").onclick = () => {
  popup.classList.add("hidden");
  openForm("edit");
};

/* -------------------------
   ADD / EDIT FORM
-------------------------- */
const formPopup = document.getElementById("itemForm");
const formTitle = document.getElementById("formTitle");
const itemName = document.getElementById("itemName");
const itemImage = document.getElementById("itemImage");
const imagePreview = document.getElementById("imagePreview");
const removeImageBtn = document.getElementById("removeImage");

let formMode = "add";

document.getElementById("fab").onclick = () => openForm("add");

function openForm(mode) {
  formMode = mode;

  if (mode === "add") {
    formTitle.textContent = "Add Item";
    itemName.value = "";
    imagePreview.src = PLACEHOLDER;
    imagePreview.classList.remove("hidden");
    removeImageBtn.classList.add("hidden");
  } else {
    formTitle.textContent = "Edit Item";
    const item = items[selectedIndex];
    itemName.value = item.title;
    imagePreview.src = item.image || PLACEHOLDER;
    imagePreview.classList.remove("hidden");
    removeImageBtn.classList.remove("hidden");
  }

  formPopup.classList.remove("hidden");
}

/* IMAGE UPLOAD */
itemImage.onchange = () => {
  const file = itemImage.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    imagePreview.src = e.target.result;
    removeImageBtn.classList.remove("hidden");
  };
  reader.readAsDataURL(file);
};

/* REMOVE IMAGE */
removeImageBtn.onclick = () => {
  imagePreview.src = PLACEHOLDER;
};

/* SAVE ITEM */
document.getElementById("saveItem").onclick = () => {
  const title = itemName.value.trim();
  const image = imagePreview.src || PLACEHOLDER;

  if (!title) {
    alert("Please enter a title.");
    return;
  }

  if (formMode === "add") {
    items.push({ title, image });
  } else {
    items[selectedIndex] = { title, image };
  }

  saveItems(items);
  renderCatalog();
  formPopup.classList.add("hidden");
};

/* CANCEL */
document.getElementById("cancelItem").onclick = () => {
  formPopup.classList.add("hidden");
};

/* -------------------------
   3D FLIP CAROUSEL
-------------------------- */
let flipIndex = 0;
let flipping = false;

const flipInner = document.getElementById("flipInner");
const frontFace = document.getElementById("frontFace");
const backFace = document.getElementById("backFace");

function updateCarouselFaces() {
  if (items.length === 0) {
    frontFace.textContent = "No Items";
    backFace.textContent = "";
    return;
  }

  const item = items[flipIndex];
  frontFace.innerHTML = `<img src="${item.image || PLACEHOLDER}" />`;
}

updateCarouselFaces();

function flipTo(nextIndex, direction) {
  if (flipping) return;
  flipping = true;

  const nextItem = items[nextIndex];
  backFace.innerHTML = `<img src="${nextItem.image || PLACEHOLDER}" />`;

  flipInner.style.transform =
    direction === "next" ? "rotateY(180deg)" : "rotateY(-180deg)";

  setTimeout(() => {
    flipIndex = nextIndex;
    updateCarouselFaces();
    flipInner.style.transform = "rotateY(0deg)";
    flipping = false;
  }, 600);
}

document.getElementById("next").onclick = () => {
  if (items.length === 0) return;
  flipTo((flipIndex + 1) % items.length, "next");
};

document.getElementById("prev").onclick = () => {
  if (items.length === 0) return;
  flipTo((flipIndex - 1 + items.length) % items.length, "prev");
};
