export type RoundResult = {
  multiplier: number
  accuracy: number
  meanError: number
  smoothness: number
  overshoots: number
  score: number
}

export type TestMode = 'quick' | 'extensive'

export const QUICK_ROUND_MULTIPLIERS = [0.72, 0.86, 1, 1.14, 1.3]
export const EXTENSIVE_FIRST_PASS_MULTIPLIERS = QUICK_ROUND_MULTIPLIERS
export const ROUND_DURATION = 12
export const VALORANT_RATIO = 3.181818
export const EXTENSIVE_SPEED_START_ROUND = 5

const clampMultiplier = (value: number) => Math.max(0.55, Math.min(1.55, value))

export function getRoundMultipliers(mode: TestMode, results: RoundResult[]) {
  if (mode === 'quick') return QUICK_ROUND_MULTIPLIERS
  const firstPass = EXTENSIVE_FIRST_PASS_MULTIPLIERS
  if (results.length < firstPass.length) return [...firstPass, 0.82, 0.92, 1.02, 1.12, 1.22]

  const best = [...results]
    .slice(0, firstPass.length)
    .sort((a, b) => b.score - a.score)[0]?.multiplier ?? 1

  const refinement = [-0.08, -0.04, 0, 0.04, 0.08].map((offset) => clampMultiplier(best + offset))
  return [...firstPass, ...refinement]
}

export function getTargetSpeed(roundIndex: number, mode: TestMode) {
  return mode === 'extensive' && roundIndex >= EXTENSIVE_SPEED_START_ROUND ? 1.15 : 1
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
  const topCount = results.length >= 8 ? 5 : Math.min(3, results.length)
  const weighted = [...results]
    .sort((a, b) => b.score - a.score)
    .slice(0, topCount)
  const weightTotal = weighted.reduce((sum, result) => sum + result.score ** 1.35, 0)
  if (!weightTotal) return weighted[0]?.multiplier ?? 1
  return weighted.reduce((sum, result) => sum + result.multiplier * result.score ** 1.35, 0) / weightTotal
}
