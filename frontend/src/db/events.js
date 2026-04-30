// Path: frontend/src/db/events.js
import { STORES, withStore } from './index.js'

export async function addEvent(event) {
  try {
    if (!event?.eventId) throw new Error('event.eventId is required')
    const safe = { synced: false, ...event }
    return await withStore(STORES.events, 'readwrite', async (store) => {
      await store.put(safe)
      return safe
    })
  } catch (err) {
    console.error('[db/events] addEvent failed', err)
    return null
  }
}

export async function upsertEvent(event) {
  return addEvent(event)
}

export async function getEventById(eventId) {
  try {
    return await withStore(STORES.events, 'readonly', (store) => store.get(eventId))
  } catch (err) {
    console.error('[db/events] getEventById failed', err)
    return null
  }
}

export async function listEventsByStudent(studentId) {
  try {
    return await withStore(STORES.events, 'readonly', (store) => store.index('studentId').getAll(studentId))
  } catch (err) {
    console.error('[db/events] listEventsByStudent failed', err)
    return []
  }
}

export async function listEventsByTopic(topic) {
  try {
    return await withStore(STORES.events, 'readonly', (store) => store.index('topic').getAll(topic))
  } catch (err) {
    console.error('[db/events] listEventsByTopic failed', err)
    return []
  }
}

export async function listUnsyncedEvents() {
  try {
    return await withStore(STORES.events, 'readonly', async (store) => {
      // Fallback: get all and filter to avoid Index DataError if migration is pending
      const all = await store.getAll();
      return all.filter(e => e.synced === false || e.synced === undefined);
    })
  } catch (err) {
    console.error('[db/events] listUnsyncedEvents failed', err)
    return []
  }
}

export async function markEventsSynced(eventIds) {
  try {
    if (!Array.isArray(eventIds) || eventIds.length === 0) return 0
    return await withStore(STORES.events, 'readwrite', async (store) => {
      let updated = 0
      for (const id of eventIds) {
        const existing = await store.get(id)
        if (!existing) continue
        if (existing.synced === true) continue
        await store.put({ ...existing, synced: true })
        updated += 1
      }
      return updated
    })
  } catch (err) {
    console.error('[db/events] markEventsSynced failed', err)
    return 0
  }
}

export async function listAllEvents() {
  try {
    return await withStore(STORES.events, 'readonly', (store) => store.getAll())
  } catch (err) {
    console.error('[db/events] listAllEvents failed', err)
    return []
  }
}

export async function deleteEvent(eventId) {
  try {
    return await withStore(STORES.events, 'readwrite', async (store) => {
      await store.delete(eventId)
      return true
    })
  } catch (err) {
    console.error('[db/events] deleteEvent failed', err)
    return false
  }
}

// Aliases for compatibility
export const getEventsByStudent = listEventsByStudent;
export const saveEvent = upsertEvent;
export const getAllEvents = listAllEvents;
export const getAllUnsyncedEvents = listUnsyncedEvents;
export const markEventSynced = async (id) => markEventsSynced([id]);

