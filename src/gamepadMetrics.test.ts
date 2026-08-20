import { describe, expect, it } from 'vitest'
import { circularityError, STICK_AXIS_BINS } from './gamepadMetrics'

describe('gamepad circularity metric', () => {
  it('reports nearly zero error for a circular contour', () => {
    const points = Array.from({ length: STICK_AXIS_BINS }, (_, index) => {
      const angle = index / STICK_AXIS_BINS * Math.PI * 2
      return { x: Math.cos(angle), y: Math.sin(angle) }
    })
    expect(circularityError(points)).toBeCloseTo(0, 5)
  })

  it('requires enough directions before reporting circularity', () => {
    expect(circularityError([{ x: 1, y: 0 }, { x: 0, y: 1 }])).toBeNull()
  })
})
