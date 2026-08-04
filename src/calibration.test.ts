import { describe, expect, it } from 'vitest'
import { calculateRoundResult, recommendMultiplier, ROUND_MULTIPLIERS, RoundResult } from './calibration'

const result = (multiplier: number, score: number): RoundResult => ({ multiplier, score, accuracy: score, meanError: 0, smoothness: score, overshoots: 0 })

describe('round scoring', () => {
  it('rewards accurate and smooth tracking', () => {
    const strong = calculateRoundResult(1, Array(100).fill(5), Array(100).fill(120), 30)
    const weak = calculateRoundResult(1, Array(100).fill(90), Array.from({ length: 100 }, (_, index) => index % 2 ? 900 : 20), 30)
    expect(strong.score).toBeGreaterThan(weak.score)
    expect(strong.accuracy).toBe(100)
    expect(strong.smoothness).toBe(100)
  })

  it('returns a safe result without samples', () => {
    expect(calculateRoundResult(1, [], [], 30)).toEqual({ multiplier: 1, accuracy: 0, meanError: 999, smoothness: 0, overshoots: 0, score: 0 })
  })
})

describe('final recommendation', () => {
  it('starts neutral and alternates lower and higher candidates', () => {
    expect(ROUND_MULTIPLIERS).toEqual([1, 0.8, 1.2, 0.9, 1.1])
  })

  it('does not favor earlier rounds when scores tie', () => {
    const results = [0.8, 0.9, 1, 1.1, 1.2].map((multiplier) => result(multiplier, 80))
    expect(recommendMultiplier(results)).toBeCloseTo(1, 10)
  })

  it('follows a clearly superior candidate and stays in tested bounds', () => {
    const results = [result(0.8, 40), result(0.9, 50), result(1, 95), result(1.1, 55), result(1.2, 45)]
    expect(recommendMultiplier(results)).toBe(1)
    expect(recommendMultiplier(results)).toBeGreaterThanOrEqual(0.8)
    expect(recommendMultiplier(results)).toBeLessThanOrEqual(1.2)
  })

  it('returns the neutral multiplier when there is no useful score', () => {
    expect(recommendMultiplier([])).toBe(1)
    expect(recommendMultiplier([result(0.8, 0), result(1.2, 0)])).toBe(1)
  })
})
