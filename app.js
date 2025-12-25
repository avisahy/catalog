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
const toggleDarkBtn = document.getElementById("toggle-dark");
const returnBtn = document.getElementById("return-btn");

// ---------- Theme ----------
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

// ---------- Menu ----------
menuBtn.onclick = (e) => {
  e.stopPropagation();
  menuDropdown.classList.toggle("hidden");
};

document.addEventListener("click", (e) => {
  if (!menuBtn.contains(e.target) && !menuDropdown.contains(e.target)) {
    menuDropdown.classList.add("hidden");
  }
});

// ---------- Modal ----------
fab.onclick = () => {
  if (viewOnlyMode) {
    alert("Cannot add items in view-only mode");
    return;
  }
  addModal.classList.remove("hidden");
};

closeModal.onclick = () => addModal.classList.add("hidden");

// ---------- Custom file picker ----------
filePicker.onclick = () => fileInput.click();

fileInput.onchange = () => {
  filePicker.textContent = fileInput.files.length
    ? "File selected"
    : "Click here to choose file";
};

// ---------- Load & Save ----------
function loadItems() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY_ITEMS) || "[]");
}

function saveItems(items) {
  localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(items));
}

// ---------- Render ----------
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

    card.appendChild(img);
    card.appendChild(body);

    itemsGrid.appendChild(card);
  });
}

// ---------- Fullscreen preview ----------
function showPreview(src) {
  previewImg.src = src;
  previewModal.classList.remove("hidden");
}

previewModal.onclick = () => {
  previewModal.classList.add("hidden");
};

// ---------- Add item ----------
function fileToBase64(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.readAsDataURL(file);
  });
}

itemForm.onsubmit = async (e) => {
  e.preventDefault();

  if (viewOnlyMode) {
    alert("Cannot add items in view-only mode");
    return;
  }

  const name = itemNameInput.value.trim();
  const file = fileInput.files[0];

  if (!name || !file) {
    alert("Name and picture required");
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

// ---------- Search ----------
search.oninput = () => {
  const q = search.value.toLowerCase();
  document.querySelectorAll(".item-card").forEach(card => {
    const name = card.querySelector(".item-name").textContent.toLowerCase();
    card.style.display = name.includes(q) ? "" : "none";
  });
};

// ---------- Import / Export ----------
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
        alert("Invalid file format");
        return;
      }

      importedItems = parsed;
      viewOnlyMode = true;

      returnBtn.classList.remove("hidden");
      fab.style.display = "none";

      renderItems();
    } catch (err) {
      console.error(err);
      alert("Failed to import database");
    }
  };

  input.click();
};

returnBtn.onclick = () => {
  viewOnlyMode = false;
  importedItems = [];

  returnBtn.classList.add("hidden");
  fab.style.display = "block";

  renderItems();
};

// ---------- Init ----------
loadTheme();

addModal.classList.add("hidden");
previewModal.classList.add("hidden");
menuDropdown.classList.add("hidden");
returnBtn.classList.add("hidden"); // FIX: hide on load

renderItems();
