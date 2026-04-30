// Path: frontend/src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import logo from '../assets/visuals/logo.png';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      const data = await login(email, password);
      const role = data.user.role;
      if (role === 'admin') navigate('/admin');
      else if (role === 'teacher') navigate('/teacher');
      else navigate('/learn');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

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
            <h1 className="text-2xl font-bold text-gray-800">Welcome Back</h1>
            <p className="text-gray-500 text-sm mt-1">Sign in to your JnanaSetu account</p>
          </div>

          {/* Login Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">📧</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200 transition-all text-sm"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔒</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-12 py-3 rounded-xl border-2 border-gray-200 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200 transition-all text-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 text-sm font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl hover:shadow-lg hover:shadow-violet-200 disabled:opacity-50 transition-all duration-200"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  'Sign In →'
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white text-gray-400">or</span>
              </div>
            </div>

            {/* Quick login buttons */}
            <div className="space-y-2">
              <p className="text-xs text-gray-400 text-center mb-3">Quick access (demo accounts)</p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => { setEmail('admin@jnanasetu.com'); setPassword('password123'); }}
                  className="px-3 py-2 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-all"
                >
                  ⚙️ Admin
                </button>
                <button
                  onClick={() => { setEmail('teacher1@jnanasetu.com'); setPassword('password123'); }}
                  className="px-3 py-2 text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-all"
                >
                  👩‍🏫 Teacher
                </button>
                <button
                  onClick={() => { setEmail('student1@jnanasetu.com'); setPassword('password123'); }}
                  className="px-3 py-2 text-xs font-medium bg-violet-50 text-violet-700 border border-violet-200 rounded-lg hover:bg-violet-100 transition-all"
                >
                  🎒 Student
                </button>
              </div>
            </div>
          </div>

          {/* Sign up link */}
          <p className="text-center mt-6 text-sm text-gray-500">
            Don't have an account?{' '}
            <Link to="/signup" className="text-violet-600 font-semibold hover:underline">
              Sign up free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
