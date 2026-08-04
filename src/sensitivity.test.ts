import { describe, expect, it } from 'vitest'
import { GAME_BY_ID } from './games'
import { convertSensitivity, formatSensitivity, isSensitivityInRange, normalizeSensitivity } from './sensitivity'

describe('sensitivity conversion', () => {
  it('matches known CS2 conversions', () => {
    expect(convertSensitivity(1, GAME_BY_ID.cs2, GAME_BY_ID.fortnite)).toBeCloseTo(3.960396, 6)
    expect(convertSensitivity(1, GAME_BY_ID.cs2, GAME_BY_ID.valorant)).toBeCloseTo(0.314286, 6)
    expect(convertSensitivity(1, GAME_BY_ID.cs2, GAME_BY_ID.overwatch2)).toBeCloseTo(3.333333, 6)
  })

  it('is reversible within floating point precision', () => {
    const supportedGames = Object.values(GAME_BY_ID).filter((game) => game.yaw)
    for (const source of supportedGames) {
      for (const target of supportedGames) {
        const converted = convertSensitivity(0.37, source, target)!
        expect(convertSensitivity(converted, target, source)).toBeCloseTo(0.37, 10)
      }
    }
  })

  it('rejects invalid and unsupported conversions', () => {
    expect(convertSensitivity(-1, GAME_BY_ID.cs2, GAME_BY_ID.valorant)).toBeNull()
    expect(convertSensitivity(0, GAME_BY_ID.cs2, GAME_BY_ID.valorant)).toBeNull()
    expect(convertSensitivity(Number.NaN, GAME_BY_ID.cs2, GAME_BY_ID.valorant)).toBeNull()
    expect(convertSensitivity(1, GAME_BY_ID.pubg, GAME_BY_ID.valorant)).toBeNull()
  })
})

describe('sensitivity normalization', () => {
  it('respects each game step and limits', () => {
    expect(normalizeSensitivity(42.49, GAME_BY_ID.pubg)).toBe(42)
    expect(normalizeSensitivity(42.5, GAME_BY_ID.pubg)).toBe(43)
    expect(normalizeSensitivity(0.314286, GAME_BY_ID.valorant)).toBe(0.314)
    expect(normalizeSensitivity(999, GAME_BY_ID.rust)).toBe(10)
  })

  it('formats output and validates ranges', () => {
    expect(formatSensitivity(3.960396)).toBe('3.960396')
    expect(formatSensitivity(1)).toBe('1')
    expect(isSensitivityInRange(0.314, GAME_BY_ID.valorant)).toBe(true)
    expect(isSensitivityInRange(11, GAME_BY_ID.valorant)).toBe(false)
  })
})
