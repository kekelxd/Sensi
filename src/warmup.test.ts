import { describe, expect, it } from 'vitest'
import { GAME_BY_ID } from './games'
import { calculateWarmupAccuracy, getNextWarmupDifficulty, getWarmupPointerGain } from './warmupConfig'

describe('warmup calculations', () => {
  it('keeps equivalent CS2 and Valorant sensitivities close', () => {
    const cs2 = getWarmupPointerGain(GAME_BY_ID.cs2, 1, 800)
    const valorant = getWarmupPointerGain(GAME_BY_ID.valorant, 0.314286, 800)
    expect(valorant).toBeCloseTo(cs2, 4)
  })

  it('includes DPI and clamps extreme gains', () => {
    expect(getWarmupPointerGain(GAME_BY_ID.cs2, 1, 1600)).toBeCloseTo(2)
    expect(getWarmupPointerGain(GAME_BY_ID.cs2, 999, 3200)).toBe(4)
  })

  it('calculates shot accuracy safely', () => {
    expect(calculateWarmupAccuracy(8, 10)).toBe(80)
    expect(calculateWarmupAccuracy(0, 0)).toBe(0)
  })
})

describe('warm-up progression', () => {
  it('advances through every difficulty and keeps advanced sessions hard', () => {
    expect(getNextWarmupDifficulty('easy')).toBe('medium')
    expect(getNextWarmupDifficulty('medium')).toBe('hard')
    expect(getNextWarmupDifficulty('hard')).toBe('hard')
  })
})
