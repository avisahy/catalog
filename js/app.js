function applyTheme(theme) {
    if (theme === "dark") {
        document.body.classList.add("dark");
    } else {
        document.body.classList.remove("dark");
    }
}

window.onload = () => {
    // Theme
    const savedTheme = localStorage.getItem("catalog_theme") || "dark";
    applyTheme(savedTheme);

    const themeToggle = document.getElementById("themeToggle");
    themeToggle.textContent = savedTheme === "dark" ? "☀️" : "🌙";

    themeToggle.onclick = () => {
        const current = document.body.classList.contains("dark") ? "dark" : "light";
        const next = current === "dark" ? "light" : "dark";
        localStorage.setItem("catalog_theme", next);
        applyTheme(next);
        themeToggle.textContent = next === "dark" ? "☀️" : "🌙";
    };

    // Filters
    document.getElementById("searchInput").oninput = renderHome;
    document.getElementById("categoryFilter").onchange = renderHome;

    // FAB
    document.getElementById("addBtn").onclick = () => {
        location.hash = "#add";
    };

    // Populate categories
    const items = loadItems();
    const categories = [...new Set(items.map(i => i.category))].filter(Boolean);
    const filter = document.getElementById("categoryFilter");
    filter.innerHTML = `<option value="all">All</option>` +
        categories.map(c => `<option value="${c}">${c}</option>`).join("");

    // Router
    router();

    // Service worker
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("service-worker.js");
    }
};
