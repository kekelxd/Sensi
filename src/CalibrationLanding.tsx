import { Target } from 'lucide-react'
import { useI18n } from './i18n'

const TRAIL_POINTS = [
  { x: 17, y: 72, delay: '-.2s' },
  { x: 23, y: 64, delay: '-.4s' },
  { x: 31, y: 59, delay: '-.6s' },
  { x: 40, y: 54, delay: '-.8s' },
  { x: 49, y: 45, delay: '-1s' },
  { x: 57, y: 33, delay: '-1.2s' },
  { x: 68, y: 35, delay: '-1.4s' },
  { x: 77, y: 25, delay: '-1.6s' },
]

type CalibrationLandingProps = {
  rounds: number
  seconds: number
  onStart: () => void
}

function CalibrationDemo() {
  const { t } = useI18n()

  return (
    <div className="calibration-demo" aria-label={t('calibration.landingPreview')}>
      <div className="calibration-demo-grid" />
      <div className="calibration-demo-label"><i />{t('calibration.landingPreview')}</div>
      <div className="calibration-demo-metric metric-accuracy"><span>{t('common.accuracy')}</span><strong>87.4%</strong></div>
      <div className="calibration-demo-metric metric-error"><span>{t('common.meanError')}</span><strong>18.2<small>px</small></strong></div>
      <div className="calibration-demo-metric metric-sensitivity"><span>{t('calibration.testSensitivity')}</span><strong>0.920</strong></div>

      <svg className="calibration-demo-path" viewBox="0 0 700 430" preserveAspectRatio="none" aria-hidden="true">
        <path d="M86 336 C145 250 228 278 298 224 S410 104 490 157 S594 140 622 77" />
      </svg>
      <div className="calibration-demo-trail" aria-hidden="true">
        {TRAIL_POINTS.map((point) => <i key={`${point.x}-${point.y}`} style={{ left: `${point.x}%`, top: `${point.y}%`, animationDelay: point.delay }} />)}
      </div>
      <div className="calibration-demo-target" aria-hidden="true"><i /></div>
      <div className="calibration-demo-crosshair" aria-hidden="true"><i /></div>
    </div>
  )
}

export function CalibrationLanding({ rounds, seconds, onStart }: CalibrationLandingProps) {
  const { t } = useI18n()
  const facts = [
    { value: String(rounds), label: t('calibration.landingRoundsLabel') },
    { value: String(seconds), label: t('calibration.landingSecondsLabel') },
  ]
  const steps = [
    { title: t('calibration.landingStepConfigure'), description: t('calibration.landingStepConfigureDescription') },
    { title: t('calibration.landingStepTrack'), description: t('calibration.landingStepTrackDescription') },
    { title: t('calibration.landingStepResult'), description: t('calibration.landingStepResultDescription') },
  ]

  return (
    <section className="calibration-landing">
      <div className="calibration-landing-inner">
        <div className="calibration-hero">
          <div className="calibration-hero-copy">
            <h1>{t('calibration.landingTitle')}</h1>
            <p>{t('calibration.landingDescription')}</p>
            <button className="calibration-start-button" type="button" onClick={onStart}><Target size={20} /> {t('calibration.landingStart')}</button>
            <div className="calibration-facts">
              {facts.map((fact) => <div key={fact.label}><strong>{fact.value}</strong><span>{fact.label}</span></div>)}
            </div>
          </div>
          <CalibrationDemo />
        </div>

        <div className="calibration-process">
          {steps.map((step, index) => (
            <div key={step.title} className="calibration-process-step">
              <i>{index + 1}</i>
              <div><strong>{step.title}</strong><span>{step.description}</span></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
