import type { AppView } from './routes'

export function isDiagnosticView(view: AppView) {
  return view === 'diagnostics' || view === 'polling' || view === 'buttons' || view === 'refresh-rate' || view === 'controller-drift'
}
