// Path: frontend/src/pages/DashboardPage.jsx
import React, { useState, useEffect, useContext } from 'react';
import { StudentContext } from '../context/StudentContext.jsx';
import { getAllEvents } from '../db/events.js';
import { getAllCards } from '../db/cards.js';
import StatCard from '../components/dashboard/StatCard.jsx';
import GapHeatmap from '../components/dashboard/GapHeatmap.jsx';
import StudentDrawer from '../components/dashboard/StudentDrawer.jsx';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

function useDashboardData() {
  const [data, setData] = useState({
    students: [],
    heatmapData: [],
    topMisconception: null,
    overconfidenceAlerts: [],
    masteryRate: 0,
    loading: true,
    error: null,
  });

  useEffect(() => {
    async function fetchData() {
      try {
        // Try backend first
        if (navigator.onLine) {
          try {
            const response = await fetch(`${BACKEND_URL}/api/events/class/default/gaps`);
            if (response.ok) {
              const backendData = await response.json();
              setData({ ...backendData, loading: false, error: null });
              return;
            }
          } catch (e) {
            console.warn('Backend fetch failed, falling back to IndexedDB:', e);
          }
        }

        // Fallback: read from IndexedDB
        const events = await getAllEvents();
        const cards = await getAllCards();

        // Process events
        const studentMap = {};
        const topicGapMap = {};
        let totalReviews = 0;
        let qualityReviews = 0;
        const overconfidenceAlerts = [];

        for (const event of events) {
          // Track students
          if (!studentMap[event.studentId]) {
            studentMap[event.studentId] = {
              studentId: event.studentId,
              name: event.studentId.replace('student_', 'Student '),
              recentEvents: [],
            };
          }
          studentMap[event.studentId].recentEvents.push(event);

          // Track gap types per topic
          if (event.topic && event.gapType) {
            if (!topicGapMap[event.topic]) {
              topicGapMap[event.topic] = { conceptual: 0, procedural: 0, careless: 0, unknown: 0 };
            }
            if (topicGapMap[event.topic][event.gapType] !== undefined) {
              topicGapMap[event.topic][event.gapType]++;
            }
          }

          // Track overconfidence
          if (event.gapType === 'overconfidence') {
            overconfidenceAlerts.push(event);
          }
        }

        // Build heatmap data
        const heatmapData = Object.entries(topicGapMap).map(([topic, gaps]) => {
          const total = gaps.conceptual + gaps.procedural + gaps.careless + gaps.unknown;
          return {
            topic,
            conceptualPercent: total > 0 ? Math.round((gaps.conceptual / total) * 100) : 0,
            proceduralPercent: total > 0 ? Math.round((gaps.procedural / total) * 100) : 0,
            carelessPercent: total > 0 ? Math.round((gaps.careless / total) * 100) : 0,
          };
        });

        // Find top misconception
        let topMisconception = null;
        let maxCount = 0;
        for (const [topic, gaps] of Object.entries(topicGapMap)) {
          for (const [gapType, count] of Object.entries(gaps)) {
            if (count > maxCount) {
              maxCount = count;
              topMisconception = { topic, gapType, count };
            }
          }
        }

        // Calculate mastery rate from cards
        for (const card of cards) {
          totalReviews++;
          if (card.n >= 3 && card.ef >= 2.0) {
            qualityReviews++;
          }
        }

        setData({
          students: Object.values(studentMap),
          heatmapData,
          topMisconception,
          overconfidenceAlerts,
          masteryRate: totalReviews > 0 ? Math.round((qualityReviews / totalReviews) * 100) : 0,
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error('Dashboard data error:', error);
        setData((prev) => ({ ...prev, loading: false, error: error.message }));
      }
    }

    fetchData();
  }, []);

  return data;
}

export default function DashboardPage() {
  const { student } = useContext(StudentContext);
  const dashboard = useDashboardData();
  const [selectedStudent, setSelectedStudent] = useState(null);

  if (dashboard.loading) {
    return (
      <div className="min-h-screen bg-violet-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (dashboard.error) {
    return (
      <div className="min-h-screen bg-violet-50 flex items-center justify-center px-6">
        <div className="card text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h3 className="font-bold text-gray-800 mb-2">Error loading dashboard</h3>
          <p className="text-gray-500 text-sm">{dashboard.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-violet-50">
      <div className="max-w-md mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Teacher Dashboard</h1>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatCard
            icon="🧠"
            label="Top Gap"
            value={dashboard.topMisconception?.gapType || 'N/A'}
            subtext={dashboard.topMisconception?.topic || ''}
            color="bg-amber-50 border-amber-200"
          />
          <StatCard
            icon="⚠️"
            label="Alerts"
            value={dashboard.overconfidenceAlerts.length}
            subtext="overconfidence"
            color="bg-red-50 border-red-200"
          />
          <StatCard
            icon="⭐"
            label="Mastery"
            value={`${dashboard.masteryRate}%`}
            subtext="rate"
            color="bg-emerald-50 border-emerald-200"
          />
        </div>

        {/* Gap heatmap */}
        {dashboard.heatmapData.length > 0 && (
          <div className="mb-6">
            <h2 className="font-semibold text-gray-700 mb-3">Gap Analysis by Topic</h2>
            <GapHeatmap data={dashboard.heatmapData} />
          </div>
        )}

        {/* Student list */}
        <div className="mb-6">
          <h2 className="font-semibold text-gray-700 mb-3">
            Students ({dashboard.students.length})
          </h2>
          <div className="space-y-3">
            {dashboard.students.map((s) => (
              <button
                key={s.studentId}
                onClick={() => setSelectedStudent(s)}
                className="card w-full text-left hover:border-violet-300 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center text-lg">
                    🎒
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">{s.name}</p>
                    <p className="text-xs text-gray-500">
                      {s.recentEvents.length} events
                    </p>
                  </div>
                  <div className="text-violet-400">→</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Student drawer */}
        {selectedStudent && (
          <StudentDrawer
            student={selectedStudent}
            onClose={() => setSelectedStudent(null)}
          />
        )}
      </div>
    </div>
  );
}
