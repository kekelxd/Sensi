import { describe, expect, it } from 'vitest'
import { createEmptyWarmupMetrics, getWarmupRecommendation, toWarmupSessionSummary } from './warmupTelemetry'

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
})
