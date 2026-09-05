import { useEffect, useState } from 'react'
import { ArrowRight, ArrowLeftRight, Crosshair, Hexagon, MousePointer2, SlidersHorizontal, Target, Zap } from 'lucide-react'
import { useI18n } from './i18n'

export type HomeDestination = 'calibration' | 'converter' | 'warmup' | 'buttons'
type Props = { onNavigate: (destination: HomeDestination) => void }
type ArenaContext = 'training' | 'calibration' | 'converter'

const arenaCopy: Record<ArenaContext, { label: string; state: string; metricOne: string; metricOneValue: string; metricTwo: string; metricTwoValue: string }> = {
  training: { label: 'ARENA_01', state: 'AO VIVO', metricOne: 'ACCURACY', metricOneValue: '92%', metricTwo: 'REACTION', metricTwoValue: '184ms' },
  calibration: { label: 'CALIBRATION_01', state: 'EM TESTE', metricOne: 'PRECISÃO', metricOneValue: '91.2%', metricTwo: 'ERRO MÉDIO', metricTwoValue: '34.8px' },
  converter: { label: 'CONVERTER_01', state: 'EQUIVALÊNCIA', metricOne: 'CM / 360', metricOneValue: '37.11', metricTwo: 'ANGULAR', metricTwoValue: '100%' },
}

const productText = {
  pt: { precision: 'PRECISÃO PARA FPS', returning: 'SEU PAINEL DE CONTROLE', welcome: ['Bem-vindo', 'novamente.'], subtitle: 'Treinos de precisão, análise de desempenho e calibração de sensibilidade para FPS em um único ambiente.', returningSubtitle: 'Sua última sessão mostrou uma mira mais estável. Continue de onde parou ou explore outra área do seu controle.', start: 'Começar treino', continue: 'Continuar treino', functions: [['Calibrar', 'Encontre a faixa de sensibilidade em que seu controle rende melhor.'], ['Converter', 'Leve sua referência de sensibilidade para outro jogo.'], ['Treinar', 'Pratique flick, tracking, troca de alvo e reação.']], modes: 'MODOS DE TREINO', control: 'CONTROLE', recent: 'ÚLTIMAS SESSÕES', current: 'SENSIBILIDADE ATUAL', calibration: 'Última calibração', confidence: 'CONFIANÇA ALTA', profile: 'PERFIL DE MIRA', forming: 'EM FORMAÇÃO', sessions: 'SESSÕES', lastCalibration: 'ÚLTIMA CALIBRAÇÃO' },
  en: { precision: 'FPS PRECISION', returning: 'YOUR CONTROL PANEL', welcome: ['Welcome', 'back.'], subtitle: 'Precision training, performance analysis, and sensitivity calibration for FPS in one environment.', returningSubtitle: 'Your last session showed steadier aim. Continue where you left off or explore another part of your control.', start: 'Start training', continue: 'Continue training', functions: [['Calibrate', 'Find the sensitivity range where your control performs best.'], ['Convert', 'Carry your sensitivity reference to another game.'], ['Train', 'Practice flicks, tracking, target switching, and reaction.']], modes: 'TRAINING MODES', control: 'CONTROL', recent: 'RECENT SESSIONS', current: 'CURRENT SENSITIVITY', calibration: 'Last calibration', confidence: 'HIGH CONFIDENCE', profile: 'AIM PROFILE', forming: 'IN PROGRESS', sessions: 'SESSIONS', lastCalibration: 'LAST CALIBRATION' },
  es: { precision: 'PRECISIÓN PARA FPS', returning: 'TU PANEL DE CONTROL', welcome: ['Bienvenido', 'de nuevo.'], subtitle: 'Entrenamiento de precisión, análisis de rendimiento y calibración de sensibilidad para FPS en un solo entorno.', returningSubtitle: 'Tu última sesión mostró una mira más estable. Continúa donde lo dejaste o explora otra parte de tu control.', start: 'Empezar entrenamiento', continue: 'Continuar entrenamiento', functions: [['Calibrar', 'Encuentra el rango de sensibilidad donde tu control rinde mejor.'], ['Convertir', 'Lleva tu referencia de sensibilidad a otro juego.'], ['Entrenar', 'Practica flicks, tracking, cambio de objetivo y reacción.']], modes: 'MODOS DE ENTRENAMIENTO', control: 'CONTROL', recent: 'ÚLTIMAS SESIONES', current: 'SENSIBILIDAD ACTUAL', calibration: 'Última calibración', confidence: 'CONFIANZA ALTA', profile: 'PERFIL DE MIRA', forming: 'EN FORMACIÓN', sessions: 'SESIONES', lastCalibration: 'ÚLTIMA CALIBRACIÓN' },
} as const

