// Path: frontend/src/components/learning/ConfidenceBadge.jsx
/**
 * ConfidenceBadge - Shows the student's confidence calibration
 * 
 * Displays whether the student's self-rated confidence matches their actual performance.
 * Maps directly from calibrator.js output.
 */

export default function ConfidenceBadge({ calibration }) {
  if (!calibration) return null;

  const { label, icon, description } = calibration;

  const styles = {
    mastered: {
      bg: 'bg-emerald-50 border-emerald-200',
      text: 'text-emerald-700',
      display: 'Mastered ⭐',
    },
    fragile: {
      bg: 'bg-amber-50 border-amber-200',
      text: 'text-amber-700',
      display: 'Fragile 🌱',
    },
    developing: {
      bg: 'bg-blue-50 border-blue-200',
      text: 'text-blue-700',
      display: 'Developing 🙂',
    },
    overconfidence: {
      bg: 'bg-red-50 border-red-200',
      text: 'text-red-700',
      display: 'Overconfident ⚠️',
    },
    guess: {
      bg: 'bg-gray-50 border-gray-200',
      text: 'text-gray-700',
      display: 'Guess 🎲',
    },
    partial: {
      bg: 'bg-orange-50 border-orange-200',
      text: 'text-orange-700',
      display: 'Partial 🤔',
    },
    unknown: {
      bg: 'bg-gray-50 border-gray-200',
      text: 'text-gray-700',
      display: 'Unknown ❓',
    },
  };

  const style = styles[label] || styles.unknown;

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${style.bg}`}>
      <span className="text-sm">{icon || '📊'}</span>
      <div>
        <span className={`text-xs font-semibold ${style.text}`}>{style.display}</span>
        {description && (
          <p className="text-[10px] text-gray-500">{description}</p>
        )}
      </div>
    </div>
  );
}
