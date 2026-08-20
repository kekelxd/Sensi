import type { GameConfig } from './games'

export type MousepadSize = 'small' | 'medium' | 'large'
export type CmRange = { min: number, max: number }

export const MOUSEPAD_RANGES: Record<MousepadSize, CmRange> = {
  small: { min: 20, max: 35 },
  medium: { min: 25, max: 50 },
  large: { min: 25, max: 70 },
}

export function countsPer360(sensitivity: number, yaw: number) {
  if (!Number.isFinite(sensitivity) || sensitivity <= 0 || !Number.isFinite(yaw) || yaw <= 0) return null
  return 360 / (sensitivity * yaw)
}

export function cmPer360FromSensitivity(sensitivity: number, yaw: number, dpi: number) {
  const counts = countsPer360(sensitivity, yaw)
  if (counts === null || !Number.isFinite(dpi) || dpi <= 0) return null
  return counts / dpi * 2.54
}

export function sensitivityFromCmPer360(cmPer360: number, yaw: number, dpi: number) {
  if (!Number.isFinite(cmPer360) || cmPer360 <= 0 || !Number.isFinite(yaw) || yaw <= 0 || !Number.isFinite(dpi) || dpi <= 0) return null
  return 360 * 2.54 / (cmPer360 * dpi * yaw)
}

export function finderSensitivity(game: GameConfig, cmPer360: number, dpi: number) {
  if (!game.yaw) return null
  return sensitivityFromCmPer360(cmPer360, game.yaw, dpi)
}

export function clampFinderRange(range: CmRange) {
  return { min: Math.min(range.min, range.max), max: Math.max(range.min, range.max) }
}

export function finderScore(telemetry: { timeOnTarget: number, smoothness: number, jitter: number, overshoots: number }) {
  const overshootPenalty = Math.min(100, telemetry.overshoots * 7)
  return telemetry.timeOnTarget * .4 + telemetry.smoothness * .3 - telemetry.jitter * .2 - overshootPenalty * .1
}

export function biomechanicalProfile(cmPer360: number) {
  if (cmPer360 >= 45) return 'arm' as const
  if (cmPer360 <= 30) return 'hybrid' as const
  return 'wrist' as const
}
