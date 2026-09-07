import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, Circle, Copy, Crosshair, Dot, GripVertical, Layers3, LogOut, Play, Plus, RotateCcw, Save, Sparkles, Trash2, X, type LucideIcon } from 'lucide-react'
import { GAME_BY_ID, GAMES, type GameId } from './games'
import { GamePicker } from './GamePicker'
import { SensitivityConfigFields } from './SensitivityConfigFields'
import { WizardStepPanel, WizardStepper } from './SetupWizard'
import { useSensitivityPreset } from './useSensitivityPreset'
import { createSessionContext, type SessionContext } from './playerProfileStore'
import { useDialogFocus } from './useDialogFocus'
import { normalizeSensitivity, parsePositiveNumberInput } from './sensitivity'
import type { CrosshairStyle } from './TrackingArena'
import { WarmupArena, type ArenaHandle, type WarmupMetrics, type WarmupPhase } from './Warmup'
import { getWarmupPointerGain, type FixedWarmupDifficulty, type WarmupDifficulty, type WarmupExercise } from './warmupConfig'
import { EXERCISES } from './warmupExercises'
import { createEmptyWarmupMetrics, readWarmupSessionHistory, toWarmupSessionSummary, writeWarmupSession } from './warmupTelemetry'
import { evaluatePersonalBest, formatPersonalBestValue, type PersonalBestResult } from './personalBests'
import { createRoutineItem, formatRoutineDuration, getRoutineTotalSeconds, readCustomRoutine, ROUTINE_ITEM_DURATIONS, supportsRoutineDifficulty, validateRoutine, writeCustomRoutine, type CustomRoutine, type CustomRoutineItem, type RoutineItemDuration } from './routineConfig'
import { useI18n, type TranslationKey } from './i18n'

type SetupStep = 1 | 2 | 3
type RoutinePhase = 'builder' | 'countdown' | 'playing' | 'transition' | 'result'

const CROSSHAIRS: Array<{ id: CrosshairStyle, label: TranslationKey, icon: LucideIcon }> = [
  { id: 'classic', label: 'crosshair.classic', icon: Crosshair },
  { id: 'dot', label: 'crosshair.dot', icon: Dot },
  { id: 'circle', label: 'crosshair.circle', icon: Circle },
  { id: 'plus', label: 'crosshair.plus', icon: Plus },
]

const format = (value: number, digits = 0) => Number.isFinite(value) ? value.toFixed(digits) : '0'
const difficultyKeys: WarmupDifficulty[] = ['easy', 'medium', 'hard', 'adaptive']
const exerciseById = (id: WarmupExercise) => EXERCISES.find((item) => item.id === id) ?? EXERCISES[0]

type StageResult = {
  item: CustomRoutineItem
  metrics: WarmupMetrics
  personalBest: PersonalBestResult | null
}

function ExerciseMicroPreview({ modeId }: { modeId: WarmupExercise }) {
  return <div className={`routine-builder-preview preview-${modeId}`} aria-hidden="true">
    <span /><span /><span /><i />
  </div>
}

function RoutineItemCard({ item, index, total, children }: { item: CustomRoutineItem; index: number; total: number; children: ReactNode }) {
  const exercise = exerciseById(item.modeId)
  const Icon = exercise.icon
  return <article className="routine-builder-item">
    <div className="routine-builder-order"><GripVertical size={15} /><span>{String(index + 1).padStart(2, '0')}</span></div>
    <div className="routine-builder-main">
      <div className="routine-builder-title"><Icon size={18} /><strong>{exercise.name}</strong><small>{formatRoutineDuration(item.durationSeconds)} · {index + 1}/{total}</small></div>
      {children}
    </div>
    <ExerciseMicroPreview modeId={item.modeId} />
  </article>
}

function RoutineSummaryMetric({ label, value }: { label: string; value: string }) {
  return <div><span>{label}</span><strong>{value}</strong></div>
}

