// Path: frontend/src/services/moduleLoader.js

/**
 * Module loader service for downloading and caching chapter modules.
 * Works offline by storing modules in IndexedDB.
 */

import { saveModule, getModule, getAllModules } from '../db/modules.js';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

/**
 * Download and cache a module from the backend or local dataset.
 * @param {string} moduleId - The module ID to load
 * @returns {Promise<object>} - The loaded module
 */
export async function loadModule(moduleId) {
  // Try IndexedDB first
  try {
    const cached = await getModule(moduleId);
    if (cached) {
      console.log('Module loaded from cache:', moduleId);
      return cached;
    }
  } catch (error) {
    console.error('Error reading module from cache:', error);
  }

  // Try backend
  if (navigator.onLine) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/modules/${moduleId}`);
      if (response.ok) {
        const module = await response.json();
        await saveModule(module);
        return module;
      }
    } catch (error) {
      console.error('Error fetching module from backend:', error);
    }
  }

  // Fallback: load from local dataset
  try {
    const module = await loadLocalModule(moduleId);
    if (module) {
      await saveModule(module);
      return module;
    }
  } catch (error) {
    console.error('Error loading local module:', error);
  }

  throw new Error(`Module "${moduleId}" not found`);
}

/**
 * Map of module IDs to their local data files
 */
const LOCAL_MODULES = {
  'math_7_fractions': { path: '../data/fractions.json', subject: 'mathematics', chapter: 'Fractions', grade: 7 },
  'math_7_decimals': { path: '../data/decimals.json', subject: 'mathematics', chapter: 'Decimals', grade: 7 },
  'science_7_nutrition': { path: '../data/science_nutrition.json', subject: 'science', chapter: 'Nutrition in Plants', grade: 7 },
};

/**
 * Load a module from the local dataset.
 * @param {string} moduleId
 * @returns {Promise<object|null>}
 */
async function loadLocalModule(moduleId) {
  const moduleConfig = LOCAL_MODULES[moduleId];
  if (!moduleConfig) {
    console.warn(`No local data found for module: ${moduleId}`);
    return null;
  }

  try {
    const dataset = await import(moduleConfig.path);

    if (dataset && dataset.questions && dataset.questions.length > 0) {
      return {
        moduleId,
        subject: moduleConfig.subject,
        chapter: moduleConfig.chapter,
        grade: moduleConfig.grade,
        topic: dataset.topic || moduleId,
        questions: dataset.questions.map((q) => ({
          id: q.id,
          question: q.question,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          concept: q.concept,
          difficulty: q.difficulty,
          misconceptions: q.misconceptions,
        })),
        downloadedAt: new Date().toISOString(),
        version: 1,
      };
    }
  } catch (error) {
    console.error(`Failed to load local module ${moduleId}:`, error);
  }

  return null;
}

/**
 * Get all available modules.
 * @returns {Promise<Array>}
 */
export async function getAvailableModules() {
  // Try IndexedDB first
  try {
    const cached = await getAllModules();
    if (cached.length > 0) {
      return cached.map((m) => ({
        moduleId: m.moduleId,
        subject: m.subject,
        chapter: m.chapter,
        grade: m.grade,
        questionCount: m.questions?.length || 0,
        downloadedAt: m.downloadedAt,
      }));
    }
  } catch (error) {
    console.error('Error reading modules from cache:', error);
  }

  // Try backend
  if (navigator.onLine) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/modules`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Error fetching modules from backend:', error);
    }
  }

  // Return all available local modules as defaults
  return Object.entries(LOCAL_MODULES).map(([moduleId, config]) => ({
    moduleId,
    subject: config.subject,
    chapter: config.chapter,
    grade: config.grade,
    questionCount: 5,
    downloadedAt: null,
  }));
}

/**
 * Preload all available modules for offline use.
 * @returns {Promise<Array>}
 */
export async function preloadFractionsModule() {
  const loaded = [];
  for (const [moduleId] of Object.entries(LOCAL_MODULES)) {
    try {
      const module = await loadLocalModule(moduleId);
      if (module) {
        await saveModule(module);
        console.log(`Module preloaded: ${moduleId}`);
        loaded.push(module);
      }
    } catch (error) {
      console.error(`Failed to preload module ${moduleId}:`, error);
    }
  }
  return loaded;
}
