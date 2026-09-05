import type { NavigationView } from './AppNavigation'

export function isDiagnosticView(view: NavigationView) {
  return view === 'polling' || view === 'buttons'
}
