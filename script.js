/* MODE SWITCHING */
const catalogUI = document.getElementById("catalogUI");
const carouselUI = document.getElementById("carouselUI");

document.getElementById("btnCatalog").onclick = () => {
  catalogUI.classList.remove("hidden");
  carouselUI.classList.add("hidden");
};

document.getElementById("btnCarousel").onclick = () => {
  carouselUI.classList.remove("hidden");
  catalogUI.classList.add("hidden");
};

/* FLIP CAROUSEL */
const items = [
  "Item 1", "Item 2", "Item 3", "Item 4", "Item 5",
  "Item 6", "Item 7", "Item 8", "Item 9"
];

let index = 0;
let flipping = false;

const flipInner = document.getElementById("flipInner");
const frontFace = document.getElementById("frontFace");
const backFace = document.getElementById("backFace");

function showItem(nextIndex, direction) {
  if (flipping) return;
  flipping = true;

  const nextItem = items[nextIndex];

  if (direction === "next") {
    backFace.textContent = nextItem;
    flipInner.style.transform = "rotateY(180deg)";
  } else {
    backFace.textContent = nextItem;
    flipInner.style.transform = "rotateY(-180deg)";
  }

  setTimeout(() => {
    frontFace.textContent = nextItem;
    flipInner.style.transform = "rotateY(0deg)";
    flipping = false;
  }, 800);
}

document.getElementById("next").onclick = () => {
  index = (index + 1) % items.length;
  showItem(index, "next");
};

document.getElementById("prev").onclick = () => {
  index = (index - 1 + items.length) % items.length;
  showItem(index, "prev");
};
