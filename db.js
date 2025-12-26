// db.js
// IndexedDB logic, import/export, SHA-256, tamper detection, backups

const DB_NAME = 'catalog-db';
const DB_VERSION = 1;
const STORE_ITEMS = 'items';
const STORE_META = 'meta';

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORE_ITEMS)) {
        const itemStore = db.createObjectStore(STORE_ITEMS, { keyPath: 'id' });
        itemStore.createIndex('by_favorite', 'favorite', { unique: false });
        itemStore.createIndex('by_createdAt', 'createdAt', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

// CRUD

async function dbAddItem(item) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_ITEMS], 'readwrite');
    tx.objectStore(STORE_ITEMS).add(item);
    tx.oncomplete = () => resolve(item);
    tx.onerror = () => reject(tx.error);
  });
}

async function dbUpdateItem(item) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_ITEMS], 'readwrite');
    tx.objectStore(STORE_ITEMS).put(item);
    tx.oncomplete = () => resolve(item);
    tx.onerror = () => reject(tx.error);
  });
}

async function dbDeleteItem(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_ITEMS], 'readwrite');
    tx.objectStore(STORE_ITEMS).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function dbGetItem(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_ITEMS], 'readonly');
    const req = tx.objectStore(STORE_ITEMS).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function dbGetAllItems() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_ITEMS], 'readonly');
    const req = tx.objectStore(STORE_ITEMS).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function dbClearAll() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_ITEMS, STORE_META], 'readwrite');
    tx.objectStore(STORE_ITEMS).clear();
    tx.objectStore(STORE_META).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Meta store helpers

async function dbSetMeta(key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_META], 'readwrite');
    tx.objectStore(STORE_META).put({ key, value });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function dbGetMeta(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_META], 'readonly');
    const req = tx.objectStore(STORE_META).get(key);
    req.onsuccess = () => resolve(req.result ? req.result.value : null);
    req.onerror = () => reject(req.error);
  });
}

// SHA-256

