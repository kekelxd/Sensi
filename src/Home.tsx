import { useEffect, useState } from 'react'
import { ArrowRight, Crosshair, Gauge, MousePointer2, Target, Zap } from 'lucide-react'
import { useI18n } from './i18n'

export type HomeDestination = 'calibration' | 'warmup' | 'buttons'
type Props = { onNavigate: (destination: HomeDestination) => void }

function ArenaPreview({ activeTarget, score, onHit }: { activeTarget: number; score: number; onHit: (target: number) => void }) {
  const { t } = useI18n()
  const targets = [
    { id: 0, point: 'top', label: t('home.demoTargetOne') },
    { id: 1, point: 'right', label: t('home.demoTargetThree') },
    { id: 2, point: 'left', label: t('home.demoTargetTwo') },
  ]

  return <section className="xensi-reference-arena" aria-label={t('home.demoGridshot')} data-testid="home-training-demo">
    <div className="xensi-reference-arena-bar"><span><b>ARENA</b> · FLICK 1W3TS</span><span>01:07 &nbsp; || &nbsp; SAIR &nbsp; ⛶</span></div>
    <div className="xensi-reference-room" aria-hidden="true"><i /><i /><i /></div>
    <span className="xensi-reference-trace" aria-hidden="true" />
    <span className="xensi-reference-crosshair" aria-hidden="true" />
    {targets.map((target) => <button key={target.id} type="button" className={`xensi-reference-target xensi-reference-target-${target.point} ${target.id === activeTarget ? 'is-active' : ''}`} onClick={() => onHit(target.id)} aria-label={target.label}><i /></button>)}
    <aside className="xensi-reference-metrics" aria-hidden="true"><span>ACURÁCIA<b>{Math.min(99, 84 + Math.floor(score / 18))}%</b><i /></span><span>REAÇÃO<b>184<small>ms</small></b><i /></span></aside>
  </section>
}

export function Home({ onNavigate }: Props) {
  const { t } = useI18n()
  const heroLineOne = t('home.aimLineOne').replace(/\.$/, '')
  const heroLineTwo = t('home.aimLineTwo').replace(/\.$/, '')
  const [activeTarget, setActiveTarget] = useState(0)
  const [score, setScore] = useState(128)

  useEffect(() => {
    const id = window.setInterval(() => {
      if (!document.hidden) setActiveTarget((target) => (target + 1) % 3)
    }, 1900)
    return () => window.clearInterval(id)
  }, [])

  const hitTarget = (target: number) => {
    if (target !== activeTarget) return
    setScore((current) => current + 8)
    setActiveTarget((current) => (current + 1) % 3)
  }

  const modes = [
    { name: 'FLICK', description: 'Alvos que aparecem. Decisões que importam.', icon: MousePointer2, art: 'flick' },
    { name: 'TRACKING', description: 'Rastreio constante. Controle que permanece.', icon: Target, art: 'tracking' },
    { name: 'REACTION', description: 'Velocidade na percepção. Vantagem no primeiro tiro.', icon: Zap, art: 'reaction' },
  ]

  return <main className="xensi-home xensi-reference">
    <div className="xensi-reference-shell">
      <section className="xensi-reference-hero" aria-labelledby="home-title">
        <div className="xensi-reference-copy">
          <h1 id="home-title"><span>{heroLineOne}</span><span>{heroLineTwo}</span></h1>
          <p>Treinos de mira precisos e mensuráveis para FPS competitivos. Dados que revelam. Repetição que transforma.</p>
          <button type="button" className="xensi-reference-cta" onClick={() => onNavigate('warmup')}>Começar treino <ArrowRight size={20} /></button>
        </div>
        <ArenaPreview activeTarget={activeTarget} score={score} onHit={hitTarget} />
      </section>

      <section className="xensi-reference-modes" aria-labelledby="modes-title">
        <div className="xensi-reference-section-line"><h2 id="modes-title">MODOS DE TREINO</h2><button type="button" onClick={() => onNavigate('warmup')}>VER TODOS OS MODOS <ArrowRight size={16} /></button></div>
        <div className="xensi-reference-mode-list">
          {modes.map((mode, index) => { const Icon = mode.icon; return <button key={mode.name} type="button" onClick={() => onNavigate('warmup')} className={`xensi-reference-mode xensi-reference-mode-${mode.art}`}><span className="xensi-reference-mode-index">0{index + 1}</span><span className="xensi-reference-mode-icon"><Icon size={24} /></span><span><b>{mode.name}</b><small>{mode.description}</small></span><i className="xensi-reference-mode-art" aria-hidden="true" /></button> })}
        </div>
      </section>

      <section className="xensi-reference-performance" aria-labelledby="performance-title">
        <h2 id="performance-title">DESEMPENHO</h2>
        <div className="xensi-reference-performance-grid">
          <article className="xensi-reference-chart"><span>DESEMPENHO GERAL</span><svg viewBox="0 0 340 88" aria-hidden="true"><path d="M0 72 L20 61 L42 64 L63 47 L84 52 L107 38 L130 42 L151 31 L174 35 L196 27 L220 34 L244 24 L267 31 L290 21 L315 28 L340 13" /><path className="area" d="M0 72 L20 61 L42 64 L63 47 L84 52 L107 38 L130 42 L151 31 L174 35 L196 27 L220 34 L244 24 L267 31 L290 21 L315 28 L340 13 V88 H0 Z" /></svg><b>82% <small>↑ 8%</small></b></article>
          <article className="xensi-reference-ring"><span>SEQUÊNCIA ATUAL</span><i><b>12</b><small>DIAS</small></i><p>MELHOR SEQUÊNCIA<br /><strong>28 DIAS</strong></p></article>
          <article className="xensi-reference-ring"><span>CONSISTÊNCIA</span><i><b>78%</b><small>BOA</small></i><p>VARIAÇÃO<br /><strong>± 6%</strong></p></article>
          <article className="xensi-reference-record"><span>RECORDE PESSOAL</span><Crosshair size={48} /><p>FLICK 1W3TS <b>98%</b><small>23 MAI 2025</small></p></article>
        </div>
      </section>

      <section className="xensi-reference-trust"><Gauge size={20} /><p>{t('home.simpleDisclosureDescription')}</p><button type="button" onClick={() => onNavigate('calibration')}>{t('home.calibrationAction')} <ArrowRight size={16} /></button></section>
    </div>
  </main>
}
