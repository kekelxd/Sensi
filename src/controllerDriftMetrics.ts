import { rawAxis, type StickPoint } from './gamepadMetrics'

export const DRIFT_MIN_SAMPLES = 120
export const DRIFT_MOVEMENT_THRESHOLD = 0.35
export const DRIFT_REFERENCE_THRESHOLDS = { low: 0.03, moderate: 0.08 } as const

export type DriftClassification = 'low' | 'moderate' | 'high'
export type DriftAxis = 'x' | 'y' | 'balanced'
export type StickDriftStats = {
  meanMagnitude: number
  medianMagnitude: number
  peakMagnitude: number
  meanX: number
  meanY: number
  dominantAxis: DriftAxis
  centerStability: number
  classification: DriftClassification
  samples: number
}

export type DriftCollectionResult = {
  valid: boolean
  reason: 'insufficient-samples' | 'excessive-movement' | null
  left: StickDriftStats | null
  right: StickDriftStats | null
}

const median = (values: number[]) => {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

export function stickMagnitude(x: number, y: number) {
  return Math.hypot(rawAxis(x), rawAxis(y))
}

export function classifyDrift(magnitude: number): DriftClassification {
  if (magnitude < DRIFT_REFERENCE_THRESHOLDS.low) return 'low'
  if (magnitude < DRIFT_REFERENCE_THRESHOLDS.moderate) return 'moderate'
  return 'high'
}

export function analyzeStickDrift(samples: StickPoint[]): StickDriftStats {
  const magnitudes = samples.map((sample) => stickMagnitude(sample.x, sample.y))
  const meanMagnitude = magnitudes.reduce((sum, value) => sum + value, 0) / Math.max(1, magnitudes.length)
  const medianMagnitude = median(magnitudes)
  const meanX = samples.reduce((sum, sample) => sum + rawAxis(sample.x), 0) / Math.max(1, samples.length)
  const meanY = samples.reduce((sum, sample) => sum + rawAxis(sample.y), 0) / Math.max(1, samples.length)
  const spread = median(magnitudes.map((value) => Math.abs(value - medianMagnitude)))
  const axisDifference = Math.abs(Math.abs(meanX) - Math.abs(meanY))
  const dominantAxis: DriftAxis = axisDifference < 0.002 ? 'balanced' : Math.abs(meanX) > Math.abs(meanY) ? 'x' : 'y'
  return {
    meanMagnitude,
    medianMagnitude,
    peakMagnitude: magnitudes.length ? Math.max(...magnitudes) : 0,
    meanX,
    meanY,
    dominantAxis,
    centerStability: Math.max(0, Math.min(100, 100 - spread / 0.05 * 100)),
    classification: classifyDrift(medianMagnitude),
    samples: samples.length,
  }
}

export function analyzeDriftCollection(left: StickPoint[], right: StickPoint[], minimumSamples = DRIFT_MIN_SAMPLES): DriftCollectionResult {
  if (left.length < minimumSamples || right.length < minimumSamples) return { valid: false, reason: 'insufficient-samples', left: null, right: null }
  const moved = [...left, ...right].some((sample) => stickMagnitude(sample.x, sample.y) > DRIFT_MOVEMENT_THRESHOLD)
  if (moved) return { valid: false, reason: 'excessive-movement', left: null, right: null }
  return { valid: true, reason: null, left: analyzeStickDrift(left), right: analyzeStickDrift(right) }
}
