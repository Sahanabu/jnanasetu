// Path: frontend/src/components/learning/SocraticNudge.jsx
import React from 'react';

export default function SocraticNudge({ hint, onSelfFixed, onStillStuck }) {
  return (
    <div className="card animate-slideUp border-amber-300 bg-amber-50">
      <div className="text-center mb-4">
        <div className="text-4xl mb-2">💡</div>
        <h3 className="text-lg font-bold text-amber-800">Think about this...</h3>
      </div>

      <div className="bg-white rounded-2xl p-4 mb-6 border border-amber-200">
        <p className="text-gray-700 text-base italic">
          "{hint || 'Think carefully about what the question is asking. Can you explain your reasoning?'}"
        </p>
      </div>

      <div className="space-y-3">
        <button
          onClick={onSelfFixed}
          className="btn-primary w-full"
        >
          💡 I see my mistake! Let me fix it
        </button>
        <button
          onClick={onStillStuck}
          className="btn-secondary w-full"
        >
          🤔 I'm still stuck — show me the explanation
        </button>
      </div>
    </div>
  );
}
