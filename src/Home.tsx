import { useEffect, useRef } from 'react'
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Crosshair,
  Flame,
  Gamepad2,
  Keyboard,
  LineChart,
  LockKeyhole,
  Mouse,
  MousePointer2,
  Target,
  TimerReset,
  type LucideIcon,
} from 'lucide-react'
import { useI18n } from './i18n'

export type HomeDestination = 'calibration' | 'warmup' | 'buttons'

type Props = { onNavigate: (destination: HomeDestination) => void }

function GridshotPreview() {
  return <div className="home-v3-preview" aria-hidden="true">
    <span className="home-v3-preview-grid" />
    <span className="home-v3-preview-scan" />
    <span className="home-v3-preview-trace" />
    <span className="home-v3-preview-crosshair" />
    <span className="home-v3-preview-target home-v3-preview-target-one"><i /></span>
    <span className="home-v3-preview-target home-v3-preview-target-two"><i /></span>
    <span className="home-v3-preview-target home-v3-preview-target-three"><i /></span>
    <span className="home-v3-preview-hit home-v3-preview-hit-one" />
    <span className="home-v3-preview-hit home-v3-preview-hit-two" />
    <span className="home-v3-preview-hit home-v3-preview-hit-three" />
    <span className="home-v3-preview-panel">
      <small>Gridshot</small>
      <strong>+128</strong>
      <em>target chain</em>
    </span>
    <span className="home-v3-preview-bars">
      <i />
      <i />
      <i />
      <i />
    </span>
  </div>
}

function MetricStrip() {
  return <div className="home-v3-metrics" aria-hidden="true">
    <span><small>precision</small><strong>91%</strong></span>
    <span><small>stability</small><strong>high</strong></span>
    <span><small>round</small><strong>04/08</strong></span>
  </div>
}

