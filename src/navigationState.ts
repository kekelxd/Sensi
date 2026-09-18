import type { NavigationView } from './AppNavigation'

export function isDiagnosticView(view: NavigationView) {
  return view === 'diagnostics' || view === 'polling' || view === 'buttons' || view === 'refresh-rate' || view === 'controller-drift'
}
