import { describe, expect, it } from 'vitest'
import {
  buildCalibrationReport,
  calculateRoundResult,
  isCalibrationComplete,
  type RoundCapture,
  type RoundDiagnostics,
  type RoundResult,
} from './calibration'
import { appendValidationRounds, createCalibrationPlan } from './calibrationPlan'
import { GAME_BY_ID } from './games'

const diagnostics = (overrides: Partial<RoundDiagnostics> = {}): RoundDiagnostics => ({
  pointerLockLosses: 0,
  resizeCount: 0,
  frameCount: 1200,
  longFrameCount: 0,
  inputEventCount: 500,
  rawInputSupported: true,
  coalescedInputSupported: true,
  ...overrides,
})

const capture = (distance: number, speed: number, overrides: Partial<RoundCapture> = {}): RoundCapture => ({
  distances: Array(500).fill(distance),
  speeds: Array(500).fill(speed),
  targetRadius: 30,
  diagnostics: diagnostics(),
  ...overrides,
})

const syntheticResult = (
  round: ReturnType<typeof createCalibrationPlan>['rounds'][number],
  candidate: ReturnType<typeof createCalibrationPlan>['candidates'][number],
  score: number,
): RoundResult => ({
  roundId: round.id,
  stage: round.stage,
  candidateId: candidate.id,
  blockIndex: round.blockIndex,
  repetitionIndex: round.repetitionIndex,
  trajectorySeed: round.trajectorySeed,
  sensitivity: candidate.sensitivity,
  multiplier: candidate.multiplier,
  accuracy: score,
  meanError: 20,
  smoothness: score,
  overshoots: 0,
  score,
  errorControl: 80,
  overshootPenalty: 0,
  sampleCount: 500,
  targetRadius: 30,
  qualityScore: 100,
  valid: true,
  issues: [],
  diagnostics: diagnostics(),
})

describe('round scoring', () => {
  it('rewards accurate and stable tracking', () => {
    const plan = createCalibrationPlan(1, GAME_BY_ID.cs2, 10)
    const round = plan.rounds[0]
    const candidate = plan.candidates.find((item) => item.id === round.candidateId)!
    const strong = calculateRoundResult(round, candidate, capture(5, 120))
    const weak = calculateRoundResult(round, candidate, capture(90, 900, {
      speeds: Array.from({ length: 500 }, (_, index) => index % 2 ? 900 : 20),
    }))

    expect(strong.valid).toBe(true)
    expect(strong.score).toBeGreaterThan(weak.score)
    expect(strong.accuracy).toBe(100)
    expect(strong.smoothness).toBe(100)
  })

  it('rejects a round when pointer lock is interrupted during scoring', () => {
    const plan = createCalibrationPlan(1, GAME_BY_ID.cs2, 10)
    const round = plan.rounds[0]
    const candidate = plan.candidates.find((item) => item.id === round.candidateId)!
    const result = calculateRoundResult(round, candidate, capture(5, 120, {
      diagnostics: diagnostics({ pointerLockLosses: 1 }),
    }))

    expect(result.valid).toBe(false)
    expect(result.issues).toContain('too-many-interruptions')
  })

  it('rejects a round with insufficient samples', () => {
    const plan = createCalibrationPlan(1, GAME_BY_ID.cs2, 10)
    const round = plan.rounds[0]
    const candidate = plan.candidates.find((item) => item.id === round.candidateId)!
    const result = calculateRoundResult(round, candidate, capture(5, 120, {
      distances: Array(10).fill(5),
      speeds: Array(10).fill(120),
    }))

    expect(result.valid).toBe(false)
    expect(result.issues).toContain('insufficient-samples')
  })
})

