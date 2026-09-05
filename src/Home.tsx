import { useEffect, useMemo, useState } from 'react'
import { Activity, ArrowLeftRight, ArrowRight, Crosshair, Gauge, Mouse, Target } from 'lucide-react'
import { readCalibrationHistory, type CalibrationSessionSummary } from './calibration'
import { GAMES, type GameConfig } from './games'
import { useI18n, type Locale } from './i18n'
import { readWarmupSession, type WarmupSessionSummary } from './warmupTelemetry'
import type { WarmupExercise } from './warmupConfig'

export type HomeDestination = 'analysis' | 'calibration' | 'converter' | 'warmup' | 'polling' | 'buttons'
type Props = { onNavigate: (destination: HomeDestination) => void }

const WARMUP_EXERCISES: WarmupExercise[] = ['switch', 'tracking', 'flick', 'reflex', 'gridshot', 'strafetrack']

const productText = {
  pt: {
    precision: 'PRECISÃO PARA FPS', subtitle: 'Treinos de precisão, análise de desempenho e calibração de sensibilidade para FPS em um único ambiente.', start: 'Começar treino', live: 'DEMONSTRAÇÃO ATIVA', chain: 'SEQUÊNCIA DEMO',
    control: 'SEU CONTROLE', analysis: 'Ver análise', accuracy: 'Precisão', tracking: 'Tracking', reaction: 'Reação', sensitivity: 'Sensibilidade atual', sessions: 'sessões salvas', consistency: 'de consistência', calibrated: 'última calibração', noSessions: 'Nenhuma sessão ainda.', noSessionsHint: 'Complete seu primeiro treino para começar a montar seu perfil de mira.',
    quick: 'AÇÕES RÁPIDAS', quickHint: 'Escolha o que quer fazer agora.', setup: 'TESTE SEU SETUP', setupHint: 'Confira como seus dispositivos respondem antes da partida.',
    actions: [['Treinar', 'Comece uma sessão curta de mira.'], ['Calibrar', 'Encontre sua região de sensibilidade.'], ['Converter', 'Preserve sua referência de 360° entre jogos.']],
    polling: 'Polling Rate', pollingHint: 'Confira a frequência de atualização recebida do mouse.', pollingAction: 'Testar polling rate', input: 'Diagnóstico de entrada', inputHint: 'Analise estabilidade, botões e interrupções do input.', inputAction: 'Abrir diagnóstico', daysToday: 'hoje', daysAgo: 'há {days} dias',
  },
  en: {
    precision: 'FPS PRECISION', subtitle: 'Precision training, performance analysis, and sensitivity calibration for FPS in one environment.', start: 'Start training', live: 'ACTIVE DEMO', chain: 'DEMO CHAIN',
    control: 'YOUR CONTROL', analysis: 'View analysis', accuracy: 'Accuracy', tracking: 'Tracking', reaction: 'Reaction', sensitivity: 'Current sensitivity', sessions: 'saved sessions', consistency: 'consistency', calibrated: 'last calibration', noSessions: 'No sessions yet.', noSessionsHint: 'Complete your first training session to start building your aim profile.',
    quick: 'QUICK ACTIONS', quickHint: 'Choose what you want to do now.', setup: 'TEST YOUR SETUP', setupHint: 'Check how your devices respond before a match.',
    actions: [['Train', 'Start a short aim session.'], ['Calibrate', 'Find your sensitivity region.'], ['Convert', 'Preserve your 360° reference across games.']],
    polling: 'Polling Rate', pollingHint: 'Check the mouse update frequency received by the browser.', pollingAction: 'Test polling rate', input: 'Input diagnostics', inputHint: 'Analyze input stability, buttons, and interruptions.', inputAction: 'Open diagnostics', daysToday: 'today', daysAgo: '{days} days ago',
  },
  es: {
    precision: 'PRECISIÓN PARA FPS', subtitle: 'Entrenamiento de precisión, análisis de rendimiento y calibración de sensibilidad para FPS en un solo entorno.', start: 'Empezar entrenamiento', live: 'DEMO ACTIVA', chain: 'SECUENCIA DEMO',
    control: 'TU CONTROL', analysis: 'Ver análisis', accuracy: 'Precisión', tracking: 'Tracking', reaction: 'Reacción', sensitivity: 'Sensibilidad actual', sessions: 'sesiones guardadas', consistency: 'de consistencia', calibrated: 'última calibración', noSessions: 'Aún no hay sesiones.', noSessionsHint: 'Completa tu primer entrenamiento para empezar a crear tu perfil de mira.',
    quick: 'ACCIONES RÁPIDAS', quickHint: 'Elige qué quieres hacer ahora.', setup: 'PRUEBA TU SETUP', setupHint: 'Comprueba cómo responden tus dispositivos antes de la partida.',
    actions: [['Entrenar', 'Empieza una sesión corta de mira.'], ['Calibrar', 'Encuentra tu región de sensibilidad.'], ['Convertir', 'Conserva tu referencia de 360° entre juegos.']],
    polling: 'Polling Rate', pollingHint: 'Comprueba la frecuencia de actualización recibida del ratón.', pollingAction: 'Probar polling rate', input: 'Diagnóstico de entrada', inputHint: 'Analiza estabilidad, botones e interrupciones del input.', inputAction: 'Abrir diagnóstico', daysToday: 'hoy', daysAgo: 'hace {days} días',
  },
} as const

