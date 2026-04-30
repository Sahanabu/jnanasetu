// Path: frontend/src/components/dashboard/StudentDrawer.jsx
import React, { useState, useEffect } from 'react';
import { getCardsByStudent } from '../../db/cards.js';
import { getEventsByStudent } from '../../db/events.js';

export default function StudentDrawer({ student, onClose }) {
  const [cards, setCards] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [studentCards, studentEvents] = await Promise.all([
          getCardsByStudent(student.studentId),
          getEventsByStudent(student.studentId),
        ]);
        setCards(studentCards || []);
        setEvents(studentEvents || []);
      } catch (error) {
        console.error('Failed to load student data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [student.studentId]);

  const getGapBadge = (gapType) => {
    const badges = {
      conceptual: { label: 'Conceptual', color: 'bg-red-100 text-red-700 border-red-200' },
      procedural: { label: 'Procedural', color: 'bg-amber-100 text-amber-700 border-amber-200' },
      careless: { label: 'Careless', color: 'bg-blue-100 text-blue-700 border-blue-200' },
      overconfidence: { label: 'Overconfident', color: 'bg-purple-100 text-purple-700 border-purple-200 animate-pulse' },
    };
    return badges[gapType] || { label: gapType || 'Unknown', color: 'bg-gray-100 text-gray-600 border-gray-200' };
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Drawer */}
      <div className="relative w-full max-w-sm bg-white h-full overflow-y-auto shadow-2xl animate-slideUp">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-violet-100 rounded-full flex items-center justify-center text-2xl">
                🎒
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800">{student.name}</h2>
                <p className="text-sm text-gray-500">{student.studentId}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
            >
              ✕
            </button>
          </div>

          {/* Recent Events */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-700 mb-3">Recent Answers</h3>
            {loading ? (
              <div className="text-center py-4">
                <div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : events.length === 0 ? (
              <p className="text-gray-400 text-sm">No events recorded yet</p>
            ) : (
              <div className="space-y-2">
                {events.slice(0, 5).map((event) => {
                  const badge = getGapBadge(event.gapType);
                  return (
                    <div key={event.eventId} className="flex items-center gap-2 p-2 rounded-xl bg-gray-50">
                      <div className={`flex-1 min-w-0`}>
                        <p className="text-sm font-medium text-gray-700 truncate">
                          {event.topic || 'Unknown topic'}
                        </p>
                        <p className="text-xs text-gray-400">
                          {event.correct ? '✅ Correct' : '❌ Wrong'} · Confidence: {event.confidence}/5
                        </p>
                      </div>
                      {event.gapType && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${badge.color}`}>
                          {badge.label}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Upcoming Reviews */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-700 mb-3">Upcoming Reviews</h3>
            {loading ? (
              <div className="text-center py-4">
                <div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : cards.length === 0 ? (
              <p className="text-gray-400 text-sm">No review cards</p>
            ) : (
              <div className="space-y-2">
                {cards.slice(0, 5).map((card) => {
                  const isDue = new Date(card.nextReview) <= new Date();
                  return (
                    <div key={card.cardId} className="flex items-center gap-2 p-2 rounded-xl bg-gray-50">
                      <div className={`w-2 h-2 rounded-full ${isDue ? 'bg-red-500' : 'bg-emerald-400'}`} />
                      <div className="flex-1">
                        <p className="text-sm text-gray-700">{card.topic}</p>
                        <p className="text-xs text-gray-400">
                          {isDue ? '🔴 Due now' : `Next: ${new Date(card.nextReview).toLocaleDateString()}`}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400">EF: {card.ef?.toFixed(1)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Flag for Intervention */}
          <button
            onClick={() => {
              alert(`Student ${student.name} flagged for teacher intervention.`);
            }}
            className="w-full py-3 rounded-full bg-red-50 border-2 border-red-200 text-red-600 font-medium hover:bg-red-100 transition-all"
          >
            🚩 Flag for Intervention
          </button>
        </div>
      </div>
    </div>
  );
}
