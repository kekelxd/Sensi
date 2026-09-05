import { describe, expect, it } from 'vitest'
import type { NavigationView } from './AppNavigation'
import { isDiagnosticView } from './navigationState'

describe('diagnostic navigation state', () => {
  it.each<NavigationView>(['polling', 'buttons'])('marks %s as part of Diagnostics', (view) => {
    expect(isDiagnosticView(view)).toBe(true)
  })

  it.each<NavigationView>(['home', 'analysis', 'profile', 'routine', 'warmup', 'calibration', 'converter'])('does not mark %s as Diagnostics', (view) => {
    expect(isDiagnosticView(view)).toBe(false)
  })
})