type CalibrationWithGame = CalibrationSessionSummary & { game: GameConfig }
type HomeSummary = { warmups: WarmupSessionSummary[]; latestCalibration: CalibrationWithGame | null; calibrationCount: number }

function readHomeSummary(storage: Storage): HomeSummary {
  const warmups = WARMUP_EXERCISES.flatMap((exercise) => {
    const session = readWarmupSession(storage, exercise)
    return session ? [session] : []
  })
  const calibrations = GAMES.flatMap((game) => readCalibrationHistory(storage, game.id).map((session) => ({ ...session, game })))
    .sort((left, right) => right.completedAt.localeCompare(left.completedAt))
  return { warmups, latestCalibration: calibrations[0] ?? null, calibrationCount: calibrations.length }
}

function average(values: number[]) {
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : null
}

function relativeCalibrationDate(value: string, locale: Locale) {
  const copy = productText[locale]
  const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000))
  return days === 0 ? copy.daysToday : copy.daysAgo.replace('{days}', String(days))
}

function ArenaPreview({ activeTarget, chain, onHit }: { activeTarget: number; chain: number; onHit: (target: number) => void }) {
  const { t, locale } = useI18n()
  const copy = productText[locale]
  const targets = [
    { id: 0, point: 'top', label: t('home.demoTargetOne') },
    { id: 1, point: 'right', label: t('home.demoTargetThree') },
    { id: 2, point: 'left', label: t('home.demoTargetTwo') },
  ]

  return <section className="xensi-reference-arena xensi-arena-training" aria-label={t('home.demoGridshot')} data-testid="home-training-demo">
    <div className="xensi-reference-arena-bar"><span><b>ARENA_01</b> · <em>{copy.live}</em></span><span>00:27 &nbsp; ⛶</span></div>
    <div className="xensi-reference-room" aria-hidden="true"><i /><i /><i /></div>
    <span className="xensi-reference-trace" aria-hidden="true" />
    <span className="xensi-reference-crosshair" aria-hidden="true" />
    {targets.map((target) => <button key={target.id} type="button" className={`xensi-reference-target xensi-reference-target-${target.point} ${target.id === activeTarget ? 'is-active' : ''}`} onClick={() => onHit(target.id)} aria-label={target.label}><i /></button>)}
    <div className="xensi-arena-demo-status" aria-hidden="true"><span>{copy.chain}</span><b>+{chain}</b></div>
  </section>
}

