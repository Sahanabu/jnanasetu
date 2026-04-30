// Path: frontend/src/components/learning/QuestionCard.jsx
import React, { useState } from 'react';
import AutoTranslate from '../common/AutoTranslate.jsx';

export default function QuestionCard({ question, onSubmit, disabled }) {
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!answer.trim()) {
      setError('Please enter an answer before continuing.');
      return;
    }
    setError('');
    onSubmit(answer.trim());
  };

  return (
    <div className="card animate-slideUp">
      <div className="flex items-center gap-2 mb-4">
        <span className="bg-violet-100 text-violet-700 text-xs font-semibold px-3 py-1 rounded-full">
          {question.difficulty || 'medium'}
        </span>
      </div>

      <AutoTranslate as="h2" className="text-xl font-bold text-gray-800 mb-6">
        {question.question}
      </AutoTranslate>


      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <AutoTranslate as="label" className="block text-sm font-medium text-gray-600 mb-2">
            Your answer:
          </AutoTranslate>
          <input
            type="text"
            value={answer}
            onChange={(e) => {
              setAnswer(e.target.value);
              setError('');
            }}
            placeholder="Type your answer here..."
            className="input-field"
            disabled={disabled}
            autoFocus
          />
          {error && (
            <p className="text-red-500 text-sm mt-1">{error}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={disabled || !answer.trim()}
          className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {disabled ? <AutoTranslate>Submitting...</AutoTranslate> : <><AutoTranslate>Check Answer</AutoTranslate> →</>}
        </button>
      </form>
    </div>
  );
}
