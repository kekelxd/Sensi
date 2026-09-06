import { Check } from 'lucide-react'
import type { ReactNode } from 'react'

export function WizardStepper({ steps, current }: { steps: string[]; current: number }) {
  return <div className="xensi-wizard-stepper" aria-label={steps.join(', ')}>
    {steps.map((label, index) => {
      const number = index + 1
      const state = number < current ? 'complete' : number === current ? 'active' : 'future'
      return <div key={label} className={state}><i>{state === 'complete' ? <Check size={11} /> : number}</i><span>{label}</span></div>
    })}
  </div>
}

export function WizardStepPanel({ step, direction, children }: { step: number; direction: 1 | -1; children: ReactNode }) {
  return <div key={step} className={`xensi-wizard-panel ${direction > 0 ? 'is-forward' : 'is-back'}`}>{children}</div>
}
