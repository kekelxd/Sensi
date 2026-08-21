export type TargetPoint = { x: number, y: number }

const POSITIONS: readonly [number, number][] = [
  [-.32, -.22], [.30, -.20], [-.18, .28], [.34, .17], [0, -.31],
  [-.36, .06], [.16, .31], [.08, -.11], [-.08, .12], [.37, -.04],
]

export function flickTargetFor(index: number, width: number, height: number): TargetPoint {
  const [x, y] = POSITIONS[index % POSITIONS.length]
  return { x: width / 2 + x * width, y: height / 2 + y * height }
}

export function isFlickHit(aim: TargetPoint, target: TargetPoint, radius: number) {
  return Math.hypot(aim.x - target.x, aim.y - target.y) <= radius
}
