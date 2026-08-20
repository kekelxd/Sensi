import { describe, expect, it } from 'vitest'
import { getCanvasGain, getCmPer360, getSensitivityForCmPer360 } from './aimModel'
import { GAME_BY_ID } from './games'

describe('physical aim model', () => {
  it('keeps equivalent linear game sensitivities at the same cm/360', () => {
    const cs2 = getCmPer360(GAME_BY_ID.cs2, 1, 800)
    const valorant = getCmPer360(GAME_BY_ID.valorant, 0.314285714, 800)

    expect(cs2).not.toBeNull()
    expect(valorant).not.toBeNull()
    expect(valorant).toBeCloseTo(cs2 ?? 0, 5)
  })

  it('round-trips a physical distance into a native sensitivity', () => {
    const cmPer360 = getCmPer360(GAME_BY_ID.cs2, 1.25, 1600)
    const restored = getSensitivityForCmPer360(GAME_BY_ID.cs2, cmPer360 ?? 0, 1600)

    expect(restored).toBeCloseTo(1.25, 10)
  })

  it('projects angular movement in proportion to FOV and canvas width', () => {
    const wideArena = getCanvasGain(GAME_BY_ID.cs2, 1, 100, 1600)
    const narrowArena = getCanvasGain(GAME_BY_ID.cs2, 1, 100, 800)
    const wideFov = getCanvasGain(GAME_BY_ID.cs2, 1, 120, 1600)

    expect(wideArena).toBeCloseTo((narrowArena ?? 0) * 2, 10)
    expect(wideFov).toBeLessThan(wideArena ?? 0)
  })

  it('refuses a physical conversion for profiles without a known yaw scale', () => {
    expect(getCmPer360(GAME_BY_ID.pubg, 50, 800)).toBeNull()
  })
})
