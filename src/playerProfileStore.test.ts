import { describe, expect, it } from 'vitest'
import { calculatePresetCm360, ensureSinglePrimary, parsePlayerProfile, type SensitivityPreset } from './playerProfileStore'

const timestamp = '2026-09-05T12:00:00.000Z'

describe('player profile', () => {
  it('starts without fictional sensitivity presets', () => {
    expect(parsePlayerProfile(null, timestamp).presets).toEqual([])
  })

  it('migrates legacy games and keeps only one primary preset', () => {
    const profile = parsePlayerProfile(JSON.stringify({ nickname: 'Kekas', games: [
      { id: 'cs2', dpi: 800, sensitivity: 0.65 },
      { id: 'cs2', dpi: 1600, sensitivity: 0.325 },
    ] }), timestamp)
    expect(profile.presets).toHaveLength(2)
    expect(profile.presets.filter((preset) => preset.isPrimary)).toHaveLength(1)
  })

  it('normalizes a single primary preset', () => {
    const presets = [{ id: 'a', isPrimary: true }, { id: 'b', isPrimary: true }] as SensitivityPreset[]
    expect(ensureSinglePrimary(presets).map((preset) => preset.isPrimary)).toEqual([true, false])
  })

  it('uses the shared sensitivity engine for cm/360', () => {
    expect(calculatePresetCm360({ gameId: 'cs2', sensitivity: 1, dpi: 800 })).toBeCloseTo(51.9545, 3)
    expect(calculatePresetCm360({ gameId: 'pubg', sensitivity: 50, dpi: 800 })).toBeNull()
  })
})
