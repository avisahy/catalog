// Storage keys
const STORAGE_KEY_ITEMS = "itemCatalogItems";
const STORAGE_KEY_THEME = "itemCatalogTheme";

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
const darkToggle = document.getElementById("dark-mode-toggle");

// ---------- Theme ----------
function applyTheme(theme) {
  document.body.classList.toggle("dark", theme === "dark");
  darkToggle.textContent = theme === "dark" ? "☀️" : "🌙";
}

function loadTheme() {
  const saved = localStorage.getItem(STORAGE_KEY_THEME);
  applyTheme(saved || "light");
}

darkToggle.onclick = () => {
  const newTheme = document.body.classList.contains("dark") ? "light" : "dark";
  applyTheme(newTheme);
  localStorage.setItem(STORAGE_KEY_THEME, newTheme);
};

// ---------- Modal ----------
fab.onclick = () => addModal.classList.remove("hidden");
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
  const items = loadItems();
  itemsGrid.innerHTML = "";

  items.forEach(item => {
    const card = document.createElement("div");
    card.className = "item-card";

    const img = document.createElement("img");
    img.src = item.imageData;
    img.onclick = () => showPreview(item.imageData);

    const body = document.createElement("div");
    body.className = "item-card-body";

    const name = document.createElement("p");
    name.className = "item-name";
    name.textContent = item.name;

    const date = document.createElement("p");
    date.className = "item-date";
    date.textContent = new Date(item.createdAt).toLocaleDateString();

    body.appendChild(name);
    body.appendChild(date);

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

previewModal.onclick = () => previewModal.classList.add("hidden");

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

  const name = itemNameInput.value.trim();
  const file = fileInput.files[0];

  if (!name || !file) return alert("Name and picture required");

  const imageData = await fileToBase64(file);

  const items = loadItems();
  items.unshift({
    id: Date.now(),
    name,
    imageData,
    createdAt: new Date().toISOString()
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

// ---------- Init ----------
loadTheme();
renderItems();
