// Path: frontend/src/engine/calibrator.js
export function calibrateConfidence(correct, selfRating) {
  const r = Number(selfRating)
  const rating = Number.isFinite(r) ? Math.max(1, Math.min(5, Math.round(r))) : 3

  if (correct === true) {
    if (rating <= 2) return { label: 'fragile', action: 'review_soon', color: 'amber', icon: '🌱' }
    if (rating === 3) return { label: 'developing', action: 'normal', color: 'blue', icon: '🙂' }
    return { label: 'mastered', action: 'long_interval', color: 'emerald', icon: '⭐' }
  }

  // correct === false (or unknown)
  if (rating <= 2) return { label: 'guess', action: 'remediate', color: 'gray', icon: '🎲' }
  if (rating === 3) return { label: 'partial', action: 'remediate', color: 'orange', icon: '🤔' }
  return { label: 'overconfidence', action: 'retest_tomorrow', color: 'red', icon: '⚠️' }
}

