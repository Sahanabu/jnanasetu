// Path: frontend/src/context/StudentContext.jsx
import React, { createContext, useState, useEffect } from 'react';
import { saveStudent, getStudent } from '../db/students.js';
import { useAuth } from './AuthContext.jsx';

export const StudentContext = createContext({
  student: null,
  setStudent: () => {},
  updateStudent: () => {},
  logout: () => {},
});

export function StudentProvider({ children }) {
  const { user } = useAuth();
  const [student, setStudentState] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load student from IndexedDB on mount or when AuthContext user changes
  useEffect(() => {
    async function loadStudent() {
      try {
        if (user) {
          // Sync MongoDB user to StudentContext
          const studentData = {
            studentId: user._id, // Use MongoDB _id as the offline studentId
            name: user.name,
            email: user.email,
            grade: user.grade || 7,
            language: user.language || 'en',
            role: user.role,
            lastActive: new Date().toISOString(),
          };
          setStudentState(studentData);
          await saveStudent(studentData);
        } else {
          // Try to get the most recent student from IndexedDB if not logged in
          const allStudents = await getAllStudentsFromDB();
          if (allStudents.length > 0) {
            const sorted = allStudents.sort(
              (a, b) => new Date(b.lastActive) - new Date(a.lastActive)
            );
            setStudentState(sorted[0]);
          } else {
            setStudentState(null);
          }
        }
      } catch (error) {
        console.error('Failed to load/sync student:', error);
      } finally {
        setLoading(false);
      }
    }
    loadStudent();
  }, [user]);

  const setStudent = async (studentData) => {
    try {
      setStudentState(studentData);
      await saveStudent(studentData);
    } catch (error) {
      console.error('Failed to save student:', error);
    }
  };

  const updateStudent = async (updates) => {
    try {
      const updated = { ...student, ...updates, lastActive: new Date().toISOString() };
      setStudentState(updated);
      await saveStudent(updated);
    } catch (error) {
      console.error('Failed to update student:', error);
    }
  };

  const logout = () => {
    setStudentState(null);
  };

  return (
    <StudentContext.Provider value={{ student, setStudent, updateStudent, logout, loading }}>
      {children}
    </StudentContext.Provider>
  );
}

// Helper to get all students from IndexedDB
async function getAllStudentsFromDB() {
  try {
    const { getDb } = await import('../db/index.js');
    const db = await getDb();
    const tx = db.transaction('students', 'readonly');
    const store = tx.objectStore('students');
    const students = await store.getAll();
    await tx.done;
    return students || [];
  } catch (error) {
    console.error('Error reading students from DB:', error);
    return [];
  }
}
