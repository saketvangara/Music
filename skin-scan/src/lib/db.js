// Minimal promise wrapper around IndexedDB for scan history.
// Store 'scans': keyPath 'id', index 'ts' for chronological queries.
// Blobs (thumb/photo JPEGs) are stored directly — IndexedDB handles them natively.

const DB_NAME = 'skin-scan'
const DB_VERSION = 1
const STORE = 'scans'

let dbPromise = null

function openDb() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' })
        store.createIndex('ts', 'ts')
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => { dbPromise = null; reject(req.error) }
  })
  return dbPromise
}

function tx(db, mode) {
  return db.transaction(STORE, mode).objectStore(STORE)
}

function asPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function putScan(scan) {
  const db = await openDb()
  return asPromise(tx(db, 'readwrite').put(scan))
}

export async function getScan(id) {
  const db = await openDb()
  return asPromise(tx(db, 'readonly').get(id))
}

// Newest first.
export async function getScans() {
  const db = await openDb()
  const all = await asPromise(tx(db, 'readonly').getAll())
  return all.sort((a, b) => b.ts - a.ts)
}

export async function deleteScan(id) {
  const db = await openDb()
  return asPromise(tx(db, 'readwrite').delete(id))
}

export async function clearScans() {
  const db = await openDb()
  return asPromise(tx(db, 'readwrite').clear())
}
