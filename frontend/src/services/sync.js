// Path: frontend/src/services/sync.js

/**
 * Background sync service for uploading offline events to the backend.
 * Batches events and handles retry logic.
 */

import { getAllUnsyncedEvents, markEventSynced } from '../db/events.js';

const BATCH_SIZE = 50;
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

/**
 * Sync all pending events to the backend.
 * @returns {Promise<{ synced: number, failed: number }>}
 */
export async function syncPendingEvents() {
  if (!navigator.onLine) {
    console.log('Offline: skipping sync');
    return { synced: 0, failed: 0 };
  }

  try {
    const unsyncedEvents = await getAllUnsyncedEvents();
    console.log(`Syncing ${unsyncedEvents.length} events...`);
    if (unsyncedEvents.length === 0) {
      return { synced: 0, failed: 0 };
    }

    let synced = 0;
    let failed = 0;

    // Batch into groups of 50
    for (let i = 0; i < unsyncedEvents.length; i += BATCH_SIZE) {
      const batch = unsyncedEvents.slice(i, i + BATCH_SIZE);

      try {
        const response = await fetch(`${BACKEND_URL}/api/events/batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ events: batch }),
        });

        if (response.ok) {
          const result = await response.json();
          synced += result.synced || batch.length;

          // Mark each event as synced in IndexedDB
          for (const event of batch) {
            try {
              await markEventSynced(event.eventId);
            } catch (err) {
              console.error('Failed to mark event as synced:', event.eventId, err);
            }
          }
        } else {
          console.error('Batch sync failed with status:', response.status);
          failed += batch.length;
        }
      } catch (error) {
        console.error('Batch sync error:', error);
        failed += batch.length;
      }
    }

    return { synced, failed };
  } catch (error) {
    console.error('Sync failed:', error);
    return { synced: 0, failed: 0 };
  }
}

/**
 * Set up automatic sync triggers.
 * Syncs on app focus, online event, and initial mount.
 */
export function setupAutoSync() {
  // Sync on visibility change (app comes to foreground)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      syncPendingEvents();
    }
  });

  // Sync when coming back online
  window.addEventListener('online', () => {
    syncPendingEvents();
  });

  // Sync on initial mount (if online)
  if (navigator.onLine) {
    syncPendingEvents();
  }
}

/**
 * Sync student data to backend.
 * @param {object} student - Student object
 * @returns {Promise<boolean>} - Whether sync was successful
 */
export async function syncStudent(student) {
  if (!navigator.onLine || !student) return false;

  try {
    const response = await fetch(`${BACKEND_URL}/api/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(student),
    });

    return response.ok;
  } catch (error) {
    console.error('Student sync failed:', error);
    return false;
  }
}
