import { describe, expect, it } from 'vitest'
import { appendValidationRounds, buildCalibrationCandidates, createCalibrationPlan, createRefinementPlan } from './calibrationPlan'
import { GAME_BY_ID } from './games'

describe('calibration plan', () => {
  it('uses the same trajectory for every candidate inside a block', () => {
    const plan = createCalibrationPlan(1, GAME_BY_ID.cs2, 42)
    const firstBlock = plan.rounds.filter((round) => round.blockIndex === 0)
    const secondBlock = plan.rounds.filter((round) => round.blockIndex === 1)

    expect(new Set(firstBlock.map((round) => round.trajectorySeed)).size).toBe(1)
    expect(new Set(secondBlock.map((round) => round.trajectorySeed)).size).toBe(1)
    expect(firstBlock[0].trajectorySeed).not.toBe(secondBlock[0].trajectorySeed)
  })

  it('reverses the second block to balance learning and fatigue', () => {
    const plan = createCalibrationPlan(1, GAME_BY_ID.cs2, 42)
    const firstOrder = plan.rounds.filter((round) => round.blockIndex === 0).map((round) => round.candidateId)
    const secondOrder = plan.rounds.filter((round) => round.blockIndex === 1).map((round) => round.candidateId)

    expect(secondOrder).toEqual([...firstOrder].reverse())
  })

  it('removes duplicate candidates caused by game rounding', () => {
    const candidates = buildCalibrationCandidates(1, GAME_BY_ID.pubg)
    expect(new Set(candidates.map((candidate) => candidate.sensitivity)).size).toBe(candidates.length)
    expect(candidates.length).toBeLessThan(3)
  })


  it('creates a narrow refinement plan around the selected point', () => {
    const plan = createRefinementPlan(0.12, GAME_BY_ID.valorant, [0.85, 0.9, 0.95], 99)

    expect(plan.candidates.map((candidate) => candidate.sensitivity)).toEqual([0.102, 0.108, 0.114])
    expect(plan.measurementRoundCount).toBe(6)
    expect(new Set(plan.candidates.map((candidate) => candidate.sensitivity)).size).toBe(3)
  })

  it('adds validation rounds with one new shared trajectory', () => {
    const plan = createCalibrationPlan(1, GAME_BY_ID.cs2, 42)
    const finalists = plan.candidates.slice(0, 2).map((candidate) => candidate.id)
    const expanded = appendValidationRounds(plan, finalists)
    const validation = expanded.rounds.filter((round) => round.stage === 'validation')

    expect(validation).toHaveLength(2)
    expect(new Set(validation.map((round) => round.trajectorySeed)).size).toBe(1)
    expect(expanded.validationRoundCount).toBe(2)
  })
})
