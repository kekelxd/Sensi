import { Activity, ArrowRight, CircleAlert, Crosshair, Flame, LineChart, LockKeyhole, Mouse, MousePointer2, ShieldCheck, Sparkles, Target, type LucideIcon } from 'lucide-react'
import { useI18n } from './i18n'

export type HomeDestination = 'calibration' | 'warmup' | 'buttons'

type Props = { onNavigate: (destination: HomeDestination) => void }

function CalibrationSimulation() {
  return <div className="home-v2-simulation" aria-hidden="true">
    <span className="home-v2-simulation-grid" />
    <div className="home-v2-simulation-head"><span><i /> CALIBRATION SESSION</span><b>ROUND 04 / 08</b></div>
    <div className="home-v2-simulation-track"><span /><i /><b><em /></b><strong /></div>
    <div className="home-v2-simulation-readout"><div><small>PRECISION</small><strong>91.2<em>%</em></strong></div><div><small>STABILITY</small><strong>HIGH</strong></div></div>
    <div className="home-v2-simulation-bars"><span><i /><b /></span><span><i /><b /></span><span><i /><b /></span><span><i /><b /></span></div>
  </div>
}

export function Home({ onNavigate }: Props) {
  const { t } = useI18n()
  const method: Array<{ icon: LucideIcon, title: string, description: string }> = [
    { icon: MousePointer2, title: t('home.v2MethodSetupTitle'), description: t('home.v2MethodSetupDescription') },
    { icon: Activity, title: t('home.v2MethodMeasureTitle'), description: t('home.v2MethodMeasureDescription') },
    { icon: LineChart, title: t('home.v2MethodCompareTitle'), description: t('home.v2MethodCompareDescription') },
  ]
  const tools: Array<{ id: HomeDestination, icon: LucideIcon, title: string, description: string, action: string }> = [
    { id: 'calibration', icon: Crosshair, title: t('home.calibrationTitle'), description: t('home.v2CalibrationDescription'), action: t('home.calibrationAction') },
    { id: 'warmup', icon: Flame, title: t('home.warmupTitle'), description: t('home.v2WarmupDescription'), action: t('home.warmupAction') },
    { id: 'buttons', icon: Mouse, title: t('home.diagnosticsTitle'), description: t('home.v2DiagnosticsDescription'), action: t('home.diagnosticsAction') },
  ]

  return <section className="home-v2-workspace">
    <section className="home-v2-hero">
      <div className="home-v2-hero-copy">
        <span className="home-v2-eyebrow"><Sparkles size={14} /> {t('home.v2Kicker')}</span>
        <h1><span>$ENSI</span> {t('home.v2HeroTitle')}</h1>
        <p>{t('home.v2HeroDescription')}</p>
        <div className="home-v2-actions"><button className="primary-button" onClick={() => onNavigate('calibration')}><Target size={17} /> {t('home.primaryAction')}</button><button className="home-v2-text-action" onClick={() => onNavigate('warmup')}>{t('home.secondaryAction')} <ArrowRight size={16} /></button></div>
        <div className="home-v2-proof"><span><ShieldCheck size={15} /> {t('home.trustLocal')}</span><span><Activity size={15} /> {t('home.trustGuided')}</span></div>
      </div>
      <CalibrationSimulation />
    </section>

    <section className="home-v2-method">
      <div className="home-v2-section-intro"><span>{t('home.v2MethodKicker')}</span><h2>{t('home.v2MethodTitle')}</h2><p>{t('home.v2MethodDescription')}</p></div>
      <div className="home-v2-method-steps">
        {method.map((item, index) => {
          const Icon = item.icon
          return <article key={item.title}><span className="home-v2-step-index">0{index + 1}</span><Icon size={20} /><div><strong>{item.title}</strong><p>{item.description}</p></div></article>
        })}
      </div>
    </section>

    <section className="home-v2-tools">
      <div className="home-v2-section-intro"><span>{t('home.v2ToolsKicker')}</span><h2>{t('home.v2ToolsTitle')}</h2></div>
      <div className="home-v2-tool-list">{tools.map((tool, index) => {
        const Icon = tool.icon
        return <button key={tool.id} onClick={() => onNavigate(tool.id)}><span className="home-v2-tool-index">0{index + 1}</span><span className="home-v2-tool-icon"><Icon size={19} /></span><span className="home-v2-tool-copy"><strong>{tool.title}</strong><small>{tool.description}</small></span><span className="home-v2-tool-action">{tool.action} <ArrowRight size={15} /></span></button>
      })}</div>
    </section>

    <section className="home-v2-disclosure">
      <div className="home-v2-disclosure-heading"><span className="home-v2-disclosure-icon"><CircleAlert size={19} /></span><div><span>{t('home.v2DisclosureKicker')}</span><h2>{t('home.v2DisclosureTitle')}</h2></div></div>
      <p>{t('home.v2DisclosureDescription')}</p>
      <div className="home-v2-disclosure-points"><div><LockKeyhole size={17} /><strong>{t('home.v2DisclosureRawTitle')}</strong><span>{t('home.v2DisclosureRawDescription')}</span></div><div><Mouse size={17} /><strong>{t('home.v2DisclosureAccelerationTitle')}</strong><span>{t('home.v2DisclosureAccelerationDescription')}</span></div><div><LineChart size={17} /><strong>{t('home.v2DisclosureComparisonTitle')}</strong><span>{t('home.v2DisclosureComparisonDescription')}</span></div></div>
    </section>
  </section>
}
