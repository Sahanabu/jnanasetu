// Path: frontend/src/services/moduleLoader.js
import { saveModule, getModule, getAllModules } from '../db/modules.js';
import { generateQuestionsForChapter } from './aiTutor.js';

// Static imports for maximum reliability in Vite/PWA environments
import fractionsData from '../data/fractions.json';
import decimalsData from '../data/decimals.json';
import scienceNutritionData from '../data/science_nutrition.json';
import socialCivilizationData from '../data/social_civilization.json';
import englishVerbsData from '../data/english_verbs.json';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

// Prevents concurrent loadModule calls for the same moduleId from firing
// multiple Groq requests (React StrictMode, double-clicks, etc.)
const _inflight = new Map();
function withLock(key, fn) {
  if (_inflight.has(key)) return _inflight.get(key);
  const p = fn().finally(() => _inflight.delete(key));
  _inflight.set(key, p);
  return p;
}

/**
 * Mapping of IDs to actual data objects
 */
const LOCAL_DATA = {
  'math_7_fractions': fractionsData,
  'math_7_decimals': decimalsData,
  'science_7_nutrition': scienceNutritionData,
  'social_7_civilization': socialCivilizationData,
  'english_7_verbs': englishVerbsData,
};

/**
 * Configuration for the hierarchical module structure
 */
const LOCAL_MODULES_CONFIG = {
  // Virtual Textbooks (Roots)
  'math_7_textbook': { subject: 'mathematics', chapter: 'Mathematics Grade 7', grade: 7, type: 'textbook' },
  'science_7_textbook': { subject: 'science', chapter: 'Science Grade 7', grade: 7, type: 'textbook' },
  'social_7_textbook': { subject: 'social studies', chapter: 'Social Science Grade 7', grade: 7, type: 'textbook' },
  'english_7_textbook': { subject: 'english', chapter: 'English Grade 7', grade: 7, type: 'textbook' },

  // Chapters (Linked to Textbooks)
  'math_7_fractions': { subject: 'mathematics', chapter: 'Fractions', grade: 7, type: 'chapter', parentModuleId: 'math_7_textbook' },
  'math_7_decimals': { subject: 'mathematics', chapter: 'Decimals', grade: 7, type: 'chapter', parentModuleId: 'math_7_textbook' },
  'science_7_nutrition': { subject: 'science', chapter: 'Nutrition in Plants', grade: 7, type: 'chapter', parentModuleId: 'science_7_textbook' },
  'social_7_civilization': { subject: 'social studies', chapter: 'Ancient Civilizations', grade: 7, type: 'chapter', parentModuleId: 'social_7_textbook' },
  'english_7_verbs': { subject: 'english', chapter: 'Verbs and Tenses', grade: 7, type: 'chapter', parentModuleId: 'english_7_textbook' },
};

/**
 * Load a module from the local bundled dataset.
 */
async function loadLocalModule(moduleId) {
  const config = LOCAL_MODULES_CONFIG[moduleId];
  if (!config) return null;

  // Handle textbook containers
  if (config.type === 'textbook') {
    return {
      moduleId,
      ...config,
      questions: [],
      downloadedAt: new Date().toISOString(),
      version: 1,
    };
  }

  // Handle chapter data
  const dataset = LOCAL_DATA[moduleId];
  if (!dataset) return null;

  return {
    moduleId,
    ...config,
    topic: dataset.topic || moduleId,
    questions: (dataset.questions || []).map((q) => ({
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

/**
 * Public API to load a module with locking to prevent duplicate requests.
 */
export function loadModule(moduleId) {
  return withLock(moduleId, () => _loadModule(moduleId));
}

/**
 * Internal loader implementation.
 */
async function _loadModule(moduleId) {
  // 1. Try IndexedDB (Cache)
  try {
    const cached = await getModule(moduleId);
    if (cached) {
      // If it's a known local module but questions are missing in cache, reload from local data
      if (LOCAL_MODULES_CONFIG[moduleId] && (!cached.questions || cached.questions.length === 0)) {
        console.log(`[moduleLoader] Reloading local module from bundle: ${moduleId}`);
        const local = await loadLocalModule(moduleId);
        if (local) {
          await saveModule(local);
          return local;
        }
      }

      // If it's an uploaded chapter with no questions, generate them
      if (cached.type === 'chapter' && (!cached.questions || cached.questions.length === 0) && cached.chapter) {
        console.log(`[moduleLoader] Generating questions on-demand for: ${moduleId}`);
        const questions = await generateQuestionsForChapter(
          { chapterId: moduleId, chapterName: cached.chapter, keyConcepts: cached.keyConcepts || [] },
          cached.subject || 'General',
          cached.grade || 7
        );
        const updated = { ...cached, questions };
        await saveModule(updated);
        return updated;
      }
      return cached;
    }
  } catch (error) {
    console.error('Error reading from cache:', error);
  }

  // 2. Try Local Static Data (Bundled)
  if (LOCAL_MODULES_CONFIG[moduleId]) {
    const local = await loadLocalModule(moduleId);
    if (local) {
      await saveModule(local);
      return local;
    }
  }

  // 3. Try Backend (Online)
  if (navigator.onLine) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/modules/${moduleId}`);
      if (response.ok) {
        const module = await response.json();
        await saveModule(module);
        return module;
      }
    } catch (error) {
      console.error('Error fetching from backend:', error);
    }
  }

  throw new Error(`Module "${moduleId}" not found`);
}

/**
 * Get all modules available to the user.
 */
export async function getAvailableModules() {
  // Try to get fully downloaded modules from IndexedDB
  try {
    const cached = await getAllModules();
    if (cached.length > 0) {
      return cached;
    }
  } catch (error) {
    console.error('Error reading modules from cache:', error);
  }

  // Fallback to backend if online
  if (navigator.onLine) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/modules`);
      if (response.ok) return await response.json();
    } catch (error) {}
  }

  // Return local defaults as the ultimate fallback
  return Object.entries(LOCAL_MODULES_CONFIG).map(([moduleId, config]) => ({
    moduleId,
    ...config,
    questionCount: config.type === 'textbook' ? 0 : 5,
    downloadedAt: config.type === 'textbook' ? new Date().toISOString() : null, // Textbooks always available
  }));
}

/**
 * Preload all bundled local modules into IndexedDB.
 */
export async function preloadFractionsModule() {
  const loaded = [];
  for (const moduleId of Object.keys(LOCAL_MODULES_CONFIG)) {
    try {
      const existing = await getModule(moduleId);
      // Skip if already in DB and has questions (or is a textbook)
      if (existing && (existing.questions?.length > 0 || existing.type === 'textbook')) continue;

      const mod = await loadLocalModule(moduleId);
      if (mod) {
        await saveModule(mod);
        console.log(`Module preloaded successfully: ${moduleId}`);
        loaded.push(mod);
      }
    } catch (error) {
      console.error(`Failed to preload module ${moduleId}:`, error);
    }
  }
  return loaded;
}
