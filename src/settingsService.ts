import type { GameId } from './games'

export type SavedSensitivity = { gameId: GameId, sensitivity: number, cmPer360: number, savedAt: string }
const STORAGE_KEY = 'sensi-settings:v1'

export function saveRecommendedSensitivity(storage: Storage, result: SavedSensitivity) {
  const previous = readSensitivitySettings(storage)
  const next = { ...previous, [result.gameId]: result }
  storage.setItem(STORAGE_KEY, JSON.stringify(next))
  return result
}

export function readSensitivitySettings(storage: Storage): Partial<Record<GameId, SavedSensitivity>> {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const value = JSON.parse(raw) as unknown
    return value && typeof value === 'object' ? value as Partial<Record<GameId, SavedSensitivity>> : {}
  } catch {
    return {}
  }
}
