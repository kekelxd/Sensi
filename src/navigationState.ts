import type { NavigationView } from './AppNavigation'

export function isDiagnosticView(view: NavigationView) {
  return view === 'polling' || view === 'buttons' || view === 'refresh-rate' || view === 'controller-drift'
}
