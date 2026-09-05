import { GameConfig } from './games'
import { GAME_SENSITIVITY_PROFILE_BY_ID } from './gameSensitivityProfiles'
import { getCmPer360, getSensitivityForCmPer360 } from './aimModel'
import { convertSensitivity as convertWithProfile, normalizeSensitivityForGame } from './sensitivityConversionEngine'

export { getCmPer360, getSensitivityForCmPer360 }

export function parsePositiveNumberInput(value: string) {
  if (!value.trim()) return null
  const parsed = Number(value.replace(',', '.'))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export function convertSensitivity(value: number, source: GameConfig, target: GameConfig, sourceDpi = 800, targetDpi = sourceDpi) {
  return convertWithProfile(value, GAME_SENSITIVITY_PROFILE_BY_ID[source.id], GAME_SENSITIVITY_PROFILE_BY_ID[target.id], sourceDpi, targetDpi)?.exactSensitivity ?? null
}

export function formatSensitivity(value: number, digits = 6) {
  if (!Number.isFinite(value)) return '--'
  return value.toFixed(digits).replace(/\.?0+$/, '')
}

export function normalizeSensitivity(value: number, game: GameConfig) {
  return normalizeSensitivityForGame(value, GAME_SENSITIVITY_PROFILE_BY_ID[game.id]) ?? game.sensitivityMin
}

export function isSensitivityInRange(value: number, game: GameConfig) {
  return Number.isFinite(value) && value >= game.sensitivityMin && value <= game.sensitivityMax
}
