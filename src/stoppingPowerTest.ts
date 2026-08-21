import type { TargetPoint } from './flickAcquisitionTest'

export type StoppingTarget = TargetPoint & { stopped: boolean, cycle: number }

const CYCLE_MS = 2_500
const MOVING_MS = 1_450

export function stoppingTargetFor(elapsedMs: number, width: number, height: number): StoppingTarget {
  const cycle = Math.floor(elapsedMs / CYCLE_MS)
  const local = elapsedMs % CYCLE_MS
  const direction = cycle % 2 === 0 ? 1 : -1
  const startX = direction > 0 ? width * .18 : width * .82
  const endX = direction > 0 ? width * .82 : width * .18
  const progress = Math.min(1, local / MOVING_MS)
  const eased = progress * progress * (3 - 2 * progress)
  const y = height * (.5 + (cycle % 3 - 1) * .12)
  return {
    x: startX + (endX - startX) * eased,
    y,
    stopped: local >= MOVING_MS,
    cycle,
  }
}

export const STOPPING_MOVING_MS = MOVING_MS
