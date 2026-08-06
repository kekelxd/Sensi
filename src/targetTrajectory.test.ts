import { describe, expect, it } from 'vitest'
import { createTargetTrajectory, sampleTargetTrajectory } from './targetTrajectory'

describe('deterministic target trajectory', () => {
  it('returns identical positions for the same seed and elapsed time', () => {
    const first = createTargetTrajectory(1234, 1)
    const second = createTargetTrajectory(1234, 1)

    for (const elapsed of [0, 250, 1000, 5000, 15000]) {
      expect(sampleTargetTrajectory(first, elapsed, 1000, 700, 35))
        .toEqual(sampleTargetTrajectory(second, elapsed, 1000, 700, 35))
    }
  })

  it('produces a different path for a different seed', () => {
    const first = createTargetTrajectory(1234, 1)
    const second = createTargetTrajectory(4321, 1)
    expect(sampleTargetTrajectory(first, 5000, 1000, 700, 35))
      .not.toEqual(sampleTargetTrajectory(second, 5000, 1000, 700, 35))
  })

  it('keeps the target inside the drawable area', () => {
    const trajectory = createTargetTrajectory(1234, 1.12)
    const point = sampleTargetTrajectory(trajectory, 7500, 800, 500, 30)
    expect(point.x).toBeGreaterThanOrEqual(30)
    expect(point.x).toBeLessThanOrEqual(770)
    expect(point.y).toBeGreaterThanOrEqual(30)
    expect(point.y).toBeLessThanOrEqual(470)
  })
})
