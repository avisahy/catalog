// db.js
// IndexedDB wrapper and data logic

const DB_NAME = 'catalog-db';
const DB_VERSION = 1;
const STORE_ITEMS = 'items';
const STORE_META = 'meta';

// Key for backup metadata in meta store
const META_KEY_BACKUP = 'backupInfo';

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = event => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORE_ITEMS)) {
        const store = db.createObjectStore(STORE_ITEMS, { keyPath: 'id' });
        store.createIndex('by_name', 'name', { unique: false });
        store.createIndex('by_location', 'location', { unique: false });
        store.createIndex('by_favorite', 'favorite', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  return dbPromise;
}

// Helpers
async function tx(storeName, mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const result = fn(store);
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error);
  });
}

// Crypto hash (SHA-256)
async function sha256Base64(input) {
  const enc = new TextEncoder();
  const data = enc.encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(digest);
  let binary = '';
  for (let b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

// Image to hash (for duplicate detection)
async function hashImageFile(file) {
  return sha256Base64(`${file.name}-${file.size}-${file.lastModified}`);
}

// Item schema:
// {
//   id: string (crypto.randomUUID())
//   name: string
//   location: string
//   imageDataUrl: string
//   checksum: string (SHA-256 of name+location+imageDataUrl or file info)
//   favorite: boolean
//   createdAt: number (timestamp)
//   updatedAt: number (timestamp)
// }

async function addItem({ name, location, imageDataUrl }) {
  const id = crypto.randomUUID();
  const checksum = await sha256Base64(`${name.toLowerCase()}|${location.toLowerCase()}|${imageDataUrl}`);
  const now = Date.now();

  const item = {
    id,
    name,
    location,
    imageDataUrl,
    checksum,
    favorite: false,
    createdAt: now,
    updatedAt: now
  };

  await tx(STORE_ITEMS, 'readwrite', store => store.add(item));
  return item;
}

async function updateItem(item) {
  item.updatedAt = Date.now();
  await tx(STORE_ITEMS, 'readwrite', store => store.put(item));
  return item;
}

async function deleteItem(id) {
  await tx(STORE_ITEMS, 'readwrite', store => store.delete(id));
}

async function deleteAllItems() {
  await tx(STORE_ITEMS, 'readwrite', store => store.clear());
}

async function getAllItems() {
  return tx(STORE_ITEMS, 'readonly', store => {
    return new Promise(resolve => {
      const items = [];
      const req = store.openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          items.push(cursor.value);
          cursor.continue();
        } else {
          resolve(
            items.sort((a, b) => b.createdAt - a.createdAt)
          );
        }
      };
    });
  });
}

async function toggleFavorite(id, favorite) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_ITEMS, 'readwrite');
    const store = transaction.objectStore(STORE_ITEMS);
    const req = store.get(id);
    req.onsuccess = () => {
      const item = req.result;
      if (!item) return resolve(null);
      item.favorite = favorite;
      item.updatedAt = Date.now();
      store.put(item);
      resolve(item);
    };
    req.onerror = () => reject(req.error);
  });
}

// Export
async function exportAllItems() {
  const items = await getAllItems();
  return {
    version: 1,
    exportedAt: Date.now(),
    items
  };
}

async function exportSingleItem(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const txObj = db.transaction(STORE_ITEMS, 'readonly');
    const store = txObj.objectStore(STORE_ITEMS);
    const req = store.get(id);
    req.onsuccess = () => {
      if (!req.result) return resolve(null);
      resolve({
        version: 1,
        exportedAt: Date.now(),
        items: [req.result]
      });
    };
    req.onerror = () => reject(req.error);
  });
}

// Import + duplicate detection + tamper checks
function isDuplicate(existing, candidate) {
  if (!existing || !candidate) return false;
  return (
    (existing.name || '').toLowerCase() === (candidate.name || '').toLowerCase() &&
    (existing.location || '').toLowerCase() === (candidate.location || '').toLowerCase() &&
    existing.checksum === candidate.checksum
  );
}

