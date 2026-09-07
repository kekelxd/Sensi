import { useMemo, useState } from 'react'
import { Activity, BarChart3, CalendarDays, Crosshair, MousePointer2, RotateCcw, Target, Trophy } from 'lucide-react'
import { readCalibrationHistory, type CalibrationSessionSummary } from './calibration'
import { GAME_BY_ID, GAMES, type GameConfig } from './games'
import { getPersonalBestValue, PERSONAL_BEST_DEFINITIONS, type PersonalBestDefinition } from './personalBests'
import { EXERCISES, type WarmupExerciseDefinition } from './warmupExercises'
import { readWarmupSessionHistory, type WarmupSessionSummary } from './warmupTelemetry'
import { useI18n, type Locale } from './i18n'
import type { AnalysisSection } from './AppNavigation'
import type { GameSensitivityProfileId } from './gameSensitivityProfiles'

type Props = {
  section: AnalysisSection
  onStartTraining?: () => void
}

type PeriodKey = '7d' | '30d' | '90d' | 'all'
type MetricKey = 'accuracy' | 'tracking' | 'reaction' | 'consistency'

type AnalysisPoint = {
  id: string
  source: 'warmup' | 'calibration'
  metric: MetricKey
  value: number
  completedAt: string | null
  mode: string
  gameId?: GameSensitivityProfileId
  sensitivity?: number
  dpi?: number
  difficulty?: string
  previousSensitivity?: number
}

type RecentSession = {
  id: string
  completedAt: string | null
  title: string
  metricLine: string
  presetLine: string | null
}

const copy = {
  pt: {
    title: 'Análise',
    subtitle: 'Veja como sua mira evolui e quais configurações estavam em uso em cada sessão.',
    sessions: 'Sessões recentes',
    evolution: 'Evolução',
    calibration: 'Histórico de calibração',
    compare: 'Comparação de períodos',
    precision: 'Precisão',
    tracking: 'Tracking',
    reaction: 'Reação',
    consistency: 'Consistência',
    emptyTitle: 'Ainda não há dados suficientes',
    emptyText: 'Complete mais sessões para começar a visualizar sua evolução.',
    startTraining: 'Começar treino',
    waiting: 'Aguardando mais sessões',
    previous: 'Período anterior',
    all: 'Tudo',
    lastPeriod: 'Últimos {period}',
    previousPeriod: '{period} anteriores',
    wholeHistory: 'Todo histórico',
    noPreviousPeriod: 'sem período anterior equivalente',
    fullHistory: 'Ver histórico completo',
    personalBests: 'Recordes pessoais',
    noBaseline: 'Sem baseline válido',
    noDate: 'Data não salva',
    methodTitle: 'Como o XENSI mede',
    methodSubtitle: 'A metodologia usa as mesmas métricas em cada comparação para reduzir o efeito do acaso.',
    methodOne: 'Movimento comparável',
    methodOneText: 'Cada rodada usa regras e trajetórias controladas para que a diferença venha da sua execução.',
    methodTwo: 'Métricas universais',
    methodTwoText: 'Precisão, erro médio, tempo no alvo, reação, overshoot e consistência explicam o resultado.',
    methodThree: 'Recomendação, não promessa',
    methodThreeText: 'O navegador compara seu desempenho dentro do XENSI. Confirme a sensação no jogo antes de manter uma mudança.',
  },
  en: {
    title: 'Analysis',
    subtitle: 'See how your aim is changing and which settings were used in each session.',
    sessions: 'Recent sessions',
    evolution: 'Progress',
    calibration: 'Calibration history',
    compare: 'Period comparison',
    precision: 'Accuracy',
    tracking: 'Tracking',
    reaction: 'Reaction',
    consistency: 'Consistency',
    emptyTitle: 'Not enough data yet',
    emptyText: 'Complete more sessions to start visualizing your progress.',
    startTraining: 'Start training',
    waiting: 'Waiting for more sessions',
    previous: 'Previous period',
    all: 'All',
    lastPeriod: 'Last {period}',
    previousPeriod: 'Previous {period}',
    wholeHistory: 'All history',
    noPreviousPeriod: 'no equivalent previous period',
    fullHistory: 'View full history',
    personalBests: 'Personal bests',
    noBaseline: 'No valid baseline',
    noDate: 'Date not saved',
    methodTitle: 'How XENSI measures',
    methodSubtitle: 'The method uses the same metrics in every comparison to reduce random variation.',
    methodOne: 'Comparable movement',
    methodOneText: 'Each round uses controlled rules and trajectories so differences reflect your execution.',
    methodTwo: 'Universal metrics',
    methodTwoText: 'Accuracy, mean error, time on target, reaction, overshoot, and consistency explain the result.',
    methodThree: 'Recommendation, not a promise',
    methodThreeText: 'The browser compares your performance inside XENSI. Confirm the feel in-game before keeping a change.',
  },
  es: {
    title: 'Análisis',
    subtitle: 'Observa cómo cambia tu mira y qué configuraciones se usaron en cada sesión.',
    sessions: 'Sesiones recientes',
    evolution: 'Evolución',
    calibration: 'Historial de calibración',
    compare: 'Comparación de períodos',
    precision: 'Precisión',
    tracking: 'Tracking',
    reaction: 'Reacción',
    consistency: 'Consistencia',
    emptyTitle: 'Aún no hay datos suficientes',
    emptyText: 'Completa más sesiones para empezar a visualizar tu evolución.',
    startTraining: 'Comenzar entrenamiento',
    waiting: 'Esperando más sesiones',
    previous: 'Período anterior',
    all: 'Todo',
    lastPeriod: 'Últimos {period}',
    previousPeriod: '{period} anteriores',
    wholeHistory: 'Todo el historial',
    noPreviousPeriod: 'sin período anterior equivalente',
    fullHistory: 'Ver historial completo',
    personalBests: 'Récords personales',
    noBaseline: 'Sin baseline válido',
    noDate: 'Fecha no guardada',
    methodTitle: 'Cómo mide XENSI',
    methodSubtitle: 'La metodología usa las mismas métricas en cada comparación para reducir el efecto del azar.',
    methodOne: 'Movimiento comparable',
    methodOneText: 'Cada round usa reglas y trayectorias controladas para que la diferencia provenga de tu ejecución.',
    methodTwo: 'Métricas universales',
    methodTwoText: 'Precisión, error medio, tiempo en objetivo, reacción, overshoot y consistencia explican el resultado.',
    methodThree: 'Recomendación, no promesa',
    methodThreeText: 'El navegador compara tu rendimiento dentro de XENSI. Confirma la sensación en el juego antes de mantener un cambio.',
  },
} satisfies Record<Locale, Record<string, string>>

