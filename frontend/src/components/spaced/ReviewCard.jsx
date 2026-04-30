// Path: frontend/src/components/spaced/ReviewCard.jsx
import React, { useState } from 'react';

export default function ReviewCard({ card, onComplete }) {
  const [showAnswer, setShowAnswer] = useState(false);
  const [quality, setQuality] = useState(null);

  const handleRate = (q) => {
    setQuality(q);
    onComplete(q);
  };

  const getDifficultyLabel = (q) => {
    const labels = ['', 'Forgot', 'Hard', 'Okay', 'Easy', 'Perfect'];
    return labels[q] || '';
  };

  const getDifficultyColor = (q) => {
    const colors = ['', 'bg-red-500', 'bg-orange-500', 'bg-amber-400', 'bg-emerald-400', 'bg-green-500'];
    return colors[q] || '';
  };

  return (
    <div className="card animate-pop">
      {/* Card front */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium">
            {card.topic}
          </span>
          {card.subtopic && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {card.subtopic}
            </span>
          )}
        </div>
        <p className="text-lg font-semibold text-gray-800">
          {card.question || 'Review this concept'}
        </p>
      </div>

      {/* Show answer button */}
      {!showAnswer ? (
        <button
          onClick={() => setShowAnswer(true)}
          className="w-full py-3 rounded-full bg-violet-600 text-white font-medium hover:bg-violet-700 transition-all mb-4"
        >
          Show Answer
        </button>
      ) : (
        <>
          {/* Answer */}
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4 mb-4">
            <p className="text-sm text-emerald-700 font-medium">
              {card.correctAnswer || 'Answer not available'}
            </p>
          </div>

          {/* Quality rating */}
          <div className="mb-2">
            <p className="text-sm font-medium text-gray-600 mb-2">How well did you remember?</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((q) => (
                <button
                  key={q}
                  onClick={() => handleRate(q)}
                  disabled={quality !== null}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
                    quality === q
                      ? `${getDifficultyColor(q)} text-white`
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  } ${quality !== null ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {getDifficultyLabel(q)}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Card metadata */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span>Reps: {card.n || 0}</span>
          <span>EF: {card.ef?.toFixed(1) || '2.5'}</span>
          <span>Interval: {card.interval || 0}d</span>
        </div>
        <div className="text-xs text-gray-400">
          {card.lastReview
            ? `Last: ${new Date(card.lastReview).toLocaleDateString()}`
            : 'New card'}
        </div>
      </div>
    </div>
  );
}
