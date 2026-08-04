import { describe, expect, it } from 'vitest'
import { buildAimHeatmap, createEmptyWarmupMetrics, getWarmupRecommendation, toWarmupSessionSummary } from './warmupTelemetry'

describe('warm-up telemetry', () => {
  it('aggregates normalized aim samples into heatmap cells', () => {
    const cells = buildAimHeatmap([
      { x: 0.1, y: 0.1, error: 0.2 },
      { x: 0.12, y: 0.12, error: 0.4 },
      { x: 0.9, y: 0.8, error: 0.8 },
    ], 4, 4)

    expect(cells).toHaveLength(2)
    expect(cells[0]).toMatchObject({ intensity: 1, samples: 2 })
    expect(cells[0].error).toBeCloseTo(0.3)
    expect(cells[1]).toMatchObject({ intensity: 0.5, samples: 1, error: 0.8 })
  })

  it('removes trajectory data from the persisted summary', () => {
    const metrics = createEmptyWarmupMetrics(60)
    metrics.score = 420
    metrics.aimSamples.push({ x: 0.5, y: 0.5, error: 0.1 })
    const summary = toWarmupSessionSummary(metrics)

    expect(summary.score).toBe(420)
    expect(summary).not.toHaveProperty('aimSamples')
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
