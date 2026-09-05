import { describe, expect, it } from 'vitest'
import { SNIPER_CONFIG, SniperReaction, summarizeSniper, type SniperAttempt } from './sniperReaction'
import { createEmptyWarmupMetrics, readWarmupSession, writeWarmupSession } from './warmupTelemetry'

function peek(random = .5) {
  const engine = new SniperReaction('medium', () => random)
  engine.update(0)
  engine.update(engine.deadline)
  return engine
}
function expose(engine: SniperReaction) {
  const time = engine.peekAt + engine.config.radius / engine.speed * 1000 + 1
  engine.update(time)
  return time
}
describe('Sniper Reaction', () => {
  it('waits until the seeded delay expires', () => {
    const engine = new SniperReaction('medium', () => .5)
    engine.update(0)
    expect(engine.deadline).toBe(1850)
    engine.update(1849)
    expect(engine.phase).toBe('waiting')
    engine.update(1850)
    expect(engine.phase).toBe('peek')
    expect(engine.visibleAt).toBeNull()
  })
  it.each([.2, .8])('crosses in the seeded direction %s', random => {
    const engine = peek(random)
    const x = engine.x
    engine.update(engine.peekAt + 50)
    expect(Math.sign(engine.x - x)).toBe(random < .5 ? 1 : -1)
  })
  it('adds a false window without a stimulus', () => {
    const engine = new SniperReaction('easy', () => 0)
    engine.update(0)
    expect(engine.deadline).toBe(1700)
    engine.update(700)
    expect(engine.phase).toBe('waiting')
    expect(engine.visibleAt).toBeNull()
  })
  it('times a hit from the first frame with half of the disk exposed', () => {
    const engine = peek()
    engine.update(engine.peekAt + 10)
    expect(engine.visibleAt).toBeNull()
    const visible = expose(engine)
    engine.shoot(visible + 120, engine.x, engine.y)
    expect(engine.attempts[0]).toEqual({ outcome: 'hit', stimulusVisibleAt: visible, shotAt: visible + 120, reactionMs: 120 })
  })
  it('records misses but excludes them from valid hit reaction average', () => {
    const engine = peek()
    const visible = expose(engine)
    engine.shoot(visible + 100, 1, 1)
    expect(engine.attempts[0].outcome).toBe('miss')
    expect(summarizeSniper(engine.attempts).reactionTimeMs).toBe(0)
  })
  it.each(['waiting', 'peek'])('classifies a shot before visual exposure as early (%s)', phase => {
    const engine = new SniperReaction('easy', () => .5)
    engine.update(0)
    if (phase === 'peek') engine.update(engine.deadline)
    engine.shoot(phase === 'peek' ? engine.peekAt : 10, 0, 0)
    expect(engine.attempts[0].outcome).toBe('early')
    expect(engine.attempts[0].reactionMs).toBeNull()
    expect(summarizeSniper(engine.attempts).shots).toBe(0)
  })
  it('consumes the attempt after one shot and waits through feedback', () => {
    const engine = peek()
    const time = expose(engine)
    engine.shoot(time, engine.x, engine.y)
    engine.shoot(time + 1, engine.x, engine.y)
    engine.update(time + 449)
    expect(engine.phase).toBe('feedback')
    expect(engine.attempts).toHaveLength(1)
    engine.update(time + 450)
    expect(engine.phase).toBe('waiting')
  })
  it('records no shot after crossing, including late input between frames', () => {
    for (const lateShot of [false, true]) {
      const engine = peek()
      expose(engine)
      if (lateShot) engine.shoot(engine.peekAt + 2000, engine.x, engine.y)
      else engine.update(engine.peekAt + 2000)
      expect(engine.attempts[0].outcome).toBe('noShot')
    }
  })
  it('never hits a part of the disk behind the structure', () => {
    const engine = peek(.2)
    const time = expose(engine)
    engine.shoot(time, -engine.config.opening / 2 - .001, engine.y)
    expect(engine.attempts[0].outcome).toBe('miss')
  })
  it('calculates accuracy, median, best and population-CV consistency', () => {
    const attempts: SniperAttempt[] = [
      { outcome: 'hit', reactionMs: 100, stimulusVisibleAt: 0, shotAt: 100 },
      { outcome: 'hit', reactionMs: 300, stimulusVisibleAt: 0, shotAt: 300 },
      { outcome: 'miss', reactionMs: 900, stimulusVisibleAt: 0, shotAt: 900 },
      { outcome: 'early', reactionMs: null, stimulusVisibleAt: null, shotAt: 10 },
      { outcome: 'noShot', reactionMs: null, stimulusVisibleAt: 0, shotAt: null },
    ]
    expect(summarizeSniper(attempts)).toMatchObject({ reactionTimeMs: 200, medianReactionMs: 200, bestReactionMs: 100, consistency: 50, earlyShots: 1, noShots: 1, attempts: 5 })
    expect(summarizeSniper(attempts).accuracy).toBeCloseTo(200 / 3)
    expect(summarizeSniper(attempts.slice(0, 1)).consistency).toBeNull()
  })
  it('narrows exposure and increases speed with difficulty', () => {
    expect(SNIPER_CONFIG.easy.opening).toBeGreaterThan(SNIPER_CONFIG.medium.opening)
    expect(SNIPER_CONFIG.medium.radius).toBeGreaterThan(SNIPER_CONFIG.hard.radius)
    expect(SNIPER_CONFIG.easy.speed).toBeLessThan(SNIPER_CONFIG.medium.speed)
    expect(SNIPER_CONFIG.medium.speed).toBeLessThan(SNIPER_CONFIG.hard.speed)
  })
  it('stops all state progression on session completion', () => {
    const engine = peek()
    engine.stop()
    engine.update(100000)
    engine.shoot(100001, 0, 0)
    expect(engine.phase).toBe('complete')
    expect(engine.attempts).toHaveLength(0)
  })
  it('persists mode-specific statistics with the existing storage contract', () => {
    const values = new Map<string, string>()
    const storage: Storage = {
      get length() { return values.size },
      clear: () => values.clear(),
      key: index => [...values.keys()][index] ?? null,
      removeItem: key => { values.delete(key) },
      getItem: key => values.get(key) ?? null,
      setItem: (key, value) => { values.set(key, value) },
    }
    const metrics = { ...createEmptyWarmupMetrics(60), sniper: summarizeSniper([]) }
    writeWarmupSession(storage, 'sniper-reaction', metrics)
    expect(readWarmupSession(storage, 'sniper-reaction')?.sniper).toEqual(metrics.sniper)
    expect(readWarmupSession(storage, 'reflex')).toBeNull()
  })
})
