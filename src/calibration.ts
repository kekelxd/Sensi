export type RoundResult = {
  multiplier: number
  accuracy: number
  meanError: number
  smoothness: number
  overshoots: number
  score: number
  errorControl: number
  overshootPenalty: number
  sampleCount: number
  targetRadius: number
}

export type CalibrationConfidence = 'high' | 'medium' | 'exploratory'

export type CalibrationReport = {
  recommendation: number
  bestResult: RoundResult
  baselineResult: RoundResult
  competitiveResults: RoundResult[]
  accuracy: number
  meanError: number
  smoothness: number
  overshoots: number
  score: number
  confidence: CalibrationConfidence
  confidenceScore: number
  multiplierSpread: number
}

export type CalibrationSessionSummary = {
  sensitivity: number
  multiplier: number
  score: number
  accuracy: number
  meanError: number
  smoothness: number
  overshoots: number
  confidenceScore: number
}

export type TargetSpeedMode = 'normal' | 'fast'

export const ROUND_MULTIPLIERS = [1, 0.8, 1.2, 0.9, 1.1]
export const ROUND_DURATION = 25
export const ROUND_WARMUP = 1
export const SMOOTHNESS_SPEED_CHANGE_PER_RADIUS = 20

export function getTargetSpeed(mode: TargetSpeedMode) {
  return mode === 'fast' ? 1.12 : 1
}

export function isCalibrationComplete(completedRounds: number, totalRounds = ROUND_MULTIPLIERS.length) {
  return completedRounds >= totalRounds
}

export function calculateRoundResult(
  multiplier: number,
  distances: number[],
  speeds: number[],
  targetRadius: number,
): RoundResult {
  if (!distances.length) {
    return { multiplier, accuracy: 0, meanError: 999, smoothness: 0, overshoots: 0, score: 0, errorControl: 0, overshootPenalty: 0, sampleCount: 0, targetRadius }
  }

  const accuracy = distances.filter((distance) => distance <= targetRadius).length / distances.length
  const meanError = distances.reduce((sum, distance) => sum + distance, 0) / distances.length
  const speedChanges = speeds.slice(1).map((speed, index) => Math.abs(speed - speeds[index]))
  const averageChange = speedChanges.length
    ? speedChanges.reduce((sum, change) => sum + change, 0) / speedChanges.length
    : 0
  const smoothnessReference = Math.max(1, targetRadius * SMOOTHNESS_SPEED_CHANGE_PER_RADIUS)
  const smoothness = Math.max(0, Math.min(1, 1 - averageChange / smoothnessReference))
  const overshoots = distances.slice(1).filter((distance, index) => {
    const previous = distances[index]
    return previous < targetRadius * 0.75 && distance > targetRadius * 1.35
  }).length
  const errorScore = Math.max(0, 1 - meanError / (targetRadius * 4.2))
  const overshootPenalty = Math.min(0.18, overshoots / distances.length * 3)
  const score = Math.max(0, accuracy * 0.55 + errorScore * 0.3 + smoothness * 0.15 - overshootPenalty)

  return {
    multiplier,
    accuracy: accuracy * 100,
    meanError,
    smoothness: smoothness * 100,
    overshoots,
    score: score * 100,
    errorControl: errorScore * 100,
    overshootPenalty: overshootPenalty * 100,
    sampleCount: distances.length,
    targetRadius,
  }
}

function getCompetitiveResults(results: RoundResult[]) {
  const valid = results.filter((result) => Number.isFinite(result.multiplier) && Number.isFinite(result.score))
  if (!valid.length) return { valid, competitive: valid, competitiveFloor: 0 }
  const bestScore = Math.max(...valid.map((result) => result.score))
  const competitiveFloor = bestScore - 12
  return {
    valid,
    competitive: valid.filter((result) => result.score >= competitiveFloor),
    competitiveFloor,
  }
}

const getCompetitiveWeight = (result: RoundResult, competitiveFloor: number) => Math.max(1, result.score - competitiveFloor + 1) ** 1.35

