import type { GameArchetype, HybridTelemetry } from './hybridSensEngine'

const clamp = (value: number) => Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0))

export function normalizeFlick(data: HybridTelemetry) {
  if (!data.flickAttempts || !data.flickHits) return 0
  const hitRate = data.flickHits / data.flickAttempts * 100
  const timeScore = clamp(100 - data.timeToFirstHitMs / 18)
  const errorScore = clamp(100 - data.firstClickErrorPx * 1.2)
  return hitRate * .45 + timeScore * .4 + errorScore * .15
}

export function normalizeBraking(data: HybridTelemetry) {
  const overshootScore = clamp(100 - data.overshootPixels * .8)
  const settlingScore = clamp(100 - data.settlingTimeMs / 16)
  const oscillationScore = clamp(100 - data.overshootOscillations * 12)
  return overshootScore * .45 + settlingScore * .4 + oscillationScore * .15
}

export function normalizeTracking(data: HybridTelemetry) {
  return clamp(data.timeOnTargetPct) * .65 + clamp(data.smoothnessIndex) * .35
}

export function normalizeJitter(data: HybridTelemetry) {
  return clamp(data.jitterVariance)
}

export function calculateAdaptiveScore(data: HybridTelemetry, gameType: GameArchetype) {
  const flickScore = normalizeFlick(data)
  const brakeScore = normalizeBraking(data)
  const trackScore = normalizeTracking(data)
  const jitterPenalty = normalizeJitter(data)
  const raw = gameType === 'TACTICAL'
    ? brakeScore * .35 + flickScore * .4 + trackScore * .25 - jitterPenalty * .15
    : trackScore * .5 + flickScore * .3 + brakeScore * .2 - jitterPenalty * .2
  return clamp(raw)
}

export function brakingCost(data: HybridTelemetry) {
  return Math.max(0, data.overshootPixels) + Math.max(0, data.settlingTimeMs) * .12 + Math.max(0, data.overshootOscillations) * 12
}