export function Routine() {
  const { t } = useI18n()
  const arenaRef = useRef<ArenaHandle>(null)
  const setupRef = useRef<HTMLElement>(null)
  const [phase, setPhase] = useState<RoutinePhase>('builder')
  useDialogFocus(setupRef, phase === 'builder')
  const [setupStep, setSetupStep] = useState<SetupStep>(1)
  const [stepDirection, setStepDirection] = useState<1 | -1>(1)
  const config = useSensitivityPreset('cs2', null, true)
  const selectedGame = config.draft.gameId as GameId
  const { sensitivity, dpi } = config.draft
  const { setSensitivity, setDpi } = config
  const [routine, setRoutine] = useState<CustomRoutine>(() => readCustomRoutine(window.localStorage, selectedGame))
  const [crosshair, setCrosshair] = useState<CrosshairStyle>('dot')
  const [addOpen, setAddOpen] = useState(false)
  const [selectedAddMode, setSelectedAddMode] = useState<WarmupExercise>('flick')
  const [selectedAddDuration, setSelectedAddDuration] = useState<RoutineItemDuration>(60)
  const [selectedAddDifficulty, setSelectedAddDifficulty] = useState<WarmupDifficulty>('medium')
  const [saveState, setSaveState] = useState<'idle' | 'saved'>('idle')
  const [stageIndex, setStageIndex] = useState(0)
  const [stageResults, setStageResults] = useState<StageResult[]>([])
  const [inputReady, setInputReady] = useState(false)
  const [countdown, setCountdown] = useState(3)
  const [transitionCountdown, setTransitionCountdown] = useState(3)
  const [sessionId, setSessionId] = useState(0)
  const [metrics, setMetrics] = useState<WarmupMetrics>(() => createEmptyWarmupMetrics(60))
  const sessionContext = useRef<SessionContext | undefined>(undefined)

  const game = GAME_BY_ID[selectedGame]
  const parsedSensitivity = parsePositiveNumberInput(sensitivity)
  const parsedDpi = parsePositiveNumberInput(dpi)
  const validSetup = parsedSensitivity !== null && parsedDpi !== null
  const normalizedSensitivity = parsedSensitivity === null ? null : normalizeSensitivity(parsedSensitivity, game)
  const pointerGain = getWarmupPointerGain(game, normalizedSensitivity ?? game.sensitivityMin)
  const orderedItems = useMemo(() => routine.items.slice().sort((left, right) => left.order - right.order), [routine.items])
  const activeItem = orderedItems[stageIndex] ?? orderedItems[0]
  const exercise = activeItem ? exerciseById(activeItem.modeId) : EXERCISES[0]
  const nextItem = orderedItems[stageIndex + 1]
  const totalSeconds = getRoutineTotalSeconds(orderedItems)
  const issues = validateRoutine({ ...routine, items: orderedItems })
  const canStart = validSetup && normalizedSensitivity !== null && parsedDpi !== null && issues.length === 0
  const effectiveDifficulty: FixedWarmupDifficulty = activeItem?.difficulty === 'adaptive' ? 'medium' : (activeItem?.difficulty ?? 'medium') as FixedWarmupDifficulty
  const difficultyLabel = (difficulty: WarmupDifficulty) => difficulty === 'adaptive'
    ? t('difficulty.adaptive')
    : t(`difficulty.${difficulty}` as TranslationKey)

  const startStage = useCallback((index: number) => {
    const item = orderedItems[index]
    if (!item || normalizedSensitivity === null || parsedDpi === null) return
    sessionContext.current = createSessionContext(selectedGame, normalizedSensitivity, Math.round(parsedDpi), config.draft.presetId, {
      difficulty: item.difficulty,
      durationSeconds: item.durationSeconds,
    })
    setInputReady(document.pointerLockElement?.classList.contains('warmup-arena') ?? false)
    setMetrics(createEmptyWarmupMetrics(item.durationSeconds))
    flushSync(() => {
      setStageIndex(index)
      setSessionId((value) => value + 1)
      setPhase('countdown')
    })
    arenaRef.current?.requestPointerLock()
  }, [config.draft.presetId, normalizedSensitivity, orderedItems, parsedDpi, selectedGame])

  useEffect(() => {
    setRoutine((current) => current.gameId === selectedGame && current.presetId === config.draft.presetId ? current : { ...current, gameId: selectedGame, ...(config.draft.presetId ? { presetId: config.draft.presetId } : { presetId: undefined }) })
  }, [selectedGame, config.draft.presetId])

  useEffect(() => {
    if (phase !== 'countdown' || !inputReady) return
    setCountdown(3)
    const started = performance.now()
    const timer = window.setInterval(() => {
      const next = Math.max(0, 3 - Math.floor((performance.now() - started) / 1000))
      setCountdown(next)
      if (performance.now() - started >= 3000) {
        window.clearInterval(timer)
        setPhase('playing')
      }
    }, 50)
    return () => window.clearInterval(timer)
  }, [phase, sessionId, inputReady])

  useEffect(() => {
    if (phase !== 'transition') return
    setTransitionCountdown(3)
    const started = performance.now()
    const timer = window.setInterval(() => {
      const next = Math.max(0, 3 - Math.floor((performance.now() - started) / 1000))
      setTransitionCountdown(next)
      if (performance.now() - started >= 3000) {
        window.clearInterval(timer)
        startStage(stageIndex + 1)
      }
    }, 80)
    return () => window.clearInterval(timer)
  }, [phase, stageIndex, startStage])

  const updateItems = (items: CustomRoutineItem[]) => {
    setSaveState('idle')
    setRoutine((current) => ({ ...current, items: items.map((item, index) => ({ ...item, order: index })) }))
  }

  const updateItem = (id: string, patch: Partial<CustomRoutineItem>) => {
    updateItems(orderedItems.map((item) => {
      if (item.id !== id) return item
      const next = { ...item, ...patch }
      if (!supportsRoutineDifficulty(next.modeId, next.difficulty)) next.difficulty = 'medium'
      return next
    }))
  }

  const addItem = () => {
    if (!supportsRoutineDifficulty(selectedAddMode, selectedAddDifficulty)) return
    const next = { ...createRoutineItem(selectedAddMode, orderedItems.length), durationSeconds: selectedAddDuration, difficulty: selectedAddDifficulty }
    updateItems([...orderedItems, next])
    setAddOpen(false)
  }

  const removeItem = (id: string) => updateItems(orderedItems.filter((item) => item.id !== id))
  const moveItem = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= orderedItems.length) return
    const next = [...orderedItems]
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    updateItems(next)
  }

  const duplicateItem = (item: CustomRoutineItem) => {
    const next = { ...item, id: crypto.randomUUID?.() ?? `${item.id}-copy-${Date.now()}`, order: orderedItems.length }
    updateItems([...orderedItems, next])
  }

  const saveRoutine = () => {
    if (issues.includes('duration') || issues.includes('difficulty') || issues.includes('mode')) return
    const saved = writeCustomRoutine(window.localStorage, { ...routine, items: orderedItems, name: routine.name.trim() || 'Minha rotina' })
    setRoutine(saved)
    setSaveState('saved')
    window.setTimeout(() => setSaveState('idle'), 1400)
  }

  const startRoutine = () => {
    if (!canStart) return
    saveRoutine()
    setStageResults([])
    setSensitivity(String(normalizedSensitivity))
    setDpi(String(Math.round(parsedDpi)))
    startStage(0)
  }

  const completeStage = (result: WarmupMetrics) => {
    const withContext = { ...result, sessionContext: sessionContext.current }
    const currentSummary = toWarmupSessionSummary(withContext)
    const history = readWarmupSessionHistory(window.localStorage, activeItem.modeId)
    const personalBest = evaluatePersonalBest(activeItem.modeId, currentSummary, history)
    writeWarmupSession(window.localStorage, activeItem.modeId, withContext)
    setMetrics(withContext)
    setStageResults((current) => [...current.filter((item) => item.item.id !== activeItem.id), { item: activeItem, metrics: withContext, personalBest }].sort((left, right) => left.item.order - right.item.order))
    setInputReady(false)
    setPhase(stageIndex >= orderedItems.length - 1 ? 'result' : 'transition')
  }

  const exitToBuilder = () => {
    document.exitPointerLock?.()
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
    setInputReady(false)
    setCountdown(3)
    setTransitionCountdown(3)
    setStageIndex(0)
    setPhase('builder')
  }

  const copyRoutineCard = async () => {
    const content = [
      routine.name,
      `${GAME_BY_ID[selectedGame].label} · ${formatRoutineDuration(totalSeconds)}`,
      ...orderedItems.map((item, index) => `${index + 1}. ${exerciseById(item.modeId).name} · ${formatRoutineDuration(item.durationSeconds)} · ${difficultyLabel(item.difficulty)}`),
    ].join('\n')
    try { await navigator.clipboard?.writeText(content) } catch { /* sharing remains optional */ }
  }

  if (phase === 'builder') {
    return <section className="warmup-workspace routine-workspace routine-builder-workspace" ref={setupRef}>
      <div className="routine-builder-hero">
        <div>
          <div className="panel-label"><Layers3 size={15} /> {t('routine.kicker')}</div>
          <h1>{t('routine.title')}</h1>
          <p>{t('routine.subtitle')}</p>
        </div>
        <div className="routine-builder-summary" aria-label={t('routine.summary')}>
          <RoutineSummaryMetric label={t('routine.totalDuration')} value={formatRoutineDuration(totalSeconds)} />
          <RoutineSummaryMetric label={t('routine.exerciseCount')} value={String(orderedItems.length)} />
          <RoutineSummaryMetric label={t('common.gameReference')} value={game.shortLabel} />
        </div>
      </div>

      <div className="routine-builder-layout">
        <section className="routine-builder-context">
          <WizardStepper current={setupStep} steps={[t('warmup.stepGame'), t('warmup.stepSettings'), t('warmup.stepCrosshair')]} />
          <div className="routine-context-panel">
            <WizardStepPanel key={setupStep} step={setupStep} direction={stepDirection}>
              {setupStep === 1 && <>
                <h2>{t('routine.contextTitle')}</h2>
                <GamePicker gameIds={GAMES.map(item => item.id)} value={selectedGame} onChange={config.selectGame} presets={config.presets} />
              </>}
              {setupStep === 2 && <SensitivityConfigFields draft={config.draft} presets={config.presets} onSelectPreset={config.selectPreset} onSensitivityChange={setSensitivity} onDpiChange={setDpi} sensitivityInvalid={parsedSensitivity === null} dpiInvalid={parsedDpi === null} />}
              {setupStep === 3 && <>
                <h2>{t('warmup.crosshairTitle')}</h2>
                <div className="warmup-crosshairs" role="radiogroup" aria-label={t('calibration.crosshairType')}>
                  {CROSSHAIRS.map((item) => { const Icon = item.icon; return <button type="button" key={item.id} className={crosshair === item.id ? 'selected' : ''} aria-pressed={crosshair === item.id} onClick={() => setCrosshair(item.id)}><Icon size={16} /><span>{t(item.label)}</span></button> })}
                </div>
              </>}
            </WizardStepPanel>
          </div>
          <div className="warmup-wizard-actions routine-context-actions">
            {setupStep > 1 && <button className="secondary-button" type="button" onClick={() => { setStepDirection(-1); setSetupStep((setupStep - 1) as SetupStep) }}><ArrowLeft size={15} /> {t('warmup.back')}</button>}
            {setupStep < 3 && <button className="primary-button" type="button" onClick={() => { setStepDirection(1); setSetupStep((setupStep + 1) as SetupStep) }} disabled={setupStep === 2 && !validSetup}>{t('warmup.next')} <ArrowRight size={15} /></button>}
          </div>
        </section>

        <section className="routine-playlist-panel" aria-label={t('routine.playlist')}>
          <div className="routine-playlist-head">
            <label>{t('routine.name')}<input value={routine.name} maxLength={48} onChange={(event) => { setSaveState('idle'); setRoutine(current => ({ ...current, name: event.target.value })) }} /></label>
            <div>
              <button className="secondary-button" type="button" onClick={saveRoutine}><Save size={14} /> {saveState === 'saved' ? t('routine.saved') : t('routine.save')}</button>
              <button className="primary-button" type="button" disabled={!canStart} onClick={startRoutine}><Play size={14} /> {t('routine.start')}</button>
            </div>
          </div>

          {orderedItems.length === 0 ? <div className="routine-empty-state">
            <Sparkles size={22} />
            <strong>{t('routine.emptyTitle')}</strong>
            <p>{t('routine.emptyDescription')}</p>
            <button className="primary-button" type="button" onClick={() => setAddOpen(true)}><Plus size={14} /> {t('routine.addExercise')}</button>
          </div> : <div className="routine-builder-list">
            {orderedItems.map((item, index) => (
              <RoutineItemCard key={item.id} item={item} index={index} total={orderedItems.length}>
                <div className="routine-item-controls">
                  <select value={item.modeId} onChange={(event) => updateItem(item.id, { modeId: event.target.value as WarmupExercise })} aria-label={t('routine.exercise')}>
                    {EXERCISES.map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.name}</option>)}
                  </select>
                  <div className="routine-chip-row" aria-label={t('routine.duration')}>
                    {ROUTINE_ITEM_DURATIONS.map((duration) => <button key={duration} type="button" className={item.durationSeconds === duration ? 'selected' : ''} onClick={() => updateItem(item.id, { durationSeconds: duration })}>{duration / 60}m</button>)}
                  </div>
                  <div className="routine-chip-row" aria-label={t('warmup.difficulty')}>
                    {difficultyKeys.filter((difficulty) => supportsRoutineDifficulty(item.modeId, difficulty)).map((difficulty) => <button key={difficulty} type="button" className={item.difficulty === difficulty ? 'selected' : ''} onClick={() => updateItem(item.id, { difficulty })}>{difficultyLabel(difficulty)}</button>)}
                  </div>
                  <div className="routine-row-actions">
                    <button type="button" onClick={() => moveItem(index, -1)} disabled={index === 0} aria-label={t('routine.moveUp')}><ArrowUp size={14} /></button>
                    <button type="button" onClick={() => moveItem(index, 1)} disabled={index === orderedItems.length - 1} aria-label={t('routine.moveDown')}><ArrowDown size={14} /></button>
                    <button type="button" onClick={() => duplicateItem(item)} aria-label={t('routine.duplicate')}><Copy size={14} /></button>
                    <button type="button" onClick={() => removeItem(item.id)} aria-label={t('routine.remove')}><Trash2 size={14} /></button>
                  </div>
                </div>
              </RoutineItemCard>
            ))}
          </div>}

          <div className="routine-builder-footer">
            <button className="secondary-button" type="button" onClick={() => setAddOpen(true)}><Plus size={14} /> {t('routine.addExercise')}</button>
            <button className="secondary-button" type="button" onClick={copyRoutineCard}><Copy size={14} /> {t('routine.copyCard')}</button>
            {issues.includes('empty') && <span>{t('routine.emptyGuard')}</span>}
          </div>
        </section>
      </div>

      {addOpen && <div className="modal-backdrop">
        <section className="modal routine-add-modal" role="dialog" aria-modal="true" aria-label={t('routine.addExercise')}>
          <button className="modal-close" onClick={() => setAddOpen(false)} aria-label={t('common.close')}><X size={18} /></button>
          <Plus size={20} className="modal-icon" />
          <h2>{t('routine.addExercise')}</h2>
          <p>{t('routine.addDescription')}</p>
          <div className="routine-add-grid">
            {EXERCISES.map((exercise) => {
              const Icon = exercise.icon
              return <button key={exercise.id} type="button" className={selectedAddMode === exercise.id ? 'selected' : ''} onClick={() => { setSelectedAddMode(exercise.id); if (!supportsRoutineDifficulty(exercise.id, selectedAddDifficulty)) setSelectedAddDifficulty('medium') }}>
                <Icon size={19} /><strong>{exercise.name}</strong><small>{t(exercise.description)}</small>
              </button>
            })}
          </div>
          <div className="routine-add-options">
            <div><span>{t('routine.duration')}</span><div className="routine-chip-row">{ROUTINE_ITEM_DURATIONS.map((duration) => <button key={duration} type="button" className={selectedAddDuration === duration ? 'selected' : ''} onClick={() => setSelectedAddDuration(duration)}>{duration / 60} min</button>)}</div></div>
            <div><span>{t('warmup.difficulty')}</span><div className="routine-chip-row">{difficultyKeys.filter((difficulty) => supportsRoutineDifficulty(selectedAddMode, difficulty)).map((difficulty) => <button key={difficulty} type="button" className={selectedAddDifficulty === difficulty ? 'selected' : ''} onClick={() => setSelectedAddDifficulty(difficulty)}>{difficultyLabel(difficulty)}</button>)}</div></div>
          </div>
          <div className="warmup-result-actions">
            <button className="secondary-button" type="button" onClick={() => setAddOpen(false)}>{t('common.close')}</button>
            <button className="primary-button" type="button" onClick={addItem}><Plus size={14} /> {t('routine.addExercise')}</button>
          </div>
        </section>
      </div>}
    </section>
  }

  if (phase === 'transition') {
    const nextExercise = nextItem ? exerciseById(nextItem.modeId) : null
    const transitionOverlay = <div className="routine-transition-overlay">
        <section className="routine-transition-card">
          <Sparkles size={24} />
          <div className="panel-label">{t('routine.phaseComplete')}</div>
          <h2>{exercise.name}</h2>
          {nextExercise && <p>{t('routine.nextExercise', { exercise: nextExercise.name })}</p>}
          {nextItem && <div className="routine-transition-score"><span>{t('routine.startsIn')}</span><strong>{transitionCountdown}</strong><small>{formatRoutineDuration(nextItem.durationSeconds)} · {difficultyLabel(nextItem.difficulty)}</small></div>}
          <div className="warmup-result-actions">
            <button className="secondary-button" onClick={exitToBuilder}><LogOut size={15} /> {t('warmup.exit')}</button>
          </div>
        </section>
      </div>
    return <section className="warmup-game-workspace routine-game-workspace">
      <WarmupArena
        ref={arenaRef}
        phase="result"
        countdown={countdown}
        exercise={activeItem.modeId}
        difficulty={effectiveDifficulty}
        durationSeconds={activeItem.durationSeconds}
        crosshair={crosshair}
        pointerGain={pointerGain}
        sessionId={sessionId}
        sensitivityLabel={`${game.shortLabel} ${format(normalizedSensitivity ?? 0, 3)}`}
        instruction={t(exercise.instruction)}
        metrics={metrics}
        progressLabel={t('routine.phase', { current: stageIndex + 1, total: orderedItems.length })}
        completionOverlay={transitionOverlay}
        exitFullscreenOnComplete={false}
        releasePointerLockOnComplete={false}
        onMetrics={setMetrics}
        onComplete={completeStage}
        onPointerLockChange={setInputReady}
      />
      <aside className="warmup-side-panel routine-side-panel">
        <span>{routine.name}</span>
        <strong>{format(metrics.remaining, 1)}<small>s</small></strong>
        <div><span>{t('common.score')}</span><b>{metrics.score}</b></div>
        <div><span>{t('common.accuracy')}</span><b>{format(metrics.accuracy)}%</b></div>
        <div><span>{t('warmup.level')}</span><b>{difficultyLabel(activeItem.difficulty)}</b></div>
        <ol>
          {orderedItems.map((item, index) => {
            const itemExercise = exerciseById(item.modeId)
            return <li key={item.id} className={index === stageIndex ? 'active' : index < stageIndex ? 'complete' : ''}><i>{index < stageIndex ? <Check size={10} /> : index + 1}</i><span>{itemExercise.name}<small>{formatRoutineDuration(item.durationSeconds)}</small></span></li>
          })}
        </ol>
      </aside>
    </section>
  }

  if (phase === 'result') {
    return <section className="warmup-workspace routine-workspace routine-result-workspace">
      <section className="routine-final-card">
        <Check size={26} />
        <div className="panel-label">{t('routine.complete')}</div>
        <h1>{routine.name}</h1>
        <p>{formatRoutineDuration(totalSeconds)} · {stageResults.length} {t('routine.exercises')}</p>
        <div className="routine-result-list">
          {stageResults.map(({ item, metrics, personalBest }, index) => {
            const exercise = exerciseById(item.modeId)
            const primary = item.modeId === 'tracking' || item.modeId === 'strafetrack'
              ? `${format(metrics.accuracy, 1)}%`
              : item.modeId === 'sniper-reaction'
                ? (metrics.reactionTimeMs ? `${format(metrics.reactionTimeMs)}ms` : '—')
                : String(metrics.score)
            const label = item.modeId === 'tracking' || item.modeId === 'strafetrack' ? t('common.accuracy') : item.modeId === 'sniper-reaction' ? t('sniper.reaction') : t('common.score')
            return <article key={item.id}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{exercise.name}</strong>
              <small>{formatRoutineDuration(item.durationSeconds)} · {difficultyLabel(item.difficulty)}</small>
              <b>{label} {primary}</b>
              {personalBest?.status === 'new' && <em>{formatPersonalBestValue(personalBest)}</em>}
            </article>
          })}
        </div>
        <div className="warmup-result-actions">
          <button className="secondary-button" onClick={exitToBuilder}><ArrowLeft size={15} /> {t('routine.backToBuilder')}</button>
          <button className="secondary-button" onClick={() => startStage(0)}><RotateCcw size={15} /> {t('common.restart')}</button>
        </div>
      </section>
    </section>
  }

  return <section className="warmup-game-workspace routine-game-workspace">
    <WarmupArena
      ref={arenaRef}
      phase={phase as WarmupPhase}
      countdown={countdown}
      exercise={activeItem.modeId}
      difficulty={effectiveDifficulty}
      durationSeconds={activeItem.durationSeconds}
      crosshair={crosshair}
      pointerGain={pointerGain}
      sessionId={sessionId}
      sensitivityLabel={`${game.shortLabel} ${format(normalizedSensitivity ?? 0, 3)}`}
      instruction={t(exercise.instruction)}
      metrics={metrics}
      progressLabel={t('routine.phase', { current: stageIndex + 1, total: orderedItems.length })}
      exitFullscreenOnComplete={false}
      releasePointerLockOnComplete={stageIndex >= orderedItems.length - 1}
      onMetrics={setMetrics}
      onComplete={completeStage}
      onPointerLockChange={setInputReady}
    />
    <aside className="warmup-side-panel routine-side-panel">
      <span>{routine.name}</span>
      <strong>{format(metrics.remaining, 1)}<small>s</small></strong>
      <div><span>{t('common.score')}</span><b>{metrics.score}</b></div>
      <div><span>{t('common.accuracy')}</span><b>{format(metrics.accuracy)}%</b></div>
      <div><span>{t('warmup.level')}</span><b>{difficultyLabel(activeItem.difficulty)}</b></div>
      <ol>
        {orderedItems.map((item, index) => {
          const itemExercise = exerciseById(item.modeId)
          return <li key={item.id} className={index === stageIndex ? 'active' : index < stageIndex ? 'complete' : ''}><i>{index < stageIndex ? <Check size={10} /> : index + 1}</i><span>{itemExercise.name}<small>{formatRoutineDuration(item.durationSeconds)}</small></span></li>
        })}
      </ol>
    </aside>
  </section>
}