export function Home({ onNavigate }: Props) {
  const { t, locale } = useI18n()
  const copy = productText[locale]
  const heroLineOne = t('home.aimLineOne').replace(/\.$/, '')
  const heroLineTwo = t('home.aimLineTwo').replace(/\.$/, '')
  const [activeTarget, setActiveTarget] = useState(0)
  const [chain, setChain] = useState(3)
  const [summary, setSummary] = useState<HomeSummary>(() => readHomeSummary(window.localStorage))

  useEffect(() => {
    const refresh = () => setSummary(readHomeSummary(window.localStorage))
    window.addEventListener('storage', refresh)
    const id = window.setInterval(() => {
      if (!document.hidden) setActiveTarget((target) => (target + 1) % 3)
    }, 1900)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  const metrics = useMemo(() => {
    const accuracy = average(summary.warmups.map((session) => session.accuracy)) ?? summary.latestCalibration?.accuracy ?? null
    const tracking = average((['switch', 'tracking'] as WarmupExercise[]).flatMap((exercise) => {
      const session = readWarmupSession(window.localStorage, exercise)
      return session ? [session.accuracy] : []
    }))
    const reaction = average(summary.warmups.map((session) => session.reactionTimeMs).filter((value) => value > 0))
    return { accuracy, tracking, reaction }
  }, [summary])

  const latest = summary.latestCalibration
  const consistency = latest && Number.isFinite(latest.playerConsistencyScore) ? Math.round(latest.playerConsistencyScore) : null
  const hasHistory = summary.warmups.length > 0 || Boolean(latest)
  const sessionCount = summary.warmups.length + summary.calibrationCount
  const controlMetrics = [
    [copy.accuracy, metrics.accuracy === null ? '—' : `${Math.round(metrics.accuracy)}%`],
    [copy.tracking, metrics.tracking === null ? '—' : `${Math.round(metrics.tracking)}%`],
    [copy.reaction, metrics.reaction === null ? '—' : `${Math.round(metrics.reaction)}ms`],
    [copy.sensitivity, latest ? `${latest.game.shortLabel} ${latest.sensitivity.toFixed(3)}` : '—'],
  ]
  const quickActions = [
    { title: copy.actions[0][0], description: copy.actions[0][1], destination: 'warmup' as const, icon: Target },
    { title: copy.actions[1][0], description: copy.actions[1][1], destination: 'calibration' as const, icon: Crosshair },
    { title: copy.actions[2][0], description: copy.actions[2][1], destination: 'converter' as const, icon: ArrowLeftRight },
  ]

  const hitTarget = (target: number) => {
    if (target !== activeTarget) return
    setChain((current) => current + 1)
    setActiveTarget((current) => (current + 1) % 3)
  }

  return <main className="xensi-home xensi-reference xensi-product xensi-home-compact">
    <div className="xensi-reference-shell">
      <section className="xensi-reference-hero" aria-labelledby="home-title">
        <div className="xensi-reference-copy">
          <span className="xensi-reference-kicker">◎ {copy.precision}</span>
          <h1 id="home-title"><span>{heroLineOne}</span><span>{heroLineTwo}</span></h1>
          <p>{copy.subtitle}</p>
          <button type="button" className="xensi-reference-cta" onClick={() => onNavigate('warmup')}>{copy.start} <ArrowRight size={20} /></button>
        </div>
        <ArenaPreview activeTarget={activeTarget} chain={chain} onHit={hitTarget} />
      </section>

      <section className={`xensi-home-control ${hasHistory ? '' : 'is-empty'}`} aria-labelledby="home-control-title">
        <header><Activity size={15} /><h2 id="home-control-title">{copy.control}</h2></header>
        {hasHistory ? <>
          <div className="xensi-home-control-metrics">{controlMetrics.map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}</div>
          <footer><p>{sessionCount} {copy.sessions}{consistency !== null ? <> · {consistency}% {copy.consistency}</> : ''}{latest ? <> · {copy.calibrated} {relativeCalibrationDate(latest.completedAt, locale)}</> : ''}</p><button type="button" onClick={() => onNavigate('analysis')}>{copy.analysis}<ArrowRight size={15} /></button></footer>
        </> : <div className="xensi-home-empty"><span><strong>{copy.noSessions}</strong>{copy.noSessionsHint}</span><button type="button" onClick={() => onNavigate('warmup')}>{copy.start}<ArrowRight size={15} /></button></div>}
      </section>

      <section className="xensi-home-section" aria-labelledby="home-quick-title">
        <div className="xensi-home-section-heading"><span><h2 id="home-quick-title">{copy.quick}</h2><p>{copy.quickHint}</p></span></div>
        <div className="xensi-home-quick-grid">{quickActions.map((item) => { const Icon = item.icon; return <button key={item.title} type="button" onClick={() => onNavigate(item.destination)}><Icon size={20} /><span><strong>{item.title}</strong><small>{item.description}</small></span><ArrowRight size={16} /></button> })}</div>
      </section>

      <section className="xensi-home-section" aria-labelledby="home-setup-title">
        <div className="xensi-home-section-heading"><span><h2 id="home-setup-title">{copy.setup}</h2><p>{copy.setupHint}</p></span></div>
        <div className="xensi-home-setup-grid">
          <article><Gauge size={23} /><span><h3>{copy.polling}</h3><p>{copy.pollingHint}</p></span><button type="button" onClick={() => onNavigate('polling')}>{copy.pollingAction}<ArrowRight size={15} /></button></article>
          <article><Mouse size={23} /><span><h3>{copy.input}</h3><p>{copy.inputHint}</p></span><button type="button" onClick={() => onNavigate('buttons')}>{copy.inputAction}<ArrowRight size={15} /></button></article>
        </div>
      </section>
    </div>
  </main>
}
