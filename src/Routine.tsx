import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { ArrowLeft, ArrowRight, Check, Circle, Crosshair, Dot, Layers3, LogOut, Play, Plus, RotateCcw, Settings2, Sparkles, X, type LucideIcon } from 'lucide-react'
import { GAME_BY_ID, GAMES, type GameId } from './games'
import { useI18n, type TranslationKey } from './i18n'
import { ROUTINE_PRESETS, type RoutinePreset } from './routineConfig'
import { normalizeSensitivity, parsePositiveNumberInput } from './sensitivity'
import type { CrosshairStyle } from './TrackingArena'
import { WarmupArena, type ArenaHandle, type WarmupMetrics, type WarmupPhase } from './Warmup'
import { getAdaptiveDifficulty, getWarmupPointerGain, WARMUP_DIFFICULTIES, WARMUP_DURATION, type FixedWarmupDifficulty, type WarmupDifficulty } from './warmupConfig'
import { EXERCISES } from './warmupExercises'

type SetupStep = 1 | 2 | 3

const CROSSHAIRS: Array<{ id: CrosshairStyle, label: TranslationKey, icon: LucideIcon }> = [
  { id: 'classic', label: 'crosshair.classic', icon: Crosshair },
  { id: 'dot', label: 'crosshair.dot', icon: Dot },
  { id: 'circle', label: 'crosshair.circle', icon: Circle },
  { id: 'plus', label: 'crosshair.plus', icon: Plus },
]

const emptyMetrics = (): WarmupMetrics => ({ score: 0, accuracy: 0, hits: 0, shots: 0, remaining: WARMUP_DURATION })
const format = (value: number, digits = 0) => Number.isFinite(value) ? value.toFixed(digits) : '0'

