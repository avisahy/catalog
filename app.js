// Storage keys
const STORAGE_KEY_ITEMS = "itemCatalogItems";
const STORAGE_KEY_THEME = "itemCatalogTheme";

const itemForm = document.getElementById("item-form");
const itemNameInput = document.getElementById("item-name");
const itemImageInput = document.getElementById("item-image");
const itemsGrid = document.getElementById("items-grid");
const clearBtn = document.getElementById("clear-items");
const darkToggle = document.getElementById("dark-mode-toggle");

// ---------- Theme ----------
function applyTheme(theme) {
  if (theme === "dark") {
    document.body.classList.add("dark");
    darkToggle.textContent = "☀️";
  } else {
    document.body.classList.remove("dark");
    darkToggle.textContent = "🌙";
  }
}

function loadTheme() {
  const saved = localStorage.getItem(STORAGE_KEY_THEME);
  if (saved === "dark" || saved === "light") {
    applyTheme(saved);
  } else {
    const prefersDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(prefersDark ? "dark" : "light");
  }
}

darkToggle.addEventListener("click", () => {
  const isDark = document.body.classList.contains("dark");
  const newTheme = isDark ? "light" : "dark";
  applyTheme(newTheme);
  localStorage.setItem(STORAGE_KEY_THEME, newTheme);
});

// ---------- Items storage ----------
function loadItems() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ITEMS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to parse items", e);
    return [];
  }
}

function saveItems(items) {
  localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(items));
}

function renderItems() {
  const items = loadItems();
  itemsGrid.innerHTML = "";
  if (items.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No items yet. Add your first one above.";
    empty.className = "empty-state";
    itemsGrid.appendChild(empty);
    return;
  }

  items.forEach((item) => {
    const card = document.createElement("article");
    card.className = "item-card";
    card.dataset.id = item.id;

    const img = document.createElement("img");
    img.src = item.imageData;
    img.alt = item.name;

    const body = document.createElement("div");
    body.className = "item-card-body";

    const textWrap = document.createElement("div");
    const nameEl = document.createElement("p");
    nameEl.className = "item-name";
    nameEl.textContent = item.name;

    const dateEl = document.createElement("p");
    dateEl.className = "item-date";
    const date = new Date(item.createdAt);
    dateEl.textContent = date.toLocaleDateString();

    textWrap.appendChild(nameEl);
    textWrap.appendChild(dateEl);

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-btn";
    removeBtn.type = "button";
    removeBtn.innerHTML = "✕";
    removeBtn.title = "Remove item";
    removeBtn.addEventListener("click", () => removeItem(item.id));

    body.appendChild(textWrap);
    body.appendChild(removeBtn);

    card.appendChild(img);
    card.appendChild(body);

    itemsGrid.appendChild(card);
  });
}

function removeItem(id) {
  const items = loadItems().filter((i) => i.id !== id);
  saveItems(items);
  renderItems();
}

// ---------- File to base64 ----------
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ---------- Form submit ----------
itemForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = itemNameInput.value.trim();
  const file = itemImageInput.files[0];

  if (!name || !file) {
    alert("Please provide both a name and a picture.");
    return;
  }

  try {
    const imageData = await fileToBase64(file);
    const newItem = {
      id: Date.now().toString(),
      name,
      imageData,
      createdAt: new Date().toISOString(),
    };

    const items = loadItems();
    items.unshift(newItem);
    saveItems(items);
    renderItems();

    itemForm.reset();
    itemNameInput.focus();
  } catch (err) {
    console.error(err);
    alert("Could not read the image. Please try again.");
  }
});

// ---------- Clear all ----------
clearBtn.addEventListener("click", () => {
  if (!confirm("Clear all items? This cannot be undone.")) return;
  localStorage.removeItem(STORAGE_KEY_ITEMS);
  renderItems();
});

// ---------- Service worker registration ----------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("service-worker.js")
      .catch((err) => console.error("SW registration failed", err));
  });
}

// ---------- Init ----------
loadTheme();
renderItems();
