import { Activity, BarChart3, CalendarDays, Crosshair, MousePointer2, RotateCcw, Target } from 'lucide-react'
import { readCalibrationHistory } from './calibration'
import { GAMES } from './games'
import { EXERCISES } from './warmupExercises'
import { readWarmupSession } from './warmupTelemetry'
import { useI18n, type Locale } from './i18n'
import type { AnalysisSection } from './AppNavigation'

type Props = { section: AnalysisSection }

const copy = {
  pt: { kicker: 'LEITURA DE DESEMPENHO', title: 'Análise', subtitle: 'Veja como sua mira está mudando entre treinos e calibrações.', overview: 'Visão geral', sessions: 'Histórico de sessões', evolution: 'Evolução', calibration: 'Histórico de calibração', compare: 'Comparação de períodos', precision: 'Precisão', tracking: 'Tracking', reaction: 'Reaction', consistency: 'Consistência', empty: 'Faça uma sessão para começar a formar este histórico.', current: 'Última referência', previous: 'Período anterior', methodTitle: 'Como o XENSI mede', methodSubtitle: 'A metodologia usa as mesmas métricas em cada comparação para reduzir o efeito do acaso.', methodOne: 'Movimento comparável', methodOneText: 'Cada rodada usa regras e trajetórias controladas para que a diferença venha da sua execução.', methodTwo: 'Métricas universais', methodTwoText: 'Precisão, erro médio, tempo no alvo, reação, overshoot e consistência explicam o resultado.', methodThree: 'Recomendação, não promessa', methodThreeText: 'O navegador compara seu desempenho dentro do XENSI. Confirme a sensação no jogo antes de manter uma mudança.' },
  en: { kicker: 'PERFORMANCE REVIEW', title: 'Analysis', subtitle: 'See how your aim changes across training and calibration sessions.', overview: 'Overview', sessions: 'Session history', evolution: 'Progress', calibration: 'Calibration history', compare: 'Period comparison', precision: 'Accuracy', tracking: 'Tracking', reaction: 'Reaction', consistency: 'Consistency', empty: 'Complete a session to start building this history.', current: 'Latest reference', previous: 'Previous period', methodTitle: 'How XENSI measures', methodSubtitle: 'The method uses the same metrics in every comparison to reduce random variation.', methodOne: 'Comparable movement', methodOneText: 'Each round uses controlled rules and trajectories so differences reflect your execution.', methodTwo: 'Universal metrics', methodTwoText: 'Accuracy, mean error, time on target, reaction, overshoot, and consistency explain the result.', methodThree: 'Recommendation, not a promise', methodThreeText: 'The browser compares your performance inside XENSI. Confirm the feel in-game before keeping a change.' },
  es: { kicker: 'LECTURA DE RENDIMIENTO', title: 'Análisis', subtitle: 'Observa cómo cambia tu mira entre entrenamientos y calibraciones.', overview: 'Resumen', sessions: 'Historial de sesiones', evolution: 'Evolución', calibration: 'Historial de calibración', compare: 'Comparación de períodos', precision: 'Precisión', tracking: 'Tracking', reaction: 'Reaction', consistency: 'Consistencia', empty: 'Completa una sesión para empezar a formar este historial.', current: 'Última referencia', previous: 'Período anterior', methodTitle: 'Cómo mide XENSI', methodSubtitle: 'La metodología usa las mismas métricas en cada comparación para reducir el efecto del azar.', methodOne: 'Movimiento comparable', methodOneText: 'Cada round usa reglas y trayectorias controladas para que la diferencia provenga de tu ejecución.', methodTwo: 'Métricas universales', methodTwoText: 'Precisión, error medio, tiempo en objetivo, reacción, overshoot y consistencia explican el resultado.', methodThree: 'Recomendación, no promesa', methodThreeText: 'El navegador compara tu rendimiento dentro de XENSI. Confirma la sensación en el juego antes de mantener un cambio.' },
} satisfies Record<Locale, Record<string, string>>

const format = (value: number, digits = 0) => Number.isFinite(value) ? value.toFixed(digits) : '—'

