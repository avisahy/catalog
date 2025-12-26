// db.js

const DB_NAME = 'catalog-db';
const DB_VERSION = 1;
const STORE_ITEMS = 'items';

let dbInstance = null;

function openDb() {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_ITEMS)) {
        const store = db.createObjectStore(STORE_ITEMS, { keyPath: 'id' });
        store.createIndex('byName', 'name', { unique: false });
        store.createIndex('byLocation', 'location', { unique: false });
        store.createIndex('byFavorite', 'favorite', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onerror = () => reject(request.error);
  });
}

async function sha256(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function ensureChecksum(item) {
  if (item.checksum) return item.checksum;
  const base = (item.name || '') + '|' + (item.location || '') + '|' + (item.imageData || '');
  const checksum = await sha256(base);
  item.checksum = checksum;
  return checksum;
}

async function addItem({ name, location, imageData }) {
  const db = await openDb();
  const id = crypto.randomUUID();
  const item = {
    id,
    name: name.trim(),
    location: location.trim(),
    imageData,
    favorite: false,
    createdAt: Date.now()
  };
  await ensureChecksum(item);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ITEMS, 'readwrite');
    tx.objectStore(STORE_ITEMS).add(item);
    tx.oncomplete = () => resolve(item);
    tx.onerror = () => reject(tx.error);
  });
}

async function updateItem(item) {
  const db = await openDb();
  await ensureChecksum(item);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ITEMS, 'readwrite');
    tx.objectStore(STORE_ITEMS).put(item);
    tx.oncomplete = () => resolve(item);
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteItem(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ITEMS, 'readwrite');
    tx.objectStore(STORE_ITEMS).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function clearAllItems() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ITEMS, 'readwrite');
    tx.objectStore(STORE_ITEMS).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getAllItems() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ITEMS, 'readonly');
    const req = tx.objectStore(STORE_ITEMS).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function getItem(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ITEMS, 'readonly');
    const req = tx.objectStore(STORE_ITEMS).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function exportAllToJson() {
  const items = await getAllItems();
  for (const it of items) {
    await ensureChecksum(it);
  }

  const payload = {
    type: 'catalog-export',
    version: 1,
    exportedAt: new Date().toISOString(),
    items
  };

  const payloadStr = JSON.stringify(payload);
  const masterChecksum = await sha256(payloadStr);

  const wrapper = {
    meta: {
      type: 'catalog-export-wrapper',
      version: 1,
      checksum: masterChecksum
    },
    data: payload
  };

  return JSON.stringify(wrapper, null, 2);
}

async function exportItemsToJson(ids) {
  const all = await getAllItems();
  const selected = all.filter((it) => ids.includes(it.id));
  for (const it of selected) {
    await ensureChecksum(it);
  }

  const payload = {
    type: 'catalog-export',
    version: 1,
    exportedAt: new Date().toISOString(),
    items: selected
  };

  const payloadStr = JSON.stringify(payload);
  const masterChecksum = await sha256(payloadStr);

  const wrapper = {
    meta: {
      type: 'catalog-export-wrapper',
      version: 1,
      checksum: masterChecksum
    },
    data: payload
  };

  return JSON.stringify(wrapper, null, 2);
}

