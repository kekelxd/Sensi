export const REFRESH_MIN_SAMPLES = 90
export const REFRESH_STABILITY_THRESHOLDS = { stable: 95, moderate: 85 } as const

export type RefreshRateStats = {
  valid: boolean
  reason: 'insufficient-samples' | 'throttled' | null
  observedHz: number
  frameIntervalMs: number
  meanIntervalMs: number
  p95IntervalMs: number
  stability: number
  delayedFrames: number
  samples: number
  outliers: number
  classification: 'stable' | 'moderate' | 'unstable'
}

const empty = (reason: RefreshRateStats['reason'], samples: number): RefreshRateStats => ({
  valid: false,
  reason,
  observedHz: 0,
  frameIntervalMs: 0,
  meanIntervalMs: 0,
  p95IntervalMs: 0,
  stability: 0,
  delayedFrames: 0,
  samples,
  outliers: 0,
  classification: 'unstable',
})

export function median(values: number[]) {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

export function percentile(values: number[], ratio: number) {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.max(0, Math.min(sorted.length - 1, (sorted.length - 1) * ratio))
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  if (lower === upper) return sorted[lower]
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower)
}

export function classifyRefreshStability(stability: number): RefreshRateStats['classification'] {
  if (stability >= REFRESH_STABILITY_THRESHOLDS.stable) return 'stable'
  if (stability >= REFRESH_STABILITY_THRESHOLDS.moderate) return 'moderate'
  return 'unstable'
}

export function analyzeRefreshIntervals(intervals: number[], minimumSamples = REFRESH_MIN_SAMPLES): RefreshRateStats {
  const samples = intervals.filter((value) => Number.isFinite(value) && value > 0 && value <= 1000)
  if (samples.length < minimumSamples) return empty('insufficient-samples', samples.length)

  const baseline = median(samples)
  const deviations = samples.map((value) => Math.abs(value - baseline))
  const mad = median(deviations)
  const tolerance = Math.max(0.2, baseline * 0.18, mad * 4)
  const inliers = samples.filter((value) => Math.abs(value - baseline) <= tolerance)
  const delayedFrames = samples.filter((value) => value > baseline * 1.5).length

  if (baseline > 50 || delayedFrames / samples.length > 0.2 || inliers.length < minimumSamples) {
    return { ...empty('throttled', samples.length), delayedFrames, outliers: samples.length - inliers.length }
  }

  const frameIntervalMs = median(inliers)
  const meanIntervalMs = inliers.reduce((sum, value) => sum + value, 0) / inliers.length
  const stability = Math.max(0, Math.min(100, 100 - (mad / frameIntervalMs) * 400))

  return {
    valid: true,
    reason: null,
    observedHz: 1000 / frameIntervalMs,
    frameIntervalMs,
    meanIntervalMs,
    p95IntervalMs: percentile(samples, 0.95),
    stability,
    delayedFrames,
    samples: samples.length,
    outliers: samples.length - inliers.length,
    classification: classifyRefreshStability(stability),
  }
}
