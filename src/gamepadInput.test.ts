import { describe, expect, it } from 'vitest'
import { selectActiveGamepad, type GamepadSnapshot } from './gamepadInput'

const gamepad = (index: number, connected = true): GamepadSnapshot => ({ index, connected, id: `Pad ${index}`, timestamp: 0, axes: [0, 0, 0, 0], buttons: [] })

describe('shared gamepad input', () => {
  it('selects the requested controller and falls back after disconnect', () => {
    expect(selectActiveGamepad([gamepad(0), gamepad(2)], 2)?.index).toBe(2)
    expect(selectActiveGamepad([gamepad(0)], 2)?.index).toBe(0)
    expect(selectActiveGamepad([], 0)).toBeNull()
  })
})
