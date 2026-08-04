import type { WarmupExercise } from './warmupConfig'

export type AimSample = {
  x: number
  y: number
  error: number
}

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
  aimSamples: AimSample[]
  missSamples: AimSample[]
  overshootX: number
  overshootY: number
  overshootCount: number
}

export type WarmupSessionSummary = Omit<WarmupMetrics, 'remaining' | 'aimSamples' | 'missSamples'>

export type HeatmapCell = {
  x: number
  y: number
  intensity: number
  error: number
  samples: number
}

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
    aimSamples: [],
    missSamples: [],
    overshootX: 0,
    overshootY: 0,
    overshootCount: 0,
  }
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
    overshootX: metrics.overshootX,
    overshootY: metrics.overshootY,
    overshootCount: metrics.overshootCount,
  }
}

export function buildAimHeatmap(samples: AimSample[], columns = 12, rows = 7): HeatmapCell[] {
  const cells = Array.from({ length: columns * rows }, () => ({ samples: 0, errorTotal: 0 }))
  for (const sample of samples) {
    const column = Math.min(columns - 1, Math.max(0, Math.floor(sample.x * columns)))
    const row = Math.min(rows - 1, Math.max(0, Math.floor(sample.y * rows)))
    const cell = cells[row * columns + column]
    cell.samples += 1
    cell.errorTotal += sample.error
  }
  const peak = Math.max(1, ...cells.map((cell) => cell.samples))
  return cells.flatMap((cell, index) => {
    if (!cell.samples) return []
    return [{
      x: ((index % columns) + 0.5) / columns * 100,
      y: (Math.floor(index / columns) + 0.5) / rows * 100,
      intensity: cell.samples / peak,
      error: cell.errorTotal / cell.samples,
      samples: cell.samples,
    }]
  })
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
