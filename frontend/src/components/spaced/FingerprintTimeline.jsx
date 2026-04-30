// Path: frontend/src/components/spaced/FingerprintTimeline.jsx
import React from 'react';

export default function FingerprintTimeline({ cards = [], studentId }) {
  if (cards.length === 0) {
    return (
      <div className="card text-center py-4">
        <p className="text-gray-400 text-sm">No review history yet</p>
      </div>
    );
  }

  // Sort cards by nextReview date
  const sorted = [...cards].sort(
    (a, b) => new Date(a.nextReview) - new Date(b.nextReview)
  );

  const getStatusColor = (card) => {
    const now = new Date();
    const reviewDate = new Date(card.nextReview);
    const diffDays = Math.ceil((reviewDate - now) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return 'bg-red-500'; // Overdue
    if (diffDays <= 1) return 'bg-amber-500'; // Due today/tomorrow
    if (diffDays <= 7) return 'bg-blue-400'; // Due this week
    return 'bg-emerald-400'; // Due later
  };

  const getStatusLabel = (card) => {
    const now = new Date();
    const reviewDate = new Date(card.nextReview);
    const diffDays = Math.ceil((reviewDate - now) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return '🔴 Overdue';
    if (diffDays === 1) return '🟡 Tomorrow';
    if (diffDays <= 7) return `🔵 ${diffDays} days`;
    return '🟢 Later';
  };

  return (
    <div className="card">
      <h3 className="font-semibold text-gray-700 mb-3">Review Timeline</h3>
      <div className="space-y-2">
        {sorted.slice(0, 10).map((card, index) => (
          <div key={card.cardId} className="flex items-center gap-3">
            {/* Timeline dot */}
            <div className="flex flex-col items-center">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(card)}`} />
              {index < sorted.length - 1 && (
                <div className="w-0.5 h-6 bg-gray-200" />
              )}
            </div>

            {/* Card info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700 truncate">
                {card.topic || 'Unknown'}
              </p>
              <p className="text-xs text-gray-400">
                {card.subtopic || ''}
              </p>
            </div>

            {/* Status */}
            <div className="text-xs font-medium text-gray-500 whitespace-nowrap">
              {getStatusLabel(card)}
            </div>

            {/* Rep count */}
            <div className="text-xs text-gray-400 w-8 text-right">
              x{card.n || 0}
            </div>
          </div>
        ))}
      </div>

      {sorted.length > 10 && (
        <p className="text-xs text-gray-400 mt-3 text-center">
          +{sorted.length - 10} more cards
        </p>
      )}
    </div>
  );
}
