window.onload = () => {
    router();

    document.getElementById("searchInput").oninput = renderHome;
    document.getElementById("categoryFilter").onchange = renderHome;

    document.getElementById("addBtn").onclick = () => {
        location.hash = "#add";
    };

    const categories = [...new Set(loadItems().map(i => i.category))];
    const filter = document.getElementById("categoryFilter");
    filter.innerHTML = `<option value="all">All</option>` +
        categories.map(c => `<option value="${c}">${c}</option>`).join("");

    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("service-worker.js");
    }
};
