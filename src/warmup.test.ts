import { describe, expect, it } from 'vitest'
import { GAME_BY_ID } from './games'
import { getAimGain } from './aimModel'
import { calculateWarmupAccuracy, getWarmupPointerGain } from './warmupConfig'

describe('warmup calculations', () => {
  it('keeps equivalent CS2 and Valorant sensitivities close', () => {
    const cs2 = getWarmupPointerGain(GAME_BY_ID.cs2, 1)
    const valorant = getWarmupPointerGain(GAME_BY_ID.valorant, 0.314286)
    expect(valorant).toBeCloseTo(cs2, 4)
  })

  it('keeps aim gain independent from the configured DPI', () => {
    const configurations = [{ sensitivity: 1, dpi: 800 }, { sensitivity: 1, dpi: 1600 }]
    const gains = configurations.map(({ sensitivity }) => getWarmupPointerGain(GAME_BY_ID.cs2, sensitivity))
    expect(gains[0]).toBeCloseTo(gains[1])
  })

  it('changes gain with sensitivity and clamps extreme values', () => {
    expect(getWarmupPointerGain(GAME_BY_ID.cs2, 2)).toBeCloseTo(2)
    expect(getWarmupPointerGain(GAME_BY_ID.cs2, 999)).toBe(4)
  })

  it('derives minigame movement from the shared aim gain', () => {
    const sharedGain = getAimGain(GAME_BY_ID.cs2, .7)
    expect(getWarmupPointerGain(GAME_BY_ID.cs2, .7)).toBeCloseTo((sharedGain ?? 0) / 0.022, 10)
  })

  it('calculates shot accuracy safely', () => {
    expect(calculateWarmupAccuracy(8, 10)).toBe(80)
    expect(calculateWarmupAccuracy(0, 0)).toBe(0)
  })
})
