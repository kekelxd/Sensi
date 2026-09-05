import { useEffect, useRef, useState } from 'react'
import { Activity, ArrowRight, Crosshair, Flame, Gamepad2, Keyboard, LineChart, LockKeyhole, Mouse, MousePointer2, Target, type LucideIcon } from 'lucide-react'
import { useI18n } from './i18n'

export type HomeDestination = 'calibration' | 'warmup' | 'buttons'

type Props = { onNavigate: (destination: HomeDestination) => void }
type PreviewProps = { score: number; activeTarget: number; hitTarget: number | null; onTargetHit: (target: number) => void }

function TrainingArena({ score, activeTarget, hitTarget, onTargetHit }: PreviewProps) {
  const { t } = useI18n()
  const targets = [
    { id: 0, className: 'northwest', label: t('home.demoTargetOne') },
    { id: 1, className: 'center', label: t('home.demoTargetTwo') },
    { id: 2, className: 'northeast', label: t('home.demoTargetThree') },
  ]

  return <section className="xensi-arena" aria-label={t('home.demoGridshot')} data-testid="home-training-demo">
    <span className="xensi-arena-grid" />
    <span className="xensi-arena-scan" />
    <span className="xensi-arena-trace" />
    <span className="xensi-arena-crosshair" aria-hidden="true" />
    <div className="xensi-arena-status" aria-hidden="true"><span>{t('home.demoGridshot')}</span><strong>+{score}</strong><small>{t('home.demoInteractive')}</small></div>
    {targets.map((target) => <button key={target.id} type="button" className={`xensi-arena-target xensi-arena-target-${target.className} ${activeTarget === target.id ? 'is-active' : ''}`} onClick={() => onTargetHit(target.id)} aria-label={target.label}><i /></button>)}
    {targets.map((target) => <span key={`impact-${target.id}`} className={`xensi-arena-impact xensi-arena-impact-${target.className} ${hitTarget === target.id ? 'is-hit' : ''}`} />)}
    <div className="xensi-arena-metrics" aria-hidden="true">
      <span><small>{t('home.demoPrecision')}</small><b>{Math.min(99, 88 + Math.floor(score / 16))}%</b></span>
      <span><small>{t('home.demoStability')}</small><b>{t('home.demoHigh')}</b></span>
      <span><small>{t('home.demoCombo')}</small><b>{String(Math.max(1, Math.floor(score / 8))).padStart(2, '0')}</b></span>
    </div>
  </section>
}

