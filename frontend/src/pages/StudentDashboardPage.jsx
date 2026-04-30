import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { StudentContext } from '../context/StudentContext.jsx';
import StudentInsights from '../components/learning/StudentInsights.jsx';
import GamificationBanner from '../components/learning/GamificationBanner.jsx';
import LanguageSelector from '../components/learning/LanguageSelector.jsx';
import { useTranslation } from '../i18n/index.js';
import { syncPendingEvents } from '../services/sync.js';
import { getAllUnsyncedEvents } from '../db/events.js';
import { motion } from 'framer-motion';

export default function StudentDashboardPage() {
  const t = useTranslation();
  const { student } = useContext(StudentContext);
  const { logout, token } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    async function loadUnreadCount() {
      try {
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/messages/contacts`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const contacts = await res.json();
          const count = contacts.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
          setUnreadCount(count);
        }
      } catch (err) {}
    }
    if (token) loadUnreadCount();

    const checkUnsynced = async () => {
      const unsynced = await getAllUnsyncedEvents();
      setUnsyncedCount(unsynced.length);
    };
    checkUnsynced();
    const interval = setInterval(checkUnsynced, 5000);
    return () => clearInterval(interval);
  }, [token]);

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      await syncPendingEvents();
      const unsynced = await getAllUnsyncedEvents();
      setUnsyncedCount(unsynced.length);
    } catch (err) {
      console.error('Manual sync failed', err);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📊</span>
              <div>
                <h1 className="text-lg font-bold text-gray-800">{t('my_analytics')}</h1>
                <p className="text-xs text-gray-500">{t('track_learning_progress')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <LanguageSelector />
              <button
                onClick={() => navigate('/messages')}
                className="relative flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                💬 {t('messages')}
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                )}
              </button>
              <button
                onClick={() => navigate('/learn')}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                ← {t('back_to_learning')}
              </button>
              <button onClick={logout} className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-all font-medium">
                {t('logout')}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Gamification Stats */}
        <GamificationBanner />

        {/* Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 to-indigo-700 rounded-[2rem] p-8 sm:p-12 mb-10 shadow-2xl shadow-indigo-200">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-400/20 rounded-full blur-2xl -ml-10 -mb-10" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-white text-xs font-bold uppercase tracking-widest mb-4"
              >
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                Learning Command Center
              </motion.div>
              <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-4">
                {student?.name ? `${student.name}'s Dashboard` : t('your_performance_overview')}
              </h2>
              <p className="text-indigo-100 text-lg font-medium max-w-xl">
                {t('ai_gap_desc')}
              </p>
            </div>

            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-white/20">
                  🏆
                </div>
                <div>
                  <div className="text-white font-black text-2xl">Level {student?.level || 1}</div>
                  <div className="text-indigo-200 text-xs font-bold uppercase tracking-wider">{student?.xp || 0} Total XP</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Insights Panel (takes up 2/3 of screen on desktop) */}
          <div className="lg:col-span-2">
            <StudentInsights student={student} />
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions Card */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/learn')}
                  className="w-full py-3 px-4 flex items-center justify-between bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors font-medium shadow-sm"
                >
                  <span>Continue Learning</span>
                  <span>→</span>
                </button>
                <button
                  onClick={() => navigate('/ai-tutor')}
                  className="w-full py-3 px-4 flex items-center justify-between bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium shadow-sm"
                >
                  <span>Ask AI Tutor</span>
                  <span>🤖</span>
                </button>
                
                {/* Sync Status Button */}
                <button
                  onClick={handleManualSync}
                  disabled={syncing}
                  className={`w-full py-3 px-4 flex items-center justify-between rounded-xl transition-all font-medium border-2 ${
                    unsyncedCount > 0 
                      ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' 
                      : 'bg-emerald-50 border-emerald-100 text-emerald-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={syncing ? 'animate-spin' : ''}>{unsyncedCount > 0 ? '🔄' : '✅'}</span>
                    <span>{syncing ? 'Syncing...' : unsyncedCount > 0 ? `Sync Data (${unsyncedCount})` : 'Data Synced'}</span>
                  </div>
                  {unsyncedCount > 0 && (
                    <motion.span 
                      animate={{ x: [0, 5, 0] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="text-[10px] font-bold bg-amber-200 px-2 py-0.5 rounded-full"
                    >
                      NEEDS SYNC
                    </motion.span>
                  )}
                </button>
              </div>
              {unsyncedCount > 0 && (
                <p className="text-[10px] text-gray-400 mt-3 text-center">
                  Sync your data to update your teacher's dashboard.
                </p>
              )}
            </div>
            
            {/* Info Card */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
              <h3 className="font-bold text-indigo-900 mb-2 flex items-center gap-2">
                <span>🧠</span> How AI Gap Detection Works
              </h3>
              <p className="text-sm text-indigo-700 leading-relaxed mb-3">
                Instead of just marking answers right or wrong, our AI analyzes *why* you made a mistake:
              </p>
              <ul className="space-y-2 text-sm text-indigo-800/80">
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">•</span>
                  <span><strong>Conceptual:</strong> You misunderstood the core theory.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 font-bold">•</span>
                  <span><strong>Procedural:</strong> You missed a step in the process.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 font-bold">•</span>
                  <span><strong>Careless:</strong> You knew it, but made a silly mistake.</span>
                </li>
              </ul>
            </div>

            {/* State Textbooks Card */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span>📚</span> State Textbooks
              </h3>
              <div className="space-y-3">
                <a
                  href="https://textbooks.karnataka.gov.in/textbooks/en"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full py-3 px-4 text-sm bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors font-medium border border-blue-200"
                >
                  Class 1 to 10 Textbooks →
                </a>
                <a
                  href="https://pue.karnataka.gov.in/167/TEXT%20BOOKS/en"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full py-3 px-4 text-sm bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100 transition-colors font-medium border border-emerald-200"
                >
                  PUC (Class 11-12) Textbooks →
                </a>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
