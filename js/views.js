function renderHome() {
    const items = loadItems();
    const search = document.getElementById("searchInput").value.toLowerCase();
    const filter = document.getElementById("categoryFilter").value;

    const filtered = items.filter(i =>
        i.name.toLowerCase().includes(search) &&
        (filter === "all" || i.category === filter)
    );

    const app = document.getElementById("app");
    app.innerHTML = `<div class="grid">
        ${filtered.map(item => `
            <div class="card" onclick="location.hash='#item/${item.id}'">
                <img src="${item.imageUrl}">
                <h3>${item.name}</h3>
                <p>${item.category}</p>
                <strong>$${item.price}</strong>
            </div>
        `).join("")}
    </div>`;
}

function renderItem(id) {
    const item = getItem(id);
    const app = document.getElementById("app");

    app.innerHTML = `
        <button onclick="history.back()">Back</button>
        <h2>${item.name}</h2>
        <img src="${item.imageUrl}" style="width:100%;border-radius:8px;">
        <p>${item.description}</p>
        <p><strong>Category:</strong> ${item.category}</p>
        <p><strong>Price:</strong> $${item.price}</p>

        <button onclick="location.hash='#edit/${item.id}'">Edit</button>
        <button onclick="confirmDelete(${item.id})">Delete</button>
    `;
}

function confirmDelete(id) {
    if (confirm("Delete this item?")) {
        deleteItem(id);
        location.hash = "#home";
    }
}

function renderForm(mode, id = null) {
    let item = { name:"", category:"", description:"", price:"", imageUrl:"" };

    if (mode === "edit") item = getItem(id);

    const app = document.getElementById("app");
    app.innerHTML = `
        <button onclick="history.back()">Back</button>
        <h2>${mode === "add" ? "Add Item" : "Edit Item"}</h2>

        <form id="itemForm">
            <input name="name" placeholder="Name" value="${item.name}" required>
            <input name="category" placeholder="Category" value="${item.category}" required>
            <textarea name="description" placeholder="Description">${item.description}</textarea>
            <input name="price" type="number" placeholder="Price" value="${item.price}" required>
            <input name="imageUrl" placeholder="Image URL" value="${item.imageUrl}">
            <button type="submit">Save</button>
        </form>
    `;

    document.getElementById("itemForm").onsubmit = e => {
        e.preventDefault();
        const form = new FormData(e.target);

        const newItem = {
            id: mode === "add" ? Date.now() : id,
            name: form.get("name"),
            category: form.get("category"),
            description: form.get("description"),
            price: Number(form.get("price")),
            imageUrl: form.get("imageUrl") || "assets/placeholder.png",
            createdAt: Date.now()
        };

        if (mode === "add") addItem(newItem);
        else updateItem(id, newItem);

        location.hash = "#home";
    };
}
