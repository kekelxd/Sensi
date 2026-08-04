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

  it('limits a browser-generated jump while preserving its direction', () => {
    const result = sanitizePointerMovement({ movementX: 4000, movementY: 3000, gain: 1, width: 1280, height: 720, elapsedSinceLock: 200 })
    expect(result).not.toBeNull()
    expect(Math.hypot(result!.x, result!.y)).toBeCloseTo(720 * 0.14)
    expect(result!.x / result!.y).toBeCloseTo(4 / 3)
  })

  it('keeps the complete crosshair inside the arena', () => {
    expect(clampAimCoordinate(-500, 800)).toBe(AIM_EDGE_PADDING)
    expect(clampAimCoordinate(1200, 800)).toBe(800 - AIM_EDGE_PADDING)
    expect(clampAimCoordinate(400, 800)).toBe(400)
  })
})
