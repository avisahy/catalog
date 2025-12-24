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

/* CARD TILT */
document.querySelectorAll(".card").forEach(card => {
  card.addEventListener("mousemove", e => {
    const r = card.getBoundingClientRect();
    const x = e.clientX - r.left - r.width / 2;
    const y = e.clientY - r.top - r.height / 2;
    card.style.transform = `rotateX(${-(y / r.height) * 20}deg) rotateY(${(x / r.width) * 20}deg)`;
  });
  card.addEventListener("mouseleave", () => {
    card.style.transform = "rotateX(0deg) rotateY(0deg)";
  });
});

/* CAROUSEL — PERFECT CENTER */
const carousel = document.getElementById("carousel");
const items = carousel.children;
const total = items.length;
let angle = 0;
const step = 360 / total;
const depth = 350; // FIXED depth = no drift

function positionItems() {
  for (let i = 0; i < total; i++) {
    const rotate = step * i;
    items[i].style.transform = `rotateY(${rotate}deg) translateZ(${depth}px)`;
  }
}

positionItems();

/* ROTATION */
document.getElementById("next").onclick = () => {
  angle -= step;
  carousel.style.transform = `translate(-50%, -50%) rotateY(${angle}deg)`;
};

document.getElementById("prev").onclick = () => {
  angle += step;
  carousel.style.transform = `translate(-50%, -50%) rotateY(${angle}deg)`;
};
