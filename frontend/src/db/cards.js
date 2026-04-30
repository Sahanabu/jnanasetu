// Path: frontend/src/db/cards.js
import { STORES, withStore } from './index.js'

export async function upsertCard(card) {
  try {
    if (!card?.cardId) throw new Error('card.cardId is required')
    const safe = { ef: 2.5, n: 0, interval: 0, ...card }
    return await withStore(STORES.cards, 'readwrite', async (store) => {
      await store.put(safe)
      return safe
    })
  } catch (err) {
    console.error('[db/cards] upsertCard failed', err)
    return null
  }
}

export async function getCardById(cardId) {
  try {
    return await withStore(STORES.cards, 'readonly', (store) => store.get(cardId))
  } catch (err) {
    console.error('[db/cards] getCardById failed', err)
    return null
  }
}

export async function listCardsByStudent(studentId) {
  try {
    return await withStore(STORES.cards, 'readonly', (store) => store.index('studentId').getAll(studentId))
  } catch (err) {
    console.error('[db/cards] listCardsByStudent failed', err)
    return []
  }
}

export async function listDueCards(studentId, nowIso = new Date().toISOString()) {
  try {
    const all = await listCardsByStudent(studentId)
    return all.filter((c) => (c?.nextReview ?? '9999-12-31T00:00:00.000Z') <= nowIso)
  } catch (err) {
    console.error('[db/cards] listDueCards failed', err)
    return []
  }
}

export async function deleteCard(cardId) {
  try {
    return await withStore(STORES.cards, 'readwrite', async (store) => {
      await store.delete(cardId)
      return true
    })
  } catch (err) {
    console.error('[db/cards] deleteCard failed', err)
    return false
  }
}

// Aliases for compatibility
export const getCardsByStudent = listCardsByStudent;
export const saveCard = upsertCard;
export const getDueCards = listDueCards;
export const getCard = getCardById;
export const updateCard = upsertCard;

export async function getCardsByTopic(topic) {
  try {
    return await withStore(STORES.cards, 'readonly', (store) => store.index('topic').getAll(topic))
  } catch (err) {
    console.error('[db/cards] getCardsByTopic failed', err)
    return []
  }
}

export async function getAllCards() {
  try {
    return await withStore(STORES.cards, 'readonly', (store) => store.getAll())
  } catch (err) {
    console.error('[db/cards] getAllCards failed', err)
    return []
  }
}

