export type StickPoint = { x: number, y: number }

export const STICK_AXIS_BINS = 72

export function clampAxis(value: number | undefined) {
  return Math.max(-1, Math.min(1, Number.isFinite(value) ? value as number : 0))
}

export function rawAxis(value: number | undefined) {
  return Number.isFinite(value) ? value as number : 0
}

export function circularityError(points: StickPoint[]) {
  const maximumRadius = Array.from({ length: STICK_AXIS_BINS }, () => 0)

  for (const point of points) {
    const radius = Math.min(1, Math.hypot(point.x, point.y))
    if (radius < 0.08) continue
    const angle = (Math.atan2(point.y, point.x) + Math.PI * 2) % (Math.PI * 2)
    const bin = Math.min(STICK_AXIS_BINS - 1, Math.floor(angle / (Math.PI * 2) * STICK_AXIS_BINS))
    maximumRadius[bin] = Math.max(maximumRadius[bin], radius)
  }

  const sampledRadii = maximumRadius.filter((radius) => radius > 0)
  if (sampledRadii.length < STICK_AXIS_BINS / 3) return null
  const averageRadius = sampledRadii.reduce((sum, radius) => sum + radius, 0) / sampledRadii.length
  if (averageRadius === 0) return null
  return sampledRadii.reduce((sum, radius) => sum + Math.abs(radius - averageRadius), 0) / sampledRadii.length / averageRadius * 100
}