async function importItemsFromJson(parsed, {
  mode = 'merge', // 'merge' | 'replace' | 'select'
  selectedIds = null,
  conflictResolver = null // async (existing, incoming) => 'keepExisting' | 'keepImported' | 'skip'
} = {}) {
  // Tamper detection: basic schema check
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.items)) {
    return {
      tampered: true,
      tamperedItems: [],
      imported: 0,
      skipped: 0,
      replaced: 0
    };
  }

  const incomingItems = parsed.items.filter(i =>
    i && typeof i.id === 'string' && i.checksum
  );

  const db = await openDb();
  const results = {
    tampered: false,
    tamperedItems: [],
    imported: 0,
    skipped: 0,
    replaced: 0
  };

  await new Promise((resolve, reject) => {
    const txDb = db.transaction(STORE_ITEMS, 'readwrite');
    const store = txDb.objectStore(STORE_ITEMS);

    const existingMap = new Map();
    store.openCursor().onsuccess = e => {
      const cursor = e.target.result;
      if (cursor) {
        existingMap.set(cursor.value.id, cursor.value);
        cursor.continue();
      } else {
        // Now process imports
        const toProcess = selectedIds
          ? incomingItems.filter(i => selectedIds.includes(i.id))
          : incomingItems;

        const processNext = index => {
          if (index >= toProcess.length) {
            return;
          }
          const inc = toProcess[index];

          try {
            // Simple checksum presence as part of tamper detection
            if (!inc.checksum) {
              results.tamperedItems.push(inc.id);
              results.skipped++;
              return processNext(index + 1);
            }

            // Duplicate detection
            const existingById = existingMap.get(inc.id);
            let conflictTarget = null;

            // Also check duplicates by name/location/checksum
            let matchedExisting = null;
            for (const ex of existingMap.values()) {
              if (isDuplicate(ex, inc)) {
                matchedExisting = ex;
                break;
              }
            }

            if (existingById || matchedExisting) {
              conflictTarget = existingById || matchedExisting;
            }

            if (conflictTarget && conflictResolver) {
              conflictResolver(conflictTarget, inc).then(choice => {
                if (choice === 'keepExisting') {
                  results.skipped++;
                } else if (choice === 'keepImported') {
                  store.put(inc);
                  existingMap.set(inc.id, inc);
                  results.replaced++;
                } else {
                  results.skipped++;
                }
                processNext(index + 1);
              }).catch(() => {
                results.skipped++;
                processNext(index + 1);
              });
            } else if (conflictTarget) {
              // Default: skip
              results.skipped++;
              processNext(index + 1);
            } else {
              // Insert new
              store.put(inc);
              existingMap.set(inc.id, inc);
              results.imported++;
              processNext(index + 1);
            }
          } catch (err) {
            results.tamperedItems.push(inc.id);
            results.skipped++;
            processNext(index + 1);
          }
        };

        if (mode === 'replace') {
          store.clear().onsuccess = () => {
            existingMap.clear();
            toProcess.forEach(i => existingMap.set(i.id, i));
            toProcess.forEach(i => store.put(i));
            results.imported = toProcess.length;
            resolve();
          };
        } else {
          processNext(0);
          resolve();
        }
      }
    };

    txDb.oncomplete = () => {};
    txDb.onerror = () => reject(txDb.error);
  });

  return results;
}

// Meta: backup info
async function getBackupInfo() {
  const db = await openDb();
  return new Promise(resolve => {
    const txObj = db.transaction(STORE_META, 'readonly');
    const store = txObj.objectStore(STORE_META);
    const req = store.get(META_KEY_BACKUP);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => resolve(null);
  });
}

async function setBackupInfo(info) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const txObj = db.transaction(STORE_META, 'readwrite');
    const store = txObj.objectStore(STORE_META);
    store.put({ key: META_KEY_BACKUP, ...info });
    txObj.oncomplete = () => resolve();
    txObj.onerror = () => reject(txObj.error);
  });
}

window.CatalogDB = {
  addItem,
  updateItem,
  deleteItem,
  deleteAllItems,
  getAllItems,
  toggleFavorite,
  exportAllItems,
  exportSingleItem,
  importItemsFromJson,
  getBackupInfo,
  setBackupInfo
};
