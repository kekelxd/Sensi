import { describe, expect, it } from 'vitest'
import { biomechanicalProfile, cmPer360FromSensitivity, finderScore, sensitivityFromCmPer360 } from './sensMath'

describe('finder sensitivity math', () => {
  it('round trips physical sensitivity through cm/360', () => {
    const cm = cmPer360FromSensitivity(1, .022, 800)
    expect(cm).toBeCloseTo(51.9545, 3)
    expect(sensitivityFromCmPer360(cm!, .022, 800)).toBeCloseTo(1, 6)
  })

  it('uses the requested weighted telemetry formula', () => {
    expect(finderScore({ timeOnTarget: 80, smoothness: 70, jitter: 20, overshoots: 2 })).toBeCloseTo(47.6, 4)
  })

  it('identifies physical play styles from the final range', () => {
    expect(biomechanicalProfile(50)).toBe('arm')
    expect(biomechanicalProfile(36)).toBe('wrist')
    expect(biomechanicalProfile(28)).toBe('hybrid')
  })
})
