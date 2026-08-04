import { describe, expect, it } from 'vitest'
import { ROUTINE_PRESETS } from './routineConfig'
import { WARMUP_DURATION } from './warmupConfig'

describe('routine presets', () => {
  it('contains five one-minute phases in every preset', () => {
    expect(WARMUP_DURATION).toBe(60)
    expect(ROUTINE_PRESETS).toHaveLength(3)
    for (const preset of ROUTINE_PRESETS) expect(preset.exercises).toHaveLength(5)
  })

  it('covers clicking, switching and tracking in the fundamentals preset', () => {
    const fundamentals = ROUTINE_PRESETS.find((preset) => preset.id === 'fundamentals')!
    expect(fundamentals.exercises).toContain('flick')
    expect(fundamentals.exercises).toContain('switch')
    expect(fundamentals.exercises).toContain('tracking')
  })
})
