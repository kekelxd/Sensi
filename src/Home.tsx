import { Activity, ArrowRight, CheckCircle2, CircleAlert, Crosshair, Flame, Gamepad2, Gauge, Keyboard, Lightbulb, LineChart, LockKeyhole, Mouse, MousePointer2, ShieldCheck, Target, TimerReset, type LucideIcon } from 'lucide-react'
import { useI18n } from './i18n'

export type HomeDestination = 'calibration' | 'warmup' | 'buttons'

type Props = { onNavigate: (destination: HomeDestination) => void }

function GridshotPreview() {
  return <div className="home-gridshot-preview" aria-hidden="true">
    <span className="home-gridshot-noise" />
    <span className="home-gridshot-line home-gridshot-line-one" />
    <span className="home-gridshot-line home-gridshot-line-two" />
    <span className="home-gridshot-crosshair" />
    <span className="home-gridshot-target home-gridshot-target-one"><i /><b /><b /><b /></span>
    <span className="home-gridshot-target home-gridshot-target-two"><i /><b /><b /><b /></span>
    <span className="home-gridshot-target home-gridshot-target-three"><i /><b /><b /><b /></span>
    <div className="home-gridshot-hud">
      <small>GRIDSHOT</small>
      <strong>+128</strong>
      <span>target chain</span>
    </div>
    <div className="home-gridshot-feed">
      <span />
      <span />
      <span />
      <span />
    </div>
  </div>
}

