import { describe, expect, it } from 'vitest'
import { AIM_EDGE_PADDING, clampAimCoordinate, sanitizePointerMovement } from './pointerInput'

describe('pointer input safety', () => {
  it('ignores movement emitted while pointer lock is settling', () => {
    expect(sanitizePointerMovement({ movementX: 900, movementY: -600, gain: 1, width: 1280, height: 720, elapsedSinceLock: 20 })).toBeNull()
  })

  it('preserves normal high-polling movement', () => {
    const result = sanitizePointerMovement({ movementX: 3, movementY: -2, gain: 1.2, width: 1280, height: 720, elapsedSinceLock: 200 })
    expect(result!.x).toBeCloseTo(3.6)
    expect(result!.y).toBeCloseTo(-2.4)
  })

  it('preserves a legitimate fast movement after pointer lock settles', () => {
    const result = sanitizePointerMovement({ movementX: 400, movementY: 300, gain: 1.25, width: 1280, height: 720, elapsedSinceLock: 200 })
    expect(result).toEqual({ x: 500, y: 375 })
  })

  it('keeps the complete crosshair inside the arena', () => {
    expect(clampAimCoordinate(-500, 800)).toBe(AIM_EDGE_PADDING)
    expect(clampAimCoordinate(1200, 800)).toBe(800 - AIM_EDGE_PADDING)
    expect(clampAimCoordinate(400, 800)).toBe(400)
  })
})
