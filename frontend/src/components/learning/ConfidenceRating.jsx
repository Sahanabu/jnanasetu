// Path: frontend/src/components/learning/ConfidenceRating.jsx
import React, { useState } from 'react';

const ratings = [
  { value: 1, label: 'Pure guess', emoji: '😕', color: 'bg-red-100 border-red-300 hover:bg-red-200' },
  { value: 2, label: 'Not sure', emoji: '🤔', color: 'bg-orange-100 border-orange-300 hover:bg-orange-200' },
  { value: 3, label: 'Pretty sure', emoji: '🙂', color: 'bg-yellow-100 border-yellow-300 hover:bg-yellow-200' },
  { value: 4, label: 'Very confident', emoji: '😊', color: 'bg-blue-100 border-blue-300 hover:bg-blue-200' },
  { value: 5, label: 'Totally sure!', emoji: '🤩', color: 'bg-emerald-100 border-emerald-300 hover:bg-emerald-200' },
];

export default function ConfidenceRating({ question, studentAnswer, onRate, loading }) {
  const [selected, setSelected] = useState(null);

  const handleRate = (value) => {
    setSelected(value);
    onRate(value);
  };

  return (
    <div className="card animate-slideUp">
      <div className="text-center mb-6">
        <div className="text-4xl mb-2">📝</div>
        <h3 className="text-lg font-bold text-gray-800">How sure are you?</h3>
        <p className="text-gray-500 text-sm mt-1">
          Your answer: <span className="font-semibold text-violet-600">{studentAnswer}</span>
        </p>
      </div>

      <div className="space-y-3">
        {ratings.map((r) => (
          <button
            key={r.value}
            onClick={() => handleRate(r.value)}
            disabled={loading || selected !== null}
            className={`w-full p-4 rounded-2xl border-2 transition-all duration-200 flex items-center gap-3
              ${selected === r.value ? 'ring-2 ring-violet-600 scale-[1.02]' : ''}
              ${r.color}
              ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <span className="text-2xl">{r.emoji}</span>
            <div className="text-left">
              <span className="font-semibold text-gray-800">{r.label}</span>
              <div className="flex gap-1 mt-1">
                {Array.from({ length: 5 }, (_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full ${
                      i < r.value ? 'bg-violet-600' : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
            </div>
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-center mt-4">
          <div className="inline-flex items-center gap-2 text-violet-600">
            <div className="w-4 h-4 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Analyzing...</span>
          </div>
        </div>
      )}
    </div>
  );
}
