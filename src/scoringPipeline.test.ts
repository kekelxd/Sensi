import { describe, expect, it } from 'vitest'
import { calculateAdaptiveScore } from './scoringPipeline'
import type { HybridTelemetry } from './hybridSensEngine'

const stable: HybridTelemetry = {
  timeToFirstHitMs: 250, firstClickErrorPx: 8, flickAttempts: 10, flickHits: 9,
  overshootPixels: 8, overshootOscillations: 0, settlingTimeMs: 180,
  timeOnTargetPct: 82, smoothnessIndex: 88, jitterVariance: 7,
}

describe('hybrid scoring pipeline', () => {
  it('rewards flick and braking more heavily for tactical games', () => {
    const poorFlick = { ...stable, flickHits: 2, flickAttempts: 10, timeToFirstHitMs: 900, overshootPixels: 90, settlingTimeMs: 1400 }
    expect(calculateAdaptiveScore(stable, 'TACTICAL')).toBeGreaterThan(calculateAdaptiveScore(poorFlick, 'TACTICAL'))
  })

  it('rewards tracking more heavily for dynamic games', () => {
    const poorTracking = { ...stable, timeOnTargetPct: 10, smoothnessIndex: 15, jitterVariance: 65 }
    expect(calculateAdaptiveScore(stable, 'DYNAMIC')).toBeGreaterThan(calculateAdaptiveScore(poorTracking, 'DYNAMIC'))
  })

  it('handles idle and malformed telemetry without NaN', () => {
    const idle = { ...stable, flickAttempts: 0, flickHits: 0, timeToFirstHitMs: Number.NaN, timeOnTargetPct: 0, smoothnessIndex: 0, overshootPixels: 1_000, settlingTimeMs: 10_000, jitterVariance: Number.NaN }
    expect(calculateAdaptiveScore(idle, 'TACTICAL')).toBeGreaterThanOrEqual(0)
    expect(calculateAdaptiveScore(idle, 'TACTICAL')).toBeLessThanOrEqual(100)
  })
})