export function Routine() {
  const { t } = useI18n()
  const arenaRef = useRef<ArenaHandle>(null)
  const [phase, setPhase] = useState<WarmupPhase>('hub')
  const [setupStep, setSetupStep] = useState<SetupStep>(1)
  const [preset, setPreset] = useState<RoutinePreset>(ROUTINE_PRESETS[0])
  const [stageIndex, setStageIndex] = useState(0)
  const [stageResults, setStageResults] = useState<WarmupMetrics[]>([])
  const [inputReady, setInputReady] = useState(false)
  const [difficulty, setDifficulty] = useState<WarmupDifficulty>('adaptive')
  const [adaptiveLevel, setAdaptiveLevel] = useState<FixedWarmupDifficulty>('medium')
  const [selectedGame, setSelectedGame] = useState<GameId>('cs2')
  const [sensitivity, setSensitivity] = useState('1')
  const [dpi, setDpi] = useState('800')
  const [crosshair, setCrosshair] = useState<CrosshairStyle>('dot')
  const [countdown, setCountdown] = useState(3)
  const [sessionId, setSessionId] = useState(0)
  const [metrics, setMetrics] = useState<WarmupMetrics>(emptyMetrics)

  const game = GAME_BY_ID[selectedGame]
  const parsedSensitivity = parsePositiveNumberInput(sensitivity)
  const parsedDpi = parsePositiveNumberInput(dpi)
  const validSetup = parsedSensitivity !== null && parsedDpi !== null
  const normalizedSensitivity = parsedSensitivity === null ? null : normalizeSensitivity(parsedSensitivity, game)
  const effectiveDifficulty: FixedWarmupDifficulty = difficulty === 'adaptive' ? adaptiveLevel : difficulty
  const pointerGain = getWarmupPointerGain(game, normalizedSensitivity ?? game.sensitivityMin, parsedDpi ?? 800)
  const exerciseId = preset.exercises[stageIndex]
  const exercise = EXERCISES.find((item) => item.id === exerciseId) ?? EXERCISES[0]
  const nextExercise = EXERCISES.find((item) => item.id === preset.exercises[stageIndex + 1])
  const nextAdaptiveLevel = getAdaptiveDifficulty(adaptiveLevel, metrics.accuracy)
  const difficultyLabel = difficulty === 'adaptive'
    ? `${t('difficulty.adaptive')} · ${t(`difficulty.${adaptiveLevel}` as TranslationKey)}`
    : t(`difficulty.${difficulty}` as TranslationKey)
  const lastStage = stageIndex === preset.exercises.length - 1
  const totalScore = stageResults.reduce((sum, result) => sum + result.score, 0)

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

  const openSetup = (nextPreset: RoutinePreset) => {
    setPreset(nextPreset)
    setSetupStep(1)
    setPhase('setup')
  }

  const launchStage = () => {
    setInputReady(false)
    setMetrics(emptyMetrics())
    flushSync(() => {
      setSessionId((value) => value + 1)
      setPhase('countdown')
    })
    arenaRef.current?.requestPointerLock()
  }

  const startRoutine = () => {
    if (!validSetup || normalizedSensitivity === null || parsedDpi === null) return
    setSensitivity(String(normalizedSensitivity))
    setDpi(String(Math.round(parsedDpi)))
    setStageIndex(0)
    setStageResults([])
    if (difficulty === 'adaptive') setAdaptiveLevel('medium')
    launchStage()
  }

  const completeStage = (result: WarmupMetrics) => {
    setMetrics(result)
    setStageResults((current) => {
      const next = [...current]
      next[stageIndex] = result
      return next
    })
    setInputReady(false)
    setPhase('result')
  }

  const advanceStage = () => {
    if (lastStage) return
    if (difficulty === 'adaptive') setAdaptiveLevel(nextAdaptiveLevel)
    setStageIndex((value) => value + 1)
    launchStage()
  }

  const restartRoutine = () => {
    setStageIndex(0)
    setStageResults([])
    if (difficulty === 'adaptive') setAdaptiveLevel('medium')
    launchStage()
  }

  const exitToHub = () => {
    document.exitPointerLock?.()
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
    setInputReady(false)
    setStageIndex(0)
    setStageResults([])
    setCountdown(3)
    setPhase('hub')
  }

  if (phase === 'hub' || phase === 'setup') {
    return (
      <section className="warmup-workspace routine-workspace">
        <div className="warmup-heading">
          <div className="panel-label"><Sparkles size={15} /> {t('routine.kicker')}</div>
          <h1>{t('routine.title')}</h1>
          <p>{t('routine.subtitle')}</p>
        </div>

        <div className="routine-presets" aria-label={t('routine.selectPreset')}>
          {ROUTINE_PRESETS.map((item) => (
            <button key={item.id} type="button" className="routine-preset-card" onClick={() => openSetup(item)}>
              <div className="routine-preset-head"><Layers3 size={22} /><span>{t('routine.phases')}</span></div>
              <strong>{item.name}</strong>
              <small>{t(item.descriptionKey)}</small>
              <ol>
                {item.exercises.map((id, index) => {
                  const itemExercise = EXERCISES.find((candidate) => candidate.id === id) ?? EXERCISES[0]
                  const Icon = itemExercise.icon
                  return <li key={`${id}-${index}`}><i>{index + 1}</i><Icon size={14} /><span>{itemExercise.name}</span><b>1:00</b></li>
                })}
              </ol>
              <em>{t('routine.configure')} <ArrowRight size={14} /></em>
            </button>
          ))}
        </div>

        {phase === 'setup' && (
          <div className="modal-backdrop">
            <section className="modal setup-modal warmup-setup-modal routine-setup-modal">
              <button className="modal-close" onClick={exitToHub} aria-label={t('common.close')}><X size={18} /></button>
              <Settings2 size={20} className="modal-icon" />
              <h2>{t('routine.setupTitle', { routine: preset.name })}</h2>
              <p>{t('routine.setupDescription')}</p>

              <div className="warmup-stepper" aria-label={t('routine.configure')}>
                {([['warmup.stepGame', 1], ['warmup.stepSettings', 2], ['warmup.stepCrosshair', 3]] as Array<[TranslationKey, SetupStep]>).map(([label, step]) => (
                  <div key={step} className={setupStep === step ? 'active' : setupStep > step ? 'complete' : ''}><i>{step}</i><span>{t(label)}</span></div>
                ))}
              </div>

              <div className="warmup-step-content">
                {setupStep === 1 && <>
                  <h3>{t('warmup.chooseGame')}</h3>
                  <div className="option-group game-grid warmup-game-grid" role="radiogroup" aria-label={t('common.gameReference')}>
                    {GAMES.map((item) => (
                      <button key={item.id} className={selectedGame === item.id ? 'choice-card game-choice selected' : 'choice-card game-choice'} onClick={() => setSelectedGame(item.id)} type="button">
                        <div className={`game-logo game-logo-${item.id}`}><img src={`./game-icons/${item.iconFile ?? `${item.id}.png`}`} alt="" /></div>
                        <span className="game-card-name">{item.shortLabel}</span>
                      </button>
                    ))}
                  </div>
                </>}

                {setupStep === 2 && <>
                  <h3>{t('warmup.settingsTitle')}</h3>
                  <div className="setup-fields">
                    <label>{t('calibration.currentSensitivity', { game: game.label })}<input type="text" inputMode="decimal" value={sensitivity} onChange={(event) => setSensitivity(event.target.value)} aria-invalid={parsedSensitivity === null} /></label>
                    <label>{t('common.mouseDpi')}<input type="text" inputMode="numeric" value={dpi} onChange={(event) => setDpi(event.target.value)} aria-invalid={parsedDpi === null} /></label>
                  </div>
                  <div className="warmup-config-label">{t('warmup.difficulty')}</div>
                  <div className="warmup-difficulty" role="radiogroup" aria-label={t('warmup.difficulty')}>
                    {(Object.keys(WARMUP_DIFFICULTIES) as WarmupDifficulty[]).map((level) => (
                      <button type="button" key={level} className={difficulty === level ? 'selected' : ''} onClick={() => { setDifficulty(level); if (level === 'adaptive') setAdaptiveLevel('medium') }}>
                        <strong>{t(`difficulty.${level}` as TranslationKey)}</strong><small>{t(`difficulty.${level}Description` as TranslationKey)}</small>
                      </button>
                    ))}
                  </div>
                </>}

                {setupStep === 3 && <>
                  <h3>{t('warmup.crosshairTitle')}</h3>
                  <div className="warmup-crosshairs" role="radiogroup" aria-label={t('calibration.crosshairType')}>
                    {CROSSHAIRS.map((item) => { const Icon = item.icon; return <button type="button" key={item.id} className={crosshair === item.id ? 'selected' : ''} onClick={() => setCrosshair(item.id)}><Icon size={16} /><span>{t(item.label)}</span></button> })}
                  </div>
                </>}
              </div>

              <div className="warmup-wizard-actions">
                {setupStep > 1 && <button className="secondary-button" onClick={() => setSetupStep((setupStep - 1) as SetupStep)}><ArrowLeft size={15} /> {t('warmup.back')}</button>}
                {setupStep < 3
                  ? <button className="primary-button" onClick={() => setSetupStep((setupStep + 1) as SetupStep)} disabled={setupStep === 2 && !validSetup}>{t('warmup.next')} <ArrowRight size={15} /></button>
                  : <button className="primary-button" onClick={startRoutine} disabled={!validSetup}><Play size={15} /> {t('routine.start')}</button>}
              </div>
            </section>
          </div>
        )}
      </section>
    )
  }

  const resultOverlay = phase === 'result' ? (
    <div className="routine-transition-overlay">
      <section className="routine-transition-card">
        {lastStage ? <Check size={24} /> : <Sparkles size={24} />}
        <div className="panel-label">{lastStage ? t('routine.complete') : t('routine.phaseComplete')}</div>
        <h2>{lastStage ? preset.name : exercise.name}</h2>
        <p>{lastStage ? t('routine.phases') : nextExercise && t('routine.nextExercise', { exercise: nextExercise.name })}</p>
        <div className="routine-transition-score">
          <span>{lastStage ? t('routine.totalScore') : t('common.score')}</span>
          <strong>{lastStage ? totalScore : metrics.score}</strong>
        </div>
        <div className="warmup-result-grid">
          <div><span>{t('common.accuracy')}</span><strong>{format(metrics.accuracy)}%</strong></div>
          <div><span>{t('routine.phase', { current: stageIndex + 1, total: preset.exercises.length })}</span><strong>{stageIndex + 1}/{preset.exercises.length}</strong></div>
          <div><span>{t('warmup.level')}</span><strong>{difficultyLabel}</strong></div>
        </div>
        {!lastStage && <div className="warmup-next-hint">
          {difficulty === 'adaptive'
            ? t('warmup.adaptiveNextHint', { level: t(`difficulty.${nextAdaptiveLevel}` as TranslationKey) })
            : t('warmup.fixedNextHint', { level: t(`difficulty.${difficulty}` as TranslationKey) })}
        </div>}
        <div className="warmup-result-actions">
          <button className="secondary-button" onClick={exitToHub}><LogOut size={15} /> {t('warmup.exit')}</button>
          <button className="secondary-button" onClick={lastStage ? restartRoutine : launchStage}><RotateCcw size={15} /> {lastStage ? t('common.restart') : t('routine.repeatPhase')}</button>
          {!lastStage && <button className="primary-button" onClick={advanceStage}>{t('routine.nextPhase')} <ArrowRight size={15} /></button>}
        </div>
      </section>
    </div>
  ) : undefined

  return (
    <section className="warmup-game-workspace routine-game-workspace">
      <WarmupArena
        ref={arenaRef}
        phase={phase}
        countdown={countdown}
        exercise={exerciseId}
        difficulty={effectiveDifficulty}
        crosshair={crosshair}
        pointerGain={pointerGain}
        sessionId={sessionId}
        sensitivityLabel={`${game.shortLabel} ${format(normalizedSensitivity ?? 0, 3)}`}
        instruction={t(exercise.instruction)}
        metrics={metrics}
        progressLabel={t('routine.phase', { current: stageIndex + 1, total: preset.exercises.length })}
        completionOverlay={resultOverlay}
        exitFullscreenOnComplete={false}
        onMetrics={setMetrics}
        onComplete={completeStage}
        onPointerLockChange={setInputReady}
      />
      <aside className="warmup-side-panel routine-side-panel">
        <span>{preset.name}</span>
        <strong>{format(metrics.remaining, 1)}<small>s</small></strong>
        <div><span>{t('common.score')}</span><b>{metrics.score}</b></div>
        <div><span>{t('common.accuracy')}</span><b>{format(metrics.accuracy)}%</b></div>
        <div><span>{t('warmup.level')}</span><b>{difficultyLabel}</b></div>
        <ol>
          {preset.exercises.map((id, index) => {
            const item = EXERCISES.find((candidate) => candidate.id === id) ?? EXERCISES[0]
            return <li key={`${id}-${index}`} className={index === stageIndex ? 'active' : index < stageIndex ? 'complete' : ''}><i>{index < stageIndex ? <Check size={10} /> : index + 1}</i><span>{item.name}</span></li>
          })}
        </ol>
      </aside>
    </section>
  )
}
