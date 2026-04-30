// Path: frontend/src/components/learning/StudentInsights.jsx
import React, { useState, useEffect } from 'react';
import { getEventsByStudent } from '../../db/events.js';

/**
 * StudentInsights - Shows comprehensive learning analytics
 * 
 * Features:
 * - Per-question insight history (not just aggregated)
 * - Concept-level breakdown with accuracy per concept
 * - Gap type distribution with trend analysis
 * - Personalized recommendations based on performance
 * - Session-by-session progress tracking
 */

export default function StudentInsights({ student, module, sessionStats }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'concepts' | 'history'
  const [mentors, setMentors] = useState([]);
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

  useEffect(() => {
    async function loadInsights() {
      if (!student?.studentId) {
        setLoading(false);
        return;
      }
      try {
        const events = await getEventsByStudent(student.studentId);
        
        // Filter events for this module's topic
        const moduleEvents = module?.topic 
          ? events.filter(e => e.topic === module.topic)
          : events;

        if (moduleEvents.length === 0 && !sessionStats) {
          setInsights({ status: 'no_data' });
          setLoading(false);
          return;
        }

        // Use session stats if available (real-time), otherwise compute from DB
        const totalAttempts = sessionStats?.totalAnswered || moduleEvents.length;
        const correctCount = sessionStats?.correctCount || moduleEvents.filter(e => e.correct).length;
        const accuracy = totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0;

        // Gap analysis
        const gapCounts = { conceptual: 0, procedural: 0, careless: 0, unknown: 0 };
        const gapHistory = sessionStats?.gapHistory || [];
        
        if (sessionStats?.gapHistory) {
          // Use real-time session stats
          sessionStats.gapHistory.forEach(g => {
            if (g.gapType && gapCounts[g.gapType] !== undefined) {
              gapCounts[g.gapType]++;
            }
          });
        } else {
          moduleEvents.forEach(e => {
            if (e.gapType && gapCounts[e.gapType] !== undefined) {
              gapCounts[e.gapType]++;
            }
          });
        }

        // Concept-level breakdown
        const conceptStats = sessionStats?.conceptStats || {};
        if (!sessionStats?.conceptStats) {
          moduleEvents.forEach(e => {
            const concept = e.subtopic || 'general';
            if (!conceptStats[concept]) {
              conceptStats[concept] = { total: 0, correct: 0 };
            }
            conceptStats[concept].total++;
            if (e.correct) conceptStats[concept].correct++;
          });
        }

        // Recent trend (last 10 events)
        const recentEvents = moduleEvents.slice(-10);
        const recentCorrect = recentEvents.filter(e => e.correct).length;
        const recentAccuracy = recentEvents.length > 0 
          ? Math.round((recentCorrect / recentEvents.length) * 100) 
          : accuracy;

        // Dominant gap
        const dominantGap = Object.entries(gapCounts)
          .sort((a, b) => b[1] - a[1])
          .find(([_, count]) => count > 0);

        // Strength level
        let strengthLevel;
        if (accuracy >= 80) strengthLevel = 'strong';
        else if (accuracy >= 60) strengthLevel = 'average';
        else if (accuracy >= 40) strengthLevel = 'developing';
        else strengthLevel = 'needs_attention';

        // Generate personalized recommendations
        const recommendations = generateRecommendations({
          accuracy,
          dominantGap: dominantGap?.[0],
          gapCounts,
          conceptStats,
          strengthLevel,
        });

        setInsights({
          status: 'analyzed',
          metrics: {
            totalAttempts,
            accuracy,
            correctCount,
            gapCounts,
            dominantGap: dominantGap ? { type: dominantGap[0], count: dominantGap[1] } : null,
            recentAccuracy,
            strengthLevel,
            conceptStats,
            gapHistory: moduleEvents.map(e => ({
              concept: e.subtopic || 'General',
              correct: e.correct,
              gapType: e.gapType,
              confidence: e.confidence,
              date: e.date
            })).sort((a, b) => new Date(b.date) - new Date(a.date)),
            recommendations,
          },
        });
      } catch (error) {
        console.error('Error loading student insights:', error);
        setInsights({ status: 'error' });
      } finally {
        setLoading(false);
      }
    }
    async function loadMentors() {
      if (!module?.topic || !student?.grade) return;
      try {
        const res = await fetch(`${BACKEND_URL}/api/insights/peer-mentors/${module.topic}?grade=${student.grade}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) {
          const data = await res.json();
          setMentors(data.mentors || []);
        }
      } catch (err) {
        console.error('Failed to load mentors:', err);
      }
    }

    loadInsights();
    loadMentors();
  }, [student?.studentId, module?.topic, sessionStats]);

  const generateRecommendations = ({ accuracy, dominantGap, gapCounts, conceptStats, strengthLevel }) => {
    const recs = [];

    // Accuracy-based recommendation
    if (accuracy >= 80) {
      recs.push({
        type: 'positive',
        icon: '🌟',
        text: 'Excellent progress! You\'re mastering this topic.',
        action: 'Try more advanced problems or move to the next topic.',
      });
    } else if (accuracy >= 60) {
      recs.push({
        type: 'encourage',
        icon: '📈',
        text: 'Good foundation! A bit more practice will solidify your understanding.',
        action: 'Focus on the concepts where you made mistakes.',
      });
    } else {
      recs.push({
        type: 'focus',
        icon: '🎯',
        text: 'Keep practicing! Understanding takes time.',
        action: 'Review the explanations and try similar problems again.',
      });
    }

    // Gap-based recommendation
    if (dominantGap === 'conceptual') {
      recs.push({
        type: 'gap',
        icon: '🧠',
        text: 'You have conceptual gaps in understanding.',
        action: 'Watch video explanations and read the theory before attempting more problems.',
      });
    } else if (dominantGap === 'procedural') {
      recs.push({
        type: 'gap',
        icon: '🔧',
        text: 'You understand the concepts but miss steps in execution.',
        action: 'Write down each step and practice the procedure systematically.',
      });
    } else if (dominantGap === 'careless') {
      recs.push({
        type: 'gap',
        icon: '👀',
        text: 'Most mistakes are careless errors - you know the material!',
        action: 'Slow down, double-check your work, and verify each step.',
      });
    }

    // Concept-specific recommendations
    const weakConcepts = Object.entries(conceptStats || {})
      .filter(([_, stats]) => stats.total >= 2 && (stats.correct / stats.total) < 0.5)
      .map(([concept]) => concept);

    if (weakConcepts.length > 0) {
      recs.push({
        type: 'concept',
        icon: '📚',
        text: `Focus on these concepts: ${weakConcepts.join(', ')}`,
        action: 'Review the material for these specific topics.',
      });
    }

    return recs;
  };

  if (loading) {
    return (
      <div className="card p-6 text-center">
        <div className="w-8 h-8 border-3 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500">Loading your progress...</p>
      </div>
    );
  }

  if (!insights || insights.status === 'no_data') {
    return (
      <div className="card p-6 text-center">
        <div className="text-3xl mb-3">📊</div>
        <h3 className="font-semibold text-gray-800 mb-1">No Progress Yet</h3>
        <p className="text-sm text-gray-500">
          Complete some questions to see your learning insights!
        </p>
      </div>
    );
  }

  const { metrics } = insights;
  const getAccuracyColor = (val) => {
    if (val >= 70) return 'text-emerald-600';
    if (val >= 50) return 'text-amber-600';
    return 'text-red-600';
  };

  const getAccuracyBg = (val) => {
    if (val >= 70) return 'bg-emerald-500';
    if (val >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getStrengthEmoji = (level) => {
    const map = {
      strong: '🌟',
      average: '✅',
      developing: '📈',
      needs_attention: '⚠️',
    };
    return map[level] || '❓';
  };

  const getGapEmoji = (type) => {
    const map = {
      conceptual: '🧠',
      procedural: '🔧',
      careless: '👀',
      unknown: '❓',
    };
    return map[type] || '❓';
  };

  const getGapLabel = (type) => {
    const map = {
      conceptual: 'Conceptual',
      procedural: 'Procedural',
      careless: 'Careless',
      unknown: 'Unknown',
    };
    return map[type] || type;
  };

  const renderOverview = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Left Column: Accuracy & Core Stats */}
      <div>
        {/* Accuracy ring */}
        <div className="flex items-center justify-center mb-6">
          <div className="relative w-32 h-32 sm:w-40 sm:h-40">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#f3f4f6" strokeWidth="6" />
              <circle
                cx="50" cy="50" r="42"
                fill="none"
                stroke={metrics.accuracy >= 70 ? '#10b981' : metrics.accuracy >= 50 ? '#f59e0b' : '#ef4444'}
                strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 42}`}
                strokeDashoffset={`${2 * Math.PI * 42 * (1 - metrics.accuracy / 100)}`}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl sm:text-4xl font-black ${getAccuracyColor(metrics.accuracy)}`}>
                {metrics.accuracy}%
              </span>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Accuracy</span>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white border border-gray-100 rounded-2xl p-4 text-center shadow-sm">
            <div className="text-xl font-black text-gray-800">{metrics.totalAttempts}</div>
            <div className="text-[10px] text-gray-400 font-bold uppercase">Questions</div>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-4 text-center shadow-sm">
            <div className="text-xl font-black text-emerald-600">{metrics.correctCount}</div>
            <div className="text-[10px] text-gray-400 font-bold uppercase">Correct</div>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-4 text-center shadow-sm">
            <div className="text-xl font-black text-amber-600">{metrics.totalAttempts - metrics.correctCount}</div>
            <div className="text-[10px] text-gray-400 font-bold uppercase">To Review</div>
          </div>
        </div>

        {/* Recent accuracy bar */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm mb-6">
          <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
            <span>Recent Performance</span>
            <span className={getAccuracyColor(metrics.recentAccuracy)}>{metrics.recentAccuracy}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${getAccuracyBg(metrics.recentAccuracy)}`}
              style={{ width: `${metrics.recentAccuracy}%` }}
            />
          </div>
          <p className="text-[10px] text-gray-400 mt-2">Based on your last 10 interactions</p>
        </div>

        {/* Gap breakdown */}
        {Object.entries(metrics.gapCounts).filter(([_, count]) => count > 0).length > 0 && (
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4">Error Pattern Analysis</p>
            <div className="space-y-4">
              {Object.entries(metrics.gapCounts)
                .filter(([_, count]) => count > 0)
                .map(([type, count]) => (
                  <div key={type} className="flex items-center gap-4">
                    <span className="text-xs font-bold text-gray-500 w-24">{getGapLabel(type)}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          type === 'conceptual' ? 'bg-red-400' :
                          type === 'procedural' ? 'bg-amber-400' :
                          type === 'careless' ? 'bg-blue-400' : 'bg-gray-400'
                        }`}
                        style={{
                          width: `${(count / metrics.totalAttempts) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs font-black text-gray-800 w-6 text-right">{count}</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Right Column: Insights & Recommendations */}
      <div className="space-y-6">
        {/* Dominant gap Hero */}
        {metrics.dominantGap && (
          <div className="bg-gradient-to-br from-red-50 to-orange-50 border border-red-100 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-3xl shadow-sm">
                {getGapEmoji(metrics.dominantGap.type)}
              </div>
              <div>
                <span className="text-xs font-bold text-red-600 uppercase tracking-widest">Primary Focus Area</span>
                <h4 className="text-xl font-black text-red-800 leading-tight">
                  {getGapLabel(metrics.dominantGap.type)} Errors
                </h4>
              </div>
            </div>
            <p className="text-sm text-red-700 leading-relaxed">
              We've identified {metrics.dominantGap.count} specific instances where your understanding or execution could be improved.
            </p>
          </div>
        )}

        {/* Personalized recommendations */}
        {metrics.recommendations?.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Smart Action Plan</p>
            {metrics.recommendations.map((rec, i) => (
              <div key={i} className={`rounded-2xl p-4 border-2 transition-all hover:scale-[1.02] ${
                rec.type === 'positive' ? 'bg-emerald-50 border-emerald-100 shadow-emerald-50' :
                rec.type === 'encourage' ? 'bg-blue-50 border-blue-100 shadow-blue-50' :
                rec.type === 'focus' ? 'bg-amber-50 border-amber-100 shadow-amber-50' :
                rec.type === 'gap' ? 'bg-red-50 border-red-100 shadow-red-50' :
                'bg-violet-50 border-violet-100 shadow-violet-50'
              }`}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-2xl shadow-sm flex-shrink-0">
                    {rec.icon}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">{rec.text}</p>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{rec.action}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Peer Learning Prompts */}
        {mentors.length > 0 && (
          <div className="bg-gradient-to-br from-violet-50 to-fuchsia-50 border border-violet-100 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-xl shadow-sm">
                🤝
              </div>
              <div>
                <p className="text-[10px] font-bold text-violet-600 uppercase tracking-widest">Collaborative Learning</p>
                <h4 className="text-sm font-black text-violet-800">Talk to a Peer Mentor</h4>
              </div>
            </div>
            <p className="text-xs text-violet-700 leading-relaxed mb-3">
              These classmates have recently mastered <span className="font-bold">{module?.topic || 'this topic'}</span>. They might have some great tips for you!
            </p>
            <div className="flex flex-wrap gap-2">
              {mentors.map((mentor, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-violet-100 shadow-sm">
                  <span className="text-xs font-bold text-violet-700">{mentor.name}</span>
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderConcepts = () => {
    const concepts = Object.entries(metrics.conceptStats || {});
    if (concepts.length === 0) {
      return (
        <div className="text-center py-6">
          <p className="text-sm text-gray-500">No concept data available yet.</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <p className="text-xs font-medium text-gray-600 mb-2">Performance by Concept</p>
        {concepts
          .sort((a, b) => (a[1].correct / a[1].total) - (b[1].correct / b[1].total))
          .map(([concept, stats]) => {
            const conceptAccuracy = Math.round((stats.correct / stats.total) * 100);
            return (
              <div key={concept} className="bg-white rounded-xl p-3 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {concept.replace(/_/g, ' ')}
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    conceptAccuracy >= 70 ? 'bg-emerald-100 text-emerald-700' :
                    conceptAccuracy >= 50 ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {conceptAccuracy}%
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      conceptAccuracy >= 70 ? 'bg-emerald-500' :
                      conceptAccuracy >= 50 ? 'bg-amber-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${conceptAccuracy}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  {stats.correct} correct out of {stats.total} attempts
                </p>
              </div>
            );
          })}
      </div>
    );
  };

  const renderHistory = () => {
    const history = metrics.gapHistory || [];
    if (history.length === 0) {
      return (
        <div className="text-center py-6">
          <p className="text-sm text-gray-500">No question history available yet.</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-600 mb-2">Question History</p>
        {history.map((item, i) => (
          <div key={i} className={`rounded-xl p-3 border ${
            item.correct ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>{item.correct ? '✅' : '❌'}</span>
                <div>
                  <p className="text-xs font-medium text-gray-700 capitalize">
                    {item.concept?.replace(/_/g, ' ') || 'General'}
                  </p>
                  {item.gapType && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      item.gapType === 'conceptual' ? 'bg-red-100 text-red-600' :
                      item.gapType === 'procedural' ? 'bg-orange-100 text-orange-600' :
                      item.gapType === 'careless' ? 'bg-yellow-100 text-yellow-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {item.gapType}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-[10px] text-gray-400">
                Confidence: {item.confidence}/5
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="card p-4 sm:p-8">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">{getStrengthEmoji(metrics.strengthLevel)}</span>
        <h3 className="font-bold text-gray-800">Your Learning Insights</h3>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1">
        {[
          { id: 'overview', label: 'Overview', icon: '📊' },
          { id: 'concepts', label: 'Concepts', icon: '📚' },
          { id: 'history', label: 'History', icon: '📝' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 text-xs font-medium px-3 py-2 rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-white text-violet-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'concepts' && renderConcepts()}
      {activeTab === 'history' && renderHistory()}
    </div>
  );
}