function ArenaPreview({ context, activeTarget, score, onHit }: { context: ArenaContext; activeTarget: number; score: number; onHit: (target: number) => void }) {
  const { t } = useI18n()
  const copy = arenaCopy[context]
  const targets = [
    { id: 0, point: 'top', label: t('home.demoTargetOne') },
    { id: 1, point: 'right', label: t('home.demoTargetThree') },
    { id: 2, point: 'left', label: t('home.demoTargetTwo') },
  ]

  return <section className={`xensi-reference-arena xensi-arena-${context}`} aria-label={t('home.demoGridshot')} data-testid="home-training-demo">
    <div className="xensi-reference-arena-bar"><span><b>{copy.label}</b> · <em>{copy.state}</em></span><span>{context === 'training' ? '00:27' : 'DADOS AO VIVO'} &nbsp; ⛶</span></div>
    <div className="xensi-reference-room" aria-hidden="true"><i /><i /><i /></div>
    <span className="xensi-reference-trace" aria-hidden="true" />
    <span className="xensi-reference-crosshair" aria-hidden="true" />
    {context === 'converter' ? <div className="xensi-converter-readout" aria-hidden="true"><span>CS2<b>0.70</b></span><strong>→</strong><span>VALORANT<b>0.220</b></span></div> : targets.map((target) => <button key={target.id} type="button" className={`xensi-reference-target xensi-reference-target-${target.point} ${target.id === activeTarget ? 'is-active' : ''}`} onClick={() => onHit(target.id)} aria-label={target.label}><i /></button>)}
    {context === 'calibration' && <div className="xensi-calibration-readout" aria-hidden="true"><span>CS2</span><b>Sens atual <strong>0.70</strong></b><b>Em teste <strong>0.665</strong></b></div>}
    <aside className="xensi-reference-metrics" aria-hidden="true"><span>{copy.metricOne}<b>{context === 'training' ? `${Math.min(99, 84 + Math.floor(score / 18))}%` : copy.metricOneValue}</b><i /></span><span>{copy.metricTwo}<b>{copy.metricTwoValue}</b><i /></span></aside>
  </section>
}