export function recommendMultiplier(results: RoundResult[]) {
  const { valid, competitive, competitiveFloor } = getCompetitiveResults(results)
  if (!valid.length) return 1

  const bestScore = Math.max(...valid.map((result) => result.score))
  if (bestScore <= 0) return 1

  const weightTotal = competitive.reduce((sum, result) => sum + getCompetitiveWeight(result, competitiveFloor), 0)
  const recommendation = competitive.reduce((sum, result) => sum + result.multiplier * getCompetitiveWeight(result, competitiveFloor), 0) / weightTotal
  const minMultiplier = Math.min(...valid.map((result) => result.multiplier))
  const maxMultiplier = Math.max(...valid.map((result) => result.multiplier))
  return Math.min(maxMultiplier, Math.max(minMultiplier, recommendation))
}

export function buildCalibrationReport(results: RoundResult[]): CalibrationReport | null {
  const { valid, competitive, competitiveFloor } = getCompetitiveResults(results)
  if (!valid.length || !competitive.length) return null
  const recommendation = recommendMultiplier(valid)
  const weightTotal = competitive.reduce((sum, result) => sum + getCompetitiveWeight(result, competitiveFloor), 0)
  const weighted = (selector: (result: RoundResult) => number) => competitive.reduce((sum, result) => sum + selector(result) * getCompetitiveWeight(result, competitiveFloor), 0) / weightTotal
  const bestResult = valid.reduce((best, result) => result.score > best.score ? result : best)
  const baselineResult = valid.reduce((closest, result) => Math.abs(result.multiplier - 1) < Math.abs(closest.multiplier - 1) ? result : closest)
  const multiplierSpread = Math.sqrt(weighted((result) => (result.multiplier - recommendation) ** 2))
  const signal = Math.max(0, Math.min(1, (bestResult.score - 42) / 38))
  const convergence = Math.max(0, Math.min(1, 1 - multiplierSpread / 0.18))
  const completeness = Math.max(0, Math.min(1, valid.length / ROUND_MULTIPLIERS.length))
  const confidenceScore = Math.round((signal * 0.4 + convergence * 0.35 + completeness * 0.25) * 100)
  const confidence: CalibrationConfidence = confidenceScore >= 76 ? 'high' : confidenceScore >= 56 ? 'medium' : 'exploratory'

  return {
    recommendation,
    bestResult,
    baselineResult,
    competitiveResults: [...competitive].sort((a, b) => b.score - a.score),
    accuracy: weighted((result) => result.accuracy),
    meanError: weighted((result) => result.meanError),
    smoothness: weighted((result) => result.smoothness),
    overshoots: weighted((result) => result.overshoots),
    score: weighted((result) => result.score),
    confidence,
    confidenceScore,
    multiplierSpread,
  }
}

export function createCalibrationSessionSummary(report: CalibrationReport, sensitivity: number): CalibrationSessionSummary {
  return {
    sensitivity,
    multiplier: report.recommendation,
    score: report.score,
    accuracy: report.accuracy,
    meanError: report.meanError,
    smoothness: report.smoothness,
    overshoots: report.overshoots,
    confidenceScore: report.confidenceScore,
  }
}

const calibrationSessionStorageKey = (game: string) => `sensi-calibration-session:v1:${game}`

export function readCalibrationSession(storage: Storage, game: string): CalibrationSessionSummary | null {
  try {
    const saved = storage.getItem(calibrationSessionStorageKey(game))
    if (!saved) return null
    const parsed = JSON.parse(saved) as CalibrationSessionSummary
    return Number.isFinite(parsed.sensitivity) && Number.isFinite(parsed.score) ? parsed : null
  } catch {
    return null
  }
}

export function writeCalibrationSession(storage: Storage, game: string, summary: CalibrationSessionSummary) {
  try {
    storage.setItem(calibrationSessionStorageKey(game), JSON.stringify(summary))
  } catch {
    // Calibration remains available when local storage cannot be used.
  }
}
