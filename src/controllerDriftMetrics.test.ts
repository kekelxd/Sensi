import { describe, expect, it } from 'vitest'
import { analyzeDriftCollection, analyzeStickDrift, stickMagnitude } from './controllerDriftMetrics'

describe('controller drift metrics', () => {
  it('calculates normalized stick magnitude', () => {
    expect(stickMagnitude(0, 0)).toBe(0)
    expect(stickMagnitude(0.03, 0.04)).toBeCloseTo(0.05)
  })

  it('calculates mean, median, peak and the predominant axis', () => {
    const result = analyzeStickDrift([{ x: 0.01, y: 0 }, { x: 0.02, y: 0 }, { x: 0.03, y: 0 }])
    expect(result.meanMagnitude).toBeCloseTo(0.02)
    expect(result.medianMagnitude).toBeCloseTo(0.02)
    expect(result.peakMagnitude).toBeCloseTo(0.03)
    expect(result.dominantAxis).toBe('x')
  })

  it('validates a resting collection and rejects movement or missing samples', () => {
    const resting = Array.from({ length: 120 }, () => ({ x: 0.01, y: -0.012 }))
    expect(analyzeDriftCollection(resting, resting)).toMatchObject({ valid: true, reason: null })
    expect(analyzeDriftCollection(resting.slice(0, 30), resting)).toMatchObject({ valid: false, reason: 'insufficient-samples' })
    expect(analyzeDriftCollection([...resting.slice(1), { x: 0.5, y: 0 }], resting)).toMatchObject({ valid: false, reason: 'excessive-movement' })
  })
})
