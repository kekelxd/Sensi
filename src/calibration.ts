export type RoundResult = {
  multiplier: number
  accuracy: number
  meanError: number
  smoothness: number
  overshoots: number
  score: number
}

export const ROUND_MULTIPLIERS = [0.72, 0.86, 1, 1.14, 1.3]
export const ROUND_DURATION = 12
export const VALORANT_RATIO = 3.181818

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
  const smoothness = Math.max(0, Math.min(1, 1 - averageChange / 23))
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
  if (!results.length) return 1
  const weighted = [...results]
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(3, results.length))
  const weightTotal = weighted.reduce((sum, result) => sum + result.score, 0)
  if (!weightTotal) return weighted[0]?.multiplier ?? 1
  return weighted.reduce((sum, result) => sum + result.multiplier * result.score, 0) / weightTotal
}
