// db.js

const DB_NAME = "catalog_db";
const DB_VERSION = 1;
const STORE_ITEMS = "items";
const STORE_BACKUPS = "backups";

// Open DB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_ITEMS)) {
        const store = db.createObjectStore(STORE_ITEMS, { keyPath: "id" });
        store.createIndex("favorite", "favorite", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
        store.createIndex("checksum", "checksum", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_BACKUPS)) {
        db.createObjectStore(STORE_BACKUPS, { keyPath: "createdAt" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// SHA-256 helper
async function sha256(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Convert image file to data URL
function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// Core item operations
async function dbAddItem({ name, location, imageDataUrl }) {
  const db = await openDB();
  const id = crypto.randomUUID();
  const payloadForChecksum = JSON.stringify({ name, location, imageDataUrl });
  const checksum = await sha256(payloadForChecksum);
  const now = Date.now();

  const item = {
    id,
    name,
    location,
    imageDataUrl,
    favorite: false,
    createdAt: now,
    updatedAt: now,
    checksum,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ITEMS, "readwrite");
    const store = tx.objectStore(STORE_ITEMS);
    store.add(item);
    tx.oncomplete = () => resolve(item);
    tx.onerror = () => reject(tx.error);
  });
}

async function dbUpdateItem(id, updates) {
  const db = await openDB();
  const tx = db.transaction(STORE_ITEMS, "readwrite");
  const store = tx.objectStore(STORE_ITEMS);

  const item = await new Promise((resolve, reject) => {
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  if (!item) return null;

  const updated = { ...item, ...updates, updatedAt: Date.now() };
  return new Promise((resolve, reject) => {
    const req = store.put(updated);
    req.onsuccess = () => resolve(updated);
    req.onerror = () => reject(req.error);
  });
}

async function dbDeleteItem(id) {
  const db = await openDB();
  const tx = db.transaction(STORE_ITEMS, "readwrite");
  const store = tx.objectStore(STORE_ITEMS);
  return new Promise((resolve, reject) => {
    const reqGet = store.get(id);
    reqGet.onsuccess = () => {
      const existing = reqGet.result;
      const reqDel = store.delete(id);
      reqDel.onsuccess = () => resolve(existing || null);
      reqDel.onerror = () => reject(reqDel.error);
    };
    reqGet.onerror = () => reject(reqGet.error);
  });
}

async function dbGetAllItems() {
  const db = await openDB();
  const tx = db.transaction(STORE_ITEMS, "readonly");
  const store = tx.objectStore(STORE_ITEMS);
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => {
      const items = req.result || [];
      items.sort((a, b) => b.createdAt - a.createdAt);
      resolve(items);
    };
    req.onerror = () => reject(req.error);
  });
}

async function dbDeleteAllItems() {
  const db = await openDB();
  const tx = db.transaction(STORE_ITEMS, "readwrite");
  const store = tx.objectStore(STORE_ITEMS);
  return new Promise((resolve, reject) => {
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// EXPORTS
async function dbExportAll() {
  const items = await dbGetAllItems();
  const payload = {
    version: 1,
    type: "catalog_export",
    exportedAt: Date.now(),
    items,
  };
  const serialized = JSON.stringify(payload);
  const checksum = await sha256(serialized);
  return {
    payload,
    serialized,
    checksum,
    wrapper: {
      fileType: "catalog_export_v1",
      checksum,
      payload,
    },
  };
}

async function dbExportItemsByIds(ids) {
  const all = await dbGetAllItems();
  const items = all.filter((i) => ids.includes(i.id));
  const payload = {
    version: 1,
    type: "catalog_items_export",
    exportedAt: Date.now(),
    items,
  };
  const serialized = JSON.stringify(payload);
  const checksum = await sha256(serialized);
  return {
    payload,
    serialized,
    checksum,
    wrapper: {
      fileType: "catalog_items_export_v1",
      checksum,
      payload,
    },
  };
}

async function dbExportSingleItem(id) {
  const db = await openDB();
  const tx = db.transaction(STORE_ITEMS, "readonly");
  const store = tx.objectStore(STORE_ITEMS);
  const item = await new Promise((resolve, reject) => {
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  if (!item) throw new Error("Item not found");
  const payload = {
    version: 1,
    type: "catalog_single_item",
    exportedAt: Date.now(),
    item,
  };
  const serialized = JSON.stringify(payload);
  const checksum = await sha256(serialized);
  return {
    payload,
    serialized,
    checksum,
    wrapper: {
      fileType: "catalog_single_item_v1",
      checksum,
      payload,
    },
  };
}

// IMPORT & TAMPER DETECTION
async function dbImportFromJson(
  jsonText,
  {
    mode, // "merge" | "replace" | "select"
    selectedIds = null,
    onConflict, // async (existing, incoming) => "keep_existing" | "keep_imported" | "skip"
  }
) {
  const errors = [];
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    throw new Error("Invalid JSON file");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid export structure");
  }
  if (!parsed.payload || !parsed.checksum) {
    throw new Error("Missing wrapper or checksum");
  }

  const payloadString = JSON.stringify(parsed.payload);
  const actualChecksum = await sha256(payloadString);
  if (actualChecksum !== parsed.checksum) {
    throw new Error("File appears tampered or corrupted (checksum mismatch)");
  }

  const { payload } = parsed;

  if (!payload.items || !Array.isArray(payload.items)) {
    throw new Error("No items array in payload");
  }

  // Basic per-item validation & tamper check for each
  const validItems = [];
  for (const item of payload.items) {
    if (
      !item.id ||
      !item.name ||
      !item.location ||
      !item.imageDataUrl ||
      !item.checksum
    ) {
      errors.push({
        id: item.id || "(unknown)",
        error: "Missing required fields",
      });
      continue;
    }
    const itemPayload = JSON.stringify({
      name: item.name,
      location: item.location,
      imageDataUrl: item.imageDataUrl,
    });
    const computed = await sha256(itemPayload);
    if (computed !== item.checksum) {
      errors.push({
        id: item.id,
        error: "Item checksum mismatch (tampered item)",
      });
      continue;
    }
    validItems.push(item);
  }

  const db = await openDB();
  const tx = db.transaction(STORE_ITEMS, "readwrite");
  const store = tx.objectStore(STORE_ITEMS);

  let existingItems = await new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });

  if (mode === "replace") {
    await new Promise((resolve, reject) => {
      const reqClear = store.clear();
      reqClear.onsuccess = () => resolve();
      reqClear.onerror = () => reject(reqClear.error);
    });
    existingItems = [];
  }

  const importedItems =
    mode === "select" && Array.isArray(selectedIds)
      ? validItems.filter((i) => selectedIds.includes(i.id))
      : validItems;

  let importedCount = 0;
  let skippedCount = 0;
  let replacedCount = 0;

  for (const item of importedItems) {
    const duplicate = existingItems.find(
      (e) =>
        e.name.toLowerCase() === item.name.toLowerCase() &&
        e.location.toLowerCase() === item.location.toLowerCase() &&
        e.checksum === item.checksum
    );

    if (duplicate) {
      const resolution = await onConflict(duplicate, item);
      if (resolution === "skip") {
        skippedCount++;
        continue;
      }
      if (resolution === "keep_existing") {
        skippedCount++;
        continue;
      }
      if (resolution === "keep_imported") {
        // Replace existing
        item.id = duplicate.id;
        await new Promise((resolve, reject) => {
          const req = store.put(item);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
        replacedCount++;
        continue;
      }
    } else {
      // New item, ensure id uniqueness
      if (!item.id) item.id = crypto.randomUUID();
      await new Promise((resolve, reject) => {
        const req = store.put(item);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
      importedCount++;
    }
  }

  return {
    importedCount,
    skippedCount,
    replacedCount,
    errorItems: errors,
  };
}

// BACKUPS
async function dbCreateBackup() {
  const { wrapper } = await dbExportAll();
  const db = await openDB();
  const tx = db.transaction(STORE_BACKUPS, "readwrite");
  const store = tx.objectStore(STORE_BACKUPS);
  return new Promise((resolve, reject) => {
    const record = {
      createdAt: Date.now(),
      data: wrapper,
    };
    const req = store.add(record);
    req.onsuccess = () => resolve(record);
    req.onerror = () => reject(req.error);
  });
}

async function dbGetBackups() {
  const db = await openDB();
  const tx = db.transaction(STORE_BACKUPS, "readonly");
  const store = tx.objectStore(STORE_BACKUPS);
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => {
      const backups = req.result || [];
      backups.sort((a, b) => a.createdAt - b.createdAt);
      resolve(backups);
    };
    req.onerror = () => reject(req.error);
  });
}

async function dbPruneBackups(keepMax = 5) {
  const backups = await dbGetBackups();
  if (backups.length <= keepMax) return;
  const db = await openDB();
  const tx = db.transaction(STORE_BACKUPS, "readwrite");
  const store = tx.objectStore(STORE_BACKUPS);
  const toDelete = backups.slice(0, backups.length - keepMax);
  await Promise.all(
    toDelete.map(
      (b) =>
        new Promise((resolve, reject) => {
          const req = store.delete(b.createdAt);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        })
    )
  );
}

window.CatalogDB = {
  fileToDataURL,
  sha256,
  addItem: dbAddItem,
  updateItem: dbUpdateItem,
  deleteItem: dbDeleteItem,
  deleteAll: dbDeleteAllItems,
  getAll: dbGetAllItems,
  exportAll: dbExportAll,
  exportItemsByIds: dbExportItemsByIds,
  exportSingle: dbExportSingleItem,
  importFromJson: dbImportFromJson,
  createBackup: dbCreateBackup,
  getBackups: dbGetBackups,
  pruneBackups: dbPruneBackups,
};
