// Path: frontend/src/db/modules.js
import { STORES, withStore } from './index.js'

export async function upsertModule(module) {
  try {
    if (!module?.moduleId) throw new Error('module.moduleId is required')
    return await withStore(STORES.modules, 'readwrite', async (store) => {
      await store.put(module)
      return module
    })
  } catch (err) {
    console.error('[db/modules] upsertModule failed', err)
    return null
  }
}

export async function getModuleById(moduleId) {
  try {
    return await withStore(STORES.modules, 'readonly', (store) => store.get(moduleId))
  } catch (err) {
    console.error('[db/modules] getModuleById failed', err)
    return null
  }
}

export async function listModules({ subject, chapter } = {}) {
  try {
    return await withStore(STORES.modules, 'readonly', async (store) => {
      if (subject) return await store.index('subject').getAll(subject)
      if (chapter) return await store.index('chapter').getAll(chapter)
      return await store.getAll()
    })
  } catch (err) {
    console.error('[db/modules] listModules failed', err)
    return []
  }
}

export async function deleteModule(moduleId) {
  try {
    return await withStore(STORES.modules, 'readwrite', async (store) => {
      await store.delete(moduleId)
      return true
    })
  } catch (err) {
    console.error('[db/modules] deleteModule failed', err)
    return false
  }
}

// Aliases for compatibility
export const saveModule = upsertModule;
export const getModule = getModuleById;
export const getAllModules = listModules;

