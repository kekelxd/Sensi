import { describe, expect, it } from 'vitest'
import { GAME_BY_ID } from './games'
import { calculateWarmupAccuracy, getAdaptiveDifficulty, getWarmupPointerGain } from './warmupConfig'

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
  it('adapts difficulty from accuracy without leaving supported bounds', () => {
    expect(getAdaptiveDifficulty('easy', 90)).toBe('medium')
    expect(getAdaptiveDifficulty('medium', 90)).toBe('hard')
    expect(getAdaptiveDifficulty('hard', 90)).toBe('hard')
    expect(getAdaptiveDifficulty('hard', 40)).toBe('medium')
    expect(getAdaptiveDifficulty('medium', 40)).toBe('easy')
    expect(getAdaptiveDifficulty('medium', 70)).toBe('medium')
  })
})