async function validateImportJson(text) {
  const errors = [];
  let wrapper;

  try {
    wrapper = JSON.parse(text);
  } catch (e) {
    return {
      valid: false,
      tampered: true,
      errors: ['Invalid JSON structure'],
      items: []
    };
  }

  if (!wrapper.meta || !wrapper.data) {
    return {
      valid: false,
      tampered: true,
      errors: ['Missing wrapper meta or data'],
      items: []
    };
  }

  if (wrapper.meta.type !== 'catalog-export-wrapper') {
    errors.push('Unexpected wrapper type');
  }

  const dataStr = JSON.stringify(wrapper.data);
  const computed = await sha256(dataStr);
  if (computed !== wrapper.meta.checksum) {
    errors.push('Checksum mismatch (possible tampering)');
  }

  const data = wrapper.data;
  if (!data.items || !Array.isArray(data.items)) {
    errors.push('No items array found in data');
  }

  const items = (data.items || []).map((raw) => ({
    id: raw.id || crypto.randomUUID(),
    name: raw.name || '',
    location: raw.location || '',
    imageData: raw.imageData || '',
    favorite: !!raw.favorite,
    createdAt: raw.createdAt || Date.now(),
    checksum: raw.checksum || null
  }));

  const invalidItems = [];
  for (const it of items) {
    const base = (it.name || '') + '|' + (it.location || '') + '|' + (it.imageData || '');
    const intendedChecksum = await sha256(base);
    if (it.checksum && it.checksum !== intendedChecksum) {
      invalidItems.push(it.id);
    } else if (!it.checksum) {
      it.checksum = intendedChecksum;
    }
  }

  if (invalidItems.length > 0) {
    errors.push(`Some items failed checksum validation: ${invalidItems.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    tampered: errors.some((e) => e.toLowerCase().includes('checksum')),
    errors,
    items,
    invalidItems
  };
}

async function findDuplicates(importItems) {
  const existing = await getAllItems();
  const duplicates = [];

  for (const item of importItems) {
    const name = (item.name || '').toLowerCase();
    const loc = (item.location || '').toLowerCase();
    const checksum = item.checksum;

    const match = existing.find((e) => {
      return (
        (e.name || '').toLowerCase() === name &&
        (e.location || '').toLowerCase() === loc &&
        e.checksum === checksum
      );
    });

    if (match) {
      duplicates.push({
        existing: match,
        incoming: item
      });
    }
  }

  return duplicates;
}

async function applyImport(importItems, mode, conflictDecisions) {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ITEMS, 'readwrite');
    const store = tx.objectStore(STORE_ITEMS);

    const result = {
      imported: 0,
      skipped: 0,
      replaced: 0
    };

    const process = async () => {
      const existingItems = await getAllItems();
      let toAdd = [...importItems];

      if (mode === 'replace') {
        await clearAllItems();
      }

      const dupList = await findDuplicates(importItems);
      const dupMap = new Map();
      dupList.forEach((d) => {
        dupMap.set(d.incoming.id, d);
      });

      for (const item of toAdd) {
        const dup = dupMap.get(item.id);
        if (!dup) {
          store.put(item);
          result.imported++;
          continue;
        }

        const decision = conflictDecisions[item.id];
        if (decision === 'skip') {
          result.skipped++;
          continue;
        } else if (decision === 'keep-existing') {
          result.skipped++;
          continue;
        } else if (decision === 'keep-imported') {
          store.put(item);
          result.replaced++;
          continue;
        } else {
          result.skipped++;
          continue;
        }
      }
    };

    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);

    process().catch((err) => {
      console.error(err);
      tx.abort();
      reject(err);
    });
  });
}

function downloadJsonFile(filename, text) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const BACKUP_KEY_LAST = 'catalog-last-backup';
const BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

function getLastBackupTime() {
  const raw = localStorage.getItem(BACKUP_KEY_LAST);
  return raw ? Number(raw) : null;
}

function setLastBackupTime(ts) {
  localStorage.setItem(BACKUP_KEY_LAST, String(ts));
}

async function performBackupNow() {
  const json = await exportAllToJson();
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  downloadJsonFile(`catalog-backup-${ts}.json`, json);
  setLastBackupTime(Date.now());
}

export {
  addItem,
  updateItem,
  deleteItem,
  clearAllItems,
  getAllItems,
  getItem,
  exportAllToJson,
  exportItemsToJson,
  validateImportJson,
  findDuplicates,
  applyImport,
  downloadJsonFile,
  getLastBackupTime,
  setLastBackupTime,
  performBackupNow,
  BACKUP_INTERVAL_MS
};
