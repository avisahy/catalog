// IndexedDB + data logic + import/export + SHA-256 + tamper detection

const DB_NAME = "catalog_pwa_db";
const DB_VERSION = 1;
const STORE_ITEMS = "items";
const STORE_BACKUPS = "backups";

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_ITEMS)) {
        const store = db.createObjectStore(STORE_ITEMS, { keyPath: "id" });
        store.createIndex("name", "name", { unique: false });
        store.createIndex("location", "location", { unique: false });
        store.createIndex("favorite", "favorite", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_BACKUPS)) {
        db.createObjectStore(STORE_BACKUPS, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

/* ============================================================
   FIX 1 — Correct transaction helper
   Resolves with request.result instead of the IDBRequest object
   ============================================================ */

async function tx(storeName, mode, cb) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);

    let requestResult;

    const request = cb(store);

    // If cb returned an IDBRequest, capture its result
    if (request && typeof request.addEventListener === "function") {
      request.onsuccess = () => {
        requestResult = request.result;
      };
      request.onerror = () => {
        // transaction.onerror will handle rejection
      };
    } else {
      // cb returned a value (e.g., for writes)
      requestResult = request;
    }

    transaction.oncomplete = () => resolve(requestResult);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

// Hash utilities
async function sha256String(str) {
  const enc = new TextEncoder();
  const buf = enc.encode(str);
  const hashBuf = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(hashBuf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function calculateItemChecksum(item) {
  const content = JSON.stringify({
    name: item.name.trim().toLowerCase(),
    location: item.location.trim().toLowerCase(),
    imageData: item.imageData || "",
  });
  return sha256String(content);
}

// Item CRUD
async function addItem({ name, location, imageData }) {
  const id = crypto.randomUUID();
  const createdAt = Date.now();
  const normalizedName = name.trim();
  const normalizedLocation = location.trim();
  const item = {
    id,
    name: normalizedName,
    location: normalizedLocation,
    imageData: imageData || "",
    favorite: false,
    createdAt,
    updatedAt: createdAt,
  };
  item.checksum = await calculateItemChecksum(item);

  await tx(STORE_ITEMS, "readwrite", (store) => store.add(item));
  return item;
}

async function updateItem(id, updates) {
  const existing = await getItem(id);
  if (!existing) return null;
  const updated = { ...existing, ...updates, updatedAt: Date.now() };
  updated.checksum = await calculateItemChecksum(updated);
  await tx(STORE_ITEMS, "readwrite", (store) => store.put(updated));
  return updated;
}

async function getItem(id) {
  return tx(STORE_ITEMS, "readonly", (store) => store.get(id));
}

async function deleteItem(id) {
  const existing = await getItem(id);
  await tx(STORE_ITEMS, "readwrite", (store) => store.delete(id));
  return existing;
}

async function deleteAllItems() {
  await tx(STORE_ITEMS, "readwrite", (store) => store.clear());
}

async function getAllItems() {
  return tx(STORE_ITEMS, "readonly", (store) => store.getAll());
}

// Backup store
async function createBackup(items) {
  const id = crypto.randomUUID();
  const createdAt = Date.now();
  const backup = { id, createdAt, items };
  await tx(STORE_BACKUPS, "readwrite", (store) => store.add(backup));
  return backup;
}

async function getAllBackups() {
  return tx(STORE_BACKUPS, "readonly", (store) => store.getAll());
}

async function cleanupBackups(maxCount = 5) {
  const backups = await getAllBackups();
  backups.sort((a, b) => a.createdAt - b.createdAt);
  if (backups.length <= maxCount) return;
  const toDelete = backups.slice(0, backups.length - maxCount);
  await tx(STORE_BACKUPS, "readwrite", (store) => {
    toDelete.forEach((b) => store.delete(b.id));
  });
}

// Export
async function exportAllItems() {
  const items = await getAllItems();
  for (const item of items) {
    if (!item.checksum) {
      item.checksum = await calculateItemChecksum(item);
      await tx(STORE_ITEMS, "readwrite", (store) => store.put(item));
    }
  }
  const payload = {
    type: "catalog_export",
    version: 1,
    createdAt: new Date().toISOString(),
    items,
  };
  payload.metaChecksum = await sha256String(JSON.stringify(items));
  return payload;
}

async function exportSingleItem(id) {
  const item = await getItem(id);
  if (!item) return null;
  if (!item.checksum) {
    item.checksum = await calculateItemChecksum(item);
    await tx(STORE_ITEMS, "readwrite", (store) => store.put(item));
  }
  const payload = {
    type: "catalog_item_export",
    version: 1,
    createdAt: new Date().toISOString(),
    items: [item],
  };
  payload.metaChecksum = await sha256String(JSON.stringify(payload.items));
  return payload;
}

// Import + duplicate detection + tamper detection
function isDuplicate(existing, candidate) {
  if (!existing || !candidate) return false;
  const sameName =
    existing.name.trim().toLowerCase() ===
    candidate.name.trim().toLowerCase();
  const sameLocation =
    existing.location.trim().toLowerCase() ===
    candidate.location.trim().toLowerCase();
  const sameChecksum = existing.checksum === candidate.checksum;
  return sameName && sameLocation && !!existing.checksum && sameChecksum;
}

async function validateImportedPayload(payload) {
  const errors = [];
  if (!payload || typeof payload !== "object") {
    errors.push("Invalid JSON structure.");
    return { valid: false, errors, items: [] };
  }
  if (!Array.isArray(payload.items)) {
    errors.push("Missing items array.");
    return { valid: false, errors, items: [] };
  }
  const recomputedMeta = await sha256String(
    JSON.stringify(payload.items || [])
  );
  if (payload.metaChecksum && payload.metaChecksum !== recomputedMeta) {
    errors.push("Top-level checksum mismatch – file may be modified.");
  }

  const validItems = [];
  const invalidItems = [];

  for (const raw of payload.items) {
    const candidate = { ...raw };
    if (!candidate.name || !candidate.location) {
      invalidItems.push({ item: candidate, reason: "Missing name/location." });
      continue;
    }
    const expectedChecksum = await calculateItemChecksum(candidate);
    if (candidate.checksum && candidate.checksum !== expectedChecksum) {
      invalidItems.push({
        item: candidate,
        reason: "Item checksum mismatch – tampered or corrupted.",
      });
      continue;
    }
    candidate.id = candidate.id || crypto.randomUUID();
    candidate.checksum = expectedChecksum;
    candidate.createdAt = candidate.createdAt || Date.now();
    candidate.updatedAt = Date.now();
    validItems.push(candidate);
  }

  if (invalidItems.length > 0) {
    errors.push(`${invalidItems.length} items failed validation.`);
  }

  return {
    valid: validItems.length > 0,
    errors,
    items: validItems,
    invalidItems,
  };
}

async function importItems(payload, strategy, selectedIds = null) {
  const { valid, errors, items, invalidItems } =
    await validateImportedPayload(payload);
  if (!valid && !items.length) {
    return {
      imported: 0,
      skipped: invalidItems.length,
      replaced: 0,
      errors,
    };
  }

  const existingItems = await getAllItems();
  const result = {
    imported: 0,
    skipped: 0,
    replaced: 0,
    errors,
    invalidItems,
  };

  const selectedSet =
    selectedIds && Array.isArray(selectedIds)
      ? new Set(selectedIds)
      : null;

  if (strategy === "replaceAll") {
    await deleteAllItems();
  }

  await tx(STORE_ITEMS, "readwrite", (store) => {
    for (const item of items) {
      if (selectedSet && !selectedSet.has(item.id)) {
        result.skipped++;
        continue;
      }

      const dup = existingItems.find((e) => isDuplicate(e, item));
      if (!dup) {
        store.put(item);
        result.imported++;
        continue;
      }

      if (strategy === "keepExisting" || strategy === "skip") {
        result.skipped++;
      } else if (strategy === "keepImported") {
        store.put({ ...item, id: dup.id });
        result.replaced++;
      } else if (strategy === "replaceAll") {
        store.put(item);
        result.imported++;
      } else {
        result.skipped++;
      }
    }
  });

  const metaChecksum = await sha256String(JSON.stringify(items));
  return { ...result, metaChecksum };
}

// Expose to script.js
window.dbApi = {
  openDb,
  addItem,
  updateItem,
  getItem,
  deleteItem,
  deleteAllItems,
  getAllItems,
  createBackup,
  getAllBackups,
  cleanupBackups,
  exportAllItems,
  exportSingleItem,
  importItems,
};
