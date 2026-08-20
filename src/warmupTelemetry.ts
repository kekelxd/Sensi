import type { WarmupExercise } from './warmupConfig'

export type WarmupMetrics = {
  score: number
  accuracy: number
  hits: number
  shots: number
  remaining: number
  onTargetMs: number
  reactionTimeMs: number
  clickErrors: number
  bestStreak: number
  bestTrackingStreakMs: number
  overshootCount: number
  aimBiasX?: number
  aimBiasY?: number
}

export type WarmupSessionSummary = Omit<WarmupMetrics, 'remaining'>

export function createEmptyWarmupMetrics(duration: number): WarmupMetrics {
  return {
    score: 0,
    accuracy: 0,
    hits: 0,
    shots: 0,
    remaining: duration,
    onTargetMs: 0,
    reactionTimeMs: 0,
    clickErrors: 0,
    bestStreak: 0,
    bestTrackingStreakMs: 0,
    overshootCount: 0,
    aimBiasX: 0,
    aimBiasY: 0,
  }
}

export function getAimBiasLabel(x = 0, y = 0) {
  if (Math.hypot(x, y) < .012) return 'Centrada'
  if (Math.abs(x) >= Math.abs(y)) return x > 0 ? 'Direita' : 'Esquerda'
  return y > 0 ? 'Abaixo' : 'Acima'
}

export function toWarmupSessionSummary(metrics: WarmupMetrics): WarmupSessionSummary {
  return {
    score: metrics.score,
    accuracy: metrics.accuracy,
    hits: metrics.hits,
    shots: metrics.shots,
    onTargetMs: metrics.onTargetMs,
    reactionTimeMs: metrics.reactionTimeMs,
    clickErrors: metrics.clickErrors,
    bestStreak: metrics.bestStreak,
    bestTrackingStreakMs: metrics.bestTrackingStreakMs,
    overshootCount: metrics.overshootCount,
    aimBiasX: metrics.aimBiasX,
    aimBiasY: metrics.aimBiasY,
  }
}

export function getWarmupRecommendation(metrics: WarmupMetrics, current: WarmupExercise): WarmupExercise {
  const trackingExercise = current === 'tracking' || current === 'strafetrack'
  if (trackingExercise && metrics.accuracy < 68) return current === 'tracking' ? 'strafetrack' : 'tracking'
  if (metrics.reactionTimeMs > 650) return 'reflex'
  if (metrics.clickErrors > Math.max(3, metrics.hits * 0.3) || (!trackingExercise && metrics.accuracy < 72)) return 'gridshot'
  if (metrics.overshootCount >= 5) return 'strafetrack'
  if (current === 'reflex') return 'gridshot'
  return 'reflex'
}

export function warmupSessionStorageKey(exercise: WarmupExercise) {
  return `sensi-warmup-session:v1:${exercise}`
}

export function readWarmupSession(storage: Storage, exercise: WarmupExercise): WarmupSessionSummary | null {
  try {
    const saved = storage.getItem(warmupSessionStorageKey(exercise))
    if (!saved) return null
    const parsed = JSON.parse(saved) as WarmupSessionSummary
    return Number.isFinite(parsed.score) && Number.isFinite(parsed.accuracy) ? parsed : null
  } catch {
    return null
  }
}

export function writeWarmupSession(storage: Storage, exercise: WarmupExercise, metrics: WarmupMetrics) {
  try {
    storage.setItem(warmupSessionStorageKey(exercise), JSON.stringify(toWarmupSessionSummary(metrics)))
  } catch {
    // Training still works when storage is unavailable or full.
  }
}
