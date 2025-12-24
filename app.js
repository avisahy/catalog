let items = [];
const catalogEl = document.getElementById("catalog");
const template = document.getElementById("itemTemplate");
const searchInput = document.getElementById("searchInput");

/* ---------------------------
   LOAD DATABASE + LOCAL ITEMS
---------------------------- */
async function loadItems() {
  const db = await fetch("database.json").then(r => r.json());
  const local = JSON.parse(localStorage.getItem("items") || "[]");
  items = [...db, ...local];
  renderItems(items);
}

/* ---------------------------
   RENDER ITEMS
---------------------------- */
function renderItems(list) {
  catalogEl.innerHTML = "";
  list.forEach(item => {
    const node = template.content.cloneNode(true);
    const img = node.querySelector(".item-image");

    img.src = item.image;
    img.alt = item.title;

    img.addEventListener("click", () => openModal(item));

    catalogEl.appendChild(node);
  });
}

/* ---------------------------
   SEARCH
---------------------------- */
searchInput.addEventListener("input", e => {
  const q = e.target.value.toLowerCase();
  const filtered = items.filter(i =>
    i.title.toLowerCase().includes(q) ||
    i.description.toLowerCase().includes(q)
  );
  renderItems(filtered);
});

/* ---------------------------
   ITEM DETAILS MODAL
---------------------------- */
const modal = document.getElementById("modal");
const modalImage = document.getElementById("modalImage");
const modalTitle = document.getElementById("modalTitle");
const modalDescription = document.getElementById("modalDescription");
const modalClose = document.getElementById("modalClose");

function openModal(item) {
  modalImage.src = item.image;
  modalTitle.textContent = item.title;
  modalDescription.textContent = item.description;
  modal.classList.remove("hidden");
}

modalClose.onclick = () => modal.classList.add("hidden");
modal.onclick = e => { if (e.target === modal) modal.classList.add("hidden") };

/* ---------------------------
   DARK / LIGHT MODE
---------------------------- */
const themeToggle = document.getElementById("themeToggle");

function applyTheme() {
  const mode = localStorage.getItem("theme") || "light";
  document.body.classList.toggle("dark", mode === "dark");
  themeToggle.textContent = mode === "dark" ? "☀️" : "🌙";
}

themeToggle.onclick = () => {
  const mode = document.body.classList.contains("dark") ? "light" : "dark";
  localStorage.setItem("theme", mode);
  applyTheme();
};

applyTheme();

/* ---------------------------
   ADD ITEM MODAL
---------------------------- */
const addButton = document.getElementById("addButton");
const addModal = document.getElementById("addModal");
const addClose = document.getElementById("addClose");

addButton.onclick = () => addModal.classList.remove("hidden");
addClose.onclick = () => addModal.classList.add("hidden");
addModal.onclick = e => { if (e.target === addModal) addModal.classList.add("hidden") };

/* ---------------------------
   IMAGE PICKER + PREVIEW
---------------------------- */
const pickImage = document.getElementById("pickImage");
const newImage = document.getElementById("newImage");
const previewImage = document.getElementById("previewImage");

pickImage.onclick = () => newImage.click();

newImage.onchange = () => {
  const file = newImage.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    previewImage.src = reader.result;
    previewImage.classList.remove("hidden");
  };
  reader.readAsDataURL(file);
};

/* ---------------------------
   SAVE NEW ITEM
---------------------------- */
document.getElementById("saveItem").onclick = () => {
  const title = document.getElementById("newTitle").value.trim();
  const description = document.getElementById("newDescription").value.trim();
  const file = newImage.files[0];

  if (!title || !description || !file) {
    alert("Please fill all fields");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const newItem = {
      id: Date.now(),
      title,
      description,
      image: reader.result
    };

    const local = JSON.parse(localStorage.getItem("items") || "[]");
    local.push(newItem);
    localStorage.setItem("items", JSON.stringify(local));

    addModal.classList.add("hidden");
    loadItems();
  };

  reader.readAsDataURL(file);
};

/* ---------------------------
   INIT
---------------------------- */
loadItems();
