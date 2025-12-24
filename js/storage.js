const STORAGE_KEY = "catalog_items";

function loadItems() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE_ITEMS));
        return SAMPLE_ITEMS;
    }
    return JSON.parse(data);
}

function saveItems(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function getItem(id) {
    return loadItems().find(i => i.id == id);
}

function addItem(item) {
    const items = loadItems();
    items.push(item);
    saveItems(items);
}

function updateItem(id, updated) {
    const items = loadItems().map(i => i.id == id ? updated : i);
    saveItems(items);
}

function deleteItem(id) {
    const items = loadItems().filter(i => i.id != id);
    saveItems(items);
}
