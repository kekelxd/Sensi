import { Activity, ArrowRight, CheckCircle2, CircleAlert, Crosshair, Flame, Lightbulb, LineChart, LockKeyhole, Mouse, MousePointer2, ShieldCheck, Sparkles, Target, TimerReset, type LucideIcon } from 'lucide-react'
import { useI18n } from './i18n'

export type HomeDestination = 'calibration' | 'warmup' | 'buttons'

type Props = { onNavigate: (destination: HomeDestination) => void }

function AimSight() {
  return <div className="home-aim-sight" aria-hidden="true">
    <span className="home-aim-sight-glow" />
    <span className="home-aim-sight-ring home-aim-sight-ring-one" />
    <span className="home-aim-sight-ring home-aim-sight-ring-two" />
    <span className="home-aim-sight-ring home-aim-sight-ring-three" />
    <span className="home-aim-sight-line home-aim-sight-line-horizontal" />
    <span className="home-aim-sight-line home-aim-sight-line-vertical" />
    <span className="home-aim-sight-sweep" />
    <span className="home-aim-sight-contact home-aim-sight-contact-one" />
    <span className="home-aim-sight-contact home-aim-sight-contact-two" />
    <span className="home-aim-sight-contact home-aim-sight-contact-three" />
    <span className="home-aim-sight-core" />
    <small>{'TARGET://SENSI'}</small>
    <b>{'READY TO CALIBRATE'}</b>
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
  const benefits: Array<{ icon: LucideIcon, title: string, description: string }> = [
    { icon: CheckCircle2, title: t('home.benefitLessGuessTitle'), description: t('home.benefitLessGuessDescription') },
    { icon: Lightbulb, title: t('home.benefitUnderstandTitle'), description: t('home.benefitUnderstandDescription') },
    { icon: TimerReset, title: t('home.benefitReadyTitle'), description: t('home.benefitReadyDescription') },
  ]

  return <section className="home-v2-workspace">
    <section className="home-v2-hero">
      <div className="home-v2-hero-copy">
        <span className="home-aim-label"><Sparkles size={14} /> {t('home.aimKicker')}</span>
        <h1><span>{t('home.aimLineOne')}</span><strong>{t('home.aimLineTwo')}</strong><span>{t('home.aimLineThree')}</span></h1>
        <p>{t('home.simpleHeroDescription')}</p>
        <div className="home-aim-actions"><button className="home-aim-primary" onClick={() => onNavigate('calibration')}><Target size={17} /> {t('home.primaryAction')}</button><button className="home-aim-secondary" onClick={() => onNavigate('warmup')}><span /> {t('home.aimWarmupBadge')}</button></div>
        <div className="home-aim-proof"><span><ShieldCheck size={15} /> {t('home.simpleLocal')}</span><span><Activity size={15} /> {t('home.simpleGuided')}</span></div>
      </div>
      <AimSight />
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
        return <button key={tool.id} onClick={() => onNavigate(tool.id)}><span className="home-v2-tool-index">0{index + 1}</span><span className="home-v2-tool-icon"><Icon size={19} /></span><span className="home-v2-tool-copy"><strong>{tool.title}</strong><small>{tool.description}</small></span><span className="home-v2-tool-action">{tool.action} <ArrowRight size={15} /></span></button>
      })}</div>
    </section>

    <section className="home-v2-worth">
      <div className="home-v2-worth-copy"><span>{t('home.benefitKicker')}</span><h2>{t('home.benefitTitle')}</h2><p>{t('home.benefitDescription')}</p><button className="home-v2-text-action" onClick={() => onNavigate('calibration')}>{t('home.benefitAction')} <ArrowRight size={16} /></button></div>
      <div className="home-v2-worth-points">{benefits.map((benefit) => {
        const Icon = benefit.icon
        return <div key={benefit.title}><Icon size={19} /><strong>{benefit.title}</strong><p>{benefit.description}</p></div>
      })}</div>
    </section>

    <section className="home-v2-disclosure">
      <div className="home-v2-disclosure-heading"><span className="home-v2-disclosure-icon"><CircleAlert size={19} /></span><div><span>{t('home.simpleDisclosureKicker')}</span><h2>{t('home.simpleDisclosureTitle')}</h2></div></div>
      <p>{t('home.simpleDisclosureDescription')}</p>
      <div className="home-v2-disclosure-points"><div><LockKeyhole size={17} /><strong>{t('home.simpleRawTitle')}</strong><span>{t('home.simpleRawDescription')}</span></div><div><Mouse size={17} /><strong>{t('home.simpleAccelerationTitle')}</strong><span>{t('home.simpleAccelerationDescription')}</span></div><div><LineChart size={17} /><strong>{t('home.simpleComparisonTitle')}</strong><span>{t('home.simpleComparisonDescription')}</span></div></div>
    </section>
  </section>
}
