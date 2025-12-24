const carousel = document.getElementById("carousel");
const items = carousel.children;
const total = items.length;

let angle = 0;
const step = 360 / total;

// Position items in a circle
for (let i = 0; i < total; i++) {
  const rotate = step * i;
  items[i].style.transform = `rotateY(${rotate}deg) translateZ(300px)`;
}

// Rotate carousel
document.getElementById("next").onclick = () => {
  angle -= step;
  carousel.style.transform = `rotateY(${angle}deg)`;
};

document.getElementById("prev").onclick = () => {
  angle += step;
  carousel.style.transform = `rotateY(${angle}deg)`;
};