export function Analysis({ section }: Props) {
  const { locale } = useI18n()
  const text = copy[locale]
  const warmups = EXERCISES.map((exercise) => ({ exercise, session: readWarmupSession(window.localStorage, exercise.id) })).filter((entry) => entry.session)
  const calibrations = GAMES.flatMap((game) => readCalibrationHistory(window.localStorage, game.id).map((session) => ({ game, session }))).sort((left, right) => right.session.completedAt.localeCompare(left.session.completedAt))
  const averageAccuracy = warmups.length ? warmups.reduce((sum, entry) => sum + (entry.session?.accuracy ?? 0), 0) / warmups.length : 0
  const trackingSessions = warmups.filter((entry) => entry.exercise.id === 'tracking' || entry.exercise.id === 'strafetrack')
  const tracking = trackingSessions.length ? trackingSessions.reduce((sum, entry) => sum + (entry.session?.accuracy ?? 0), 0) / trackingSessions.length : 0
  const reactionSessions = warmups.filter((entry) => (entry.session?.reactionTimeMs ?? 0) > 0)
  const reaction = reactionSessions.length ? reactionSessions.reduce((sum, entry) => sum + (entry.session?.reactionTimeMs ?? 0), 0) / reactionSessions.length : 0
  const consistency = calibrations[0]?.session.playerConsistencyScore ?? 0
  const latestCalibration = calibrations[0]?.session
  const previousCalibration = calibrations[1]?.session
  const evolutionValues = calibrations.slice(0, 10).reverse().map((entry) => entry.session.score)
  const evolutionPoints = evolutionValues.map((value, index) => {
    const min = Math.min(...evolutionValues)
    const max = Math.max(...evolutionValues)
    const x = evolutionValues.length === 1 ? 300 : 10 + index * (580 / (evolutionValues.length - 1))
    const y = 142 - ((value - min) / Math.max(1, max - min)) * 112
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  const accuracyDelta = latestCalibration && previousCalibration ? latestCalibration.accuracy - previousCalibration.accuracy : null
  const consistencyDelta = latestCalibration && previousCalibration ? latestCalibration.playerConsistencyScore - previousCalibration.playerConsistencyScore : null

  if (section === 'methodology') return <section className="analysis-workspace analysis-methodology">
    <header><span><Activity size={15} /> {text.kicker}</span><h1>{text.methodTitle}</h1><p>{text.methodSubtitle}</p></header>
    <div className="analysis-method-grid">
      <article><b>01</b><Crosshair size={22} /><h2>{text.methodOne}</h2><p>{text.methodOneText}</p></article>
      <article><b>02</b><BarChart3 size={22} /><h2>{text.methodTwo}</h2><p>{text.methodTwoText}</p></article>
      <article><b>03</b><Target size={22} /><h2>{text.methodThree}</h2><p>{text.methodThreeText}</p></article>
    </div>
  </section>

  const showOnlyCalibration = section === 'calibration-history'
  return <section className="analysis-workspace">
    <header><span><Activity size={15} /> {text.kicker}</span><h1>{showOnlyCalibration ? text.calibration : text.title}</h1><p>{showOnlyCalibration ? text.subtitle : text.subtitle}</p></header>

    {!showOnlyCalibration && <>
      <div className="analysis-metric-strip">
        <article><Crosshair size={18} /><span>{text.precision}</span><strong>{warmups.length || latestCalibration ? `${format(warmups.length ? averageAccuracy : latestCalibration?.accuracy ?? 0, 1)}%` : '—'}</strong><small>{text.current}</small></article>
        <article><MousePointer2 size={18} /><span>{text.tracking}</span><strong>{trackingSessions.length ? `${format(tracking, 1)}%` : '—'}</strong><small>{text.current}</small></article>
        <article><RotateCcw size={18} /><span>{text.reaction}</span><strong>{reactionSessions.length ? `${format(reaction)}ms` : '—'}</strong><small>{text.current}</small></article>
        <article><Activity size={18} /><span>{text.consistency}</span><strong>{calibrations.length ? `${format(consistency)}%` : '—'}</strong><small>{text.current}</small></article>
      </div>

      <div className="analysis-main-grid">
        <article className="analysis-panel analysis-evolution"><div><h2>{text.evolution}</h2><span>7D · 30D · 90D</span></div>{evolutionValues.length ? <><svg viewBox="0 0 600 160" role="img" aria-label={text.evolution}><polyline points={evolutionPoints} /><polygon className="analysis-area" points={`10,160 ${evolutionPoints} 590,160`} /></svg><footer><span>{text.previous}<b>{previousCalibration ? format(previousCalibration.score, 1) : '—'}</b></span><span>{text.current}<b>{latestCalibration ? format(latestCalibration.score, 1) : '—'}</b></span></footer></> : <p className="analysis-empty analysis-chart-empty">{text.empty}</p>}</article>
        <article className="analysis-panel analysis-period"><div><h2>{text.compare}</h2><CalendarDays size={17} /></div><p><span>{text.precision}</span><b>{warmups.length || latestCalibration ? `${format(warmups.length ? averageAccuracy : latestCalibration?.accuracy ?? 0, 1)}%` : '—'}</b><em>{accuracyDelta === null ? '—' : `${accuracyDelta >= 0 ? '+' : ''}${format(accuracyDelta, 1)}%`}</em></p><p><span>{text.tracking}</span><b>{trackingSessions.length ? `${format(tracking, 1)}%` : '—'}</b><em>—</em></p><p><span>{text.consistency}</span><b>{latestCalibration ? `${format(consistency)}%` : '—'}</b><em>{consistencyDelta === null ? '—' : `${consistencyDelta >= 0 ? '+' : ''}${format(consistencyDelta, 1)}%`}</em></p></article>
      </div>
    </>}

    <div className="analysis-history-grid">
      {!showOnlyCalibration && <article className="analysis-panel"><div><h2>{text.sessions}</h2><span>{warmups.length}</span></div>{warmups.length ? warmups.map(({ exercise, session }) => <div className="analysis-history-row" key={exercise.id}><span><b>{exercise.name}</b><small>{session?.hits ?? 0} hits</small></span><strong>{format(session?.accuracy ?? 0, 1)}%</strong><em>{session?.reactionTimeMs ? `${format(session.reactionTimeMs)}ms` : `${format((session?.onTargetMs ?? 0) / 1000, 1)}s`}</em></div>) : <p className="analysis-empty">{text.empty}</p>}</article>}
      <article className="analysis-panel"><div><h2>{text.calibration}</h2><span>{calibrations.length}</span></div>{calibrations.length ? calibrations.slice(0, showOnlyCalibration ? 12 : 5).map(({ game, session }) => <div className="analysis-history-row" key={session.id}><span><b>{game.shortLabel}</b><small>{new Date(session.completedAt).toLocaleDateString(locale)}</small></span><strong>{format(session.sensitivity, 3)}</strong><em>{format(session.confidenceScore)}%</em></div>) : <p className="analysis-empty">{text.empty}</p>}</article>
    </div>
  </section>
}
