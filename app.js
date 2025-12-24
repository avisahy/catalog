// Demo catalog data
const items = [
  {
    id: 1,
    title: "Minimalist Chair",
    description: "Clean lines, light frame, perfect for modern spaces.",
    price: "$89",
    image: "https://images.pexels.com/photos/116910/pexels-photo-116910.jpeg?auto=compress&w=640"
  },
  {
    id: 2,
    title: "Wooden Desk",
    description: "Solid wood desk for work, study, or creativity.",
    price: "$149",
    image: "https://images.pexels.com/photos/159839/desk-notebook-office-pen-159839.jpeg?auto=compress&w=640"
  },
  {
    id: 3,
    title: "Cozy Lamp",
    description: "Warm lighting to make any room feel calm.",
    price: "$39",
    image: "https://images.pexels.com/photos/1242348/pexels-photo-1242348.jpeg?auto=compress&w=640"
  },
  {
    id: 4,
    title: "Wall Art Print",
    description: "Abstract art print to add character to your walls.",
    price: "$29",
    image: "https://images.pexels.com/photos/276583/pexels-photo-276583.jpeg?auto=compress&w=640"
  }
];

const catalogEl = document.getElementById("catalog");
const template = document.getElementById("itemTemplate");
const searchInput = document.getElementById("searchInput");

// Render items
function renderItems(list) {
  catalogEl.innerHTML = "";
  list.forEach((item) => {
    const node = template.content.cloneNode(true);
    const img = node.querySelector(".item-image");

    img.src = item.image;
    img.alt = item.title;

    // Remove body (image-only cards)
    node.querySelector(".item-body").remove();

    img.addEventListener("click", () => openModal(item));

    catalogEl.appendChild(node);
  });
}

// Search filter
function filterItems(query) {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) =>
    item.title.toLowerCase().includes(q) ||
    item.description.toLowerCase().includes(q)
  );
}

searchInput.addEventListener("input", (e) => {
  renderItems(filterItems(e.target.value));
});

// Modal logic
const modal = document.getElementById("modal");
const modalImage = document.getElementById("modalImage");
const modalTitle = document.getElementById("modalTitle");
const modalDescription = document.getElementById("modalDescription");
const modalPrice = document.getElementById("modalPrice");
const modalClose = document.getElementById("modalClose");

function openModal(item) {
  modalImage.src = item.image;
  modalTitle.textContent = item.title;
  modalDescription.textContent = item.description;
  modalPrice.textContent = item.price;
  modal.classList.remove("hidden");
}

modalClose.addEventListener("click", () => modal.classList.add("hidden"));
modal.addEventListener("click", (e) => {
  if (e.target === modal) modal.classList.add("hidden");
});

// Initial render
renderItems(items);