export function Home({ onNavigate }: Props) {
  const { t } = useI18n()
  const rootRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        entry.target.setAttribute('data-visible', String(entry.isIntersecting))
        if (entry.isIntersecting) entry.target.setAttribute('data-revealed', 'true')
      }
    }, { threshold: 0.08 })
    root.querySelectorAll('.home-v3-tool, .home-v3-benefit, .home-v3-method-card, .home-v3-disclosure, .home-v3-stage').forEach((element) => observer.observe(element))
    const updateVisibility = () => root.setAttribute('data-hidden', String(document.hidden))
    updateVisibility()
    document.addEventListener('visibilitychange', updateVisibility)
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', updateVisibility)
    }
  }, [])
  const tools: Array<{ id: HomeDestination, icon: LucideIcon, title: string, description: string, action: string }> = [
    { id: 'calibration', icon: Crosshair, title: t('home.calibrationTitle'), description: t('home.simpleCalibrationDescription'), action: t('home.calibrationAction') },
    { id: 'warmup', icon: Flame, title: t('home.warmupTitle'), description: t('home.simpleWarmupDescription'), action: t('home.warmupAction') },
    { id: 'buttons', icon: Mouse, title: t('home.diagnosticsTitle'), description: t('home.simpleDiagnosticsDescription'), action: t('home.diagnosticsAction') },
  ]
  const method: Array<{ icon: LucideIcon, title: string, description: string }> = [
    { icon: MousePointer2, title: t('home.simpleSetupTitle'), description: t('home.simpleSetupDescription') },
    { icon: Activity, title: t('home.simpleMeasureTitle'), description: t('home.simpleMeasureDescription') },
    { icon: LineChart, title: t('home.simpleCompareTitle'), description: t('home.simpleCompareDescription') },
  ]
  const benefits: Array<{ icon: LucideIcon, title: string, description: string }> = [
    { icon: CheckCircle2, title: t('home.benefitLessGuessTitle'), description: t('home.benefitLessGuessDescription') },
    { icon: LineChart, title: t('home.benefitUnderstandTitle'), description: t('home.benefitUnderstandDescription') },
    { icon: TimerReset, title: t('home.benefitReadyTitle'), description: t('home.benefitReadyDescription') },
  ]

  return <main className="home-v3" ref={rootRef}>
    <div className="home-v3-shell">
      <section className="home-v3-hero" aria-labelledby="home-title">
        <div className="home-v3-copy">
          <span className="home-v3-eyebrow">XENSI // FPS CONTROL</span>
          <h1 id="home-title" className="home-v3-title">
            <span>{t('home.aimLineOne')}</span>
            <span>{t('home.aimLineTwo')}</span>
          </h1>
          <p className="home-v3-description">{t('home.simpleHeroDescription')}</p>

          <div className="home-v3-actions" aria-label="Ações principais">
            <button className="home-v3-primary" type="button" onClick={() => onNavigate('calibration')}>
              <Target size={18} />
              {t('home.primaryAction')}
            </button>
            <button className="home-v3-secondary" type="button" onClick={() => onNavigate('warmup')}>
              <Flame size={18} />
              {t('home.aimWarmupBadge')}
              <ArrowRight size={17} />
            </button>
          </div>
        </div>

        <div className="home-v3-stage">
          <GridshotPreview />
          <MetricStrip />
        </div>
      </section>

      <section className="home-v3-tools" aria-labelledby="tools-title">
        <div className="home-v3-section-heading">
          <span>{t('home.simpleToolsKicker')}</span>
          <h2 id="tools-title">{t('home.simpleToolsTitle')}</h2>
        </div>

        <div className="home-v3-tool-grid">
          {tools.map((tool, index) => {
            const Icon = tool.icon

            return <button
              className={`home-v3-tool home-v3-tool-${tool.id}`}
              key={tool.id}
              type="button"
              onClick={() => onNavigate(tool.id)}
            >
              <span className="home-v3-tool-number">{String(index + 1).padStart(2, '0')}</span>
              <span className="home-v3-tool-icon"><Icon size={23} /></span>
              <span className="home-v3-tool-copy">
                <strong>{tool.title}</strong>
                <small>{tool.description}</small>
              </span>
              <span className="home-v3-tool-visual" aria-hidden="true">
                {tool.id === 'calibration' && <><i /><b /><em /></>}
                {tool.id === 'warmup' && <><i /><i /><i /><b /></>}
                {tool.id === 'buttons' && <><Mouse size={17} /><Keyboard size={17} /><Gamepad2 size={17} /></>}
              </span>
              <span className="home-v3-tool-action">
                {tool.action}
                <ArrowRight size={16} />
              </span>
            </button>
          })}
        </div>
      </section>

      <section className="home-v3-method" aria-labelledby="method-title">
        <div className="home-v3-section-heading">
          <span>{t('home.simpleMethodKicker')}</span>
          <h2 id="method-title">{t('home.simpleMethodTitle')}</h2>
          <p>{t('home.simpleMethodDescription')}</p>
        </div>

        <div className="home-v3-method-grid">
          {method.map((item) => {
            const Icon = item.icon

            return <article className="home-v3-method-card" key={item.title}>
              <Icon size={22} />
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          })}
        </div>
      </section>

      <section className="home-v3-worth" aria-labelledby="worth-title">
        <article className="home-v3-worth-main">
          <span>{t('home.benefitKicker')}</span>
          <h2 id="worth-title">{t('home.benefitTitle')}</h2>
          <p>{t('home.benefitDescription')}</p>
          <button type="button" onClick={() => onNavigate('calibration')}>
            {t('home.benefitAction')}
            <ArrowRight size={17} />
          </button>
        </article>

        <div className="home-v3-benefit-grid">
          {benefits.map((benefit) => {
            const Icon = benefit.icon

            return <article className="home-v3-benefit" key={benefit.title}>
              <Icon size={21} />
              <h3>{benefit.title}</h3>
              <p>{benefit.description}</p>
            </article>
          })}
        </div>
      </section>

      <section className="home-v3-disclosure" aria-labelledby="disclosure-title">
        <div>
          <LockKeyhole size={20} />
          <h2 id="disclosure-title">{t('home.simpleDisclosureTitle')}</h2>
        </div>
        <p>{t('home.simpleDisclosureDescription')}</p>
        <ul>
          <li>{t('home.simpleRawDescription')}</li>
          <li>{t('home.simpleAccelerationDescription')}</li>
          <li>{t('home.simpleComparisonDescription')}</li>
        </ul>
      </section>
    </div>
  </main>
}
