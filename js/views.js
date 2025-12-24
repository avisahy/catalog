function getImageSrc(item) {
    return item.imageData || "";
}

function renderHome() {
    const items = loadItems();
    const search = document.getElementById("searchInput").value.toLowerCase();

    const filtered = items.filter(i =>
        i.name.toLowerCase().includes(search)
    );

    const app = document.getElementById("app");

    if (filtered.length === 0) {
        app.innerHTML = `<div class="empty-state">No items found</div>`;
        return;
    }

    app.innerHTML = `
        <div class="grid">
            ${filtered.map(item => `
                <div class="card" onclick="location.hash='#item/${item.id}'">
                    <img src="${getImageSrc(item)}">
                    <h3>${item.name}</h3>
                </div>
            `).join("")}
        </div>
    `;
}

function renderItem(id) {
    const item = getItem(id);
    const app = document.getElementById("app");

    app.innerHTML = `
        <button class="btn btn-outline" onclick="history.back()">← Back</button>

        <div class="detail-card">
            <img src="${getImageSrc(item)}">
            <h2>${item.name}</h2>

            <div class="form-footer">
                <button class="btn btn-outline" onclick="confirmDelete(${item.id})">Delete</button>
                <button class="btn btn-primary" onclick="location.hash='#edit/${item.id}'">Edit</button>
            </div>
        </div>
    `;
}

function confirmDelete(id) {
    if (confirm("Delete this item?")) {
        deleteItem(id);
        location.hash = "#home";
    }
}

function renderForm(mode, id = null) {
    let item = { name: "", imageData: "" };

    if (mode === "edit") item = getItem(id);

    const app = document.getElementById("app");

    app.innerHTML = `
        <button class="btn btn-outline" onclick="history.back()">← Back</button>

        <div class="detail-card">
            <h2>${mode === "add" ? "Add Item" : "Edit Item"}</h2>

            <form id="itemForm">
                <input name="name" placeholder="Name" value="${item.name}" required>

                <div class="image-field">
                    <label class="image-upload-area" id="uploadArea">
                        <span id="uploadPlus" ${item.imageData ? 'style="display:none;"' : ''}>+</span>
                        <img id="imagePreview" class="image-preview" 
                             src="${item.imageData}" 
                             style="${item.imageData ? '' : 'display:none;'}">
                        <input name="imageFile" type="file" accept="image/*" style="display:none;">
                    </label>

                    <button type="button" id="removeImageBtn" class="btn btn-outline"
                        style="${item.imageData ? '' : 'display:none;'}">
                        Remove picture
                    </button>
                </div>

                <button type="submit" class="btn btn-primary">Save</button>
            </form>
        </div>
    `;

    const fileInput = document.querySelector("input[name='imageFile']");
    const preview = document.getElementById("imagePreview");
    const uploadPlus = document.getElementById("uploadPlus");
    const removeBtn = document.getElementById("removeImageBtn");
    const uploadArea = document.getElementById("uploadArea");

    let currentImageData = item.imageData || "";

    uploadArea.addEventListener("click", (e) => {
    e.preventDefault();      // stop double-trigger
    fileInput.click();       // open gallery once
    });


    fileInput.addEventListener("change", e => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = ev => {
            currentImageData = ev.target.result;
            preview.src = currentImageData;
            preview.style.display = "block";
            uploadPlus.style.display = "none";
            removeBtn.style.display = "block";
        };
        reader.readAsDataURL(file);
    });

    removeBtn.onclick = () => {
        currentImageData = "";
        preview.style.display = "none";
        uploadPlus.style.display = "block";
        removeBtn.style.display = "none";
    };

    document.getElementById("itemForm").onsubmit = e => {
        e.preventDefault();
        const form = new FormData(e.target);

        const newItem = {
            id: mode === "add" ? Date.now() : id,
            name: form.get("name"),
            imageData: currentImageData,
            createdAt: Date.now()
        };

        if (mode === "add") addItem(newItem);
        else updateItem(id, newItem);

        location.hash = "#home";
    };
}
