import { describe, expect, it } from 'vitest'
import { readCalibrationHistory, writeCalibrationSession, type CalibrationSessionSummary } from './calibration'

function createStorage(): Storage {
  const values = new Map<string, string>()
  return {
    get length() { return values.size },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  }
}

function session(id: string, completedAt: string): CalibrationSessionSummary {
  return {
    id,
    completedAt,
    sensitivity: 1,
    rangeMinSensitivity: 0.95,
    rangeMaxSensitivity: 1.05,
    multiplier: 1,
    score: 80,
    accuracy: 80,
    meanError: 20,
    smoothness: 80,
    overshoots: 1,
    confidenceScore: 80,
    collectionQualityScore: 95,
    playerConsistencyScore: 82,
    recommendationStrengthScore: 78,
    resultKind: 'recommended',
    dpi: 800,
    horizontalFov: 103,
    cmPer360: 51.95,
  }
}

describe('calibration history', () => {
  it('keeps per-game sessions in newest-first order', () => {
    const storage = createStorage()
    writeCalibrationSession(storage, 'cs2', session('older', '2026-08-01T10:00:00.000Z'))
    writeCalibrationSession(storage, 'cs2', session('newer', '2026-08-02T10:00:00.000Z'))

    expect(readCalibrationHistory(storage, 'cs2').map((entry) => entry.id)).toEqual(['newer', 'older'])
    expect(readCalibrationHistory(storage, 'valorant')).toEqual([])
  })
})