export function Home({ onNavigate }: Props) {
  const { t, locale } = useI18n()
  const copy = productText[locale]
  const heroLineOne = t('home.aimLineOne').replace(/\.$/, '')
  const heroLineTwo = t('home.aimLineTwo').replace(/\.$/, '')
  const [activeTarget, setActiveTarget] = useState(0)
  const [score, setScore] = useState(128)
  const [arenaContext, setArenaContext] = useState<ArenaContext>('training')
  const [isReturning, setIsReturning] = useState(false)

  useEffect(() => {
    setIsReturning(Object.keys(localStorage).some((key) => key.startsWith('sensi-') && key.includes('history')))
    const id = window.setInterval(() => {
      if (!document.hidden && arenaContext === 'training') setActiveTarget((target) => (target + 1) % 3)
    }, 1900)
    return () => window.clearInterval(id)
  }, [arenaContext])

  const hitTarget = (target: number) => {
    if (arenaContext !== 'training' || target !== activeTarget) return
    setScore((current) => current + 8)
    setActiveTarget((current) => (current + 1) % 3)
  }

  const functions: Array<{ title: string; description: string; destination: HomeDestination; context: ArenaContext; icon: typeof Crosshair }> = [
    { title: copy.functions[0][0], description: copy.functions[0][1], destination: 'calibration', context: 'calibration', icon: Crosshair },
    { title: copy.functions[1][0], description: copy.functions[1][1], destination: 'converter', context: 'converter', icon: ArrowLeftRight },
    { title: copy.functions[2][0], description: copy.functions[2][1], destination: 'warmup', context: 'training', icon: Target },
  ]

  const localizedModes = {
    pt: [['Flick', 'Alvos estáticos para treinar picos de precisão.', '92%'], ['Tracking', 'Alvos em movimento para controle de tracking.', '84%'], ['Reaction', 'Responda rápido a alvos que aparecem.', '184ms'], ['Personalizado', 'Crie uma sessão com suas próprias regras.', '']],
    en: [['Flick', 'Static targets for practicing precise flicks.', '92%'], ['Tracking', 'Moving targets for sustained aim control.', '84%'], ['Reaction', 'Respond quickly when a target appears.', '184ms'], ['Custom', 'Build a session with your own rules.', '']],
    es: [['Flick', 'Objetivos estáticos para practicar flicks precisos.', '92%'], ['Tracking', 'Objetivos en movimiento para control continuo.', '84%'], ['Reaction', 'Responde rápido cuando aparece un objetivo.', '184ms'], ['Personalizado', 'Crea una sesión con tus propias reglas.', '']],
  } as const
  const modes = localizedModes[locale].map(([name, description, metric], index) => ({ name, description, metric, icon: [Crosshair, MousePointer2, Zap, Hexagon][index], art: ['flick', 'tracking', 'reaction', 'custom'][index] }))
  const controlMetrics = locale === 'es'
    ? [['PRECISIÓN', '92%', '↑ 6%'], ['ERROR MEDIO', '21px', '↓ 8px'], ['TRACKING', '84%', '↑ 7%'], ['REACCIÓN', '184ms', '↓ 12ms'], ['OVERSHOOT', '6.2%', '↓ 1.1%'], ['CONSISTENCIA', '89%', '↑ 4%']]
    : locale === 'en'
      ? [['ACCURACY', '92%', '↑ 6%'], ['MEAN ERROR', '21px', '↓ 8px'], ['TRACKING', '84%', '↑ 7%'], ['REACTION', '184ms', '↓ 12ms'], ['OVERSHOOT', '6.2%', '↓ 1.1%'], ['CONSISTENCY', '89%', '↑ 4%']]
      : [['PRECISÃO', '92%', '↑ 6%'], ['ERRO MÉDIO', '21px', '↓ 8px'], ['TRACKING', '84%', '↑ 7%'], ['REAÇÃO', '184ms', '↓ 12ms'], ['OVERSHOOT', '6.2%', '↓ 1.1%'], ['CONSISTÊNCIA', '89%', '↑ 4%']]

  return <main className="xensi-home xensi-reference xensi-product">
    <div className="xensi-reference-shell">
      <section className="xensi-reference-hero" aria-labelledby="home-title">
        <div className="xensi-reference-copy">
          <span className="xensi-reference-kicker">◎ {isReturning ? copy.returning : copy.precision}</span>
          <h1 id="home-title">{isReturning ? <><span>{copy.welcome[0]}</span><span>{copy.welcome[1]}</span></> : <><span>{heroLineOne}</span><span>{heroLineTwo}</span></>}</h1>
          <p>{isReturning ? copy.returningSubtitle : copy.subtitle}</p>
          <button type="button" className="xensi-reference-cta" onClick={() => onNavigate('warmup')}>{isReturning ? copy.continue : copy.start} <ArrowRight size={20} /></button>
        </div>
        <ArenaPreview context={arenaContext} activeTarget={activeTarget} score={score} onHit={hitTarget} />
      </section>

      <section className="xensi-core-functions" aria-label="Funções principais">
        {functions.map((item, index) => { const Icon = item.icon; return <button key={item.title} type="button" className={`xensi-core-function is-${item.context}`} onMouseEnter={() => setArenaContext(item.context)} onFocus={() => setArenaContext(item.context)} onClick={() => onNavigate(item.destination)}><span>0{index + 1}</span><Icon size={22} /><strong>{item.title}</strong><p>{item.description}</p><ArrowRight size={17} /></button> })}
      </section>

      <section className="xensi-reference-dashboard" aria-label="Resumo de treino">
        <div className="xensi-reference-modes" aria-labelledby="modes-title">
          <div className="xensi-reference-section-line"><h2 id="modes-title">{copy.modes}</h2><span>Flick · Tracking · Switching · Reaction</span></div>
          <div className="xensi-reference-mode-list">
            {modes.map((mode) => { const Icon = mode.icon; return <button key={mode.name} type="button" onClick={() => onNavigate('warmup')} className={`xensi-reference-mode xensi-reference-mode-${mode.art}`}><span className="xensi-reference-mode-icon"><Icon size={25} /></span><span><b>{mode.name}</b><small>{mode.description}</small></span><i className="xensi-reference-mode-art" aria-hidden="true" /><em>{mode.metric && <>{locale === 'pt' ? 'REFERÊNCIA' : locale === 'es' ? 'REFERENCIA' : 'BASELINE'}<strong>{mode.metric}</strong></>}</em><ArrowRight size={17} /></button> })}
          </div>
        </div>
        <aside className="xensi-reference-evolution xensi-control-panel" aria-labelledby="control-title">
          <div><h2 id="control-title">⌁ {copy.control}</h2><span>{copy.recent}</span></div>
          <div className="xensi-control-metric-grid">{controlMetrics.map(([label, value, trend]) => <article key={label}><span>{label}</span><strong>{value}</strong><em>{trend}</em></article>)}</div>
          <section className="xensi-sensitivity-summary"><span>{copy.current}</span><b>CS2 <strong>0.68</strong></b><p>{copy.calibration} <strong>0.65 – 0.70</strong></p><em>{copy.confidence}</em></section>
        </aside>
      </section>

      <footer className="xensi-reference-status" aria-label="Resumo da conta"><span>{copy.sessions} <b>24</b></span><span>TRACKING <b>+8.4%</b></span><span>CONSISTÊNCIA <b>87%</b></span><span>SENSIBILIDADE <b>CS2 0.68</b></span><span>{copy.lastCalibration} <b>3 DIAS</b></span><span className="xensi-reference-level"><SlidersHorizontal size={16} /> {copy.profile} <b>{copy.forming}</b></span></footer>
    </div>
  </main>
}