describe('calibration report', () => {
  it('confirms a candidate when both blocks and validation agree', () => {
    const initialPlan = createCalibrationPlan(1, GAME_BY_ID.cs2, 123)
    const orderedCandidates = [...initialPlan.candidates].sort((left, right) => left.multiplier - right.multiplier)
    const best = orderedCandidates[2]
    const second = orderedCandidates[3]
    const plan = appendValidationRounds(initialPlan, [best.id, second.id])

    const results = plan.rounds.map((round) => {
      const candidate = plan.candidates.find((item) => item.id === round.candidateId)!
      const score = candidate.id === best.id ? 92 : candidate.id === second.id ? 81 : 58
      return syntheticResult(round, candidate, score)
    })
    const report = buildCalibrationReport(results, plan.candidates, plan.measurementRoundCount, plan.validationRoundCount)

    expect(report).not.toBeNull()
    expect(report?.bestResult.candidateId).toBe(best.id)
    expect(report?.resultKind).toBe('recommended')
    expect(report?.validationAgreementScore).toBe(100)
    expect(report?.validationStatus).toBe('confirmed')
    expect(report?.validationConfirmedRounds).toBe(2)
    expect(report?.validationAlternativeRounds).toBe(0)
    expect(report?.validationTiedRounds).toBe(0)
    expect(report?.validationTotalRounds).toBe(2)
  })


  it('returns the tested winner instead of inventing an intermediate value', () => {
    const initialPlan = createCalibrationPlan(1, GAME_BY_ID.cs2, 456)
    const orderedCandidates = [...initialPlan.candidates].sort((left, right) => left.multiplier - right.multiplier)
    const best = orderedCandidates[2]
    const second = orderedCandidates[3]
    const plan = appendValidationRounds(initialPlan, [best.id, second.id])

    const results = plan.rounds.map((round) => {
      const candidate = plan.candidates.find((item) => item.id === round.candidateId)!
      const score = candidate.id === best.id ? 90 : candidate.id === second.id ? 86.5 : 60
      return syntheticResult(round, candidate, score)
    })
    const report = buildCalibrationReport(results, plan.candidates, plan.measurementRoundCount, plan.validationRoundCount)

    expect(report?.resultKind).toBe('recommended')
    expect(report?.recommendation).toBe(best.multiplier)
  })


  it('marks validation as split when each tested value wins one final trajectory', () => {
    const initialPlan = createCalibrationPlan(1, GAME_BY_ID.cs2, 246)
    const orderedCandidates = [...initialPlan.candidates].sort((left, right) => left.multiplier - right.multiplier)
    const measurementWinner = orderedCandidates[2]
    const nearbyValue = orderedCandidates[3]
    const plan = appendValidationRounds(initialPlan, [measurementWinner.id, nearbyValue.id])

    const results = plan.rounds.map((round) => {
      const candidate = plan.candidates.find((item) => item.id === round.candidateId)!
      const score = round.stage === 'validation'
        ? round.blockIndex === plan.repetitions
          ? candidate.id === measurementWinner.id ? 91 : 89
          : candidate.id === nearbyValue.id ? 91 : 89
        : candidate.id === measurementWinner.id ? 90 : candidate.id === nearbyValue.id ? 87 : 60
      return syntheticResult(round, candidate, score)
    })
    const report = buildCalibrationReport(results, plan.candidates, plan.measurementRoundCount, plan.validationRoundCount)

    expect(report?.validationStatus).toBe('split')
    expect(report?.reason).toBe('validation-split')
    expect(report?.resultKind).toBe('inconclusive')
    expect(report?.validationWinner).toBeNull()
    expect(report?.validationConfirmedRounds).toBe(1)
    expect(report?.validationAlternativeRounds).toBe(1)
    expect(report?.validationTiedRounds).toBe(0)
    expect(report?.validationTotalRounds).toBe(2)
  })

  it('does not invent a validation winner when both final trajectories are technical ties', () => {
    const initialPlan = createCalibrationPlan(1, GAME_BY_ID.cs2, 247)
    const orderedCandidates = [...initialPlan.candidates].sort((left, right) => left.multiplier - right.multiplier)
    const first = orderedCandidates[2]
    const second = orderedCandidates[3]
    const plan = appendValidationRounds(initialPlan, [first.id, second.id])

    const results = plan.rounds.map((round) => {
      const candidate = plan.candidates.find((item) => item.id === round.candidateId)!
      const score = round.stage === 'validation'
        ? round.blockIndex === plan.repetitions
          ? candidate.id === first.id ? 90 : 89.5
          : candidate.id === second.id ? 90 : 89.5
        : candidate.id === first.id ? 88 : candidate.id === second.id ? 87.5 : 60
      return syntheticResult(round, candidate, score)
    })
    const report = buildCalibrationReport(results, plan.candidates, plan.measurementRoundCount, plan.validationRoundCount)

    expect(report?.validationStatus).toBe('split')
    expect(report?.validationWinner).toBeNull()
    expect(report?.validationTiedRounds).toBe(2)
    expect(report?.validationTotalRounds).toBe(2)
  })

  it('rejects the initial leader when the other tested value wins both final trajectories', () => {
    const initialPlan = createCalibrationPlan(1, GAME_BY_ID.cs2, 789)
    const orderedCandidates = [...initialPlan.candidates].sort((left, right) => left.multiplier - right.multiplier)
    const measurementWinner = orderedCandidates[1]
    const validationWinner = orderedCandidates[4]
    const plan = appendValidationRounds(initialPlan, [measurementWinner.id, validationWinner.id])

    const results = plan.rounds.map((round) => {
      const candidate = plan.candidates.find((item) => item.id === round.candidateId)!
      const score = round.stage === 'validation'
        ? candidate.id === validationWinner.id ? 96 : 70
        : candidate.id === measurementWinner.id ? 94 : candidate.id === validationWinner.id ? 82 : 60
      return syntheticResult(round, candidate, score)
    })
    const report = buildCalibrationReport(results, plan.candidates, plan.measurementRoundCount, plan.validationRoundCount)

    expect(report?.resultKind).toBe('inconclusive')
    expect(report?.reason).toBe('validation-reversed')
    expect(report?.confidenceScore).toBeLessThanOrEqual(40)
    expect(report?.zoneKind).toBe('split')
    expect(report?.validationStatus).toBe('reversed')
    expect(report?.validationConfirmedRounds).toBe(0)
    expect(report?.validationAlternativeRounds).toBe(2)
    expect(report?.validationTiedRounds).toBe(0)
    expect(report?.range.min).toBe(measurementWinner.multiplier)
    expect(report?.range.max).toBe(measurementWinner.multiplier)
  })


  it('does not turn separated strong candidates into a broad range', () => {
    const initialPlan = createCalibrationPlan(1, GAME_BY_ID.cs2, 654)
    const orderedCandidates = [...initialPlan.candidates].sort((left, right) => left.multiplier - right.multiplier)
    const second = orderedCandidates[1]
    const best = orderedCandidates[3]
    const plan = appendValidationRounds(initialPlan, [best.id, second.id])

    const results = plan.rounds.map((round) => {
      const candidate = plan.candidates.find((item) => item.id === round.candidateId)!
      const score = candidate.id === best.id ? 84.3 : candidate.id === second.id ? 82.9 : candidate.id === orderedCandidates[2].id ? 81.9 : 79
      return syntheticResult(round, candidate, score)
    })
    const report = buildCalibrationReport(results, plan.candidates, plan.measurementRoundCount, plan.validationRoundCount)

    expect(report?.resultKind).toBe('inconclusive')
    expect(report?.reason).toBe('split-candidates')
    expect(report?.recommendation).toBe(best.multiplier)
    expect(report?.range).toEqual({ min: best.multiplier, max: best.multiplier })
    expect(report?.refinementMultipliers).toContain(best.multiplier)
  })

  it('caps recommendation strength when blocks disagree', () => {
    const initialPlan = createCalibrationPlan(1, GAME_BY_ID.cs2, 777)
    const orderedCandidates = [...initialPlan.candidates].sort((left, right) => left.multiplier - right.multiplier)
    const firstWinner = orderedCandidates[0]
    const secondWinner = orderedCandidates[4]
    const plan = appendValidationRounds(initialPlan, [firstWinner.id, secondWinner.id])

    const results = plan.rounds.map((round) => {
      const candidate = plan.candidates.find((item) => item.id === round.candidateId)!
      const score = round.stage === 'validation'
        ? candidate.id === firstWinner.id ? 91 : 80
        : round.blockIndex === 0
          ? candidate.id === firstWinner.id ? 92 : 75
          : candidate.id === secondWinner.id ? 92 : 75
      return syntheticResult(round, candidate, score)
    })
    const report = buildCalibrationReport(results, plan.candidates, plan.measurementRoundCount, plan.validationRoundCount)

    expect(report?.blockAgreementScore).toBe(20)
    expect(report?.recommendationStrengthScore).toBeLessThanOrEqual(50)
    expect(report?.collectionQualityScore).toBe(100)
  })

  it('returns a range when adjacent candidates remain close', () => {
    const initialPlan = createCalibrationPlan(1, GAME_BY_ID.cs2, 321)
    const orderedCandidates = [...initialPlan.candidates].sort((left, right) => left.multiplier - right.multiplier)
    const first = orderedCandidates[2]
    const second = orderedCandidates[3]
    const plan = appendValidationRounds(initialPlan, [first.id, second.id])

    const results = plan.rounds.map((round) => {
      const candidate = plan.candidates.find((item) => item.id === round.candidateId)!
      const score = candidate.id === first.id ? 86 : candidate.id === second.id ? 85 : 60
      return syntheticResult(round, candidate, score)
    })
    const report = buildCalibrationReport(results, plan.candidates, plan.measurementRoundCount, plan.validationRoundCount)

    expect(report?.resultKind).toBe('range')
    expect(report?.range.max).toBeGreaterThan(report?.range.min ?? 0)
  })
})

describe('calibration completion', () => {
  it('uses the dynamic plan length', () => {
    expect(isCalibrationComplete(11, 12)).toBe(false)
    expect(isCalibrationComplete(12, 12)).toBe(true)
    expect(isCalibrationComplete(13, 12)).toBe(true)
  })
})
