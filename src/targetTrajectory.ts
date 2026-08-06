import { createSeededRandom } from './calibrationPlan'

export type NormalizedTargetPoint = {
  x: number
  y: number
}

type TargetSegment = {
  from: NormalizedTargetPoint
  to: NormalizedTargetPoint
  startMs: number
  endMs: number
}

export type TargetTrajectory = {
  seed: number
  totalDurationMs: number
  segments: TargetSegment[]
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
const distanceBetween = (left: NormalizedTargetPoint, right: NormalizedTargetPoint) => Math.hypot(right.x - left.x, right.y - left.y)

export function createTargetTrajectory(seed: number, targetSpeed = 1, pointCount = 96): TargetTrajectory {
  const random = createSeededRandom(seed)
  const points: NormalizedTargetPoint[] = [{ x: 0.5, y: 0.5 }]
  const margin = 0.06
  const minimumDistance = 0.16
  const normalizedSpeed = 0.31 * Math.max(0.6, targetSpeed)

  while (points.length < pointCount) {
    const previous = points[points.length - 1]
    let next: NormalizedTargetPoint | null = null

    for (let attempt = 0; attempt < 24; attempt += 1) {
      const candidate = {
        x: margin + random() * (1 - margin * 2),
        y: margin + random() * (1 - margin * 2),
      }
      if (distanceBetween(previous, candidate) >= minimumDistance) {
        next = candidate
        break
      }
    }

    if (!next) {
      const angle = random() * Math.PI * 2
      next = {
        x: clamp(previous.x + Math.cos(angle) * minimumDistance, margin, 1 - margin),
        y: clamp(previous.y + Math.sin(angle) * minimumDistance, margin, 1 - margin),
      }
    }

    points.push(next)
  }

  let elapsedMs = 0
  const segments: TargetSegment[] = []

  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1]
    const to = points[index]
    const segmentDurationMs = Math.max(220, distanceBetween(from, to) / normalizedSpeed * 1000)
    segments.push({ from, to, startMs: elapsedMs, endMs: elapsedMs + segmentDurationMs })
    elapsedMs += segmentDurationMs
  }

  return { seed, totalDurationMs: elapsedMs, segments }
}

export function sampleTargetTrajectory(
  trajectory: TargetTrajectory,
  elapsedMs: number,
  width: number,
  height: number,
  radius: number,
) {
  if (!trajectory.segments.length || width <= 0 || height <= 0) {
    return { x: width / 2, y: height / 2 }
  }

  const wrappedTime = ((elapsedMs % trajectory.totalDurationMs) + trajectory.totalDurationMs) % trajectory.totalDurationMs
  let low = 0
  let high = trajectory.segments.length - 1

  while (low < high) {
    const middle = Math.floor((low + high) / 2)
    if (trajectory.segments[middle].endMs < wrappedTime) low = middle + 1
    else high = middle
  }

  const segment = trajectory.segments[low]
  const duration = Math.max(1, segment.endMs - segment.startMs)
  const progress = clamp((wrappedTime - segment.startMs) / duration, 0, 1)
  const normalizedX = segment.from.x + (segment.to.x - segment.from.x) * progress
  const normalizedY = segment.from.y + (segment.to.y - segment.from.y) * progress
  const safeWidth = Math.max(0, width - radius * 2)
  const safeHeight = Math.max(0, height - radius * 2)

  return {
    x: radius + normalizedX * safeWidth,
    y: radius + normalizedY * safeHeight,
  }
}