async function sha256(data) {
  const enc = new TextEncoder();
  const bytes = enc.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Item helpers

async function createItem({ name, location, imageDataUrl }) {
  const id = crypto.randomUUID();
  const payloadForHash = JSON.stringify({ name: name.trim().toLowerCase(), location: location.trim().toLowerCase(), imageDataUrl });
  const checksum = await sha256(payloadForHash);

  const item = {
    id,
    name: name.trim(),
    location: location.trim(),
    imageDataUrl: imageDataUrl || null,
    favorite: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    checksum,
  };

  await dbAddItem(item);
  return item;
}

async function updateItem(id, changes) {
  const existing = await dbGetItem(id);
  if (!existing) throw new Error('Item not found');

  const updated = { ...existing, ...changes, updatedAt: Date.now() };

  const payloadForHash = JSON.stringify({
    name: updated.name.trim().toLowerCase(),
    location: updated.location.trim().toLowerCase(),
    imageDataUrl: updated.imageDataUrl,
  });
  updated.checksum = await sha256(payloadForHash);

  await dbUpdateItem(updated);
  return updated;
}

// Export

async function exportAllItems() {
  const items = await dbGetAllItems();
  const exportObj = {
    version: 1,
    exportedAt: new Date().toISOString(),
    items,
  };
  const jsonStr = JSON.stringify(exportObj, null, 2);
  const fileChecksum = await sha256(jsonStr);
  return {
    json: jsonStr,
    checksum: fileChecksum,
  };
}

async function exportItems(items) {
  const exportObj = {
    version: 1,
    exportedAt: new Date().toISOString(),
    items,
  };
  const jsonStr = JSON.stringify(exportObj, null, 2);
  const fileChecksum = await sha256(jsonStr);
  return {
    json: jsonStr,
    checksum: fileChecksum,
  };
}

async function exportSingleItem(id) {
  const item = await dbGetItem(id);
  if (!item) throw new Error('Item not found');
  const result = await exportItems([item]);
  return result;
}

// Import & validation

function isDuplicateItem(existing, incoming) {
  const sameName = (existing.name || '').trim().toLowerCase() === (incoming.name || '').trim().toLowerCase();
  const sameLocation = (existing.location || '').trim().toLowerCase() === (incoming.location || '').trim().toLowerCase();
  const sameChecksum = existing.checksum === incoming.checksum;
  return sameName && sameLocation && sameChecksum;
}

async function validateImportJson(jsonStr) {
  let parsed;
  const fileChecksum = await sha256(jsonStr);

  try {
    parsed = JSON.parse(jsonStr);
  } catch (err) {
    return {
      valid: false,
      fileChecksum,
      reason: 'Invalid JSON syntax',
      items: [],
      itemErrors: [],
    };
  }

  const items = Array.isArray(parsed.items) ? parsed.items : [];
  const itemErrors = [];

  const validatedItems = [];
  for (const raw of items) {
    if (!raw.id || !raw.name || !raw.location || !raw.checksum) {
      itemErrors.push({ id: raw.id || null, reason: 'Missing required fields' });
      continue;
    }

    const payloadForHash = JSON.stringify({
      name: (raw.name || '').trim().toLowerCase(),
      location: (raw.location || '').trim().toLowerCase(),
      imageDataUrl: raw.imageDataUrl || null,
    });
    const expectedChecksum = await sha256(payloadForHash);
    if (expectedChecksum !== raw.checksum) {
      itemErrors.push({ id: raw.id, reason: 'Checksum mismatch (tampered or corrupted)' });
      continue;
    }

    validatedItems.push(raw);
  }

  const valid = itemErrors.length === 0;

  return {
    valid,
    fileChecksum,
    items: validatedItems,
    itemErrors,
  };
}

async function importItems({ items, mode, selectionIds, conflictStrategy }) {
  // conflictStrategy: 'keep-existing' | 'keep-imported' | 'skip' (applied for duplicates)
  const existingItems = await dbGetAllItems();
  const existingById = new Map(existingItems.map((i) => [i.id, i]));
  const toImport = selectionIds ? items.filter((it) => selectionIds.includes(it.id)) : items;

  let imported = 0;
  let skipped = 0;
  let replaced = 0;

  const db = await openDB();
  const tx = db.transaction([STORE_ITEMS], 'readwrite');
  const store = tx.objectStore(STORE_ITEMS);

  function addOrPut(item) {
    return new Promise((resolve, reject) => {
      const req = store.put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  if (mode === 'replace') {
    await new Promise((resolve, reject) => {
      const clearTx = db.transaction([STORE_ITEMS], 'readwrite');
      clearTx.objectStore(STORE_ITEMS).clear();
      clearTx.oncomplete = resolve;
      clearTx.onerror = () => reject(clearTx.error);
    });
  }

  for (const item of toImport) {
    const existing = existingItems.find((e) => isDuplicateItem(e, item));
    if (existing) {
      if (conflictStrategy === 'skip') {
        skipped++;
        continue;
      } else if (conflictStrategy === 'keep-existing') {
        skipped++;
        continue;
      } else if (conflictStrategy === 'keep-imported') {
        await addOrPut(item);
        replaced++;
      }
    } else {
      await addOrPut(item);
      imported++;
    }
  }

  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  return {
    imported,
    skipped,
    replaced,
  };
}

// Backup meta

async function recordBackup() {
  const now = Date.now();
  const stats = (await dbGetMeta('backupStats')) || { autoBackups: 0, manualBackups: 0 };
  stats.manualBackups = (stats.manualBackups || 0) + 1;
  await dbSetMeta('backupStats', stats);
  await dbSetMeta('lastBackupAt', now);
}

async function recordAutoBackup() {
  const now = Date.now();
  const stats = (await dbGetMeta('backupStats')) || { autoBackups: 0, manualBackups: 0 };
  stats.autoBackups = (stats.autoBackups || 0) + 1;
  await dbSetMeta('backupStats', stats);
  await dbSetMeta('lastBackupAt', now);
}

async function getBackupInfo() {
  const lastBackupAt = await dbGetMeta('lastBackupAt');
  const stats = (await dbGetMeta('backupStats')) || { autoBackups: 0, manualBackups: 0 };
  return { lastBackupAt, stats };
}

async function getStats() {
  const items = await dbGetAllItems();
  const total = items.length;
  const favorites = items.filter((i) => i.favorite).length;
  const recentSorted = [...items].sort((a, b) => b.createdAt - a.createdAt).slice(0, 10);
  return { total, favorites, recent: recentSorted };
}

// Expose globals

window.dbApi = {
  createItem,
  updateItem,
  deleteItem: dbDeleteItem,
  getItem: dbGetItem,
  getAllItems: dbGetAllItems,
  clearAll: dbClearAll,
  exportAllItems,
  exportItems,
  exportSingleItem,
  validateImportJson,
  importItems,
  recordBackup,
  recordAutoBackup,
  getBackupInfo,
  getStats,
  setMeta: dbSetMeta,
  getMeta: dbGetMeta,
  sha256,
};
