import { describe, expect, it } from 'vitest'
import { routeStateFromPath, viewRoutePath } from './routes'

describe('application route map', () => {
  it.each([
    ['warmup', '/Sensi/train'],
    ['routine', '/Sensi/train/routines'],
    ['calibration', '/Sensi/calibrate'],
    ['converter', '/Sensi/convert'],
    ['analysis', '/Sensi/analysis'],
    ['profile', '/Sensi/profile'],
    ['diagnostics', '/Sensi/diagnostics'],
    ['polling', '/Sensi/diagnostics/polling-rate'],
    ['buttons', '/Sensi/diagnostics/input'],
    ['refresh-rate', '/Sensi/diagnostics/refresh-rate'],
    ['controller-drift', '/Sensi/diagnostics/controller-drift'],
  ] as const)('maps %s to %s', (view, path) => {
    expect(viewRoutePath(view)).toBe(path)
  })

  it.each([
    ['switch', '/Sensi/train/target-switch'],
    ['tracking', '/Sensi/train/tracking'],
    ['flick', '/Sensi/train/target-shooting'],
    ['reflex', '/Sensi/train/reaction'],
    ['gridshot', '/Sensi/train/gridshot'],
    ['strafetrack', '/Sensi/train/strafetrack'],
    ['sniper-reaction', '/Sensi/train/sniper'],
  ] as const)('maps warmup exercise %s to %s', (warmupEntry, path) => {
    expect(viewRoutePath('warmup', { warmupEntry })).toBe(path)
  })

  it('maps methodology to the standalone route', () => {
    expect(viewRoutePath('analysis', { analysisSection: 'methodology' })).toBe('/Sensi/methodology')
    expect(routeStateFromPath('methodology')).toMatchObject({ view: 'analysis', analysisSection: 'methodology' })
  })

  it.each([
    ['diagnostics/polling-rate', 'polling'],
    ['diagnostics/input', 'buttons'],
    ['diagnostics/refresh-rate', 'refresh-rate'],
    ['diagnostics/controller-drift', 'controller-drift'],
    ['train/reaction', 'reflex'],
  ] as const)('parses %s', (path, expected) => {
    const state = routeStateFromPath(path)
    expect([state.view, state.warmupEntry]).toContain(expected)
  })
})
