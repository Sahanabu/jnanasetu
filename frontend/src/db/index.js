// Path: frontend/src/db/index.js
import { openDB } from 'idb'

const DB_NAME = 'jnanasetu-db'
const DB_VERSION = 2

export const STORES = {
  modules: 'modules',
  events: 'events',
  cards: 'cards',
  students: 'students',
  modality_prefs: 'modality_prefs'
}

let dbPromise = null

export function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // modules
        if (!db.objectStoreNames.contains(STORES.modules)) {
          const store = db.createObjectStore(STORES.modules, { keyPath: 'moduleId' })
          store.createIndex('subject', 'subject')
          store.createIndex('chapter', 'chapter')
          store.createIndex('downloadedAt', 'downloadedAt')
        }

        // events
        if (!db.objectStoreNames.contains(STORES.events)) {
          const store = db.createObjectStore(STORES.events, { keyPath: 'eventId' })
          store.createIndex('studentId', 'studentId')
          store.createIndex('topic', 'topic')
          store.createIndex('date', 'date')
          store.createIndex('synced', 'synced')
        }

        // cards
        if (!db.objectStoreNames.contains(STORES.cards)) {
          const store = db.createObjectStore(STORES.cards, { keyPath: 'cardId' })
          store.createIndex('studentId', 'studentId')
          store.createIndex('nextReview', 'nextReview')
          store.createIndex('topic', 'topic')
        }

        // students
        if (!db.objectStoreNames.contains(STORES.students)) {
          db.createObjectStore(STORES.students, { keyPath: 'studentId' })
        }

        // modality_prefs
        if (!db.objectStoreNames.contains(STORES.modality_prefs)) {
          db.createObjectStore(STORES.modality_prefs, { keyPath: 'key' })
        }
      }
    })
  }
  return dbPromise
}

export async function withStore(storeName, mode, fn) {
  try {
    const db = await getDb()
    const tx = db.transaction(storeName, mode)
    const store = tx.objectStore(storeName)
    const result = await fn(store, tx)
    await tx.done
    return result
  } catch (err) {
    console.error(`[db] ${storeName} ${mode} transaction failed`, err)
    throw err
  }
}

