// Path: frontend/src/components/learning/PeerPrompt.jsx
import React, { useState } from 'react';

const topicRubrics = {
  fractions: {
    keywords: ['denominator', 'numerator', 'common', 'fraction', 'divide', 'multiply', 'equal', 'whole', 'part', 'piece'],
    hint: 'denominator, numerator, common, fraction',
  },
  default: {
    keywords: ['explain', 'because', 'step', 'method', 'reason', 'understand', 'concept'],
    hint: 'explain, because, step, method',
  },
};

function canProceed(answer, rubric) {
  const words = answer.trim().split(/\s+/).filter(Boolean);
  const hasLength = words.length >= 10;
  const hasKeyword = rubric.keywords.some((k) =>
    answer.toLowerCase().includes(k.toLowerCase())
  );
  return hasLength && hasKeyword;
}

export default function PeerPrompt({ topic, onSubmit }) {
  const [answer, setAnswer] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const rubric = topicRubrics[topic] || topicRubrics.default;
  const canSubmit = canProceed(answer, rubric);

  const handleSubmit = () => {
    if (!canSubmit) {
      setShowHint(true);
      return;
    }
    setSubmitted(true);
    onSubmit(answer);
  };

  if (submitted) {
    return (
      <div className="card text-center p-8 animate-pop">
        <div className="text-5xl mb-4">✅</div>
        <h3 className="text-xl font-bold text-emerald-600 mb-2">Excellent explanation!</h3>
        <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full">
          <span className="text-lg">+10 XP</span>
        </div>
        <p className="text-gray-500 mt-4">
          Teaching others helps you learn better!
        </p>
      </div>
    );
  }

  return (
    <div className="card animate-slideUp">
      <div className="text-center mb-4">
        <div className="text-4xl mb-2">👩‍🏫</div>
        <h3 className="text-lg font-bold text-gray-800">
          Explain this to a friend
        </h3>
        <p className="text-gray-500 text-sm mt-1">
          Pretend you're teaching a classmate. How would you explain this concept?
        </p>
      </div>

      <textarea
        value={answer}
        onChange={(e) => {
          setAnswer(e.target.value);
          setShowHint(false);
        }}
        placeholder="Type your explanation here (at least 10 words)..."
        className="input-field min-h-[120px] resize-none"
        rows={4}
      />

      {showHint && (
        <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl p-3 animate-pop">
          <p className="text-amber-700 text-sm">
            💡 Try mentioning: <span className="font-semibold">{rubric.hint}</span>
          </p>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm text-gray-400">
          {answer.trim().split(/\s+/).filter(Boolean).length} words
        </span>
        <button
          onClick={handleSubmit}
          disabled={!answer.trim()}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Submit Explanation →
        </button>
      </div>
    </div>
  );
}
