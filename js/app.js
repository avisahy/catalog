function applyTheme(theme) {
    if (theme === "dark") document.body.classList.add("dark");
    else document.body.classList.remove("dark");
}

window.onload = () => {
    const savedTheme = localStorage.getItem("catalog_theme") || "dark";
    applyTheme(savedTheme);

    const themeToggle = document.getElementById("themeToggle");
    themeToggle.textContent = savedTheme === "dark" ? "☀️" : "🌙";

    themeToggle.onclick = () => {
        const next = document.body.classList.contains("dark") ? "light" : "dark";
        localStorage.setItem("catalog_theme", next);
        applyTheme(next);
        themeToggle.textContent = next === "dark" ? "☀️" : "🌙";
    };

    document.getElementById("searchInput").oninput = renderHome;

    document.getElementById("addBtn").onclick = () => {
        location.hash = "#add";
    };

    router();

    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("service-worker.js");
    }
};