const PERIODS: { key: PeriodKey; label: string; days: number | null }[] = [
  { key: '7d', label: '7D', days: 7 },
  { key: '30d', label: '30D', days: 30 },
  { key: '90d', label: '90D', days: 90 },
  { key: 'all', label: 'Tudo', days: null },
]

const METRICS: { key: MetricKey; icon: typeof Crosshair; higherIsBetter: boolean; unit: '%' | 'ms' }[] = [
  { key: 'accuracy', icon: Crosshair, higherIsBetter: true, unit: '%' },
  { key: 'tracking', icon: MousePointer2, higherIsBetter: true, unit: '%' },
  { key: 'reaction', icon: RotateCcw, higherIsBetter: false, unit: 'ms' },
  { key: 'consistency', icon: Activity, higherIsBetter: true, unit: '%' },
]

const format = (value: number, digits = 0) => Number.isFinite(value) ? value.toFixed(digits) : '—'
const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null
const validDate = (value: string | null | undefined) => value && Number.isFinite(new Date(value).getTime()) ? value : null

function periodLabel(period: PeriodKey, locale: Locale) {
  if (period === 'all') return copy[locale].all
  return `${period.replace('d', '')} dias`
}

function metricLabel(metric: MetricKey, locale: Locale) {
  const text = copy[locale]
  return metric === 'accuracy' ? text.precision : metric === 'tracking' ? text.tracking : metric === 'reaction' ? text.reaction : text.consistency
}

function formatValue(metric: MetricKey, value: number) {
  if (metric === 'reaction') return `${format(value)} ms`
  return `${format(value, 1)}%`
}

function formatDelta(metric: MetricKey, delta: number) {
  return metric === 'reaction' ? `${delta > 0 ? '+' : ''}${format(delta)} ms` : `${delta > 0 ? '+' : ''}${format(delta, 1)}%`
}

function formatTrend(metric: MetricKey, current: number | null, previous: number | null, locale: Locale) {
  if (current === null || previous === null) return copy[locale].waiting
  const delta = current - previous
  if (Math.abs(delta) < .01) return copy[locale].noBaseline
  const arrow = delta > 0 ? '↑' : '↓'
  const value = metric === 'reaction' ? `${format(Math.abs(delta))} ms` : `${format(Math.abs(delta), 1)}%`
  return `${arrow} ${value} vs ${copy[locale].previous.toLowerCase()}`
}

