import { Activity, ArrowRight, CheckCircle2, Crosshair, Flame, Gamepad2, Gauge, Keyboard, Lightbulb, LineChart, LockKeyhole, Mouse, MousePointer2, Target, TimerReset, type LucideIcon } from 'lucide-react'
import { useI18n } from './i18n'

export type HomeDestination = 'calibration' | 'warmup' | 'buttons'

type Props = { onNavigate: (destination: HomeDestination) => void }

function GridshotPreview() {
  return <div className="home-reboot-preview" aria-hidden="true">
    <span className="home-reboot-preview-grid" />
    <span className="home-reboot-preview-path" />
    <span className="home-reboot-target home-reboot-target-one"><i /></span>
    <span className="home-reboot-target home-reboot-target-two"><i /></span>
    <span className="home-reboot-target home-reboot-target-three"><i /></span>
    <span className="home-reboot-crosshair" />
    <span className="home-reboot-impact home-reboot-impact-one" />
    <span className="home-reboot-impact home-reboot-impact-two" />
    <span className="home-reboot-impact home-reboot-impact-three" />
    <div className="home-reboot-preview-hud">
      <small>Gridshot</small>
      <strong>Live preview</strong>
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

  return <section className="home-reboot">
    <div className="home-reboot-shell">
      <section className="home-reboot-hero" aria-labelledby="home-title">
        <div className="home-reboot-copy">
          <h1 id="home-title" className="home-reboot-title">
            <span className="home-reboot-title-brand">{t('home.aimLineOne')}</span>
            <span>{t('home.aimLineTwo')}</span>
            <span>{t('home.aimLineThree')}</span>
          </h1>
          <p className="home-reboot-description">{t('home.simpleHeroDescription')}</p>

          <div className="home-reboot-actions" aria-label="Ações principais">
            <button className="home-reboot-primary" type="button" onClick={() => onNavigate('calibration')}>
              <Target size={18} />
              {t('home.primaryAction')}
            </button>
            <button className="home-reboot-secondary" type="button" onClick={() => onNavigate('warmup')}>
              <Flame size={18} />
              {t('home.aimWarmupBadge')}
              <ArrowRight size={17} />
            </button>
          </div>
        </div>

        <div className="home-reboot-visual" aria-label="Preview animado de Gridshot">
          <GridshotPreview />
        </div>
      </section>

      <section className="home-reboot-tools" aria-labelledby="tools-title">
        <div className="home-reboot-section-heading">
          <h2 id="tools-title">{t('home.simpleToolsTitle')}</h2>
        </div>

        <div className="home-reboot-bento">
          {tools.map((tool) => {
            const Icon = tool.icon

            return <button key={tool.id} className={`home-reboot-tool home-reboot-tool-${tool.id}`} type="button" onClick={() => onNavigate(tool.id)}>
              <span className="home-reboot-tool-icon"><Icon size={23} /></span>
              <span className="home-reboot-tool-text">
                <strong>{tool.title}</strong>
                <small>{tool.description}</small>
              </span>
              <span className="home-reboot-tool-visual" aria-hidden="true">
                {tool.id === 'calibration' && <><i /><b /><em /></>}
                {tool.id === 'warmup' && <><i /><i /><i /><b /></>}
                {tool.id === 'buttons' && <><Mouse size={17} /><Keyboard size={17} /><Gamepad2 size={17} /></>}
              </span>
              <span className="home-reboot-tool-action">
                {tool.action}
                <ArrowRight size={16} />
              </span>
            </button>
          })}
        </div>
      </section>

      <section className="home-reboot-method" aria-labelledby="method-title">
        <div className="home-reboot-section-heading">
          <h2 id="method-title">{t('home.simpleMethodTitle')}</h2>
          <p>{t('home.simpleMethodDescription')}</p>
        </div>

        <div className="home-reboot-steps">
          {method.map((item) => {
            const Icon = item.icon

            return <article className="home-reboot-step" key={item.title}>
              <Icon size={22} />
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          })}
        </div>
      </section>

      <section className="home-reboot-worth" aria-labelledby="worth-title">
        <article className="home-reboot-worth-main">
          <h2 id="worth-title">{t('home.benefitTitle')}</h2>
          <p>{t('home.benefitDescription')}</p>
          <button type="button" onClick={() => onNavigate('calibration')}>
            {t('home.benefitAction')}
            <ArrowRight size={17} />
          </button>
        </article>

        <div className="home-reboot-benefits">
          {benefits.map((benefit) => {
            const Icon = benefit.icon

            return <article className={benefit.visual ? 'home-reboot-benefit home-reboot-benefit-wide' : 'home-reboot-benefit'} key={benefit.title}>
              <Icon size={22} />
              <h3>{benefit.title}</h3>
              <p>{benefit.description}</p>
              {benefit.visual === 'comparison' && <span className="home-reboot-bars" aria-hidden="true">
                <i />
                <i />
                <i />
                <b />
              </span>}
            </article>
          })}
        </div>
      </section>

      <section className="home-reboot-disclosure" aria-labelledby="disclosure-title">
        <div className="home-reboot-section-heading">
          <h2 id="disclosure-title">{t('home.simpleDisclosureTitle')}</h2>
          <p>{t('home.simpleDisclosureDescription')}</p>
        </div>

        <div className="home-reboot-disclosure-grid">
          <article>
            <LockKeyhole size={20} />
            <h3>{t('home.simpleRawTitle')}</h3>
            <p>{t('home.simpleRawDescription')}</p>
          </article>
          <article>
            <Gauge size={20} />
            <h3>{t('home.simpleAccelerationTitle')}</h3>
            <p>{t('home.simpleAccelerationDescription')}</p>
          </article>
          <article>
            <LineChart size={20} />
            <h3>{t('home.simpleComparisonTitle')}</h3>
            <p>{t('home.simpleComparisonDescription')}</p>
          </article>
        </div>
      </section>
    </div>
  </section>
}
