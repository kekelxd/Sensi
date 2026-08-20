import { describe, expect, it } from 'vitest'
import { createEmptyWarmupMetrics, getAimDiagnosis, getWarmupRecommendation, toWarmupSessionSummary } from './warmupTelemetry'

describe('warm-up telemetry', () => {
  it('removes transient timing data from the persisted summary', () => {
    const metrics = createEmptyWarmupMetrics(60)
    metrics.score = 420
    const summary = toWarmupSessionSummary(metrics)

    expect(summary.score).toBe(420)
    expect(summary).not.toHaveProperty('remaining')
  })

  it('recommends the exercise that addresses the weakest metric', () => {
    const metrics = createEmptyWarmupMetrics(60)
    metrics.accuracy = 50
    expect(getWarmupRecommendation(metrics, 'tracking')).toBe('strafetrack')

    metrics.accuracy = 90
    metrics.reactionTimeMs = 800
    expect(getWarmupRecommendation(metrics, 'flick')).toBe('reflex')
  })

  it('classifies varied sessions into plain-language aim diagnoses', () => {
    const overshoot = createEmptyWarmupMetrics(60)
    overshoot.shots = 50
    overshoot.overshootCount = 6
    expect(getAimDiagnosis(overshoot, 'flick')).toEqual({ kind: 'overshoot', rate: 12 })

    const missedClicks = createEmptyWarmupMetrics(60)
    missedClicks.shots = 20
    missedClicks.clickErrors = 7
    expect(getAimDiagnosis(missedClicks, 'gridshot')).toEqual({ kind: 'clicks', rate: 35 })

    const directionalBias = createEmptyWarmupMetrics(60)
    directionalBias.aimBiasX = .08
    expect(getAimDiagnosis(directionalBias, 'tracking')).toEqual({ kind: 'bias', rate: 0 })

    const weakTracking = createEmptyWarmupMetrics(60)
    weakTracking.accuracy = 55
    expect(getAimDiagnosis(weakTracking, 'tracking')).toEqual({ kind: 'tracking', rate: 55 })

    const steady = createEmptyWarmupMetrics(60)
    steady.accuracy = 84
    expect(getAimDiagnosis(steady, 'tracking')).toEqual({ kind: 'balanced', rate: 0 })
  })

  it('keeps the diagnosis stable across randomized session values', () => {
    let seed = 0x5e115
    const next = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0
      return seed / 0x1_0000_0000
    }
    const seen = new Set<string>()

    for (let index = 0; index < 160; index += 1) {
      const metrics = createEmptyWarmupMetrics(60)
      metrics.shots = Math.floor(next() * 80)
      metrics.clickErrors = Math.floor(next() * (metrics.shots + 1))
      metrics.overshootCount = Math.floor(next() * 16)
      metrics.correctionCount = Math.floor(next() * 180)
      metrics.accuracy = next() * 100
      metrics.aimBiasX = next() * .16 - .08
      metrics.aimBiasY = next() * .16 - .08
      const diagnosis = getAimDiagnosis(metrics, index % 2 ? 'flick' : 'tracking')

      expect(Number.isFinite(diagnosis.rate)).toBe(true)
      expect(diagnosis.rate).toBeGreaterThanOrEqual(0)
      expect(diagnosis.rate).toBeLessThanOrEqual(100)
      seen.add(diagnosis.kind)
    }

    expect(seen.size).toBeGreaterThanOrEqual(3)
  })
})
