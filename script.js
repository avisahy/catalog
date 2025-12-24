/* -------------------------
   MODE SWITCHING WITH FADE
-------------------------- */
const catalogUI = document.getElementById("catalogUI");
const carouselUI = document.getElementById("carouselUI");

const btnCatalog = document.getElementById("btnCatalog");
const btnCarousel = document.getElementById("btnCarousel");

function showCatalog() {
  catalogUI.classList.remove("hidden");
  carouselUI.classList.add("hidden");

  btnCatalog.classList.add("active");
  btnCarousel.classList.remove("active");
}

function showCarousel() {
  carouselUI.classList.remove("hidden");
  catalogUI.classList.add("hidden");

  btnCarousel.classList.add("active");
  btnCatalog.classList.remove("active");
}

btnCatalog.onclick = showCatalog;
btnCarousel.onclick = showCarousel;

/* -------------------------
   3D CATALOG UI TILT
-------------------------- */
document.querySelectorAll(".card").forEach(card => {
  card.addEventListener("mousemove", e => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    const rotateX = (y / rect.height) * -20;
    const rotateY = (x / rect.width) * 20;

    card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  });

  card.addEventListener("mouseleave", () => {
    card.style.transform = "rotateX(0deg) rotateY(0deg)";
  });
});

/* -------------------------
   3D CAROUSEL — PERFECT CENTER FIX
-------------------------- */
const carousel = document.getElementById("carousel");
const items = carousel.children;
const total = items.length;

let angle = 0;
const step = 360 / total;

// Depth always matches wrapper size
function getDepth() {
  const wrapper = document.querySelector(".carousel-wrapper");
  return wrapper.offsetWidth * 0.9;
}

function positionItems() {
  const depth = getDepth();
  for (let i = 0; i < total; i++) {
    const rotate = step * i;
    items[i].style.transform = `rotateY(${rotate}deg) translateZ(${depth}px)`;
  }
}

positionItems();
window.addEventListener("resize", positionItems);

// Rotate carousel
document.getElementById("next").onclick = () => {
  angle -= step;
  carousel.style.transform = `rotateY(${angle}deg)`;
};

document.getElementById("prev").onclick = () => {
  angle += step;
  carousel.style.transform = `rotateY(${angle}deg)`;
};
