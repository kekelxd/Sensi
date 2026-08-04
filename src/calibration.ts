export type RoundResult = {
  multiplier: number
  accuracy: number
  meanError: number
  smoothness: number
  overshoots: number
  score: number
}

export type TargetSpeedMode = 'normal' | 'fast'

export const ROUND_MULTIPLIERS = [1, 0.8, 1.2, 0.9, 1.1]
export const ROUND_DURATION = 25
export const ROUND_WARMUP = 1
export const SMOOTHNESS_SPEED_CHANGE_PER_RADIUS = 20

export function getTargetSpeed(mode: TargetSpeedMode) {
  return mode === 'fast' ? 1.12 : 1
}

export function calculateRoundResult(
  multiplier: number,
  distances: number[],
  speeds: number[],
  targetRadius: number,
): RoundResult {
  if (!distances.length) {
    return { multiplier, accuracy: 0, meanError: 999, smoothness: 0, overshoots: 0, score: 0 }
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
  }
}

export function recommendMultiplier(results: RoundResult[]) {
  const valid = results.filter((result) => Number.isFinite(result.multiplier) && Number.isFinite(result.score))
  if (!valid.length) return 1

  const bestScore = Math.max(...valid.map((result) => result.score))
  if (bestScore <= 0) return 1

  const competitiveFloor = bestScore - 12
  const competitive = valid.filter((result) => result.score >= competitiveFloor)
  const getWeight = (result: RoundResult) => Math.max(1, result.score - competitiveFloor + 1) ** 1.35
  const weightTotal = competitive.reduce((sum, result) => sum + getWeight(result), 0)
  const recommendation = competitive.reduce((sum, result) => sum + result.multiplier * getWeight(result), 0) / weightTotal
  const minMultiplier = Math.min(...valid.map((result) => result.multiplier))
  const maxMultiplier = Math.max(...valid.map((result) => result.multiplier))
  return Math.min(maxMultiplier, Math.max(minMultiplier, recommendation))
}
