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
const btnCatalog = document.getElementById("btnCatalog");
const btnCarousel = document.getElementById("btnCarousel");

btnCatalog.onclick = () => {
  btnCatalog.classList.add("active");
  btnCarousel.classList.remove("active");
  catalogUI.classList.remove("hidden");
  carouselUI.classList.add("hidden");
};

btnCarousel.onclick = () => {
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

    const isPlaceholder = !item.image || item.image === PLACEHOLDER;
    const imageSrc = item.image || PLACEHOLDER;

    card.innerHTML = `
      <div class="card-image ${isPlaceholder ? "placeholder" : ""}">
        <img src="${imageSrc}" />
      </div>
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
const previewWrapper = document.getElementById("previewWrapper");

let selectedIndex = null;

function openPreview(index) {
  selectedIndex = index;
  const item = items[index];

  const imageSrc = item.image || PLACEHOLDER;
  const isPlaceholder = imageSrc === PLACEHOLDER;

  previewTitle.textContent = item.title;
  previewImage.src = imageSrc;

  if (isPlaceholder) {
    previewWrapper.classList.add("placeholder");
  } else {
    previewWrapper.classList.remove("placeholder");
  }

  popup.classList.remove("hidden");
}

/* Clicking + in preview opens Edit (ONLY if placeholder) */
previewWrapper.onclick = () => {
  const isPlaceholder = previewImage.src === PLACEHOLDER;
  if (isPlaceholder) {
    popup.classList.add("hidden");
    openForm("edit");
  }
};

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
const formPreviewWrapper = document.getElementById("formPreviewWrapper");

let formMode = "add";

document.getElementById("fab").onclick = () => openForm("add");

function openForm(mode) {
  formMode = mode;

  if (mode === "add") {
    formTitle.textContent = "Add Item";
    itemName.value = "";
    imagePreview.src = PLACEHOLDER;
    formPreviewWrapper.classList.add("placeholder");
    removeImageBtn.classList.add("hidden");
  } else {
    formTitle.textContent = "Edit Item";
    const item = items[selectedIndex];
    const imageSrc = item.image || PLACEHOLDER;
    const isPlaceholder = imageSrc === PLACEHOLDER;

    itemName.value = item.title;
    imagePreview.src = imageSrc;

    if (isPlaceholder) {
      formPreviewWrapper.classList.add("placeholder");
      removeImageBtn.classList.add("hidden");
    } else {
      formPreviewWrapper.classList.remove("placeholder");
      removeImageBtn.classList.remove("hidden");
    }
  }

  formPopup.classList.remove("hidden");
}

/* Clicking the + opens file picker */
formPreviewWrapper.onclick = () => itemImage.click();

/* IMAGE UPLOAD */
itemImage.onchange = () => {
  const file = itemImage.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    imagePreview.src = e.target.result;
    formPreviewWrapper.classList.remove("placeholder");
    removeImageBtn.classList.remove("hidden");
  };
  reader.readAsDataURL(file);
};

/* REMOVE IMAGE */
removeImageBtn.onclick = () => {
  imagePreview.src = PLACEHOLDER;
  formPreviewWrapper.classList.add("placeholder");
  removeImageBtn.classList.add("hidden");
};

/* SAVE ITEM */
document.getElementById("saveItem").onclick = () => {
  const title = itemName.value.trim();
  let image = imagePreview.src || PLACEHOLDER;

  if (!title) {
    alert("Please enter a title.");
    return;
  }

  if (!image) image = PLACEHOLDER;

  if (formMode === "add") {
    items.push({ title, image });
  } else {
    items[selectedIndex] = { title, image };
  }

  saveItems(items);
  renderCatalog();
  updateCarouselFaces();
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
  const imageSrc = item.image || PLACEHOLDER;

  frontFace.innerHTML = `<img src="${imageSrc}" />`;
}

updateCarouselFaces();

function flipTo(nextIndex, direction) {
  if (flipping) return;
  if (items.length === 0) return;

  flipping = true;

  const nextItem = items[nextIndex];
  const nextSrc = nextItem.image || PLACEHOLDER;

  backFace.innerHTML = `<img src="${nextSrc}" />`;

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
