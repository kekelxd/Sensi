import type { FixedWarmupDifficulty } from './warmupConfig'

export const SNIPER_CONFIG = {
  easy: { opening: .32, radius: .035, speed: .38 },
  medium: { opening: .24, radius: .028, speed: .48 },
  hard: { opening: .18, radius: .022, speed: .60 },
} satisfies Record<FixedWarmupDifficulty, { opening: number; radius: number; speed: number }>

export type SniperOutcome = 'hit' | 'miss' | 'early' | 'noShot'
export type SniperAttempt = { outcome: SniperOutcome; stimulusVisibleAt: number | null; shotAt: number | null; reactionMs: number | null }

// Coordinates use the shorter canvas dimension. Time is monotonic active-session ms.
export class SniperReaction {
  phase: 'ready' | 'waiting' | 'peek' | 'feedback' | 'complete' = 'ready'
  attempts: SniperAttempt[] = []
  direction = 1
  x = 0
  y = 0
  visibleAt: number | null = null
  deadline = 0
  peekAt = 0
  speed = 0
  readonly config
  constructor(difficulty: FixedWarmupDifficulty, private rng: () => number = Math.random) {
    this.config = SNIPER_CONFIG[difficulty]
  }
  update(now: number) {
    if (this.phase === 'complete') return
    if (this.phase === 'ready' || (this.phase === 'feedback' && now >= this.deadline)) {
      this.phase = 'waiting'
      this.visibleAt = null
      this.direction = this.rng() < .5 ? 1 : -1
      this.y = (this.rng() - .5) * .08
      this.speed = this.config.speed * (.92 + this.rng() * .16)
      // 12% false windows extend the silent wait, without a cue or valid reaction.
      this.deadline = now + 700 + this.rng() * 2300 + (this.rng() < .12 ? 1000 + this.rng() * 1000 : 0)
    }
    if (this.phase === 'waiting' && now >= this.deadline) {
      this.phase = 'peek'
      this.peekAt = now
    }
    if (this.phase === 'peek') {
      this.x = this.direction * (-this.config.opening / 2 - this.config.radius + (now - this.peekAt) / 1000 * this.speed)
      // The first DRAWN frame with the center inside the aperture exposes >=50%
      // of the disk area. Never backdate to an unseen internal spawn timestamp.
      if (this.visibleAt === null && Math.abs(this.x) <= this.config.opening / 2) this.visibleAt = now
      if (this.direction * this.x >= this.config.opening / 2 + this.config.radius) this.finish('noShot', now)
    }
  }
  shoot(now: number, aimX: number, aimY: number) {
    if (this.phase !== 'waiting' && this.phase !== 'peek') return
    if (this.phase === 'peek' && (now - this.peekAt) / 1000 * this.speed >= this.config.opening + this.config.radius * 2) {
      this.finish('noShot', now)
      return
    }
    if (this.visibleAt === null) { this.finish('early', now); return }
    // Use the last rendered target and unsmoothed logical input, clipped to the aperture.
    const hit = Math.abs(aimX) <= this.config.opening / 2 && Math.hypot(aimX - this.x, aimY - this.y) <= this.config.radius
    this.finish(hit ? 'hit' : 'miss', now)
  }
  private finish(outcome: SniperOutcome, now: number) {
    this.attempts.push({ outcome, stimulusVisibleAt: this.visibleAt, shotAt: outcome === 'noShot' ? null : now,
      reactionMs: this.visibleAt !== null && (outcome === 'hit' || outcome === 'miss') ? now - this.visibleAt : null })
    this.phase = 'feedback'
    this.deadline = now + 450
  }
  stop() { this.phase = 'complete' }
}

export function summarizeSniper(attempts: SniperAttempt[]) {
  const times = attempts.filter(a => a.outcome === 'hit').map(a => a.reactionMs!).sort((a, b) => a - b)
  const hits = times.length
  const misses = attempts.filter(a => a.outcome === 'miss').length
  const mean = hits ? times.reduce((sum, n) => sum + n, 0) / hits : 0
  // Population CV: 100 * (1 - standard deviation / mean), clamped to [0,100].
  // Fewer than two hits cannot establish consistency; return null rather than 100%.
  const deviation = hits ? Math.sqrt(times.reduce((sum, n) => sum + (n - mean) ** 2, 0) / hits) : 0
  return { hits, misses, shots: hits + misses, reactionTimeMs: mean,
    accuracy: hits + misses ? hits / (hits + misses) * 100 : 0,
    earlyShots: attempts.filter(a => a.outcome === 'early').length,
    noShots: attempts.filter(a => a.outcome === 'noShot').length,
    attempts: attempts.length,
    consistency: hits >= 2 && mean > 0 ? Math.max(0, 100 * (1 - deviation / mean)) : null,
    bestReactionMs: hits ? times[0] : null,
    medianReactionMs: hits ? (times[Math.floor((hits - 1) / 2)] + times[Math.floor(hits / 2)]) / 2 : null }
}
