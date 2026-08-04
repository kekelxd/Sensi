import { GameConfig } from './games'

export function convertSensitivity(value: number, source: GameConfig, target: GameConfig, sourceDpi = 800, targetDpi = sourceDpi) {
  if (!Number.isFinite(value) || value <= 0 || !Number.isFinite(sourceDpi) || sourceDpi <= 0 || !Number.isFinite(targetDpi) || targetDpi <= 0 || !source.yaw || !target.yaw) return null
  return value * source.yaw * sourceDpi / (target.yaw * targetDpi)
}

export function formatSensitivity(value: number, digits = 6) {
  if (!Number.isFinite(value)) return '--'
  return value.toFixed(digits).replace(/\.?0+$/, '')
}

export function normalizeSensitivity(value: number, game: GameConfig) {
  const finiteValue = Number.isFinite(value) ? value : game.sensitivityMin
  const clamped = Math.min(game.sensitivityMax, Math.max(game.sensitivityMin, finiteValue))
  const steps = Math.round((clamped - game.sensitivityMin) / game.sensitivityStep)
  const normalized = game.sensitivityMin + steps * game.sensitivityStep
  const precision = Math.max(0, (String(game.sensitivityStep).split('.')[1] ?? '').length)
  return Number(Math.min(game.sensitivityMax, Math.max(game.sensitivityMin, normalized)).toFixed(precision))
}

export function isSensitivityInRange(value: number, game: GameConfig) {
  return Number.isFinite(value) && value >= game.sensitivityMin && value <= game.sensitivityMax
}
