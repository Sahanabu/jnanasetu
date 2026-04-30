// Path: frontend/src/pages/TeacherDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import LanguageSelector from '../components/learning/LanguageSelector.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import AutoTranslate from '../components/common/AutoTranslate.jsx';
import { setupAutoSync } from '../services/sync.js';
import OfflineBanner from '../components/layout/OfflineBanner.jsx';
import ConceptHeatmap from '../components/teacher/ConceptHeatmap.jsx';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { user, logout, isTeacher, isAdmin, token } = useAuth();

  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentDetail, setStudentDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [perQuestionInsights, setPerQuestionInsights] = useState(null);
  const [detailTab, setDetailTab] = useState('overview'); // 'overview' | 'questions'
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [quizForm, setQuizForm] = useState({ subject: 'Mathematics', grade: 7, chapter: '', topic: '', count: 5, language: 'English', assignedTo: '' });
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [quizSuccess, setQuizSuccess] = useState('');
  const [unreadCounts, setUnreadCounts] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;


  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  useEffect(() => {
    // Allow teachers, admins, and students to view insights
    if (!isTeacher && !isAdmin && user?.role !== 'student') {
      navigate('/login');
      return;
    }
    loadInsights();
    loadUnreadCounts();
  }, [isTeacher, isAdmin, user]);

  async function loadUnreadCounts() {
    try {
      const res = await fetch(`${BACKEND_URL}/api/messages/contacts`, { headers });
      if (res.ok) {
        const data = await res.json();
        const counts = {};
        data.forEach(c => {
          counts[c._id] = c.unreadCount || 0;
        });
        setUnreadCounts(counts);
      }
    } catch (err) {
      console.error('Failed to load unread counts', err);
    }
  }

  async function loadInsights() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${BACKEND_URL}/api/insights/students`, { headers });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to load insights');
      }
      const data = await response.json();
      setInsights(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadStudentDetail(studentId) {
    setDetailLoading(true);
    setDetailTab('overview');
    setPerQuestionInsights(null);
    try {
      const [detailResponse, perQuestionResponse] = await Promise.all([
        fetch(`${BACKEND_URL}/api/insights/students/${studentId}`, { headers }),
        fetch(`${BACKEND_URL}/api/insights/students/${studentId}/per-question`, { headers }),
      ]);
      if (!detailResponse.ok) throw new Error('Failed to load student details');
      const detailData = await detailResponse.json();
      setStudentDetail(detailData);
      if (perQuestionResponse.ok) {
        const perQuestionData = await perQuestionResponse.json();
        setPerQuestionInsights(perQuestionData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  }

  const handleGenerateQuiz = async (e) => {
    e.preventDefault();
    setGeneratingQuiz(true);
    setQuizSuccess('');
    setError('');

    try {
      const response = await fetch(`${BACKEND_URL}/api/modules/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify(quizForm),
      });

      if (!response.ok) {
        throw new Error('Failed to generate quiz');
      }

      setQuizSuccess('Quiz generated successfully! Students can now see it.');
      setTimeout(() => {
        setShowQuizModal(false);
        setQuizSuccess('');
      }, 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setGeneratingQuiz(false);
    }
  };

  const getStrengthColor = (level) => {
    const colors = {
      strong: { bg: 'bg-emerald-50 border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', icon: '🌟', label: 'Strong' },
      average: { bg: 'bg-blue-50 border-blue-200', badge: 'bg-blue-100 text-blue-700', icon: '✅', label: 'Average' },
      developing: { bg: 'bg-amber-50 border-amber-200', badge: 'bg-amber-100 text-amber-700', icon: '📈', label: 'Developing' },
      needs_attention: { bg: 'bg-red-50 border-red-200', badge: 'bg-red-100 text-red-700', icon: '⚠️', label: 'Needs Attention' },
      insufficient_data: { bg: 'bg-gray-50 border-gray-200', badge: 'bg-gray-100 text-gray-600', icon: '❓', label: 'Insufficient Data' },
    };
    return colors[level] || colors.insufficient_data;
  };

  const filteredInsights = (insights?.insights || [])
    .filter((i) => {
      if (activeFilter === 'all') return true;
      return i.metrics?.strengthLevel === activeFilter;
    })
    .sort((a, b) => {
      // Primary: Level (Needs Attention > Developing > Average > Strong)
      const priorityOrder = { needs_attention: 0, developing: 1, average: 2, strong: 3, insufficient_data: 4 };
      const aOrder = priorityOrder[a.metrics?.strengthLevel || 'insufficient_data'];
      const bOrder = priorityOrder[b.metrics?.strengthLevel || 'insufficient_data'];
      
      if (aOrder !== bOrder) return aOrder - bOrder;
      
      // Secondary: Accuracy (Lower accuracy = more urgent)
      const aAcc = a.metrics?.accuracy || 0;
      const bAcc = b.metrics?.accuracy || 0;
      return aAcc - bAcc;
    });

  const totalPages = Math.ceil(filteredInsights.length / ITEMS_PER_PAGE);
  const paginatedInsights = filteredInsights.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Analyzing student data with AI...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <span className="text-2xl">👩‍🏫</span>
              <div>
                <h1 className="text-lg font-bold text-gray-800">Teacher Dashboard</h1>
                <p className="text-xs text-gray-500">{user?.name} · {user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <LanguageSelector />
              <button onClick={() => navigate('/')} className="text-sm text-gray-500 hover:text-violet-600">Home</button>
              <button onClick={logout} className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-all">Logout</button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
            ⚠️ {error}
            <button onClick={loadInsights} className="ml-2 underline">Retry</button>
          </div>
        )}

        {/* AI Insights Summary */}
        {insights && (
          <>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10">
              <div>
                <h2 className="text-3xl font-black text-gray-900 leading-tight">Class Intelligence</h2>
                <p className="text-sm text-gray-500 font-medium">
                  {insights.totalStudents} students · AI is monitoring learning gaps in real-time
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setShowQuizModal(true)} className="px-5 py-2.5 text-sm font-bold bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2">
                  ✨ Create AI Quiz
                </button>
                <button onClick={loadInsights} className="px-5 py-2.5 text-sm font-bold bg-white border border-gray-100 text-gray-600 rounded-xl hover:bg-gray-50 transition-all shadow-sm">
                  🔄 Refresh
                </button>
              </div>
            </div>

            {/* Class-wide Concept Heatmap */}
            <ConceptHeatmap 
              insights={insights} 
              onStudentClick={(student) => {
                setSelectedStudent(student);
                loadStudentDetail(student._id);
              }}
            />

            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-800">Student Breakdown</h3>
              <p className="text-sm text-gray-500">Deep dive into individual student progress</p>
            </div>

            {/* Filter chips */}
            <div className="flex flex-wrap gap-2 mb-6">
              {[
                { key: 'all', label: 'All', color: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
                { key: 'needs_attention', label: '⚠️ Needs Attention', color: 'bg-red-100 text-red-700 hover:bg-red-200' },
                { key: 'developing', label: '📈 Developing', color: 'bg-amber-100 text-amber-700 hover:bg-amber-200' },
                { key: 'average', label: '✅ Average', color: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
                { key: 'strong', label: '🌟 Strong', color: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => {
                    setActiveFilter(f.key);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
                    activeFilter === f.key ? 'ring-2 ring-violet-400 ' + f.color : f.color
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Student Cards */}
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.1 }
                }
              }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {paginatedInsights.map((item) => {
                const style = getStrengthColor(item.metrics?.strengthLevel);
                return (
                  <motion.div
                    key={item.student._id}
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      visible: { opacity: 1, y: 0 }
                    }}
                    whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                    className={`rounded-2xl border-2 p-5 cursor-pointer transition-all shadow-sm hover:shadow-xl ${style.bg}`}
                    onClick={() => {
                      setSelectedStudent(item.student);
                      loadStudentDetail(item.student._id);
                    }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-xl shadow-sm">
                          🎒
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-800 text-sm">{item.student.name}</h3>
                          <p className="text-xs text-gray-500 font-medium">Grade {item.student.grade}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${style.badge}`}>
                          {style.icon} {style.label}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('/messages');
                          }}
                          className="px-3 py-1 bg-white hover:bg-violet-600 hover:text-white rounded-lg text-[10px] font-bold text-gray-600 transition-all shadow-sm border border-gray-100 relative"
                        >
                          💬 Message
                          {unreadCounts[item.student._id] > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>
                          )}
                        </button>
                      </div>
                    </div>

                    {item.metrics ? (
                      <div className="space-y-4">
                        {/* Metrics row */}
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-2 border border-white/50">
                            <div className="text-lg font-black text-gray-900">{item.metrics.accuracy}%</div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Accuracy</div>
                          </div>
                          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-2 border border-white/50">
                            <div className="text-lg font-black text-gray-900">{item.metrics.totalAttempts}</div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Attempts</div>
                          </div>
                          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-2 border border-white/50">
                            <div className="text-lg font-black text-gray-900">{item.metrics.overconfidenceRate}%</div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Overconf.</div>
                          </div>
                        </div>

                        {/* AI Insight */}
                        <div className="bg-white/40 backdrop-blur-sm rounded-xl p-3 border border-white/30">
                          <p className="text-xs text-gray-600 leading-relaxed font-medium">
                            <span className="text-violet-600 font-bold">AI Note:</span> {item.aiInsight}
                          </p>
                        </div>

                        {/* Recommendation */}
                        <div className="text-[11px] text-gray-500 font-medium bg-gray-50/50 rounded-lg p-2 border border-gray-100">
                          💡 {item.recommendation}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <div className="text-2xl mb-2 opacity-50">⏳</div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                          {item.message || 'Analyzing Data...'}
                        </p>
                      </div>
                    )}
                  </motion.div>
                );
              })}

              {filteredInsights.length === 0 && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="col-span-full text-center py-20"
                >
                  <div className="text-6xl mb-4">🕵️‍♀️</div>
                  <p className="text-gray-400 font-bold uppercase tracking-widest">No students match this filter</p>
                </motion.div>
              )}
            </motion.div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-4">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  className="p-2 rounded-xl bg-white border border-gray-200 disabled:opacity-30 transition-all hover:bg-violet-50 text-violet-600 shadow-sm"
                >
                  <span className="text-xl">⬅️</span>
                </button>
                
                <div className="flex items-center gap-2">
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-10 h-10 rounded-xl font-bold text-sm transition-all ${
                        currentPage === i + 1 
                        ? 'bg-violet-600 text-white shadow-lg scale-110' 
                        : 'bg-white text-gray-500 hover:bg-violet-50 border border-gray-100'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="p-2 rounded-xl bg-white border border-gray-200 disabled:opacity-30 transition-all hover:bg-violet-50 text-violet-600 shadow-sm"
                >
                  <span className="text-xl">➡️</span>
                </button>
              </div>
            )}
          </>
        )}

        {/* Student Detail Modal */}
        {selectedStudent && studentDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setSelectedStudent(null)}>
            <div className="bg-white rounded-2xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-violet-100 rounded-full flex items-center justify-center text-2xl">🎒</div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-800">{studentDetail.student.name}</h2>
                      <p className="text-sm text-gray-500">Grade {studentDetail.student.grade} · {studentDetail.student.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        setQuizForm(prev => ({ ...prev, assignedTo: studentDetail.student._id, grade: studentDetail.student.grade }));
                        setShowQuizModal(true);
                      }} 
                      className="px-3 py-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg text-sm font-medium transition-colors"
                    >
                      ✨ Assign AI Quiz
                    </button>
                    <button 
                      onClick={() => navigate('/messages')} 
                      className="px-3 py-1.5 bg-violet-100 text-violet-700 hover:bg-violet-200 rounded-lg text-sm font-medium transition-colors"
                    >
                      💬 Message
                    </button>
                    <button onClick={() => setSelectedStudent(null)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">✕</button>
                  </div>
                </div>

                {/* Tab navigation */}
                <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1">
                  {[
                    { id: 'overview', label: '📊 Overview' },
                    { id: 'questions', label: '❓ Per-Question' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setDetailTab(tab.id)}
                      className={`flex-1 text-xs font-medium px-3 py-2 rounded-lg transition-all ${
                        detailTab === tab.id
                          ? 'bg-white text-violet-700 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {detailLoading ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  </div>
                ) : detailTab === 'overview' ? (
                  <div className="space-y-6">
                    {/* Overall metrics */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-violet-50 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-gray-800">{studentDetail.metrics.accuracy}%</div>
                        <div className="text-xs text-gray-500">Overall Accuracy</div>
                      </div>
                      <div className="bg-indigo-50 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-gray-800">{studentDetail.metrics.totalAttempts}</div>
                        <div className="text-xs text-gray-500">Total Attempts</div>
                      </div>
                      <div className="bg-emerald-50 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-gray-800">{studentDetail.metrics.correctCount}</div>
                        <div className="text-xs text-gray-500">Correct</div>
                      </div>
                    </div>

                    {/* Topic Mastery */}
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-3">📚 Topic Mastery</h3>
                      <div className="space-y-2">
                        {studentDetail.metrics.topicMastery?.map((topic) => (
                          <div key={topic.topic} className="bg-gray-50 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-700">{topic.topic}</span>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                topic.accuracy >= 70 ? 'bg-emerald-100 text-emerald-700' :
                                topic.accuracy >= 50 ? 'bg-amber-100 text-amber-700' :
                                'bg-red-100 text-red-700'
                              }`}>{topic.accuracy}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div className={`h-2 rounded-full transition-all ${
                                topic.accuracy >= 70 ? 'bg-emerald-500' :
                                topic.accuracy >= 50 ? 'bg-amber-500' :
                                'bg-red-500'
                              }`} style={{ width: `${topic.accuracy}%` }} />
                            </div>
                            <div className="flex justify-between mt-1 text-[10px] text-gray-400">
                              <span>{topic.attempts} attempts</span>
                              <span>Recent: {topic.recentAccuracy}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recent Events */}
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-3">📝 Recent Activity</h3>
                      <div className="space-y-2">
                        {studentDetail.recentEvents?.slice(0, 10).map((event) => (
                          <div key={event.eventId || event._id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                            <span>{event.correct ? '✅' : '❌'}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-700 truncate">{event.topic || 'Unknown topic'}</p>
                              <p className="text-xs text-gray-400">
                                {event.gapType && `Gap: ${event.gapType} · `}
                                Confidence: {event.confidence}/5
                              </p>
                            </div>
                            <span className="text-[10px] text-gray-400">
                              {new Date(event.date).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Per-Question Insights Tab */
                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-800 mb-3">❓ Per-Question Insights</h3>
                    {perQuestionInsights?.perQuestionInsights?.length > 0 ? (
                      <div className="space-y-3">
                        {perQuestionInsights.perQuestionInsights.map((q) => (
                          <div key={q.questionId} className={`rounded-xl p-4 border-2 ${
                            q.accuracy >= 70 ? 'bg-emerald-50 border-emerald-200' :
                            q.accuracy >= 50 ? 'bg-amber-50 border-amber-200' :
                            'bg-red-50 border-red-200'
                          }`}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className={`text-lg ${
                                  q.accuracy >= 70 ? '✅' : q.accuracy >= 50 ? '⚠️' : '❌'
                                }`}></span>
                                <div>
                                  <p className="text-sm font-medium text-gray-800">
                                    {q.topic} {q.subtopic && `· ${q.subtopic}`}
                                  </p>
                                  <p className="text-[10px] text-gray-400">
                                    {q.totalAttempts} attempt{q.totalAttempts !== 1 ? 's' : ''}
                                  </p>
                                </div>
                              </div>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                q.accuracy >= 70 ? 'bg-emerald-100 text-emerald-700' :
                                q.accuracy >= 50 ? 'bg-amber-100 text-amber-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {q.accuracy}%
                              </span>
                            </div>

                            {/* Accuracy bar */}
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
                              <div className={`h-1.5 rounded-full ${
                                q.accuracy >= 70 ? 'bg-emerald-500' :
                                q.accuracy >= 50 ? 'bg-amber-500' :
                                'bg-red-500'
                              }`} style={{ width: `${q.accuracy}%` }} />
                            </div>

                            {/* Trend indicator */}
                            <div className="flex items-center gap-2 text-[10px]">
                              <span className={`font-medium ${
                                q.trend === 'improved' ? 'text-emerald-600' :
                                q.trend === 'regressed' ? 'text-red-600' :
                                q.trend === 'maintained' ? 'text-blue-600' :
                                'text-gray-500'
                              }`}>
                                {q.trend === 'improved' && '📈 Improving'}
                                {q.trend === 'regressed' && '📉 Regressing'}
                                {q.trend === 'maintained' && '✅ Maintained'}
                                {q.trend === 'needs_work' && '🔧 Needs work'}
                              </span>
                              {q.dominantGap && (
                                <span className={`px-1.5 py-0.5 rounded-full ${
                                  q.dominantGap === 'conceptual' ? 'bg-red-100 text-red-600' :
                                  q.dominantGap === 'procedural' ? 'bg-orange-100 text-orange-600' :
                                  q.dominantGap === 'careless' ? 'bg-yellow-100 text-yellow-600' :
                                  'bg-gray-100 text-gray-600'
                                }`}>
                                  {q.dominantGap}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-sm text-gray-400">No per-question data available yet.</p>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          </div>
        )}

        {/* AI Quiz Generator Modal */}
        {showQuizModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowQuizModal(false)}>
            <div className="bg-white rounded-2xl w-full max-w-md mx-4 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">✨ Create AI Quiz</h2>
                <button onClick={() => setShowQuizModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>

              {quizSuccess ? (
                <div className="p-4 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl flex items-center gap-3">
                  <span className="text-2xl">✅</span>
                  <p className="font-medium">{quizSuccess}</p>
                </div>
              ) : (
                <form onSubmit={handleGenerateQuiz} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                    <input type="text" required value={quizForm.subject} onChange={(e) => setQuizForm({...quizForm, subject: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-violet-500 focus:border-violet-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
                    <input type="number" required value={quizForm.grade} onChange={(e) => setQuizForm({...quizForm, grade: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-violet-500 focus:border-violet-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Chapter Name</label>
                    <input type="text" required placeholder="e.g. Chemical Reactions" value={quizForm.chapter} onChange={(e) => setQuizForm({...quizForm, chapter: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-violet-500 focus:border-violet-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Specific Topic</label>
                    <input type="text" required placeholder="e.g. Balancing Equations" value={quizForm.topic} onChange={(e) => setQuizForm({...quizForm, topic: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-violet-500 focus:border-violet-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Number of Questions</label>
                    <input type="number" min="1" max="15" required value={quizForm.count} onChange={(e) => setQuizForm({...quizForm, count: parseInt(e.target.value)})} className="w-full px-3 py-2 border rounded-lg focus:ring-violet-500 focus:border-violet-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                    <select 
                      value={quizForm.language} 
                      onChange={(e) => setQuizForm({...quizForm, language: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-violet-500 focus:border-violet-500"
                    >
                      <option value="English">English</option>
                      <option value="Hindi">Hindi (हिन्दी)</option>
                      <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Student (Optional)</label>
                    <select 
                      value={quizForm.assignedTo} 
                      onChange={(e) => setQuizForm({...quizForm, assignedTo: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-violet-500 focus:border-violet-500"
                    >
                      <option value="">All Students (Public)</option>
                      {insights?.insights?.map(item => (
                        <option key={item.student._id} value={item.student._id}>
                          {item.student.name} (Grade {item.student.grade})
                        </option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" disabled={generatingQuiz} className="w-full py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 font-medium disabled:opacity-50">
                    {generatingQuiz ? '🤖 AI is Generating...' : 'Generate Quiz'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
