// Path: frontend/src/pages/LandingPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import logo from '../assets/visuals/logo.png';

export default function LandingPage() {
  const navigate = useNavigate();
  const { darkMode, toggleTheme } = useTheme();
  const { isAuthenticated, user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      icon: '🧠',
      title: 'AI-Powered Learning',
      desc: 'Adaptive algorithms personalize content to each student\'s unique learning pace and style.',
      color: 'from-violet-500 to-purple-600',
      link: '/learn',
      linkText: 'Try Learning →'
    },
    {
      icon: '📚',
      title: 'Smart Content',
      desc: 'Upload any textbook PDF and get AI-transcribed chapters with interactive quizzes.',
      color: 'from-blue-500 to-indigo-600',
      link: '/ai-tutor',
      linkText: 'Upload PDF →'
    },
    {
      icon: '📊',
      title: 'Teacher Insights',
      desc: 'AI identifies strong & weak students, providing actionable insights for targeted intervention.',
      color: 'from-emerald-500 to-teal-600',
      link: '/teacher',
      linkText: 'View Dashboard →'
    },
    {
      icon: '🌍',
      title: 'Multi-Language',
      desc: 'Learn in English, Hindi, or Kannada with culturally relevant content.',
      color: 'from-amber-500 to-orange-600',
      link: '/signup',
      linkText: 'Select Language →'
    },
    {
      icon: '🎯',
      title: 'Gap Detection',
      desc: 'Smart detection of conceptual, procedural, and careless mistakes with personalized remediation.',
      color: 'from-rose-500 to-pink-600',
      link: '/my-insights',
      linkText: 'See My Gaps →'
    },
    {
      icon: '💬',
      title: 'AI Tutor Chat',
      desc: 'Ask questions naturally and get instant, contextual explanations from your AI tutor.',
      color: 'from-cyan-500 to-sky-600',
      link: '/ai-tutor',
      linkText: 'Chat Now →'
    },
  ];

  const stats = [
    { value: '10K+', label: 'Active Students' },
    { value: '500+', label: 'Teachers' },
    { value: '50K+', label: 'Questions Solved' },
    { value: '98%', label: 'Satisfaction Rate' },
  ];

  const testimonials = [
    {
      name: 'Priya Sharma',
      role: 'Mathematics Teacher',
      quote: 'JnanaSetu\'s AI insights helped me identify which students needed extra attention. My class performance improved by 40% in just 2 months!',
      avatar: '👩‍🏫',
    },
    {
      name: 'Arjun Kumar',
      role: 'Grade 7 Student',
      quote: 'I love how the AI tutor explains things in a way I understand. My math grades went from C to A!',
      avatar: '🎒',
    },
    {
      name: 'Dr. Meera Reddy',
      role: 'School Principal',
      quote: 'The admin dashboard gives me complete visibility into our school\'s learning ecosystem. A game-changer for educational management.',
      avatar: '🏫',
    },
  ];

  return (
    <div className="min-h-screen transition-colors duration-300">
      {/* ─── Navigation ─── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <img src={logo} alt="Logo" className="w-8 h-8 object-contain" />
              <span className="text-xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                JnanaSetu
              </span>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="ml-auto mr-4 p-2 bg-gray-100 dark:bg-slate-800 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 transition-all"
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-sm text-gray-600 hover:text-violet-600 transition-colors">Features</a>
              <a href="#how-it-works" className="text-sm text-gray-600 hover:text-violet-600 transition-colors">How It Works</a>
              <a href="#testimonials" className="text-sm text-gray-600 hover:text-violet-600 transition-colors">Testimonials</a>
              {isAuthenticated ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">Hi, {user?.name}</span>
                  <button
                    onClick={() => {
                      const role = user?.role;
                      if (role === 'admin') navigate('/admin');
                      else if (role === 'teacher') navigate('/teacher');
                      else navigate('/learn');
                    }}
                    className="px-4 py-2 text-sm font-medium bg-violet-600 text-white rounded-full hover:bg-violet-700 transition-all"
                  >
                    Dashboard
                  </button>
                  <button onClick={logout} className="text-sm text-gray-500 hover:text-red-500 transition-colors">
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => navigate('/login')}
                    className="px-4 py-2 text-sm font-medium text-violet-600 hover:bg-violet-50 rounded-full transition-all"
                  >
                    Log In
                  </button>
                  <button
                    onClick={() => navigate('/signup')}
                    className="px-5 py-2 text-sm font-medium bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-full hover:shadow-lg hover:shadow-violet-200 transition-all"
                  >
                    Get Started Free
                  </button>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden pb-4 space-y-2">
              <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-sm text-gray-600 hover:bg-violet-50 rounded-lg">Features</a>
              <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-sm text-gray-600 hover:bg-violet-50 rounded-lg">How It Works</a>
              <a href="#testimonials" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-sm text-gray-600 hover:bg-violet-50 rounded-lg">Testimonials</a>
              {isAuthenticated ? (
                <>
                  <button onClick={() => { setMobileMenuOpen(false); navigate('/learn'); }} className="w-full text-left px-3 py-2 text-sm text-violet-600 font-medium">Dashboard</button>
                  <button onClick={logout} className="w-full text-left px-3 py-2 text-sm text-red-500">Logout</button>
                </>
              ) : (
                <>
                  <button onClick={() => { setMobileMenuOpen(false); navigate('/login'); }} className="w-full text-left px-3 py-2 text-sm text-gray-600">Log In</button>
                  <button onClick={() => { setMobileMenuOpen(false); navigate('/signup'); }} className="w-full text-left px-3 py-2 text-sm text-violet-600 font-medium">Get Started Free</button>
                </>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* ─── Hero Section ─── */}
      <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-white to-indigo-50" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-violet-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
        <div className="absolute top-40 right-10 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-violet-100 rounded-full text-sm text-violet-700 font-medium mb-6"
            >
              <span className="w-2 h-2 bg-violet-500 rounded-full animate-pulse" />
              AI-Powered Adaptive Learning Platform
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-6xl lg:text-7xl font-bold text-gray-900 leading-tight mb-6"
            >
              Bridge the Gap in
              <span className="block bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                K-12 Education
              </span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed"
            >
              JnanaSetu (ज्ञानसेतु) — the "Knowledge Bridge" — uses AI to personalize learning,
              empower teachers with data-driven insights, and make quality education accessible to every Indian student.
            </motion.p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => navigate('/signup')}
                className="w-full sm:w-auto px-8 py-4 text-lg font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-full hover:shadow-xl hover:shadow-violet-200 hover:scale-105 transition-all duration-300"
              >
                🚀 Start Learning Free
              </button>
              <button
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto px-8 py-4 text-lg font-semibold text-violet-600 bg-white border-2 border-violet-200 rounded-full hover:bg-violet-50 hover:border-violet-300 transition-all duration-300"
              >
                👩‍🏫 I'm a Teacher
              </button>
            </div>

            <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-gray-500">
              <span className="flex items-center gap-2">✅ No credit card required</span>
              <span className="flex items-center gap-2">📱 Works on all devices</span>
              <span className="flex items-center gap-2">🔒 Secure & private</span>
            </div>
          </div>

          {/* Hero mockup */}
          <div className="mt-16 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent z-10" />
            <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden max-w-5xl mx-auto">
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <span className="ml-2 text-xs text-gray-400">JnanaSetu Dashboard</span>
              </div>
              <div className="p-4 md:p-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-violet-50 rounded-xl p-4 border border-violet-100">
                    <div className="text-2xl mb-2">📊</div>
                    <div className="text-sm font-semibold text-gray-700">Student Progress</div>
                    <div className="text-xs text-gray-500">Real-time tracking</div>
                  </div>
                  <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                    <div className="text-2xl mb-2">🤖</div>
                    <div className="text-sm font-semibold text-gray-700">AI Insights</div>
                    <div className="text-xs text-gray-500">Smart recommendations</div>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                    <div className="text-2xl mb-2">🎯</div>
                    <div className="text-sm font-semibold text-gray-700">Gap Analysis</div>
                    <div className="text-xs text-gray-500">Targeted intervention</div>
                  </div>
                </div>
                <div className="h-32 bg-gradient-to-r from-violet-100 via-indigo-100 to-purple-100 rounded-xl flex items-center justify-center">
                  <span className="text-gray-400 text-sm">Interactive Learning Dashboard Preview</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Stats Section ─── */}
      <section className="py-16 bg-gradient-to-r from-violet-600 to-indigo-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-sm text-violet-200">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features Section ─── */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Excel
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              From AI-powered tutoring to teacher insights — JnanaSetu provides a complete learning ecosystem.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -5 }}
                className="group relative bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-xl hover:border-violet-100 transition-all duration-300"
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-4">{feature.desc}</p>
                <button 
                  onClick={() => navigate(isAuthenticated ? feature.link : '/signup')}
                  className="mt-auto text-sm font-semibold text-violet-600 hover:text-violet-700 transition-colors flex items-center"
                >
                  {feature.linkText}
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How JnanaSetu Works
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Three simple steps to transform your learning experience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Sign Up & Set Up', desc: 'Create your account as a student, teacher, or admin. No complex setup needed.', icon: '📝' },
              { step: '02', title: 'Learn & Practice', desc: 'Students learn with AI-powered content, adaptive quizzes, and instant feedback.', icon: '🧠' },
              { step: '03', title: 'Track & Improve', desc: 'Teachers get AI insights on student performance. Admins manage the entire ecosystem.', icon: '📈' },
            ].map((item, i) => (
              <div key={i} className="relative text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-2xl flex items-center justify-center text-3xl">
                  {item.icon}
                </div>
                <div className="text-sm font-bold text-violet-600 mb-2">Step {item.step}</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Role Cards ─── */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Designed for Everyone
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Whether you're a student, teacher, or administrator — JnanaSetu has you covered.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Student */}
            <div className="bg-white rounded-2xl p-8 border-2 border-violet-100 hover:border-violet-300 transition-all hover:shadow-xl">
              <div className="text-4xl mb-4">🎒</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">For Students</h3>
              <p className="text-sm text-gray-500 mb-6">Personalized learning journey with AI tutor support.</p>
              <ul className="space-y-3 mb-8">
                {['AI-powered adaptive quizzes', 'Instant feedback & explanations', 'Multi-language support', 'Progress tracking', 'Gamified learning'].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="text-emerald-500">✓</span> {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate('/signup?role=student')}
                className="w-full py-3 text-sm font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-full hover:shadow-lg transition-all"
              >
                Start Learning →
              </button>
            </div>

            {/* Teacher */}
            <div className="bg-white rounded-2xl p-8 border-2 border-indigo-100 hover:border-indigo-300 transition-all hover:shadow-xl md:scale-105 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold rounded-full">
                MOST POPULAR
              </div>
              <div className="text-4xl mb-4">👩‍🏫</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">For Teachers</h3>
              <p className="text-sm text-gray-500 mb-6">AI-powered insights to identify strong & weak students.</p>
              <ul className="space-y-3 mb-8">
                {['AI student strength analysis', 'Gap detection & intervention', 'Class performance dashboard', 'Individual student reports', 'Chat & communicate with students'].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="text-emerald-500">✓</span> {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate('/signup?role=teacher')}
                className="w-full py-3 text-sm font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full hover:shadow-lg transition-all"
              >
                Teach with AI →
              </button>
            </div>

            {/* Admin */}
            <div className="bg-white rounded-2xl p-8 border-2 border-emerald-100 hover:border-emerald-300 transition-all hover:shadow-xl">
              <div className="text-4xl mb-4">⚙️</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">For Admins</h3>
              <p className="text-sm text-gray-500 mb-6">Complete control over users, mappings, and data.</p>
              <ul className="space-y-3 mb-8">
                {['User management (CRUD)', 'Teacher-student mapping', 'System-wide analytics', 'Database management', 'Role-based access control'].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="text-emerald-500">✓</span> {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3 text-sm font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-full hover:shadow-lg transition-all"
              >
                Admin Login →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section id="testimonials" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              What People Say
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Join thousands of educators and students who love JnanaSetu.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-3xl">{t.avatar}</div>
                  <div>
                    <div className="font-semibold text-gray-800">{t.name}</div>
                    <div className="text-xs text-gray-500">{t.role}</div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed italic">"{t.quote}"</p>
                <div className="mt-4 flex text-amber-400">
                  {'★'.repeat(5)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA Section ─── */}
      <section className="py-20 bg-gradient-to-r from-violet-600 to-indigo-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Transform Education?
          </h2>
          <p className="text-lg text-violet-200 mb-8 max-w-2xl mx-auto">
            Join JnanaSetu today and be part of the learning revolution. Free for students and teachers.
          </p>
          <button
            onClick={() => navigate('/signup')}
            className="px-10 py-4 text-lg font-semibold bg-white text-violet-600 rounded-full hover:shadow-xl hover:scale-105 transition-all duration-300"
          >
            🚀 Get Started Free
          </button>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src={logo} alt="Logo" className="w-6 h-6 object-contain" />
                <span className="text-lg font-bold text-white">JnanaSetu</span>
              </div>
              <p className="text-sm">AI-powered adaptive learning platform for Indian K-12 students.</p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Platform</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">For</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Students</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Teachers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Schools</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Administrators</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Connect</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 pt-8 border-t border-gray-800 text-center text-sm">
            <p>© 2026 JnanaSetu. All rights reserved. Made with ❤️ for Indian Education.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
