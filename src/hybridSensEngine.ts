import type { GameConfig } from './games'

export type GameArchetype = 'TACTICAL' | 'DYNAMIC'
export type HybridPhaseId = 'flick' | 'stopping' | 'tracking'

export type HybridPhase = {
  id: HybridPhaseId
  label: string
  durationMs: number
}

export type HybridTelemetry = {
  timeToFirstHitMs: number
  firstClickErrorPx: number
  flickAttempts: number
  flickHits: number
  overshootPixels: number
  overshootOscillations: number
  settlingTimeMs: number
  timeOnTargetPct: number
  smoothnessIndex: number
  jitterVariance: number
}

export const HYBRID_PHASES: readonly HybridPhase[] = [
  { id: 'flick', label: 'MICRO-FLICK', durationMs: 10_000 },
  { id: 'stopping', label: 'FRENAGEM', durationMs: 10_000 },
  { id: 'tracking', label: 'TRACKING', durationMs: 10_000 },
]

export const HYBRID_TRIAL_DURATION_SECONDS = HYBRID_PHASES.reduce((total, phase) => total + phase.durationMs, 0) / 1000

export function gameArchetype(game: GameConfig): GameArchetype {
  return game.id === 'cs2' || game.id === 'valorant' ? 'TACTICAL' : 'DYNAMIC'
}

export function phaseAt(elapsedMs: number) {
  let cursor = 0
  for (const phase of HYBRID_PHASES) {
    cursor += phase.durationMs
    if (elapsedMs < cursor) return phase
  }
  return HYBRID_PHASES.at(-1)!
}

export function phaseElapsedMs(elapsedMs: number, phaseId: HybridPhaseId) {
  let cursor = 0
  for (const phase of HYBRID_PHASES) {
    if (phase.id === phaseId) return Math.max(0, elapsedMs - cursor)
    cursor += phase.durationMs
  }
  return 0
}

export function emptyHybridTelemetry(): HybridTelemetry {
  return {
    timeToFirstHitMs: 0,
    firstClickErrorPx: 0,
    flickAttempts: 0,
    flickHits: 0,
    overshootPixels: 0,
    overshootOscillations: 0,
    settlingTimeMs: 10_000,
    timeOnTargetPct: 0,
    smoothnessIndex: 0,
    jitterVariance: 100,
  }
}
