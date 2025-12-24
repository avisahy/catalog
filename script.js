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

/* FLIP CAROUSEL */
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
