// Path: frontend/src/engine/sm2.js
import { calibrateConfidence } from './calibrator.js'

function clamp(num, min, max) {
  return Math.max(min, Math.min(max, num))
}

function addDaysIso(dateIso, days) {
  const d = new Date(dateIso)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString()
}

export function schedule(q, n, ef, lastInterval) {
  // SM-2 algorithm exactly:
  // - q: quality 0-5
  // - ef: ease factor updated each review, minimum 1.3
  // - interval rules: 1 day, 6 days, then previousInterval * ef
  const quality = clamp(Math.round(Number(q)), 0, 5)
  const prevN = Number.isFinite(Number(n)) ? Math.max(0, Math.floor(Number(n))) : 0
  const prevEf = Number.isFinite(Number(ef)) ? Number(ef) : 2.5
  const prevInterval = Number.isFinite(Number(lastInterval)) ? Math.max(0, Math.round(Number(lastInterval))) : 0

  const efDelta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
  const nextEf = Math.max(1.3, Number((prevEf + efDelta).toFixed(2)))

  const nowIso = new Date().toISOString()

  if (quality < 3) {
    // repeat tomorrow
    const interval = 1
    return { n: 0, ef: nextEf, interval, nextReview: addDaysIso(nowIso, interval) }
  }

  const nextN = prevN + 1
  let interval = 1
  if (nextN === 1) interval = 1
  else if (nextN === 2) interval = 6
  else interval = Math.max(1, Math.round((prevInterval || 6) * nextEf))

  return { n: nextN, ef: nextEf, interval, nextReview: addDaysIso(nowIso, interval) }
}

export function deriveQuality(correct, selfRating, selfFixed) {
  const { label } = calibrateConfidence(!!correct, selfRating)

  if (label === 'mastered' && selfFixed) return 5
  if (label === 'mastered') return 4
  if (label === 'developing') return 3
  if (label === 'fragile') return 3
  if (label === 'guess') return 1
  if (label === 'partial') return 1
  if (label === 'overconfidence') return 0
  return 2
}

