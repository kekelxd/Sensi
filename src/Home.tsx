import { Activity, ArrowRight, Crosshair, Flame, Gauge, Mouse, ShieldCheck, Sparkles, Target } from 'lucide-react'
import type { ReactNode } from 'react'
import { useI18n } from './i18n'

export type HomeDestination = 'calibration' | 'warmup' | 'buttons'

type Props = { onNavigate: (destination: HomeDestination) => void }

function CalibrationPreview() {
  return <div className="home-preview home-calibration-preview" aria-hidden="true">
    <span className="home-preview-grid" />
    <i className="home-preview-path" />
    <b className="home-preview-target"><em /></b>
    <span className="home-preview-crosshair" />
    <div className="home-preview-reading"><small>TRACKING</small><strong>87.4%</strong></div>
  </div>
}

function WarmupPreview() {
  return <div className="home-preview home-warmup-preview" aria-hidden="true">
    <span className="home-preview-grid" />
    <i className="warmup-target warmup-target-one" /><i className="warmup-target warmup-target-two" /><i className="warmup-target warmup-target-three" />
    <span className="home-preview-crosshair warmup-crosshair" />
    <div className="home-preview-reading"><small>GRIDSHOT</small><strong>30s</strong></div>
  </div>
}

function DiagnosticsPreview() {
  return <div className="home-preview home-diagnostics-preview" aria-hidden="true">
    <span className="diagnostic-mouse"><i /><b /><em /><strong /></span>
    <span className="diagnostic-wave"><i /><i /><i /><i /></span>
    <div className="home-preview-reading"><small>INPUT</small><strong>READY</strong></div>
  </div>
}

export function Home({ onNavigate }: Props) {
  const { t } = useI18n()
  const pillars: Array<{ id: HomeDestination, icon: typeof Crosshair, title: string, description: string, action: string, preview: ReactNode }> = [
    { id: 'calibration', icon: Crosshair, title: t('home.calibrationTitle'), description: t('home.calibrationDescription'), action: t('home.calibrationAction'), preview: <CalibrationPreview /> },
    { id: 'warmup', icon: Flame, title: t('home.warmupTitle'), description: t('home.warmupDescription'), action: t('home.warmupAction'), preview: <WarmupPreview /> },
    { id: 'buttons', icon: Mouse, title: t('home.diagnosticsTitle'), description: t('home.diagnosticsDescription'), action: t('home.diagnosticsAction'), preview: <DiagnosticsPreview /> },
  ]
  const steps = [
    { icon: Target, title: t('home.stepGameTitle'), description: t('home.stepGameDescription') },
    { icon: Crosshair, title: t('home.stepTestTitle'), description: t('home.stepTestDescription') },
    { icon: Sparkles, title: t('home.stepResultTitle'), description: t('home.stepResultDescription') },
  ]

  return <section className="home-workspace">
    <div className="home-hero">
      <div className="home-hero-copy">
        <div className="panel-label"><Sparkles size={15} /> {t('home.kicker')}</div>
        <h1>{t('home.title')}</h1>
        <p>{t('home.subtitle')}</p>
        <div className="home-hero-actions"><button className="primary-button" onClick={() => onNavigate('calibration')}><Target size={17} /> {t('home.primaryAction')}</button><button className="secondary-button" onClick={() => onNavigate('warmup')}><Flame size={16} /> {t('home.secondaryAction')}</button></div>
        <div className="home-trust"><span><ShieldCheck size={15} /> {t('home.trustLocal')}</span><span><Crosshair size={15} /> {t('home.trustGuided')}</span></div>
      </div>
      <CalibrationPreview />
    </div>

    <div className="home-section-heading"><div><span>{t('home.exploreKicker')}</span><h2>{t('home.exploreTitle')}</h2></div><p>{t('home.exploreDescription')}</p></div>
    <div className="home-pillar-grid">
      {pillars.map((pillar) => {
        const Icon = pillar.icon
        return <button className="home-pillar-card" key={pillar.id} onClick={() => onNavigate(pillar.id)}>
          {pillar.preview}
          <span className="home-pillar-icon"><Icon size={17} /></span>
          <strong>{pillar.title}</strong><p>{pillar.description}</p><span className="home-pillar-action">{pillar.action} <ArrowRight size={15} /></span>
        </button>
      })}
    </div>

    <section className="home-explainer">
      <div className="home-section-heading"><div><span>{t('home.howKicker')}</span><h2>{t('home.howTitle')}</h2></div><p>{t('home.howDescription')}</p></div>
      <div className="home-steps">
        {steps.map((step, index) => {
          const Icon = step.icon
          return <div className="home-step" key={step.title}><span className="home-step-number">0{index + 1}</span><span className="home-step-icon"><Icon size={18} /></span><strong>{step.title}</strong><p>{step.description}</p></div>
        })}
      </div>
    </section>

    <section className="home-confidence">
      <div className="home-confidence-copy"><span className="panel-label"><ShieldCheck size={15} /> {t('home.confidenceKicker')}</span><h2>{t('home.confidenceTitle')}</h2><p>{t('home.confidenceDescription')}</p><small>{t('home.confidenceNote')}</small></div>
      <div className="home-confidence-signals">
        <div><Mouse size={18} /><strong>{t('home.signalInputTitle')}</strong><p>{t('home.signalInputDescription')}</p></div>
        <div><Gauge size={18} /><strong>{t('home.signalGameTitle')}</strong><p>{t('home.signalGameDescription')}</p></div>
        <div><Activity size={18} /><strong>{t('home.signalTelemetryTitle')}</strong><p>{t('home.signalTelemetryDescription')}</p></div>
      </div>
    </section>
  </section>
}