export function Home({ onNavigate }: Props) {
  const { t } = useI18n()
  const rootRef = useRef<HTMLElement>(null)
  const [demoScore, setDemoScore] = useState(128)
  const [activeTarget, setActiveTarget] = useState(1)
  const [hitTarget, setHitTarget] = useState<number | null>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => entry.target.setAttribute('data-revealed', String(entry.isIntersecting))), { threshold: 0.12 })
    root.querySelectorAll('.xensi-reveal, .xensi-arena').forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const cycle = window.setInterval(() => {
      if (!document.hidden) {
        setActiveTarget((target) => (target + 1) % 3)
        setHitTarget(null)
      }
    }, 2100)
    return () => window.clearInterval(cycle)
  }, [])

  const hitDemoTarget = (target: number) => {
    if (target !== activeTarget) return
    setDemoScore((score) => score + 8)
    setHitTarget(target)
    setActiveTarget((current) => (current + 1) % 3)
  }

  const tools: Array<{ id: HomeDestination, icon: LucideIcon, title: string, description: string, action: string }> = [
    { id: 'calibration', icon: Crosshair, title: t('home.calibrationTitle'), description: t('home.simpleCalibrationDescription'), action: t('home.calibrationAction') },
    { id: 'warmup', icon: Flame, title: t('home.warmupTitle'), description: t('home.simpleWarmupDescription'), action: t('home.warmupAction') },
    { id: 'buttons', icon: Mouse, title: t('home.diagnosticsTitle'), description: t('home.simpleDiagnosticsDescription'), action: t('home.diagnosticsAction') },
  ]
  const method = [
    { icon: MousePointer2, title: t('home.simpleSetupTitle'), description: t('home.simpleSetupDescription') },
    { icon: Activity, title: t('home.simpleMeasureTitle'), description: t('home.simpleMeasureDescription') },
    { icon: LineChart, title: t('home.simpleCompareTitle'), description: t('home.simpleCompareDescription') },
  ]

  return <main className="xensi-home" ref={rootRef}>
    <div className="xensi-home-shell">
      <section className="xensi-hero" aria-labelledby="home-title">
        <div className="xensi-hero-copy">
          <span className="xensi-kicker"><i /> XENSI / FPS</span>
          <h1 id="home-title"><span>{t('home.aimLineOne')}</span><span>{t('home.aimLineTwo')}</span></h1>
          <p>{t('home.simpleHeroDescription')}</p>
          <div className="xensi-hero-actions" aria-label="Ações principais">
            <button className="xensi-action-primary" type="button" onClick={() => onNavigate('calibration')}><Target size={18} />{t('home.primaryAction')}</button>
            <button className="xensi-action-secondary" type="button" onClick={() => onNavigate('warmup')}><Flame size={18} />{t('home.aimWarmupBadge')}<ArrowRight size={17} /></button>
          </div>
          <div className="xensi-hero-proof" aria-hidden="true"><span><i />{t('home.simpleLocal')}</span><span><i />{t('home.simpleGuided')}</span></div>
        </div>
        <TrainingArena score={demoScore} activeTarget={activeTarget} hitTarget={hitTarget} onTargetHit={hitDemoTarget} />
      </section>

      <section className="xensi-tools xensi-reveal" aria-labelledby="tools-title">
        <div className="xensi-section-intro"><span>{t('home.simpleToolsKicker')}</span><h2 id="tools-title">{t('home.simpleToolsTitle')}</h2></div>
        <div className="xensi-tools-grid">
          {tools.map((tool, index) => {
            const Icon = tool.icon
            return <button key={tool.id} className={`xensi-tool xensi-tool-${tool.id}`} type="button" onClick={() => onNavigate(tool.id)}>
              <span className="xensi-tool-index">0{index + 1}</span><span className="xensi-tool-icon"><Icon size={24} /></span>
              <span className="xensi-tool-copy"><b>{tool.title}</b><small>{tool.description}</small></span>
              <span className="xensi-tool-art" aria-hidden="true">{tool.id === 'calibration' && <><i /><em /><b /></>}{tool.id === 'warmup' && <><i /><i /><i /></>}{tool.id === 'buttons' && <><Mouse size={18} /><Keyboard size={18} /><Gamepad2 size={18} /></>}</span>
              <span className="xensi-tool-action">{tool.action}<ArrowRight size={16} /></span>
            </button>
          })}
        </div>
      </section>

      <section className="xensi-method xensi-reveal" aria-labelledby="method-title">
        <div className="xensi-section-intro"><span>{t('home.simpleMethodKicker')}</span><h2 id="method-title">{t('home.simpleMethodTitle')}</h2><p>{t('home.simpleMethodDescription')}</p></div>
        <div className="xensi-method-track">{method.map((item, index) => { const Icon = item.icon; return <article key={item.title}><span>0{index + 1}</span><Icon size={21} /><h3>{item.title}</h3><p>{item.description}</p></article> })}</div>
      </section>

      <section className="xensi-trust xensi-reveal" aria-labelledby="trust-title">
        <div><LockKeyhole size={20} /><span>{t('home.simpleDisclosureKicker')}</span><h2 id="trust-title">{t('home.simpleDisclosureTitle')}</h2></div>
        <p>{t('home.simpleDisclosureDescription')}</p>
        <ul><li>{t('home.simpleRawDescription')}</li><li>{t('home.simpleAccelerationDescription')}</li><li>{t('home.simpleComparisonDescription')}</li></ul>
      </section>
    </div>
  </main>
}
