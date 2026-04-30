// Path: frontend/src/components/learning/InsightAfterAnswer.jsx
/**
 * InsightAfterAnswer - Shows personalized learning insights immediately after
 * a student answers a question. This bridges the gap between answering and
 * understanding what to focus on next.
 * 
 * Features:
 * - Per-question gap analysis visualization
 * - Confidence calibration feedback
 * - Personalized "what to focus on next" recommendation
 * - Links to related concepts for review
 * - Progress tracking per concept
 */

import React from 'react';
import ConfidenceBadge from './ConfidenceBadge.jsx';

export default function InsightAfterAnswer({
  gapResult,
  calibration,
  question,
  studentAnswer,
  sessionStats,
  onContinue,
}) {
  const isCorrect = gapResult?.gapType === null;
  const gapType = gapResult?.gapType;

  // Get gap-specific styling
  const getGapStyle = (type) => {
    const styles = {
      conceptual: {
        bg: 'bg-red-50 border-red-200',
        icon: '🧠',
        label: 'Conceptual Gap',
        text: 'text-red-700',
        badge: 'bg-red-100 text-red-700',
        tip: 'Review the core concept. Try to understand the "why" behind the correct method.',
      },
      procedural: {
        bg: 'bg-orange-50 border-orange-200',
        icon: '🔧',
        label: 'Procedural Gap',
        text: 'text-orange-700',
        badge: 'bg-orange-100 text-orange-700',
        tip: 'You understand the concept but missed a step. Practice the procedure step by step.',
      },
      careless: {
        bg: 'bg-yellow-50 border-yellow-200',
        icon: '👀',
        label: 'Careless Mistake',
        text: 'text-yellow-700',
        badge: 'bg-yellow-100 text-yellow-700',
        tip: 'You know this! Slow down and double-check your work. Take a deep breath before answering.',
      },
      unknown: {
        bg: 'bg-gray-50 border-gray-200',
        icon: '❓',
        label: 'Unclassified',
        text: 'text-gray-700',
        badge: 'bg-gray-100 text-gray-700',
        tip: 'Review the question and explanation carefully. Practice similar problems.',
      },
    };
    return styles[type] || styles.unknown;
  };

  const gapStyle = getGapStyle(gapType);

  // Generate personalized recommendation
  const getRecommendation = () => {
    if (isCorrect) {
      if (calibration?.label === 'fragile') {
        return {
          emoji: '🌱',
          text: 'You got it right but weren\'t confident. Practice more to build certainty!',
          action: 'Review similar problems to reinforce your understanding.',
        };
      }
      if (calibration?.label === 'mastered') {
        return {
          emoji: '⭐',
          text: 'Excellent mastery! You\'re ready for harder challenges.',
          action: 'Try more advanced problems in this topic.',
        };
      }
      if (calibration?.label === 'developing') {
        return {
          emoji: '🙂',
          text: 'Good progress! You\'re building confidence steadily.',
          action: 'Keep practicing to strengthen your understanding.',
        };
      }
      return {
        emoji: '✅',
        text: 'Good progress! Keep building on this foundation.',
        action: 'Move to the next concept or try a related topic.',
      };
    }

    // Wrong answer recommendations based on calibration
    if (calibration?.label === 'overconfidence') {
      return {
        emoji: '⚠️',
        text: 'You were very confident but got it wrong. This needs attention!',
        action: 'Review the concept carefully. Try explaining it to someone else.',
      };
    }
    if (calibration?.label === 'guess') {
      return {
        emoji: '🎲',
        text: 'You weren\'t sure and got it wrong. Let\'s learn this properly.',
        action: 'Start with the basics and build up step by step.',
      };
    }
    if (calibration?.label === 'partial') {
      return {
        emoji: '🤔',
        text: 'You thought you knew it, but there\'s a gap. Let\'s fix it!',
        action: 'Focus on the specific area where you made the mistake.',
      };
    }

    return {
      emoji: gapStyle.icon,
      text: gapStyle.tip,
      action: gapType === 'conceptual'
        ? 'Watch a video or read the explanation for this concept.'
        : gapType === 'procedural'
        ? 'Write down the steps and practice each one carefully.'
        : 'Take your time and verify each step before submitting.',
    };
  };


  const recommendation = getRecommendation();

  // Calculate concept progress
  const conceptProgress = sessionStats?.conceptStats?.[question?.concept];
  const conceptAccuracy = conceptProgress
    ? Math.round((conceptProgress.correct / conceptProgress.total) * 100)
    : null;

  return (
    <div className="space-y-4 animate-slideUp">
      {/* Result banner */}
      <div
        className={`card border-2 ${
          isCorrect
            ? 'bg-emerald-50 border-emerald-300'
            : `${gapStyle.bg}`
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="text-3xl">{isCorrect ? '✅' : '❌'}</span>
          <div className="flex-1">
            <h3 className="font-bold text-gray-800">
              {isCorrect ? 'Correct!' : 'Not quite right'}
            </h3>
            <p className="text-sm text-gray-600">
              Your answer: <span className="font-semibold">{studentAnswer}</span>
              {!isCorrect && (
                <>
                  {' | '}Correct:{' '}
                  <span className="font-semibold text-emerald-600">
                    {question?.correctAnswer}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Confidence calibration */}
      {calibration && (
        <div className="flex justify-center">
          <ConfidenceBadge calibration={calibration} />
        </div>
      )}

      {/* Gap analysis insight card */}
      {gapType && (
        <div className={`card border-2 ${gapStyle.bg}`}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">{gapStyle.icon}</span>
            <div>
              <h4 className="font-semibold text-gray-800">Learning Insight</h4>
              <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${gapStyle.badge}`}>
                {gapStyle.label}
              </span>
            </div>
          </div>

          {/* AI Reasoning */}
          <div className="bg-white/80 rounded-xl p-3 mb-3">
            <p className="text-sm text-gray-700">{gapResult.reasoning}</p>
          </div>

          {/* Socratic hint */}
          {gapResult.hint && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3">
              <p className="text-xs font-medium text-amber-700 mb-1">💡 Think about this:</p>
              <p className="text-sm text-amber-800 italic">"{gapResult.hint}"</p>
            </div>
          )}
        </div>
      )}

      {/* Personalized recommendation */}
      <div className="card bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200">
        <div className="flex items-start gap-3">
          <span className="text-2xl">{recommendation.emoji}</span>
          <div>
            <h4 className="font-semibold text-gray-800 text-sm mb-1">Recommendation</h4>
            <p className="text-sm text-gray-700">{recommendation.text}</p>
            <p className="text-xs text-violet-600 mt-1">{recommendation.action}</p>
          </div>
        </div>
      </div>

      {/* Concept progress */}
      {conceptAccuracy !== null && (
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-gray-700 text-sm">
              📊 Progress: {question?.concept}
            </h4>
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
          <p className="text-xs text-gray-400 mt-1">
            {conceptProgress.correct} correct out of {conceptProgress.total} attempts
          </p>
        </div>
      )}

      {/* Continue button */}
      <button onClick={onContinue} className="btn-primary w-full">
        Continue →
      </button>
    </div>
  );
}
