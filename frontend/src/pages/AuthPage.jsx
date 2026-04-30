// Path: frontend/src/pages/AuthPage.jsx
import React, { useState, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { StudentContext } from '../context/StudentContext.jsx';
import { getAvailableLanguages } from '../i18n/index.js';

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role') || 'student';
  const { setStudent } = useContext(StudentContext);

  const [name, setName] = useState('');
  const [grade, setGrade] = useState('7');
  const [language, setLanguage] = useState('en');
  const [loading, setLoading] = useState(false);

  const languages = getAvailableLanguages();
  const grades = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);

    const student = {
      studentId: `student_${Date.now()}`,
      name: name.trim(),
      grade: parseInt(grade),
      language,
      role,
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
    };

    try {
      setStudent(student);

      if (role === 'teacher') {
        navigate('/dashboard');
      } else {
        navigate('/learn');
      }
    } catch (error) {
      console.error('Auth error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-violet-50 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">
              {role === 'teacher' ? '👩‍🏫' : '🎒'}
            </div>
            <h1 className="text-2xl font-bold text-gray-800">
              {role === 'teacher' ? 'Teacher Login' : 'Student Registration'}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {role === 'teacher'
                ? 'Monitor your class progress'
                : 'Start your personalized learning journey'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="input-field"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Grade
              </label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="input-field"
              >
                {grades.map((g) => (
                  <option key={g} value={g}>
                    Grade {g}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="input-field"
              >
                {languages.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.nativeName} ({l.name})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="btn-primary w-full py-4 text-lg disabled:opacity-50"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Loading...
                </span>
              ) : role === 'teacher' ? (
                'View Dashboard →'
              ) : (
                'Start Learning →'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() =>
                navigate(`/auth?role=${role === 'teacher' ? 'student' : 'teacher'}`)
              }
              className="text-violet-600 text-sm hover:underline"
            >
              {role === 'teacher'
                ? 'I\'m a student →'
                : 'I\'m a teacher →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
