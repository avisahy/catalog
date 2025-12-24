/* MODE SWITCHING */
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
   ITEM PREVIEW POPUP
-------------------------- */
const popup = document.getElementById("previewPopup");
const previewTitle = document.getElementById("previewTitle");
const editBtn = document.getElementById("editBtn");
const deleteBtn = document.getElementById("deleteBtn");
const closePopup = document.getElementById("closePopup");

let selectedCard = null;

// Open popup when clicking a card
document.querySelectorAll(".card").forEach(card => {
  card.addEventListener("click", () => {
    selectedCard = card;
    const title = card.querySelector("h2").textContent;
    previewTitle.textContent = title;
    popup.classList.remove("hidden");
  });
});

// Close popup
closePopup.onclick = () => {
  popup.classList.add("hidden");
};

// Delete item
deleteBtn.onclick = () => {
  if (selectedCard) {
    selectedCard.remove();
    popup.classList.add("hidden");
  }
};

// Edit item
editBtn.onclick = () => {
  if (selectedCard) {
    const title = selectedCard.querySelector("h2").textContent;
    alert("Editing: " + title);
    popup.classList.add("hidden");
  }
};

/* -------------------------
   3D FLIP CAROUSEL
-------------------------- */
const items = [
  "Item 1","Item 2","Item 3","Item 4","Item 5",
  "Item 6","Item 7","Item 8","Item 9"
];

let index = 0;
let flipping = false;

const flipInner = document.getElementById("flipInner");
const frontFace = document.getElementById("frontFace");
const backFace = document.getElementById("backFace");

function flipTo(nextIndex, direction) {
  if (flipping) return;
  flipping = true;

  const nextItem = items[nextIndex];
  backFace.textContent = nextItem;

  flipInner.style.transform = direction === "next"
    ? "rotateY(180deg)"
    : "rotateY(-180deg)";

  setTimeout(() => {
    frontFace.textContent = nextItem;
    flipInner.style.transform = "rotateY(0deg)";
    flipping = false;
  }, 600);
}

document.getElementById("next").onclick = () => {
  index = (index + 1) % items.length;
  flipTo(index, "next");
};

document.getElementById("prev").onclick = () => {
  index = (index - 1 + items.length) % items.length;
  flipTo(index, "prev");
};