function dateLabel(value: string | null, locale: Locale) {
  if (!value) return copy[locale].noDate
  return new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit' }).format(new Date(value))
}

function dateTimeLabel(value: string | null, locale: Locale) {
  if (!value) return copy[locale].noDate
  return new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function readWarmupEntries(storage: Storage) {
  return EXERCISES.flatMap((exercise) =>
    readWarmupSessionHistory(storage, exercise.id).map((session, index) => ({ exercise, session, index })),
  )
}

function getGameLabel(gameId?: GameSensitivityProfileId) {
  return gameId && GAME_BY_ID[gameId as keyof typeof GAME_BY_ID] ? GAME_BY_ID[gameId as keyof typeof GAME_BY_ID].shortLabel : null
}

function warmupToPoints(exercise: WarmupExerciseDefinition, session: WarmupSessionSummary, index: number): AnalysisPoint[] {
  const context = session.sessionContext
  const completedAt = validDate(session.completedAt)
  const base = {
    source: 'warmup' as const,
    completedAt,
    mode: exercise.name,
    gameId: context?.gameId,
    sensitivity: context?.sensitivity,
    dpi: context?.dpi,
    difficulty: context?.configuration?.difficulty,
  }
  const points: AnalysisPoint[] = [{ ...base, id: `${exercise.id}-${index}-accuracy`, metric: 'accuracy', value: session.accuracy }]
  if (exercise.id === 'tracking' || exercise.id === 'strafetrack') points.push({ ...base, id: `${exercise.id}-${index}-tracking`, metric: 'tracking', value: session.accuracy })
  if (session.reactionTimeMs > 0) points.push({ ...base, id: `${exercise.id}-${index}-reaction`, metric: 'reaction', value: session.reactionTimeMs })
  if (session.sniper?.consistency !== null && session.sniper?.consistency !== undefined) points.push({ ...base, id: `${exercise.id}-${index}-consistency`, metric: 'consistency', value: session.sniper.consistency })
  return points
}

function calibrationToPoints(game: GameConfig, session: CalibrationSessionSummary, index: number, previous?: CalibrationSessionSummary): AnalysisPoint[] {
  const base = {
    source: 'calibration' as const,
    completedAt: session.completedAt,
    mode: 'Calibração',
    gameId: game.id,
    sensitivity: session.sensitivity,
    dpi: session.dpi,
    previousSensitivity: previous && Math.abs(previous.sensitivity - session.sensitivity) > .0001 ? previous.sensitivity : undefined,
  }
  return [
    { ...base, id: `${game.id}-${index}-accuracy`, metric: 'accuracy', value: session.accuracy },
    { ...base, id: `${game.id}-${index}-consistency`, metric: 'consistency', value: session.playerConsistencyScore },
  ]
}

function collectAnalysisData(storage: Storage) {
  const warmupEntries = readWarmupEntries(storage)
  const calibrationEntries = GAMES.flatMap((game) => {
    const sessions = readCalibrationHistory(storage, game.id)
    return sessions.map((session, index) => ({ game, session, index, previous: sessions[index + 1] }))
  })
  const points = [
    ...warmupEntries.flatMap(({ exercise, session, index }) => warmupToPoints(exercise, session, index)),
    ...calibrationEntries.flatMap(({ game, session, index, previous }) => calibrationToPoints(game, session, index, previous)),
  ].filter(point => Number.isFinite(point.value))
  const recents: RecentSession[] = [
    ...warmupEntries.map(({ exercise, session, index }) => ({
      id: `${exercise.id}-${index}`,
      completedAt: validDate(session.completedAt),
      title: exercise.name,
      metricLine: exercise.id === 'sniper-reaction' && session.reactionTimeMs > 0 ? `${format(session.reactionTimeMs)} ms · ${format(session.accuracy, 1)}%` : `${format(session.accuracy, 1)}% · ${session.sessionContext?.configuration?.difficulty ?? 'Normal'}`,
      presetLine: session.sessionContext ? `${getGameLabel(session.sessionContext.gameId) ?? session.sessionContext.gameId} · ${format(session.sessionContext.sensitivity, 3)} · ${session.sessionContext.dpi} DPI` : null,
    })),
    ...calibrationEntries.map(({ game, session }) => ({
      id: session.id,
      completedAt: session.completedAt,
      title: `${game.shortLabel} · Calibração`,
      metricLine: `${format(session.accuracy, 1)}% · ${format(session.playerConsistencyScore)}% consistência`,
      presetLine: `${game.shortLabel} · ${format(session.sensitivity, 3)} · ${session.dpi} DPI`,
    })),
  ].sort((left, right) => (validDate(right.completedAt) ?? '').localeCompare(validDate(left.completedAt) ?? ''))
  return { points, recents, warmupEntries, calibrationEntries }
}

function filterPeriod<T extends { completedAt: string | null }>(items: T[], period: PeriodKey) {
  const days = PERIODS.find(item => item.key === period)?.days
  if (!days) return items
  const dated = items.filter(item => item.completedAt)
  if (!dated.length) return []
  const latest = Math.max(...dated.map(item => new Date(item.completedAt!).getTime()))
  const start = latest - days * 24 * 60 * 60 * 1000
  return dated.filter(item => new Date(item.completedAt!).getTime() >= start)
}

function previousPeriod<T extends { completedAt: string | null }>(items: T[], period: PeriodKey) {
  const days = PERIODS.find(item => item.key === period)?.days
  if (!days) return []
  const dated = items.filter(item => item.completedAt)
  if (!dated.length) return []
  const latest = Math.max(...dated.map(item => new Date(item.completedAt!).getTime()))
  const currentStart = latest - days * 24 * 60 * 60 * 1000
  const previousStart = currentStart - days * 24 * 60 * 60 * 1000
  return dated.filter(item => {
    const time = new Date(item.completedAt!).getTime()
    return time >= previousStart && time < currentStart
  })
}

function comparisonRange(period: PeriodKey, locale: Locale) {
  const text = copy[locale]
  if (period === 'all') return { current: text.wholeHistory, previous: text.noPreviousPeriod }
  const label = periodLabel(period, locale)
  return { current: text.lastPeriod.replace('{period}', label), previous: text.previousPeriod.replace('{period}', label) }
}

function currentAndPrevious(points: AnalysisPoint[], metric: MetricKey, period: PeriodKey) {
  const metricPoints = points.filter(point => point.metric === metric)
  return {
    current: average(filterPeriod(metricPoints, period).map(point => point.value)),
    previous: average(previousPeriod(metricPoints, period).map(point => point.value)),
  }
}

function chartPoints(points: AnalysisPoint[]) {
  if (points.length < 2) return { line: '', area: '', nodes: [] as { x: number; y: number; point: AnalysisPoint }[] }
  const sorted = [...points].sort((left, right) => (validDate(left.completedAt) ?? '').localeCompare(validDate(right.completedAt) ?? ''))
  const values = sorted.map(point => point.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const nodes = sorted.map((point, index) => {
    const x = 22 + index * (656 / Math.max(1, sorted.length - 1))
    const y = 250 - ((point.value - min) / Math.max(1, max - min)) * 198
    return { x, y, point }
  })
  const line = nodes.map(node => `${node.x.toFixed(1)},${node.y.toFixed(1)}`).join(' ')
  return { line, area: `22,278 ${line} 678,278`, nodes }
}

function derivePersonalBests(warmupEntries: ReturnType<typeof readWarmupEntries>) {
  return EXERCISES.map((exercise) => {
    const definition = PERSONAL_BEST_DEFINITIONS[exercise.id]
    const candidates = warmupEntries
      .filter(entry => entry.exercise.id === exercise.id)
      .map(entry => ({ session: entry.session, value: getPersonalBestValue(entry.session, definition) }))
      .filter((entry): entry is { session: WarmupSessionSummary; value: number } => entry.value !== null)
      .sort((left, right) => definition.direction === 'higher' ? right.value - left.value : left.value - right.value)
    const best = candidates[0]
    if (!best) return null
    const second = candidates[1]
    return { exercise, definition, value: best.value, delta: second ? Math.abs(best.value - second.value) : null, completedAt: validDate(best.session.completedAt) }
  }).filter((entry): entry is { exercise: WarmupExerciseDefinition; definition: PersonalBestDefinition; value: number; delta: number | null; completedAt: string | null } => entry !== null).slice(0, 4)
}

function formatPersonalBest(definition: PersonalBestDefinition, value: number) {
  const normalized = value.toFixed(definition.precision)
  return definition.unit === 'milliseconds' ? `${normalized} ms` : definition.unit === 'percent' ? `${normalized}%` : normalized
}

function Methodology({ locale }: { locale: Locale }) {
  const text = copy[locale]
  return <section className="analysis-workspace analysis-methodology">
    <header><h1>{text.methodTitle}</h1><p>{text.methodSubtitle}</p></header>
    <div className="analysis-method-grid">
      <article><b>01</b><Crosshair size={22} /><h2>{text.methodOne}</h2><p>{text.methodOneText}</p></article>
      <article><b>02</b><BarChart3 size={22} /><h2>{text.methodTwo}</h2><p>{text.methodTwoText}</p></article>
      <article><b>03</b><Target size={22} /><h2>{text.methodThree}</h2><p>{text.methodThreeText}</p></article>
    </div>
  </section>
}

export function Analysis({ section, onStartTraining }: Props) {
  const { locale } = useI18n()
  const text = copy[locale]
  const [period, setPeriod] = useState<PeriodKey>('7d')
  const [metric, setMetric] = useState<MetricKey>('accuracy')
  const [showAllRecent, setShowAllRecent] = useState(false)
  const [hoveredPoint, setHoveredPoint] = useState<AnalysisPoint | null>(null)
  const data = useMemo(() => collectAnalysisData(window.localStorage), [])

  if (section === 'methodology') return <Methodology locale={locale} />

  const showOnlyCalibration = section === 'calibration-history'
  const chartMetricPoints = filterPeriod(data.points.filter(point => point.metric === metric), period)
  const chart = chartPoints(chartMetricPoints)
  const metricStates = METRICS.map((item) => ({ ...item, ...currentAndPrevious(data.points, item.key, period) }))
  const bests = derivePersonalBests(data.warmupEntries)
  const rangeText = comparisonRange(period, locale)

  return <section className="analysis-workspace analysis-dashboard">
    <header>
      <h1>{showOnlyCalibration ? text.calibration : text.title}</h1>
      <p>{text.subtitle}</p>
    </header>

    {!showOnlyCalibration && <>
      <div className="analysis-metric-strip">
        {metricStates.map((item) => {
          const Icon = item.icon
          return <article key={item.key} className="analysis-kpi-card">
            <Icon size={18} />
            <span>{metricLabel(item.key, locale)}</span>
            <strong>{item.current === null ? '—' : formatValue(item.key, item.current)}</strong>
            <small>{formatTrend(item.key, item.current, item.previous, locale)}</small>
          </article>
        })}
      </div>

      <div className="analysis-main-grid analysis-insight-grid">
        <article className="analysis-panel analysis-evolution analysis-evolution-primary">
          <div>
            <h2>{text.evolution}</h2>
            <div className="analysis-control-row" aria-label={text.evolution}>
              {PERIODS.map((item) => <button key={item.key} type="button" className={period === item.key ? 'active' : ''} onClick={() => { setPeriod(item.key); setHoveredPoint(null) }}>{item.key === 'all' ? text.all : item.label}</button>)}
            </div>
          </div>
          <div className="analysis-metric-tabs" role="tablist" aria-label={text.evolution}>
            {METRICS.map((item) => <button key={item.key} type="button" role="tab" aria-selected={metric === item.key} className={metric === item.key ? 'active' : ''} onClick={() => { setMetric(item.key); setHoveredPoint(null) }}>{metricLabel(item.key, locale)}</button>)}
          </div>
          {chartMetricPoints.length >= 2 ? <div className="analysis-chart-wrap">
            <svg viewBox="0 0 700 300" role="img" aria-label={`${text.evolution}: ${metricLabel(metric, locale)}`}>
              <g className="analysis-chart-grid" aria-hidden="true">
                {[0, 1, 2, 3].map((line) => <line key={`h-${line}`} x1="22" x2="678" y1={52 + line * 66} y2={52 + line * 66} />)}
                {[0, 1, 2, 3, 4].map((line) => <line key={`v-${line}`} x1={22 + line * 164} x2={22 + line * 164} y1="36" y2="278" />)}
              </g>
              <polygon className="analysis-area" points={chart.area} />
              <polyline points={chart.line} />
              {chart.nodes.map((node) => <circle key={node.point.id} cx={node.x} cy={node.y} r="5" tabIndex={0} role="button" aria-label={`${dateLabel(node.point.completedAt, locale)} ${node.point.mode} ${formatValue(metric, node.point.value)}`} onMouseEnter={() => setHoveredPoint(node.point)} onMouseLeave={() => setHoveredPoint(null)} onFocus={() => setHoveredPoint(node.point)} onBlur={() => setHoveredPoint(null)} />)}
            </svg>
            {hoveredPoint && <div className="analysis-chart-tooltip" role="status">
              <b>{dateLabel(hoveredPoint.completedAt, locale)}</b>
              <strong>{hoveredPoint.mode}</strong>
              <span>{formatValue(metric, hoveredPoint.value)}</span>
              {hoveredPoint.gameId && <small>{getGameLabel(hoveredPoint.gameId) ?? hoveredPoint.gameId}</small>}
              {hoveredPoint.sensitivity && hoveredPoint.dpi && <small>{format(hoveredPoint.sensitivity, 3)} · {hoveredPoint.dpi} DPI</small>}
              {hoveredPoint.difficulty && <em>{hoveredPoint.difficulty}</em>}
              {hoveredPoint.previousSensitivity && hoveredPoint.sensitivity && <em>{getGameLabel(hoveredPoint.gameId)} {format(hoveredPoint.previousSensitivity, 3)} → {format(hoveredPoint.sensitivity, 3)}</em>}
            </div>}
          </div> : <div className="analysis-chart-empty">
            <strong>{text.emptyTitle}</strong>
            <p>{text.emptyText}</p>
            {onStartTraining && <button type="button" onClick={onStartTraining}>{text.startTraining}</button>}
          </div>}
        </article>

        <article className="analysis-panel analysis-period">
          <div><h2>{text.compare}</h2><CalendarDays size={17} /></div>
          <p className="analysis-period-range">{rangeText.current}<span>vs.</span>{rangeText.previous}</p>
          {metricStates.map((item) => {
            const delta = item.current === null || item.previous === null ? null : item.current - item.previous
            const improved = delta === null ? false : item.higherIsBetter ? delta > 0 : delta < 0
            return <p key={item.key}>
              <span>{metricLabel(item.key, locale)}</span>
              <b>{item.current === null ? '—' : formatValue(item.key, item.current)}</b>
              <em className={delta === null ? '' : improved ? 'positive' : 'negative'}>{delta === null ? text.noBaseline : formatDelta(item.key, delta)}</em>
            </p>
          })}
        </article>
      </div>

      <article className="analysis-panel analysis-pb-panel">
        <div><h2>{text.personalBests}</h2><Trophy size={17} /></div>
        {bests.length ? <div className="analysis-pb-list">
          {bests.map((best) => <section key={best.exercise.id}>
            <span>{best.exercise.name}</span>
            <strong>{formatPersonalBest(best.definition, best.value)}</strong>
            <small>{best.delta === null ? dateLabel(best.completedAt, locale) : `${best.definition.direction === 'lower' ? '↓' : '↑'} ${formatPersonalBest(best.definition, best.delta)}`}</small>
          </section>)}
        </div> : <p className="analysis-empty">{text.waiting}</p>}
      </article>

      <article className="analysis-panel analysis-recent-panel">
        <div><h2>{text.sessions}</h2><button type="button" onClick={() => setShowAllRecent((value) => !value)}>{text.fullHistory}</button></div>
        {data.recents.length ? <div className="analysis-session-list">
          {data.recents.slice(0, showAllRecent ? data.recents.length : 5).map((session) => <section key={session.id}>
            <time>{dateTimeLabel(session.completedAt, locale)}</time>
            <strong>{session.title}</strong>
            <span>{session.metricLine}</span>
            {session.presetLine && <small>{session.presetLine}</small>}
          </section>)}
        </div> : <p className="analysis-empty">{text.emptyText}</p>}
      </article>
    </>}

    {showOnlyCalibration && <div className="analysis-history-grid">
      <article className="analysis-panel"><div><h2>{text.calibration}</h2><span>{data.calibrationEntries.length}</span></div>{data.calibrationEntries.length ? data.calibrationEntries.slice(0, 12).map(({ game, session, previous }) => <div className="analysis-history-row" key={session.id}><span><b>{game.shortLabel}</b><small>{dateTimeLabel(session.completedAt, locale)}</small></span><strong>{format(session.sensitivity, 3)}</strong><em>{previous && Math.abs(previous.sensitivity - session.sensitivity) > .0001 ? `${format(previous.sensitivity, 3)} → ${format(session.sensitivity, 3)}` : `${format(session.confidenceScore)}%`}</em></div>) : <p className="analysis-empty">{text.emptyText}</p>}</article>
    </div>}
  </section>
}
