// Simple demo catalog data
const items = [
  {
    id: 1,
    title: "Minimalist Chair",
    description: "Clean lines, light frame, perfect for modern spaces.",
    price: "$89",
    image:
      "https://images.pexels.com/photos/116910/pexels-photo-116910.jpeg?auto=compress&w=640"
  },
  {
    id: 2,
    title: "Wooden Desk",
    description: "Solid wood desk for work, study, or creativity.",
    price: "$149",
    image:
      "https://images.pexels.com/photos/159839/desk-notebook-office-pen-159839.jpeg?auto=compress&w=640"
  },
  {
    id: 3,
    title: "Cozy Lamp",
    description: "Warm lighting to make any room feel calm.",
    price: "$39",
    image:
      "https://images.pexels.com/photos/1242348/pexels-photo-1242348.jpeg?auto=compress&w=640"
  },
  {
    id: 4,
    title: "Wall Art Print",
    description: "Abstract art print to add character to your walls.",
    price: "$29",
    image:
      "https://images.pexels.com/photos/276583/pexels-photo-276583.jpeg?auto=compress&w=640"
  }
];

const catalogEl = document.getElementById("catalog");
const template = document.getElementById("itemTemplate");
const searchInput = document.getElementById("searchInput");

function renderItems(list) {
  catalogEl.innerHTML = "";
  list.forEach((item) => {
    const node = template.content.cloneNode(true);

    const img = node.querySelector(".item-image");
    const title = node.querySelector(".item-title");
    const desc = node.querySelector(".item-description");
    const price = node.querySelector(".item-price");
    const btn = node.querySelector(".item-cta");

    img.src = item.image;
    img.alt = item.title;
    title.textContent = item.title;
    desc.textContent = item.description;
    price.textContent = item.price;
    btn.addEventListener("click", () => {
      alert(`You clicked on "${item.title}" (id: ${item.id})`);
    });

    catalogEl.appendChild(node);
  });
}

function filterItems(query) {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) => {
    return (
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q)
    );
  });
}

// Initial render
renderItems(items);

// Search
searchInput.addEventListener("input", (e) => {
  const filtered = filterItems(e.target.value);
  renderItems(filtered);
});

// PWA: register service worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./service-worker.js")
      .catch((err) => console.error("SW registration failed", err));
  });
}
