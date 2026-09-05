import { describe, expect, it } from 'vitest'
import { GAME_SENSITIVITY_PROFILE_BY_ID, type GameSensitivityProfile, type SensitivityInputModel } from './gameSensitivityProfiles'
import { calculateCm360, calculateResidualError, classifyResidualError, convertSensitivity, normalizeSensitivityForInputModel, validateGameProfile } from './sensitivityConversionEngine'

const cs2 = GAME_SENSITIVITY_PROFILE_BY_ID.cs2
const valorant = GAME_SENSITIVITY_PROFILE_BY_ID.valorant

describe('auditable sensitivity conversion engine', () => {
  it('calculates the CS2 reference cm/360', () => {
    expect(calculateCm360(cs2, 1, 800)).toBeCloseTo(51.9545, 3)
  })

  it('converts with equal and different DPI values', () => {
    expect(convertSensitivity(1, cs2, valorant, 800, 800)?.exactSensitivity).toBeCloseTo(0.314285714, 8)
    expect(convertSensitivity(1, cs2, valorant, 800, 1600)?.exactSensitivity).toBeCloseTo(0.157142857, 8)
  })

  it('round-trips the mathematical value between profiles', () => {
    const outward = convertSensitivity(1, cs2, valorant, 800, 800)
    const restored = outward && convertSensitivity(outward.exactSensitivity, valorant, cs2, 800, 800)
    expect(restored?.exactSensitivity).toBeCloseTo(1, 10)
  })

  it('normalizes decimal, step, integer and slider input models', () => {
    const decimal: SensitivityInputModel = { type: 'decimal', min: 0, max: 10, decimals: 3 }
    const step: SensitivityInputModel = { type: 'step', min: 0, max: 10, step: 0.25, decimals: 2 }
    const integer: SensitivityInputModel = { type: 'integer', min: 1, max: 100 }
    const slider: SensitivityInputModel = { type: 'slider_with_multiplier', min: 1, max: 100, step: 1, defaultMultiplier: 0.02, userConfigurableMultiplier: true }
    expect(normalizeSensitivityForInputModel(1.23456, decimal)).toBe(1.235)
    expect(normalizeSensitivityForInputModel(1.37, step)).toBe(1.25)
    expect(normalizeSensitivityForInputModel(42.6, integer)).toBe(43)
    expect(normalizeSensitivityForInputModel(42.6, slider)).toBe(43)
  })

  it('clamps normalized values to game limits', () => {
    expect(normalizeSensitivityForInputModel(999, { type: 'integer', min: 1, max: 100 })).toBe(100)
    expect(normalizeSensitivityForInputModel(-2, { type: 'step', min: 0.1, max: 10, step: 0.1, decimals: 1 })).toBe(0.1)
  })

  it('recalculates residual error from the configurable value', () => {
    const result = convertSensitivity(1, cs2, valorant, 800, 800)
    expect(result?.exactSensitivity).toBeCloseTo(0.314285714, 8)
    expect(result?.configurableSensitivity).toBe(0.314)
    expect(result?.relativeErrorPercent).toBeGreaterThan(0)
    expect(result?.resultingCm360).not.toBe(result?.sourceCm360)
  })

  it('classifies centralized residual error thresholds', () => {
    expect(classifyResidualError(0.009)).toBe('negligible')
    expect(classifyResidualError(0.09)).toBe('very_low')
    expect(classifyResidualError(0.49)).toBe('low')
    expect(classifyResidualError(0.5)).toBe('noticeable')
    expect(calculateResidualError(50, 50.25)?.relativeErrorPercent).toBeCloseTo(0.5, 8)
  })

  it('rejects structurally invalid profiles', () => {
    const invalid: GameSensitivityProfile = { ...cs2, angularModel: { type: 'linear', coefficient: 0 }, inputModel: { type: 'step', min: 10, max: 1, step: 0, decimals: -1 } }
    expect(validateGameProfile(invalid)).toEqual(expect.arrayContaining(['angular coefficient must be greater than zero', 'input min must be lower than max', 'input step must be greater than zero', 'input decimals must be an integer between 0 and 12']))
    expect(convertSensitivity(1, invalid, valorant)).toBeNull()
  })

  it('requires evidence and sources before a profile can be verified', () => {
    const falselyVerified: GameSensitivityProfile = { ...cs2, verification: { ...cs2.verification, status: 'verified' } }
    expect(validateGameProfile(falselyVerified)).toEqual(expect.arrayContaining(['verified profile requires physical validation', 'verified profile requires validated input precision', 'verified profile requires at least one independent source', 'verified profile requires a source']))
  })

  it('supports slider multipliers in physical calculations', () => {
    const sliderProfile: GameSensitivityProfile = { ...cs2, id: 'rainbowsix', inputModel: { type: 'slider_with_multiplier', min: 1, max: 100, step: 1, defaultMultiplier: 0.5, userConfigurableMultiplier: true } }
    expect(calculateCm360(sliderProfile, 10, 800)).toBeCloseTo(calculateCm360(cs2, 5, 800) ?? 0, 10)
  })
})
