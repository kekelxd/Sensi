import type { GameConfig } from './games'

export const DEFAULT_HORIZONTAL_FOV = 103
export const MIN_HORIZONTAL_FOV = 60
export const MAX_HORIZONTAL_FOV = 140

export function getDegreesPerCount(game: GameConfig, sensitivity: number) {
  if (!game.yaw || !Number.isFinite(sensitivity) || sensitivity <= 0) return null
  return game.yaw * sensitivity
}

export function getCmPer360(game: GameConfig, sensitivity: number, dpi: number) {
  const degreesPerCount = getDegreesPerCount(game, sensitivity)
  if (degreesPerCount === null || !Number.isFinite(dpi) || dpi <= 0) return null
  return 2.54 * 360 / (dpi * degreesPerCount)
}

export function getSensitivityForCmPer360(game: GameConfig, cmPer360: number, dpi: number) {
  if (!game.yaw || !Number.isFinite(cmPer360) || cmPer360 <= 0 || !Number.isFinite(dpi) || dpi <= 0) return null
  return 2.54 * 360 / (dpi * game.yaw * cmPer360)
}

export function getCanvasGain(game: GameConfig, sensitivity: number, horizontalFov: number, canvasWidth: number) {
  const degreesPerCount = getDegreesPerCount(game, sensitivity)
  if (degreesPerCount === null || !Number.isFinite(horizontalFov) || horizontalFov <= 0 || !Number.isFinite(canvasWidth) || canvasWidth <= 0) return null
  return degreesPerCount * canvasWidth / horizontalFov
}

export function getRelativeCanvasGain(multiplier: number) {
  return Math.max(0.1, Math.min(4, Number.isFinite(multiplier) ? multiplier : 1))
}
