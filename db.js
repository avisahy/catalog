// db.js
// IndexedDB logic, import/export, duplicate detection, SHA-256, tamper detection

const DB_NAME = "catalog-db-v1";
const DB_VERSION = 1;
const STORE_ITEMS = "items";
const STORE_META = "meta";

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_ITEMS)) {
        const store = db.createObjectStore(STORE_ITEMS, { keyPath: "id" });
        store.createIndex("by_name", "name", { unique: false });
        store.createIndex("by_location", "location", { unique: false });
        store.createIndex("by_favorite", "favorite", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

/* Basic CRUD */

export async function addItem(item) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_ITEMS], "readwrite");
    tx.objectStore(STORE_ITEMS).add(item);
    tx.oncomplete = () => resolve(item);
    tx.onerror = () => reject(tx.error);
  });
}

export async function updateItem(item) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_ITEMS], "readwrite");
    tx.objectStore(STORE_ITEMS).put(item);
    tx.oncomplete = () => resolve(item);
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteItem(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_ITEMS], "readwrite");
    tx.objectStore(STORE_ITEMS).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearAllItems() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_ITEMS], "readwrite");
    tx.objectStore(STORE_ITEMS).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllItems() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_ITEMS], "readonly");
    const req = tx.objectStore(STORE_ITEMS).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function getItemById(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_ITEMS], "readonly");
    const req = tx.objectStore(STORE_ITEMS).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

/* Meta storage (for backup etc.) */

export async function setMeta(key, value) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_META], "readwrite");
    tx.objectStore(STORE_META).put({ key, value });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getMeta(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_META], "readonly");
    const req = tx.objectStore(STORE_META).get(key);
    req.onsuccess = () =>
      resolve(req.result ? req.result.value : undefined);
    req.onerror = () => reject(req.error);
  });
}

/* SHA-256 and checksum */

export async function sha256(data) {
  const enc = new TextEncoder();
  const bytes = enc.encode(data);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const arr = Array.from(new Uint8Array(digest));
  return arr.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* Export: whole DB or items */

export async function exportAllToJson() {
  const items = await getAllItems();
  const payload = {
    type: "catalog-export",
    version: 1,
    exportedAt: new Date().toISOString(),
    items,
  };
  const json = JSON.stringify(payload);
  const checksum = await sha256(json);
  return {
    ...payload,
    checksum,
  };
}

export async function exportItemsSubset(items) {
  const payload = {
    type: "catalog-export",
    version: 1,
    exportedAt: new Date().toISOString(),
    items,
  };
  const json = JSON.stringify(payload);
  const checksum = await sha256(json);
  return {
    ...payload,
    checksum,
  };
}

export async function exportSingleItem(id) {
  const item = await getItemById(id);
  if (!item) throw new Error("Item not found");
  const payload = {
    type: "catalog-item-export",
    version: 1,
    exportedAt: new Date().toISOString(),
    item,
  };
  const json = JSON.stringify(payload);
  const checksum = await sha256(json);
  return {
    ...payload,
    checksum,
  };
}

/* Download helper (JSON) */

export function triggerDownloadJson(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* Duplicate detection */

export function isDuplicate(existingItem, newItem) {
  if (!existingItem || !newItem) return false;
  const sameName =
    existingItem.name.trim().toLowerCase() ===
    newItem.name.trim().toLowerCase();
  const sameLocation =
    existingItem.location.trim().toLowerCase() ===
    newItem.location.trim().toLowerCase();
  const sameChecksum = existingItem.checksum === newItem.checksum;
  return sameName && sameLocation && sameChecksum;
}

/* Import with tamper detection and conflict handling */

export async function validateAndParseImport(fileContent) {
  let parsed;
  try {
    parsed = JSON.parse(fileContent);
  } catch (err) {
    return {
      ok: false,
      error: "Invalid JSON",
      tampered: true,
      items: [],
    };
  }

  // Basic structure checks
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !Array.isArray(parsed.items) ||
    !parsed.checksum
  ) {
    return {
      ok: false,
      error: "Missing fields",
      tampered: true,
      items: [],
    };
  }

  const originalChecksum = parsed.checksum;
  const clone = { ...parsed };
  delete clone.checksum;
  const jsonWithoutChecksum = JSON.stringify(clone);
  const computed = await sha256(jsonWithoutChecksum);

  const tampered = computed !== originalChecksum;

  // Validate each item structure
  const invalidItems = [];
  const validItems = [];
  for (const item of parsed.items) {
    if (
      !item.id ||
      !item.name ||
      !item.location ||
      !item.image ||
      !item.checksum
    ) {
      invalidItems.push(item);
    } else {
      validItems.push(item);
    }
  }

  return {
    ok: true,
    tampered,
    invalidItems,
    items: validItems,
  };
}

/**
 * Import items.
 * mode: "merge" | "replace" | "select"
 * selectedIds: array of item ids to import (used if mode === "select")
 * conflictHandler: async callback(existingItem, newItem) => "keep-existing" | "keep-imported" | "skip"
 */
export async function importItems({
  items,
  mode = "merge",
  selectedIds = null,
  conflictHandler,
}) {
  const allExisting = await getAllItems();
  const existingByKey = new Map();
  for (const it of allExisting) {
    const key = `${it.name.trim().toLowerCase()}|${it.location
      .trim()
      .toLowerCase()}|${it.checksum}`;
    existingByKey.set(key, it);
  }

  let importedCount = 0;
  let skippedCount = 0;
  let replacedCount = 0;

  const selectedSet =
    mode === "select" && Array.isArray(selectedIds)
      ? new Set(selectedIds)
      : null;

  const db = await openDb();
  const tx = db.transaction([STORE_ITEMS], "readwrite");
  const store = tx.objectStore(STORE_ITEMS);

  for (const newItem of items) {
    if (selectedSet && !selectedSet.has(newItem.id)) {
      skippedCount++;
      continue;
    }

    const key = `${newItem.name.trim().toLowerCase()}|${newItem.location
      .trim()
      .toLowerCase()}|${newItem.checksum}`;
    const existing = existingByKey.get(key);

    if (mode === "replace") {
      // Always overwrite items with same key
      if (existing) {
        await new Promise((resolve, reject) => {
          store.put(newItem).onsuccess = () => resolve();
          store.put(newItem).onerror = () => reject();
        });
        replacedCount++;
      } else {
        await new Promise((resolve, reject) => {
          store.add(newItem).onsuccess = () => resolve();
          store.add(newItem).onerror = () => reject();
        });
        importedCount++;
      }
      continue;
    }

    if (!existing) {
      await new Promise((resolve, reject) => {
        store.add(newItem).onsuccess = () => resolve();
        store.add(newItem).onerror = () => reject();
      });
      importedCount++;
      continue;
    }

    // Duplicate found
    if (!conflictHandler) {
      skippedCount++;
      continue;
    }

    const decision = await conflictHandler(existing, newItem);
    if (decision === "keep-existing") {
      skippedCount++;
    } else if (decision === "keep-imported") {
      await new Promise((resolve, reject) => {
        store.put(newItem).onsuccess = () => resolve();
        store.put(newItem).onerror = () => reject();
      });
      replacedCount++;
    } else {
      skippedCount++;
    }
  }

  return {
    imported: importedCount,
    skipped: skippedCount,
    replaced: replacedCount,
  };
}
