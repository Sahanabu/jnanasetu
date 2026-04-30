// Path: frontend/src/pages/ReviewQueue.jsx
import React, { useState, useEffect, useContext } from 'react';
import { StudentContext } from '../context/StudentContext.jsx';
import { getDueCards, getCard, updateCard, listCardsByStudent } from '../db/cards.js';
import { getModule } from '../db/modules.js';
import ReviewCard from '../components/spaced/ReviewCard.jsx';
import FingerprintTimeline from '../components/spaced/FingerprintTimeline.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import AutoTranslate from '../components/common/AutoTranslate.jsx';

export default function ReviewQueue() {
  const { student } = useContext(StudentContext);
  const navigate = useNavigate();
  const [dueCards, setDueCards] = useState([]);
  const [allCards, setAllCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [mode, setMode] = useState('due'); // 'due' or 'all'

  useEffect(() => {
    async function loadCards() {
      if (!student?.studentId) {
        setLoading(false);
        return;
      }
      try {
        const [due, all] = await Promise.all([
          getDueCards(student.studentId),
          listCardsByStudent(student.studentId)
        ]);
        setDueCards(due);
        setAllCards(all);
      } catch (error) {
        console.error('Failed to load cards:', error);
      } finally {
        setLoading(false);
      }
    }
    loadCards();
  }, [student]);

  const handleReviewComplete = async (quality) => {
    try {
      const card = dueCards[currentIndex];
      if (!card) return;

      const { n, ef, interval, nextReview } = scheduleSM2(quality, card.n, card.ef, card.interval);
      await updateCard(card.cardId, { n, ef, interval, nextReview, lastReview: new Date().toISOString() });

      if (currentIndex < dueCards.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        setCompleted(true);
      }
    } catch (error) {
      console.error('Failed to update card:', error);
    }
  };

  function scheduleSM2(q, n, ef, lastInterval) {
    if (q < 3) {
      n = 0;
      lastInterval = 1;
    } else {
      if (n === 0) lastInterval = 1;
      else if (n === 1) lastInterval = 6;
      else lastInterval = Math.round(lastInterval * ef);
      n += 1;
    }
    ef = Math.max(1.3, ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + lastInterval);
    return { n, ef, interval: lastInterval, nextReview: nextReview.toISOString() };
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-violet-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading review queue...</p>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-violet-50 flex items-center justify-center px-6">
        <div className="card text-center animate-pop">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">All reviews complete!</h2>
          <p className="text-gray-500 mb-6">Great job keeping up with your learning.</p>
          <button
            onClick={() => {
              setCurrentIndex(0);
              setCompleted(false);
              setLoading(true);
              // Reload
              getDueCards(student?.studentId).then(setDueCards).finally(() => setLoading(false));
            }}
            className="btn-primary"
          >
            Check for new reviews
          </button>
        </div>
      </div>
    );
  }

  if (dueCards.length === 0 && mode === 'due') {
    return (
      <div className="min-h-screen bg-violet-50 flex items-center justify-center px-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card text-center max-w-sm"
        >
          <div className="text-6xl mb-6">✨</div>
          <AutoTranslate as="h2" className="text-2xl font-bold text-gray-800 mb-2">You're All Caught Up!</AutoTranslate>
          <AutoTranslate as="p" className="text-gray-500 mb-8">
            You've mastered everything scheduled for today. Want to keep the momentum going?
          </AutoTranslate>
          
          <div className="space-y-3">
            {allCards.length > 0 && (
              <button
                onClick={() => {
                  setDueCards(allCards);
                  setMode('all');
                  setCurrentIndex(0);
                }}
                className="w-full py-4 bg-violet-600 text-white rounded-2xl font-bold shadow-lg shadow-violet-200 hover:scale-105 transition-all"
              >
                <AutoTranslate>🚀 Practice All ({allCards.length})</AutoTranslate>
              </button>
            )}
            <button
              onClick={() => navigate('/learn')}
              className="w-full py-4 bg-white text-violet-700 border-2 border-violet-100 rounded-2xl font-bold hover:bg-violet-50 transition-all"
            >
              <AutoTranslate>📚 Start New Lesson</AutoTranslate>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const currentCard = dueCards[currentIndex];

  return (
    <div className="min-h-screen bg-violet-50">
      <div className="max-w-md mx-auto px-4 py-8">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <AutoTranslate as="h1" className="text-2xl font-black text-gray-900 tracking-tight">Review Queue</AutoTranslate>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-widest mt-1">
              {mode === 'all' ? 'Mastery Mode' : 'Spaced Repetition'}
            </p>
          </div>
          <div className="bg-white px-3 py-1.5 rounded-xl border border-violet-100 shadow-sm">
            <span className="text-sm font-bold text-violet-600">
              {currentIndex + 1} <span className="text-gray-300 mx-1">/</span> {dueCards.length}
            </span>
          </div>
        </motion.div>

        {/* Progress bar */}
        <div className="w-full bg-violet-100 rounded-full h-3 mb-10 overflow-hidden shadow-inner">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${((currentIndex + 1) / dueCards.length) * 100}%` }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className="bg-gradient-to-r from-violet-500 to-fuchsia-500 h-3 rounded-full"
          />
        </div>

        <AnimatePresence mode="wait">
          {currentCard && (
            <motion.div
              key={currentCard.cardId}
              initial={{ opacity: 0, x: 50, rotate: 2 }}
              animate={{ opacity: 1, x: 0, rotate: 0 }}
              exit={{ opacity: 0, x: -50, rotate: -2 }}
              transition={{ type: "spring", stiffness: 200, damping: 25 }}
            >
              <ReviewCard
                card={currentCard}
                onComplete={handleReviewComplete}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fingerprint timeline */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 bg-white/50 backdrop-blur-sm rounded-[2rem] p-6 border border-white/50"
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">📊</span>
            <AutoTranslate as="h3" className="font-bold text-gray-800">Learning Insights</AutoTranslate>
          </div>
          <FingerprintTimeline
            cards={dueCards}
            studentId={student?.studentId}
          />
        </motion.div>
      </div>
    </div>
  );
}
