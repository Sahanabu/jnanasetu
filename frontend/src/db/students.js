// Path: frontend/src/db/students.js
import { STORES, withStore } from './index.js'

export async function upsertStudent(student) {
  try {
    if (!student?.studentId) throw new Error('student.studentId is required')
    return await withStore(STORES.students, 'readwrite', async (store) => {
      await store.put(student)
      return student
    })
  } catch (err) {
    console.error('[db/students] upsertStudent failed', err)
    return null
  }
}

export async function getStudentById(studentId) {
  try {
    return await withStore(STORES.students, 'readonly', (store) => store.get(studentId))
  } catch (err) {
    console.error('[db/students] getStudentById failed', err)
    return null
  }
}

export async function listStudents() {
  try {
    return await withStore(STORES.students, 'readonly', (store) => store.getAll())
  } catch (err) {
    console.error('[db/students] listStudents failed', err)
    return []
  }
}

export async function deleteStudent(studentId) {
  try {
    return await withStore(STORES.students, 'readwrite', async (store) => {
      await store.delete(studentId)
      return true
    })
  } catch (err) {
    console.error('[db/students] deleteStudent failed', err)
    return false
  }
}

// modality_prefs helpers live here to keep the exact folder structure unchanged.
export async function upsertModalityPref(pref) {
  try {
    if (!pref?.key) throw new Error('pref.key is required')
    return await withStore(STORES.modality_prefs, 'readwrite', async (store) => {
      await store.put(pref)
      return pref
    })
  } catch (err) {
    console.error('[db/students] upsertModalityPref failed', err)
    return null
  }
}

export async function getModalityPref(key) {
  try {
    return await withStore(STORES.modality_prefs, 'readonly', (store) => store.get(key))
  } catch (err) {
    console.error('[db/students] getModalityPref failed', err)
    return null
  }
}

// Aliases for compatibility
export const saveStudent = upsertStudent;
export const getStudent = getStudentById;

