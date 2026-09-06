import { describe, expect, it } from 'vitest'
import { evaluatePersonalBest, findComparablePersonalBest, PERSONAL_BEST_DEFINITIONS } from './personalBests'
import type { WarmupSessionSummary } from './warmupTelemetry'

const session = (value: Partial<WarmupSessionSummary> = {}, context: Partial<NonNullable<WarmupSessionSummary['sessionContext']>> = {}): WarmupSessionSummary => ({
  score: 100, accuracy: 80, hits: 10, shots: 12, onTargetMs: 2000, reactionTimeMs: 190, clickErrors: 2, bestStreak: 5, bestTrackingStreakMs: 0, overshootCount: 0, correctionCount: 2,
  sessionContext: { gameId: 'cs2', sensitivity: .65, dpi: 800, configuration: { difficulty: 'medium', durationSeconds: 60 }, ...context }, ...value,
})

describe('personal bests', () => {
  it('establishes a first record without a fabricated delta', () => {
    const result = evaluatePersonalBest('flick', session({ score: 178 }), [])
    expect(result).toMatchObject({ status: 'first', value: 178, previousValue: null, delta: null })
  })

  it('detects higher-is-better improvements, ties and worse results', () => {
    const previous = session({ score: 178 })
    expect(evaluatePersonalBest('flick', session({ score: 189 }), [previous])).toMatchObject({ status: 'new', value: 189, previousValue: 178, delta: 11 })
    expect(evaluatePersonalBest('flick', session({ score: 178.4 }), [previous])).toMatchObject({ status: 'none', value: 178, previousValue: 178, delta: null })
    expect(evaluatePersonalBest('flick', session({ score: 170 }), [previous])?.status).toBe('none')
  })

  it('detects lower-is-better reaction records using normalized precision', () => {
    const previous = session({ reactionTimeMs: 189, sniper: { hits: 1, shots: 1, misses: 0, noShots: 0, accuracy: 100, reactionTimeMs: 189, bestReactionMs: 189, consistency: 0, earlyShots: 0 } as never })
    const result = evaluatePersonalBest('sniper-reaction', session({ reactionTimeMs: 178, sniper: { ...previous.sniper!, bestReactionMs: 178 } }), [previous])
    expect(result).toMatchObject({ status: 'new', value: 178, previousValue: 189, delta: 11 })
    expect(evaluatePersonalBest('sniper-reaction', session({ reactionTimeMs: 200, sniper: { ...previous.sniper!, bestReactionMs: 200 } }), [previous])?.status).toBe('none')
  })

  it('does not compare different games or meaningful difficulty/duration settings', () => {
    const previous = session({ score: 200 })
    const otherGame = session({ score: 300 }, { gameId: 'valorant' })
    const otherDifficulty = session({ score: 300 }, { configuration: { difficulty: 'hard', durationSeconds: 60 } })
    expect(findComparablePersonalBest([previous], otherGame, PERSONAL_BEST_DEFINITIONS.flick)).toBeNull()
    expect(findComparablePersonalBest([previous], otherDifficulty, PERSONAL_BEST_DEFINITIONS.flick)).toBeNull()
  })

  it('ignores invalid sessions and keeps historical context detached', () => {
    const invalid = evaluatePersonalBest('flick', session({ score: 0 }), [])
    expect(invalid).toBeNull()
    const current = session({ score: 181 })
    const result = evaluatePersonalBest('flick', current, [])!
    current.sessionContext!.sensitivity = .61
    expect(result.current.sessionContext!.sensitivity).toBe(.65)
  })
})
