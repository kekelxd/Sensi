import { describe, expect, it } from 'vitest'
import { GAME_SENSITIVITY_PROFILE_BY_ID, type GameSensitivityProfile } from './gameSensitivityProfiles'
import { calculateCm360, convertSensitivity, normalizeSensitivityForGame, validateGameProfile } from './sensitivityConversionEngine'

const { cs2, valorant, overwatch2 } = GAME_SENSITIVITY_PROFILE_BY_ID

const vectors = [
  { profile: cs2, coefficient: 0.022, values: [[0.5, 103.909091], [1, 51.954545], [2, 25.977273]] },
  { profile: valorant, coefficient: 0.07, values: [[0.2, 81.642857], [0.4, 40.821429], [0.8, 20.410714]] },
  { profile: overwatch2, coefficient: 0.0066, values: [[2, 86.590909], [4, 43.295455], [8, 21.647727]] },
] as const

describe('audited CS2, Valorant and Overwatch 2 profiles', () => {
  it.each(vectors)('keeps the audited coefficient for $profile.name', ({ profile, coefficient }) => {
    expect(profile.angularModel).toEqual({ type: 'linear', coefficient })
  })

  it.each(vectors)('matches three cm/360 reference vectors for $profile.name', ({ profile, values }) => {
    for (const [sensitivity, expectedCm] of values) {
      expect(calculateCm360(profile, sensitivity, 800)).toBeCloseTo(expectedCm, 5)
    }
  })

  it('normalizes values according to each documented input model', () => {
    expect(normalizeSensitivityForGame(1.23456, cs2)).toBe(1.235)
    expect(normalizeSensitivityForGame(0.3456, valorant)).toBe(0.346)
    expect(normalizeSensitivityForGame(4.567, overwatch2)).toBe(4.57)
  })

  it('clamps values to the currently configured provisional limits', () => {
    expect(normalizeSensitivityForGame(0, cs2)).toBe(0.01)
    expect(normalizeSensitivityForGame(11, valorant)).toBe(10)
    expect(normalizeSensitivityForGame(101, overwatch2)).toBe(100)
  })

  it.each([
    [cs2, valorant, 1],
    [valorant, overwatch2, 0.35],
    [overwatch2, cs2, 5],
  ] as const)('round-trips exact angular values before target input rounding', (source, target, sensitivity) => {
    const outward = convertSensitivity(sensitivity, source, target, 800, 800)
    const restored = outward && convertSensitivity(outward.exactSensitivity, target, source, 800, 800)
    expect(restored?.exactSensitivity).toBeCloseTo(sensitivity, 10)
  })

  it('preserves physical distance when source and target DPI differ', () => {
    const result = convertSensitivity(1, cs2, valorant, 800, 1600)
    expect(result?.exactSensitivity).toBeCloseTo(0.157142857, 8)
    expect(result?.sourceCm360).toBeCloseTo(51.954545, 5)
    expect(result?.resultingCm360).toBeCloseTo(52.00182, 5)
  })

  it('reports residual error from the value the target game can receive', () => {
    const result = convertSensitivity(1, cs2, overwatch2, 800, 800)
    expect(result?.exactSensitivity).toBeCloseTo(3.333333333, 9)
    expect(result?.configurableSensitivity).toBe(3.33)
    expect(result?.relativeErrorPercent).toBeCloseTo(0.1001001, 6)
  })

  it('accepts the evidence metadata of all three audited profiles', () => {
    expect(validateGameProfile(cs2)).toEqual([])
    expect(validateGameProfile(valorant)).toEqual([])
    expect(validateGameProfile(overwatch2)).toEqual([])
  })

  it('rejects unsupported status promotion', () => {
    const promotedValorant: GameSensitivityProfile = {
      ...valorant,
      verification: { ...valorant.verification, status: 'cross_verified' },
    }
    const promotedCs2: GameSensitivityProfile = {
      ...cs2,
      verification: { ...cs2.verification, status: 'verified' },
    }
    expect(validateGameProfile(promotedValorant)).toEqual(expect.arrayContaining([
      'cross-verified profile requires a known formula',
      'cross-verified profile requires at least two independent sources',
    ]))
    expect(validateGameProfile(promotedCs2)).toEqual(expect.arrayContaining([
      'verified profile requires physical validation',
      'verified profile requires validated input precision',
    ]))
  })
})
