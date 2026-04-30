// Path: frontend/src/pages/LearnPage.jsx
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { StudentContext } from '../context/StudentContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useAnimations } from '../context/AnimationContext.jsx';
import { getAvailableModules, preloadFractionsModule, loadModule } from '../services/moduleLoader.js';
import LearningLoop from '../components/learning/LearningLoop.jsx';
import StudentInsights from '../components/learning/StudentInsights.jsx';
import GamificationBanner from '../components/learning/GamificationBanner.jsx';
import LanguageSelector from '../components/learning/LanguageSelector.jsx';
import AutoTranslate from '../components/common/AutoTranslate.jsx';
import { useTranslation } from '../i18n/index.js';
import { useTheme } from '../context/ThemeContext.jsx';
import logo from '../assets/visuals/logo.png';

export default function LearnPage() {
  const t = useTranslation();
  const { darkMode, toggleTheme } = useTheme();
  const { animationsEnabled, toggleAnimations } = useAnimations();
  const { student } = useContext(StudentContext);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [modules, setModules] = useState([]);
  const [selectedModule, setSelectedModule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingModule, setLoadingModule] = useState(false);
  const [error, setError] = useState(null);
  const [moduleComplete, setModuleComplete] = useState(false);
  const [sessionStats, setSessionStats] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const { token } = useAuth();
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => {
    async function loadModules() {
      try {
        // Preload fractions module for offline demo
        await preloadFractionsModule();
        const available = await getAvailableModules();
        setModules(available);
      } catch (err) {
        console.error('Failed to load modules:', err);
        setError('Failed to load modules');
      } finally {
        setLoading(false);
      }
    }
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

    loadModules();
    if (token) loadUnreadCount();
  }, [token]);

  const handleModuleClick = async (module) => {
    setLoadingModule(true);
    try {
      const fullModule = await loadModule(module.moduleId);
      setSelectedModule(fullModule);
    } catch (err) {
      console.error('Failed to load module:', err);
      alert('Failed to load module');
    } finally {
      setLoadingModule(false);
    }
  };

  const handleAIGenerate = async (mod) => {
    setLoadingModule(true);
    try {
      const fullModule = await loadModule(mod.moduleId);
      setModules(prev => prev.map(m => 
        m.moduleId === mod.moduleId ? { ...m, downloadedAt: new Date().toISOString() } : m
      ));
      alert(`${mod.chapter} is now available offline!`);
    } catch (err) {
      console.error('Failed to generate offline module:', err);
      alert('Failed to generate offline module');
    } finally {
      setLoadingModule(false);
    }
  };

  const toggleSelection = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const handleBulkDownload = async () => {
    setLoadingModule(true);
    let successCount = 0;
    for (const id of selectedIds) {
      try {
        await loadModule(id);
        successCount++;
      } catch (err) {
        console.error(`Failed to download ${id}:`, err);
      }
    }
    
    const available = await getAvailableModules();
    setModules(available);
    setSelectionMode(false);
    setSelectedIds(new Set());
    setLoadingModule(false);
    alert(`Successfully downloaded ${successCount} modules for offline use.`);
  };

  const normalizeSubject = (s) => {
    const normalized = s?.toLowerCase().trim() || 'others';
    if (normalized === 'mathematics' || normalized === 'math' || normalized === 'maths') return 'mathematics';
    if (normalized === 'science' || normalized === 'evs') return 'science';
    if (normalized === 'social science' || normalized === 'social' || normalized === 'social studies') return 'social studies';
    if (normalized === 'english' || normalized === 'lit' || normalized === 'language') return 'english';
    return normalized;
  };

  // Group modules by Subject > Textbook > Chapter > Topic
  const groupedModules = useMemo(() => {
    console.log('[LearnPage] Processing modules for grouping:', modules);
    const result = modules.reduce((acc, mod) => {
      if (!mod) return acc;
      const subject = normalizeSubject(mod.subject);
      if (!acc[subject]) acc[subject] = { textbooks: {}, standalone: [] };
      
      const isTextbook = mod.type === 'textbook' || mod.moduleId?.includes('textbook');
      const isChapter = mod.type === 'chapter' || (!isTextbook && mod.moduleId?.includes('_')); 
      const isTopic = mod.type === 'topic';

      if (isChapter || isTopic) {
        const parentId = mod.parentModuleId || (isChapter ? (mod.moduleId.split('_').slice(0, 2).join('_') + '_textbook') : 'standalone');
        
        // Ensure textbook entry exists
        if (!acc[subject].textbooks[parentId]) {
          const tbInfo = modules.find(m => m.moduleId === parentId);
          acc[subject].textbooks[parentId] = { 
            info: tbInfo || { chapter: parentId.replace(/_/g, ' '), moduleId: parentId, type: 'textbook', subject },
            chapters: {} 
          };
        }
        
        const chapterId = isChapter ? mod.moduleId : (mod.parentChapterId || 'misc');
        
        // Ensure chapter entry exists
        if (!acc[subject].textbooks[parentId].chapters[chapterId]) {
          const chInfo = isChapter ? mod : (modules.find(m => m.moduleId === chapterId) || mod);
          acc[subject].textbooks[parentId].chapters[chapterId] = {
            info: chInfo,
            topics: []
          };
        }
        
        if (isTopic) {
          acc[subject].textbooks[parentId].chapters[chapterId].topics.push(mod);
        }
      } else if (isTextbook) {
        if (!acc[subject].textbooks[mod.moduleId]) {
          acc[subject].textbooks[mod.moduleId] = { info: mod, chapters: {} };
        } else {
          acc[subject].textbooks[mod.moduleId].info = mod;
        }
      } else {
        acc[subject].standalone.push(mod);
      }
      return acc;
    }, {});
    console.log('[LearnPage] Grouped modules result:', result);
    return result;
  }, [modules]);

  if (selectedModule) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <button
              onClick={() => setSelectedModule(null)}
              className="flex items-center gap-2 text-gray-600 hover:text-violet-600 transition-colors group"
            >
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-violet-100">
                ←
              </div>
              <span className="font-medium"><AutoTranslate>Back to Modules</AutoTranslate></span>
            </button>
            <div className="text-center flex-1 pr-10">
              <AutoTranslate as="h2" className="text-lg font-bold text-gray-800">
                {selectedModule.chapter}
              </AutoTranslate>
              <AutoTranslate as="p" className="text-xs text-gray-400">
                {selectedModule.subject} · Grade {selectedModule.grade}
              </AutoTranslate>
            </div>
          </div>
        </header>

        <main className="py-8">
          {moduleComplete ? (
            <div className="max-w-xl mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-[2.5rem] p-8 text-center shadow-2xl shadow-violet-200/50"
              >
                <div className="text-6xl mb-4">🏆</div>
                <AutoTranslate as="h2" className="text-3xl font-black text-gray-900 mb-2">Great Progress!</AutoTranslate>
                <AutoTranslate as="p" className="text-gray-500 mb-8">
                  You've completed this learning session. Your insights have been saved.
                </AutoTranslate>
                
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="p-4 bg-violet-50 rounded-3xl">
                    <div className="text-2xl font-black text-violet-600">{sessionStats?.correctCount || 0}</div>
                    <AutoTranslate as="div" className="text-xs text-violet-400 font-bold uppercase tracking-wider">Correct</AutoTranslate>
                  </div>
                  <div className="p-4 bg-fuchsia-50 rounded-3xl">
                    <div className="text-2xl font-black text-fuchsia-600">{sessionStats?.totalAnswered || 0}</div>
                    <AutoTranslate as="div" className="text-xs text-fuchsia-400 font-bold uppercase tracking-wider">Total</AutoTranslate>
                  </div>
                </div>

                <StudentInsights student={student} module={selectedModule} sessionStats={sessionStats} />

                <button
                  onClick={() => {
                    setSelectedModule(null);
                    setModuleComplete(false);
                  }}
                  className="w-full mt-8 py-4 bg-violet-600 text-white rounded-2xl font-black shadow-xl shadow-violet-200 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <AutoTranslate>Back to Dashboard</AutoTranslate>
                </button>
              </motion.div>
            </div>
          ) : (
            <LearningLoop
              module={selectedModule}
              onComplete={(stats) => {
                setSessionStats(stats);
                setModuleComplete(true);
              }}
            />
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen transition-colors duration-300">
      {/* Premium Navigation Header */}
      <nav className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-gray-100 dark:border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-lg shadow-gray-100 dark:shadow-none p-2 border border-gray-100 dark:border-slate-700">
              <img src={logo} alt="JS" className="w-full h-full object-contain" />
            </div>
            <div>
              <AutoTranslate as="h1" className="text-xl font-black text-gray-900 dark:text-white tracking-tight">JnanaSetu</AutoTranslate>
              <AutoTranslate as="p" className="text-[10px] font-bold text-violet-500 dark:text-violet-400 uppercase tracking-widest">Offline Learning</AutoTranslate>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-3 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl hover:border-violet-200 dark:hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/30 transition-all group shadow-sm"
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              <span className="text-xl">{darkMode ? '☀️' : '🌙'}</span>
            </button>

            <LanguageSelector />
            
            <button
              onClick={() => navigate('/messages')}
              className="relative p-3 bg-white border border-gray-100 rounded-2xl hover:border-violet-200 hover:bg-violet-50 transition-all group"
            >
              <span className="text-xl">💬</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-fuchsia-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">
                  {unreadCount}
                </span>
              )}
            </button>

            <div className="h-10 w-[1px] bg-gray-100 mx-2" />

            <div className="flex items-center gap-3 pl-2">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-black text-gray-900">{student?.name || 'Student'}</div>
                <div className="text-[10px] font-bold text-gray-400 uppercase">Grade {student?.grade || 7}</div>
              </div>
              <button
                onClick={logout}
                className="w-10 h-10 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center hover:bg-red-50 hover:border-red-100 hover:text-red-600 transition-all"
              >
                <span className="text-lg">🚪</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <GamificationBanner student={student} />

        {/* Dashboard Actions */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-12">
          <div>
            <AutoTranslate as="h2" className="text-4xl font-black text-gray-900 mb-2">Learn</AutoTranslate>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <AutoTranslate as="p" className="text-gray-500 font-medium">Ready for your next session?</AutoTranslate>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => setSelectionMode(!selectionMode)}
              className={`flex-1 md:flex-none px-6 py-3 rounded-2xl font-black transition-all ${
                selectionMode 
                ? 'bg-fuchsia-100 text-fuchsia-600 ring-2 ring-fuchsia-200' 
                : 'bg-white border border-gray-100 text-gray-600 hover:border-violet-200 shadow-sm'
              }`}
            >
              {selectionMode ? 'Cancel Selection' : 'Bulk Download'}
            </button>
            {selectionMode && selectedIds.size > 0 && (
              <button
                onClick={handleBulkDownload}
                className="flex-1 md:flex-none px-8 py-3 bg-violet-600 text-white rounded-2xl font-black shadow-lg shadow-violet-200 hover:scale-105 transition-all"
              >
                Download {selectedIds.size}
              </button>
            )}
            <button
              onClick={() => navigate('/library')}
              className="flex-1 md:flex-none px-8 py-3 bg-white border-2 border-violet-100 text-violet-600 rounded-2xl font-black hover:bg-violet-50 transition-all flex items-center justify-center gap-2 group"
            >
              📚 Manage Library
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-64 bg-white rounded-[2.5rem] border border-gray-100 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-600 p-8 rounded-[2.5rem] border border-red-100 text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <p className="font-bold">{error}</p>
          </div>
        ) : (
          <div className="space-y-16">
            {Object.entries(groupedModules).map(([subject, data]) => (
              <section key={subject} className="animate-fade-in">
                <div className="flex items-center gap-4 mb-8">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm ${
                    (() => {
                      switch(subject) {
                        case 'mathematics': return 'bg-violet-100 text-violet-600';
                        case 'science': return 'bg-emerald-100 text-emerald-600';
                        case 'social studies': return 'bg-amber-100 text-amber-600';
                        case 'english': return 'bg-blue-100 text-blue-600';
                        default: return 'bg-gray-100 text-gray-600';
                      }
                    })()
                  }`}>
                    {(() => {
                      switch(subject) {
                        case 'mathematics': return '📐';
                        case 'science': return '🔬';
                        case 'social studies': return '🌍';
                        case 'english': return '📖';
                        default: return '📚';
                      }
                    })()}
                  </div>
                  <div>
                    <AutoTranslate as="h3" className="text-2xl font-black text-gray-900 capitalize">{subject}</AutoTranslate>
                    <AutoTranslate as="p" className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                      {Object.keys(data.textbooks).length} Textbooks · {data.standalone.length} Standalone
                    </AutoTranslate>
                  </div>
                </div>

                {/* Textbooks and Chapters Hierarchy */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {Object.entries(data.textbooks).map(([tbId, tbData]) => (
                    <div key={tbId} className="bg-white rounded-[3rem] p-8 border border-gray-100 shadow-sm hover:shadow-xl hover:border-violet-100 transition-all duration-500">
                      <div className="flex items-start justify-between mb-8">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-3xl">📕</div>
                          <div>
                            <AutoTranslate as="h4" className="text-xl font-black text-gray-900 leading-tight">
                              {tbData.info?.fileName || tbData.info?.chapter || 'Textbook'}
                            </AutoTranslate>
                            <p className="text-xs text-gray-400">
                              {Object.keys(tbData.chapters).length} Chapters
                            </p>
                          </div>
                        </div>
                        <div className="px-4 py-2 bg-gray-50 rounded-xl text-[10px] font-black text-gray-400 uppercase tracking-wider">
                          Ready Offline
                        </div>
                      </div>

                      <div className="space-y-4">
                        {Object.entries(tbData.chapters).map(([chId, chData]) => (
                          <div 
                            key={chId} 
                            className="group relative bg-[#FAFAFC] rounded-[2rem] p-5 hover:bg-violet-50 transition-all cursor-pointer border border-transparent hover:border-violet-100"
                            onClick={() => !selectionMode && handleModuleClick(chData.info)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-xl shadow-sm group-hover:scale-110 transition-transform">
                                  {subject === 'mathematics' ? '📐' : '🔬'}
                                </div>
                                <div>
                                  <AutoTranslate as="h5" className="text-sm font-black text-gray-800">
                                    {chData.info.chapter}
                                  </AutoTranslate>
                                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                   {(chData.info.questions?.length || chData.info.questionCount || 0) > 0
                                     ? `${chData.info.questions?.length || chData.info.questionCount} questions · ${chData.topics?.length || 0} topics`
                                     : (chData.topics?.length || 0) > 0
                                     ? `${chData.topics.length} topics`
                                     : 'Tap to start learning'}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {selectionMode ? (
                                  <div 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleSelection(chData.info.moduleId);
                                    }}
                                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                                      selectedIds.has(chData.info.moduleId) 
                                      ? 'bg-violet-600 border-violet-600 text-white' 
                                      : 'border-gray-200'
                                    }`}
                                  >
                                    {selectedIds.has(chData.info.moduleId) && '✓'}
                                  </div>
                                ) : (
                                  <>
                                    {!chData.info.downloadedAt ? (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleAIGenerate(chData.info);
                                        }}
                                        className="w-10 h-10 rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-200 flex items-center justify-center hover:scale-110 transition-transform"
                                        title="Generate Offline Module"
                                      >
                                        ✨
                                      </button>
                                    ) : (
                                      <div className="w-10 h-10 rounded-xl bg-green-100 text-green-600 flex items-center justify-center text-sm">
                                        ✅
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Standalone Modules in this Subject */}
                {data.standalone.length > 0 && (
                  <div className="mt-12">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="h-[1px] flex-1 bg-gray-100" />
                      <AutoTranslate as="span" className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">Standalone Modules</AutoTranslate>
                      <div className="h-[1px] flex-1 bg-gray-100" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {data.standalone.map(mod => (
                        <div
                          key={mod.moduleId}
                          onClick={() => !selectionMode && handleModuleClick(mod)}
                          className={`group relative bg-white rounded-[2.5rem] p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:border-violet-100 transition-all cursor-pointer ${selectionMode && 'ring-2 ring-violet-100'}`}
                        >
                          <div className="flex items-start justify-between mb-6">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-sm ${
                              (() => {
                                switch(normalizeSubject(mod.subject)) {
                                  case 'mathematics': return 'bg-violet-50 text-violet-600';
                                  case 'science': return 'bg-emerald-50 text-emerald-600';
                                  default: return 'bg-gray-50 text-gray-600';
                                }
                              })()
                            }`}>
                              {normalizeSubject(mod.subject) === 'mathematics' ? '📐' : '🔬'}
                            </div>
                            
                            {selectionMode ? (
                              <div 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSelection(mod.moduleId);
                                }}
                                className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all ${
                                  selectedIds.has(mod.moduleId) 
                                  ? 'bg-violet-600 border-violet-600 text-white' 
                                  : 'border-gray-200'
                                }`}
                              >
                                {selectedIds.has(mod.moduleId) && '✓'}
                              </div>
                            ) : (
                              <>
                                {!mod.downloadedAt ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAIGenerate(mod);
                                    }}
                                    className="w-12 h-12 rounded-2xl bg-violet-600 text-white shadow-xl shadow-violet-200 flex items-center justify-center hover:rotate-12 transition-transform"
                                  >
                                    ✨
                                  </button>
                                ) : (
                                  <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center shadow-sm">
                                    ✅
                                  </div>
                                )}
                              </>
                            )}
                          </div>

                          <AutoTranslate as="h3" className="text-xl font-black text-gray-900 mb-2 leading-tight">
                            {mod.chapter}
                          </AutoTranslate>
                          
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </main>

      {/* Global Loading Overlay */}
      <AnimatePresence>
        {loadingModule && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white/80 backdrop-blur-md z-50 flex flex-col items-center justify-center"
          >
            <div className="relative">
              <div className="w-24 h-24 border-4 border-violet-100 rounded-full" />
              <div className="absolute top-0 left-0 w-24 h-24 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-2xl">✨</div>
            </div>
            <AutoTranslate as="p" className="mt-6 text-violet-600 font-black tracking-widest uppercase text-xs animate-pulse">
              Optimizing Learning Engine...
            </AutoTranslate>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