export function Home({ onNavigate }: Props) {
  const { t } = useI18n()
  const method: Array<{ icon: LucideIcon, title: string, description: string }> = [
    { icon: MousePointer2, title: t('home.simpleSetupTitle'), description: t('home.simpleSetupDescription') },
    { icon: Activity, title: t('home.simpleMeasureTitle'), description: t('home.simpleMeasureDescription') },
    { icon: LineChart, title: t('home.simpleCompareTitle'), description: t('home.simpleCompareDescription') },
  ]
  const tools: Array<{ id: HomeDestination, icon: LucideIcon, title: string, description: string, action: string }> = [
    { id: 'calibration', icon: Crosshair, title: t('home.calibrationTitle'), description: t('home.simpleCalibrationDescription'), action: t('home.calibrationAction') },
    { id: 'warmup', icon: Flame, title: t('home.warmupTitle'), description: t('home.simpleWarmupDescription'), action: t('home.warmupAction') },
    { id: 'buttons', icon: Mouse, title: t('home.diagnosticsTitle'), description: t('home.simpleDiagnosticsDescription'), action: t('home.diagnosticsAction') },
  ]
  const benefits: Array<{ icon: LucideIcon, title: string, description: string, visual?: 'comparison' }> = [
    { icon: CheckCircle2, title: t('home.benefitLessGuessTitle'), description: t('home.benefitLessGuessDescription'), visual: 'comparison' },
    { icon: Lightbulb, title: t('home.benefitUnderstandTitle'), description: t('home.benefitUnderstandDescription') },
    { icon: TimerReset, title: t('home.benefitReadyTitle'), description: t('home.benefitReadyDescription') },
  ]

  return <section className="home-v2-workspace home-awwwards">
    <section className="home-v2-hero">
      <div className="home-v2-hero-copy">
        <h1><span>{t('home.aimLineOne')}</span><strong>{t('home.aimLineTwo')}</strong><span>{t('home.aimLineThree')}</span></h1>
        <p>{t('home.simpleHeroDescription')}</p>
        <div className="home-aim-actions">
          <button className="home-aim-primary" onClick={() => onNavigate('calibration')}><Target size={17} /> {t('home.primaryAction')}</button>
          <button className="home-aim-secondary" onClick={() => onNavigate('warmup')}><span /> {t('home.aimWarmupBadge')}</button>
        </div>
        <div className="home-aim-proof"><span><ShieldCheck size={15} /> {t('home.simpleLocal')}</span><span><Activity size={15} /> {t('home.simpleGuided')}</span></div>
      </div>
      <div className="home-hero-stage">
        <GridshotPreview />
        <div className="home-live-panel home-live-panel-score"><small>ACCURACY</small><strong>92</strong><span>clean hits</span></div>
        <div className="home-live-panel home-live-panel-error"><small>PACE</small><strong>0.41s</strong><span>reaction window</span></div>
      </div>
    </section>

    <section className="home-v2-method">
      <div className="home-v2-section-intro"><span>{t('home.simpleMethodKicker')}</span><h2>{t('home.simpleMethodTitle')}</h2><p>{t('home.simpleMethodDescription')}</p></div>
      <div className="home-v2-method-steps">
        {method.map((item, index) => {
          const Icon = item.icon
          return <article key={item.title}><span className="home-v2-step-index">0{index + 1}</span><Icon size={20} /><div><strong>{item.title}</strong><p>{item.description}</p></div></article>
        })}
      </div>
    </section>

    <section className="home-v2-tools">
      <div className="home-v2-section-intro"><span>{t('home.simpleToolsKicker')}</span><h2>{t('home.simpleToolsTitle')}</h2></div>
      <div className="home-v2-tool-list">{tools.map((tool, index) => {
        const Icon = tool.icon
        return <button key={tool.id} className={`home-tool-${tool.id}`} onClick={() => onNavigate(tool.id)}>
          <span className="home-v2-tool-index">0{index + 1}</span>
          <span className="home-v2-tool-icon"><Icon size={19} /></span>
          <span className="home-v2-tool-copy"><strong>{tool.title}</strong><small>{tool.description}</small></span>
          <span className="home-v2-tool-visual" aria-hidden="true">
            {tool.id === 'calibration' && <><i /><b /><em /></>}
            {tool.id === 'warmup' && <><i /><i /><i /><b /></>}
            {tool.id === 'buttons' && <><Mouse size={17} /><Keyboard size={17} /><Gamepad2 size={17} /></>}
          </span>
          <span className="home-v2-tool-action">{tool.action} <ArrowRight size={15} /></span>
        </button>
      })}</div>
    </section>

    <section className="home-v2-worth">
      <div className="home-v2-worth-copy"><span>{t('home.benefitKicker')}</span><h2>{t('home.benefitTitle')}</h2><p>{t('home.benefitDescription')}</p><button className="home-v2-text-action" onClick={() => onNavigate('calibration')}>{t('home.benefitAction')} <ArrowRight size={16} /></button></div>
      <div className="home-v2-worth-points">{benefits.map((benefit) => {
        const Icon = benefit.icon
        return <div key={benefit.title} className={benefit.visual ? 'home-worth-featured' : undefined}>
          <Icon size={19} />
          <strong>{benefit.title}</strong>
          <p>{benefit.description}</p>
          {benefit.visual === 'comparison' && <span className="home-worth-visual" aria-hidden="true">
            <i />
            <i />
            <i />
            <b />
            <em />
          </span>}
        </div>
      })}</div>
    </section>

    <section className="home-v2-disclosure">
      <div className="home-v2-disclosure-heading"><span className="home-v2-disclosure-icon"><CircleAlert size={19} /></span><div><span>{t('home.simpleDisclosureKicker')}</span><h2>{t('home.simpleDisclosureTitle')}</h2></div></div>
      <p>{t('home.simpleDisclosureDescription')}</p>
      <div className="home-v2-disclosure-points"><div><LockKeyhole size={17} /><strong>{t('home.simpleRawTitle')}</strong><span>{t('home.simpleRawDescription')}</span></div><div><Gauge size={17} /><strong>{t('home.simpleAccelerationTitle')}</strong><span>{t('home.simpleAccelerationDescription')}</span></div><div><LineChart size={17} /><strong>{t('home.simpleComparisonTitle')}</strong><span>{t('home.simpleComparisonDescription')}</span></div></div>
    </section>
  </section>
}
