import { describe, expect, it } from 'vitest'
import { buildCalibrationHeatmap, buildCalibrationReport, calculateRoundResult, isCalibrationComplete, recommendMultiplier, ROUND_MULTIPLIERS, RoundResult } from './calibration'

const result = (multiplier: number, score: number): RoundResult => ({
  multiplier, score, accuracy: score, meanError: 20, smoothness: score, overshoots: 0,
  errorControl: 80, overshootPenalty: 0, sampleCount: 600, targetRadius: 30, aimOffsets: [],
})

describe('round scoring', () => {
  it('rewards accurate and smooth tracking', () => {
    const strong = calculateRoundResult(1, Array(100).fill(5), Array(100).fill(120), 30)
    const weak = calculateRoundResult(1, Array(100).fill(90), Array.from({ length: 100 }, (_, index) => index % 2 ? 900 : 20), 30)
    expect(strong.score).toBeGreaterThan(weak.score)
    expect(strong.accuracy).toBe(100)
    expect(strong.smoothness).toBe(100)
    expect(strong.score).toBeCloseTo(strong.accuracy * 0.55 + strong.errorControl * 0.3 + strong.smoothness * 0.15 - strong.overshootPenalty, 10)
  })

  it('returns a safe result without samples', () => {
    expect(calculateRoundResult(1, [], [], 30)).toEqual({ multiplier: 1, accuracy: 0, meanError: 999, smoothness: 0, overshoots: 0, score: 0, errorControl: 0, overshootPenalty: 0, sampleCount: 0, targetRadius: 30, aimOffsets: [] })
  })
})

describe('technical calibration report', () => {
  it('summarizes only competitive candidates and reports confidence', () => {
    const report = buildCalibrationReport([
      result(0.8, 48), result(0.9, 76), result(1, 92), result(1.1, 81), result(1.2, 50),
    ])

    expect(report).not.toBeNull()
    expect(report?.bestResult.multiplier).toBe(1)
    expect(report?.competitiveResults.map((candidate) => candidate.multiplier)).toEqual([1, 1.1])
    expect(report?.recommendation).toBeGreaterThanOrEqual(1)
    expect(report?.recommendation).toBeLessThanOrEqual(1.1)
    expect(report?.confidenceScore).toBeGreaterThan(0)
  })

  it('maps relative aim offsets and identifies samples inside the target', () => {
    const candidate = result(1, 90)
    candidate.aimOffsets = [{ x: 0, y: 0 }, { x: 2, y: 0 }]
    const cells = buildCalibrationHeatmap([candidate])

    expect(cells).toHaveLength(2)
    expect(cells.some((cell) => cell.insideTarget)).toBe(true)
    expect(cells.some((cell) => !cell.insideTarget)).toBe(true)
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

describe('calibration completion', () => {
  it('ends exactly after the fifth completed round', () => {
    expect(isCalibrationComplete(4)).toBe(false)
    expect(isCalibrationComplete(5)).toBe(true)
    expect(isCalibrationComplete(6)).toBe(true)
  })
})
