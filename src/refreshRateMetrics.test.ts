import { describe, expect, it } from 'vitest'
import { analyzeRefreshIntervals, classifyRefreshStability, median, percentile } from './refreshRateMetrics'

const sequence = (interval: number, count = 180) => Array.from({ length: count }, () => interval)

describe('refresh rate metrics', () => {
  it.each([
    [4.1667, 240],
    [6.9444, 144],
    [8.3333, 120],
    [16.6667, 60],
  ])('estimates %f ms as approximately %i Hz', (interval, expected) => {
    const result = analyzeRefreshIntervals(sequence(interval))
    expect(result.valid).toBe(true)
    expect(result.observedHz).toBeCloseTo(expected, 0)
    expect(result.frameIntervalMs).toBeCloseTo(interval, 3)
  })

  it('uses a robust median and excludes isolated outliers', () => {
    const result = analyzeRefreshIntervals([...sequence(6.9444), 80, 120])
    expect(median([1, 3, 2, 100, 4])).toBe(3)
    expect(result.observedHz).toBeCloseTo(144, 0)
    expect(result.delayedFrames).toBe(2)
    expect(result.outliers).toBe(2)
    expect(percentile([1, 2, 3, 4, 5], 0.95)).toBeCloseTo(4.8)
  })

  it('classifies stability without depending on a display refresh tier', () => {
    expect(classifyRefreshStability(98)).toBe('stable')
    expect(classifyRefreshStability(90)).toBe('moderate')
    expect(classifyRefreshStability(70)).toBe('unstable')
  })

  it('rejects insufficient and evidently throttled collections', () => {
    expect(analyzeRefreshIntervals(sequence(16.6667, 20)).reason).toBe('insufficient-samples')
    expect(analyzeRefreshIntervals([...sequence(16.6667, 100), ...sequence(100, 30)])).toMatchObject({ valid: false, reason: 'throttled' })
  })
})
