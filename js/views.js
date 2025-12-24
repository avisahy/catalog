// Helper: safely get image (fallback to placeholder)
function getImageSrc(item) {
    return item.imageData || item.imageUrl || "assets/placeholder.png";
}

function renderHome() {
    const items = loadItems();
    const search = document.getElementById("searchInput").value.toLowerCase();
    const filter = document.getElementById("categoryFilter").value;

    const filtered = items.filter(i =>
        i.name.toLowerCase().includes(search) &&
        (filter === "all" || i.category === filter)
    );

    const app = document.getElementById("app");

    if (filtered.length === 0) {
        app.innerHTML = `
            <div class="empty-state">
                <p>No items match your search.</p>
                <p>Try a different keyword or add a new item.</p>
            </div>
        `;
        return;
    }

    app.innerHTML = `<div class="grid">
        ${filtered.map(item => `
            <article class="card" onclick="location.hash='#item/${item.id}'">
                <img src="${getImageSrc(item)}" alt="${item.name}">
                <h3>${item.name}</h3>
                <p>${item.category}</p>
                <div class="price-row">
                    <span class="price">$${item.price}</span>
                    <span class="created">
                        ${new Date(item.createdAt).toLocaleDateString()}
                    </span>
                </div>
            </article>
        `).join("")}
    </div>`;
}

function renderItem(id) {
    const item = getItem(id);
    if (!item) {
        document.getElementById("app").innerHTML = `
            <div class="empty-state">
                <p>Item not found.</p>
                <button class="btn btn-primary" onclick="location.hash='#home'">
                    Back to list
                </button>
            </div>
        `;
        return;
    }

    const app = document.getElementById("app");

    app.innerHTML = `
        <div class="back-row">
            <button class="btn btn-outline" onclick="history.back()">← Back</button>
        </div>

        <section class="detail-card">
            <img src="${getImageSrc(item)}" alt="${item.name}">
            <h2>${item.name}</h2>
            <p style="color: var(--muted); margin-top: 4px;">
                ${item.category} • $${item.price}
            </p>
            <p style="margin-top: 10px;">${item.description || "No description"}</p>

            <div class="form-footer" style="margin-top: 16px;">
                <button class="btn btn-outline" onclick="confirmDelete(${item.id})">
                    Delete
                </button>
                <button class="btn btn-primary" onclick="location.hash='#edit/${item.id}'">
                    Edit
                </button>
            </div>
        </section>
    `;
}

function confirmDelete(id) {
    if (confirm("Delete this item? This cannot be undone.")) {
        deleteItem(id);
        location.hash = "#home";
    }
}

function renderForm(mode, id = null) {
    let item = {
        name: "",
        category: "",
        description: "",
        price: "",
        imageUrl: "",
        imageData: ""
    };

    if (mode === "edit") {
        const existing = getItem(id);
        if (existing) item = existing;
    }

    const app = document.getElementById("app");
    const hasImage = !!getImageSrc(item);

    app.innerHTML = `
        <div class="back-row">
            <button class="btn btn-outline" onclick="history.back()">← Back</button>
        </div>

        <section class="detail-card">
            <h2 style="margin-top: 0;">
                ${mode === "add" ? "Add item" : "Edit item"}
            </h2>

            <form id="itemForm">
                <div class="form-row">
                    <input name="name" placeholder="Name" value="${item.name}" required>
                    <input name="category" placeholder="Category" value="${item.category}" required>
                </div>

                <div class="form-row">
                    <input name="price" type="number" min="0" step="0.01"
                        placeholder="Price" value="${item.price}" required>
                </div>

                <textarea name="description" placeholder="Description">${item.description || ""}</textarea>

                <div class="image-field">
                    <label style="font-size: 0.85rem; color: var(--muted);">
                        Image (upload a picture)
                    </label>
                    <input name="imageFile" type="file" accept="image/*">
                    <img id="imagePreview" class="image-preview"
                         src="${hasImage ? getImageSrc(item) : "assets/placeholder.png"}"
                         alt="Preview">
                </div>

                <div class="form-footer">
                    <button type="button" class="btn btn-outline" onclick="history.back()">
                        Cancel
                    </button>
                    <button type="submit" class="btn btn-primary">
                        Save
                    </button>
                </div>
            </form>
        </section>
    `;

    const fileInput = document.querySelector("input[name='imageFile']");
    const preview = document.getElementById("imagePreview");
    let currentImageData = item.imageData || item.imageUrl || "";

    fileInput.addEventListener("change", e => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = ev => {
            currentImageData = ev.target.result; // base64
            preview.src = currentImageData;
        };
        reader.readAsDataURL(file);
    });

    document.getElementById("itemForm").onsubmit = e => {
        e.preventDefault();
        const form = new FormData(e.target);

        const name = form.get("name").trim();
        const category = form.get("category").trim();
        const price = Number(form.get("price"));
        const description = form.get("description").trim();

        if (!name || !category || isNaN(price) || price < 0) {
            alert("Please fill all required fields with valid values.");
            return;
        }

        const newItem = {
            id: mode === "add" ? Date.now() : id,
            name,
            category,
            description,
            price,
            imageUrl: "",        // no longer used for new items
            imageData: currentImageData || "assets/placeholder.png",
            createdAt: mode === "add" ? Date.now() : (item.createdAt || Date.now())
        };

        if (mode === "add") addItem(newItem);
        else updateItem(id, newItem);

        location.hash = "#home";
    };
}
