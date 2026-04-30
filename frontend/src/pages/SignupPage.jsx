// Path: frontend/src/pages/SignupPage.jsx
import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import logo from '../assets/visuals/logo.png';

export default function SignupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultRole = searchParams.get('role') || 'student';
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState(defaultRole);
  const [grade, setGrade] = useState('7');
  const [language, setLanguage] = useState('en');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1: role, 2: details

  const languages = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
    { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  ];

  const grades = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const data = await register(email, password, name, role, parseInt(grade), language);
      const userRole = data.user.role;
      if (userRole === 'admin') navigate('/admin');
      else if (userRole === 'teacher') navigate('/teacher');
      else navigate('/learn');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const roleOptions = [
    { value: 'student', icon: '🎒', title: 'Student', desc: 'Learn with AI-powered tools' },
    { value: 'teacher', icon: '👩‍🏫', title: 'Teacher', desc: 'Get AI insights on your class' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-indigo-50 flex flex-col">
      {/* Header */}
      <div className="p-4">
        <Link to="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-violet-600 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm font-medium">Back to Home</span>
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <img src={logo} alt="JnanaSetu Logo" className="w-16 h-16 object-contain mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-gray-800">Create Account</h1>
            <p className="text-gray-500 text-sm mt-1">Join JnanaSetu learning community</p>
          </div>

          {/* Progress */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
              step >= 1 ? 'bg-violet-600 text-white' : 'bg-gray-200 text-gray-400'
            }`}>1</div>
            <div className={`w-16 h-1 rounded ${step >= 2 ? 'bg-violet-600' : 'bg-gray-200'}`} />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
              step >= 2 ? 'bg-violet-600 text-white' : 'bg-gray-200 text-gray-400'
            }`}>2</div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            {step === 1 ? (
              /* Step 1: Choose Role */
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-800 mb-2">I am a...</h2>
                {roleOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setRole(opt.value); setStep(2); }}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                      role === opt.value
                        ? 'border-violet-500 bg-violet-50'
                        : 'border-gray-200 hover:border-violet-200 hover:bg-violet-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-3xl">{opt.icon}</div>
                      <div>
                        <div className="font-semibold text-gray-800">{opt.title}</div>
                        <div className="text-sm text-gray-500">{opt.desc}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              /* Step 2: Fill Details */
              <form onSubmit={handleSubmit} className="space-y-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-sm text-violet-600 hover:underline flex items-center gap-1"
                >
                  ← Change role
                </button>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
                    <span>⚠️</span>
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200 transition-all text-sm"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200 transition-all text-sm"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200 transition-all text-sm"
                      required
                      minLength={6}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200 transition-all text-sm"
                      required
                    />
                  </div>
                </div>

                {role === 'student' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Grade</label>
                      <select
                        value={grade}
                        onChange={(e) => setGrade(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200 transition-all text-sm bg-white"
                      >
                        {grades.map((g) => (
                          <option key={g} value={g}>Grade {g}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Language</label>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200 transition-all text-sm bg-white"
                      >
                        {languages.map((l) => (
                          <option key={l.code} value={l.code}>{l.nativeName}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 text-sm font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl hover:shadow-lg hover:shadow-violet-200 disabled:opacity-50 transition-all duration-200 mt-2"
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creating account...
                    </span>
                  ) : (
                    `Create ${role === 'teacher' ? 'Teacher' : 'Student'} Account →`
                  )}
                </button>
              </form>
            )}
          </div>

          <p className="text-center mt-6 text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-violet-600 font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
