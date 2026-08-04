import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Crosshair, Dot, Circle, Plus, Focus, Gauge, MousePointer2, Play, RotateCcw, Settings2, Sparkles, Target, X, type LucideIcon } from 'lucide-react'
import { GAME_BY_ID, GAMES, type GameId } from './games'
import { normalizeSensitivity, parsePositiveNumberInput } from './sensitivity'
import type { CrosshairStyle } from './TrackingArena'
import { calculateWarmupAccuracy, getWarmupPointerGain, WARMUP_DIFFICULTIES, WARMUP_DURATION, type WarmupDifficulty, type WarmupExercise } from './warmupConfig'
import { useI18n, type TranslationKey } from './i18n'

type WarmupMetrics = {
  score: number
  accuracy: number
  hits: number
  shots: number
  remaining: number
}

type WarmupPhase = 'hub' | 'setup' | 'countdown' | 'playing' | 'result'

const EXERCISES: Array<{ id: WarmupExercise, name: TranslationKey, description: TranslationKey, instruction: TranslationKey, icon: LucideIcon }> = [
  { id: 'switch', name: 'warmup.switch.name', description: 'warmup.switch.description', instruction: 'warmup.switch.instruction', icon: Focus },
  { id: 'tracking', name: 'warmup.tracking.name', description: 'warmup.tracking.description', instruction: 'warmup.tracking.instruction', icon: Gauge },
  { id: 'flick', name: 'warmup.flick.name', description: 'warmup.flick.description', instruction: 'warmup.flick.instruction', icon: Target },
]

const CROSSHAIRS: Array<{ id: CrosshairStyle, label: TranslationKey, icon: LucideIcon }> = [
  { id: 'classic', label: 'crosshair.classic', icon: Crosshair },
  { id: 'dot', label: 'crosshair.dot', icon: Dot },
  { id: 'circle', label: 'crosshair.circle', icon: Circle },
  { id: 'plus', label: 'crosshair.plus', icon: Plus },
]

function ExercisePreview({ exercise, name }: { exercise: WarmupExercise, name: string }) {
  return (
    <div className={`warmup-preview warmup-preview-${exercise}`} aria-hidden="true">
      <span className="preview-target preview-target-a" />
      <span className="preview-target preview-target-b" />
      <span className="preview-target preview-target-c" />
      <span className="preview-crosshair" />
      <div className="preview-meta"><b>{name}</b></div>
    </div>
  )
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
const randomBetween = (min: number, max: number) => min + Math.random() * (max - min)
const format = (value: number, digits = 0) => Number.isFinite(value) ? value.toFixed(digits) : '0'

function requestPointerLock(canvas: HTMLCanvasElement | null) {
  canvas?.focus({ preventScroll: true })
  const request = canvas?.requestPointerLock() as unknown as Promise<void> | undefined
  request?.catch?.(() => {})
  const fullscreenTarget = canvas?.parentElement
  if (fullscreenTarget && !document.fullscreenElement) {
    const fullscreenRequest = fullscreenTarget.requestFullscreen?.({ navigationUI: 'hide' } as FullscreenOptions) as Promise<void> | undefined
    fullscreenRequest?.catch?.(() => {})
  }
}

function drawCrosshair(ctx: CanvasRenderingContext2D, x: number, y: number, style: CrosshairStyle, color: string) {
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = style === 'plus' ? 2.2 : 1.5
  if (style === 'dot') {
    ctx.beginPath(); ctx.arc(x, y, 4.2, 0, Math.PI * 2); ctx.fill(); return
  }
  if (style === 'circle') {
    ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.stroke()
    ctx.beginPath(); ctx.arc(x, y, 2.4, 0, Math.PI * 2); ctx.fill(); return
  }
  const gap = style === 'plus' ? 2 : 7
  const length = style === 'plus' ? 12 : 14
  ctx.beginPath()
  ctx.moveTo(x - gap - length, y); ctx.lineTo(x - gap, y)
  ctx.moveTo(x + gap, y); ctx.lineTo(x + gap + length, y)
  ctx.moveTo(x, y - gap - length); ctx.lineTo(x, y - gap)
  ctx.moveTo(x, y + gap); ctx.lineTo(x, y + gap + length)
  ctx.stroke()
  if (style === 'classic') { ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill() }
}

type ArenaProps = {
  phase: WarmupPhase
  countdown: number
  exercise: WarmupExercise
  difficulty: WarmupDifficulty
  crosshair: CrosshairStyle
  pointerGain: number
  sessionId: number
  sensitivityLabel: string
  instruction: string
  metrics: WarmupMetrics
  onMetrics: (metrics: WarmupMetrics) => void
  onComplete: (metrics: WarmupMetrics) => void
}

type ArenaHandle = { requestPointerLock: () => void }

const WarmupArena = forwardRef<ArenaHandle, ArenaProps>(function WarmupArena({ phase, countdown, exercise, difficulty, crosshair, pointerGain, sessionId, sensitivityLabel, instruction, metrics, onMetrics, onComplete }, ref) {
  const { t } = useI18n()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [pointerLocked, setPointerLocked] = useState(false)
  const phaseRef = useRef(phase)
  const exerciseRef = useRef(exercise)
  const configRef = useRef(WARMUP_DIFFICULTIES[difficulty])
  const gainRef = useRef(pointerGain)
  const crosshairRef = useRef(crosshair)
  const onMetricsRef = useRef(onMetrics)
  const onCompleteRef = useRef(onComplete)
  const stateRef = useRef({
    aimX: 0, aimY: 0, visualAimX: 0, visualAimY: 0,
    targetX: 0, targetY: 0, destinationX: 0, destinationY: 0,
    directionX: 1, directionY: 0, width: 0, height: 0,
    lastFrame: 0, startedAt: 0, lastMetricsAt: 0,
    onTargetMs: 0, dwellMs: 0, hiddenUntil: 0,
    hits: 0, shots: 0, score: 0, complete: false,
  })

  useImperativeHandle(ref, () => ({ requestPointerLock: () => requestPointerLock(canvasRef.current) }), [])
  useEffect(() => { phaseRef.current = phase }, [phase])
  useEffect(() => { exerciseRef.current = exercise }, [exercise])
  useEffect(() => { configRef.current = WARMUP_DIFFICULTIES[difficulty] }, [difficulty])
  useEffect(() => { gainRef.current = pointerGain }, [pointerGain])
  useEffect(() => { crosshairRef.current = crosshair }, [crosshair])
  useEffect(() => { onMetricsRef.current = onMetrics }, [onMetrics])
  useEffect(() => { onCompleteRef.current = onComplete }, [onComplete])

  const placeTarget = (time = 0) => {
    const state = stateRef.current
    const radius = Math.max(18, Math.min(state.width, state.height) * 0.048 * configRef.current.targetScale)
    state.targetX = randomBetween(radius * 1.7, Math.max(radius * 1.7, state.width - radius * 1.7))
    state.targetY = randomBetween(radius * 1.7, Math.max(radius * 1.7, state.height - radius * 1.7))
    state.hiddenUntil = time ? time + configRef.current.respawnMs : 0
    state.dwellMs = 0
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const updateLock = () => setPointerLocked(document.pointerLockElement === canvas)
    const handleMove = (event: MouseEvent) => {
      if ((phaseRef.current !== 'countdown' && phaseRef.current !== 'playing') || document.pointerLockElement !== canvas) return
      const state = stateRef.current
      state.aimX = clamp(state.aimX + event.movementX * gainRef.current, 0, canvas.clientWidth)
      state.aimY = clamp(state.aimY + event.movementY * gainRef.current, 0, canvas.clientHeight)
    }
    const handleShot = (event: MouseEvent) => {
      if (event.button !== 0 || phaseRef.current !== 'playing' || exerciseRef.current !== 'flick' || document.pointerLockElement !== canvas) return
      const state = stateRef.current
      const radius = Math.max(18, Math.min(state.width, state.height) * 0.048 * configRef.current.targetScale)
      state.shots += 1
      if (state.hiddenUntil <= performance.now() && Math.hypot(state.visualAimX - state.targetX, state.visualAimY - state.targetY) <= radius) {
        state.hits += 1
        state.score += 100
        placeTarget(performance.now())
      }
    }
    document.addEventListener('pointerlockchange', updateLock)
    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mousedown', handleShot)
    updateLock()
    return () => {
      document.removeEventListener('pointerlockchange', updateLock)
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mousedown', handleShot)
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let frame = 0
    const resize = () => {
      const ratio = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * ratio
      canvas.height = rect.height * ratio
      canvas.getContext('2d')?.setTransform(ratio, 0, 0, ratio, 0, 0)
      const state = stateRef.current
      const oldWidth = state.width || rect.width
      const oldHeight = state.height || rect.height
      state.aimX = state.aimX ? state.aimX * rect.width / oldWidth : rect.width / 2
      state.aimY = state.aimY ? state.aimY * rect.height / oldHeight : rect.height / 2
      state.visualAimX = state.visualAimX ? state.visualAimX * rect.width / oldWidth : state.aimX
      state.visualAimY = state.visualAimY ? state.visualAimY * rect.height / oldHeight : state.aimY
      state.targetX = state.targetX ? state.targetX * rect.width / oldWidth : rect.width / 2
      state.targetY = state.targetY ? state.targetY * rect.height / oldHeight : rect.height / 2
      state.width = rect.width; state.height = rect.height
    }
    const observer = new ResizeObserver(resize)
    observer.observe(canvas); resize()

    const render = (time: number) => {
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const state = stateRef.current
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      const config = configRef.current
      const radius = Math.max(18, Math.min(width, height) * 0.048 * config.targetScale)
      if (!state.lastFrame) state.lastFrame = time
      const deltaMs = Math.min(50, Math.max(0, time - state.lastFrame))
      const deltaSeconds = deltaMs / 1000
      state.lastFrame = time

      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = '#0b0e14'; ctx.fillRect(0, 0, width, height)
      ctx.strokeStyle = 'rgba(255,255,255,.035)'; ctx.lineWidth = 1
      for (let x = 0; x < width; x += 42) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke() }
      for (let y = 0; y < height; y += 42) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke() }

      if (phaseRef.current === 'countdown' || phaseRef.current === 'playing') {
        const aimBlend = 1 - Math.exp(-70 * deltaSeconds)
        state.visualAimX += (state.aimX - state.visualAimX) * aimBlend
        state.visualAimY += (state.aimY - state.visualAimY) * aimBlend
      }

      if (phaseRef.current === 'playing') {
        if (!state.startedAt) state.startedAt = time
        if (exerciseRef.current === 'tracking') {
          if (!state.destinationX || Math.hypot(state.destinationX - state.targetX, state.destinationY - state.targetY) < radius) {
            state.destinationX = randomBetween(radius * 1.6, width - radius * 1.6)
            state.destinationY = randomBetween(radius * 1.6, height - radius * 1.6)
          }
          const dx = state.destinationX - state.targetX
          const dy = state.destinationY - state.targetY
          const distance = Math.hypot(dx, dy) || 1
          const desiredX = dx / distance
          const desiredY = dy / distance
          const turnBlend = 1 - Math.exp(-6 * deltaSeconds)
          state.directionX += (desiredX - state.directionX) * turnBlend
          state.directionY += (desiredY - state.directionY) * turnBlend
          const directionLength = Math.hypot(state.directionX, state.directionY) || 1
          state.directionX /= directionLength; state.directionY /= directionLength
          const speed = Math.min(width, height) * config.targetSpeed
          state.targetX = clamp(state.targetX + state.directionX * speed * deltaSeconds, radius, width - radius)
          state.targetY = clamp(state.targetY + state.directionY * speed * deltaSeconds, radius, height - radius)
        }

        const visible = time >= state.hiddenUntil
        const onTarget = visible && Math.hypot(state.visualAimX - state.targetX, state.visualAimY - state.targetY) <= radius
        if (onTarget) {
          state.onTargetMs += deltaMs
          if (exerciseRef.current === 'switch') {
            state.dwellMs += deltaMs
            if (state.dwellMs >= config.dwellMs) {
              state.hits += 1; state.shots += 1; state.score += 100
              placeTarget(time)
            }
          }
        } else if (exerciseRef.current === 'switch') state.dwellMs = 0

        const elapsed = time - state.startedAt
        const remaining = Math.max(0, WARMUP_DURATION - elapsed / 1000)
        const trackingAccuracy = elapsed > 0 ? state.onTargetMs / elapsed * 100 : 0
        const trackingBasedAccuracy = exerciseRef.current !== 'flick'
        const metrics: WarmupMetrics = {
          score: exerciseRef.current === 'tracking' ? Math.round(state.onTargetMs / 10) : state.score,
          accuracy: trackingBasedAccuracy ? clamp(trackingAccuracy, 0, 100) : calculateWarmupAccuracy(state.hits, state.shots),
          hits: state.hits,
          shots: state.shots,
          remaining,
        }
        if (time - state.lastMetricsAt >= 100) { state.lastMetricsAt = time; onMetricsRef.current(metrics) }
        if (remaining <= 0 && !state.complete) {
          state.complete = true
          document.exitPointerLock?.()
          if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
          onCompleteRef.current(metrics)
        }
      }

      const visible = time >= state.hiddenUntil
      if (state.targetX && visible) {
        const glow = ctx.createRadialGradient(state.targetX, state.targetY, 0, state.targetX, state.targetY, radius * 2)
        glow.addColorStop(0, 'rgba(255,114,81,.28)'); glow.addColorStop(1, 'rgba(255,114,81,0)')
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(state.targetX, state.targetY, radius * 2, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#ff7251'; ctx.beginPath(); ctx.arc(state.targetX, state.targetY, radius, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,.72)'; ctx.beginPath(); ctx.arc(state.targetX, state.targetY, radius * .24, 0, Math.PI * 2); ctx.fill()
        if (exerciseRef.current === 'switch' && state.dwellMs > 0) {
          ctx.strokeStyle = '#8dfbd3'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(state.targetX, state.targetY, radius + 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, state.dwellMs / config.dwellMs)); ctx.stroke()
        }
      }
      if (phaseRef.current === 'countdown' || phaseRef.current === 'playing') {
        const onTarget = visible && Math.hypot(state.visualAimX - state.targetX, state.visualAimY - state.targetY) <= radius
        drawCrosshair(ctx, state.visualAimX, state.visualAimY, crosshairRef.current, onTarget ? '#8dfbd3' : '#f4f2eb')
      }
      frame = requestAnimationFrame(render)
    }
    frame = requestAnimationFrame(render)
    return () => { cancelAnimationFrame(frame); observer.disconnect() }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const state = stateRef.current
    const width = canvas?.clientWidth ?? state.width
    const height = canvas?.clientHeight ?? state.height
    Object.assign(state, {
      aimX: width / 2, aimY: height / 2, visualAimX: width / 2, visualAimY: height / 2,
      targetX: width / 2, targetY: height / 2, destinationX: 0, destinationY: 0,
      directionX: 1, directionY: 0, lastFrame: 0, startedAt: 0, lastMetricsAt: 0,
      onTargetMs: 0, dwellMs: 0, hiddenUntil: 0, hits: 0, shots: 0, score: 0, complete: false,
    })
    placeTarget()
  }, [sessionId])

  const active = phase === 'countdown' || phase === 'playing'
  return (
    <div className="warmup-arena-wrap">
      <canvas ref={canvasRef} className="warmup-arena" tabIndex={0} onMouseDown={() => active && requestPointerLock(canvasRef.current)} />
      {active && (
        <div className="warmup-hud">
          <div><span>{t('common.score')}</span><strong>{metrics.score}</strong></div>
          <div><span>{t('common.accuracy')}</span><strong>{format(metrics.accuracy)}<small>%</small></strong></div>
          <div><span>{t('common.time')}</span><strong>{format(metrics.remaining, 1)}<small>s</small></strong></div>
          <div><span>{t('common.sensitivity')}</span><strong>{sensitivityLabel}</strong></div>
        </div>
      )}
      {phase === 'countdown' && <div className="warmup-countdown"><strong>{countdown}</strong><span>{t('warmup.prepareAim')}</span></div>}
      {phase === 'playing' && <div className="warmup-instruction">{instruction}</div>}
      {active && !pointerLocked && <button className="lock-prompt" onClick={() => requestPointerLock(canvasRef.current)}>{t('arena.lockCursor')}</button>}
    </div>
  )
})

export function Warmup() {
  const { t } = useI18n()
  const arenaRef = useRef<ArenaHandle>(null)
  const [phase, setPhase] = useState<WarmupPhase>('hub')
  const [exercise, setExercise] = useState<WarmupExercise>('switch')
  const [difficulty, setDifficulty] = useState<WarmupDifficulty>('easy')
  const [selectedGame, setSelectedGame] = useState<GameId>('cs2')
  const [sensitivity, setSensitivity] = useState('1')
  const [dpi, setDpi] = useState('800')
  const [crosshair, setCrosshair] = useState<CrosshairStyle>('classic')
  const [countdown, setCountdown] = useState(3)
  const [sessionId, setSessionId] = useState(0)
  const [previewExercise, setPreviewExercise] = useState<WarmupExercise | null>(null)
  const [metrics, setMetrics] = useState<WarmupMetrics>({ score: 0, accuracy: 0, hits: 0, shots: 0, remaining: WARMUP_DURATION })

  const game = GAME_BY_ID[selectedGame]
  const parsedSensitivity = parsePositiveNumberInput(sensitivity)
  const parsedDpi = parsePositiveNumberInput(dpi)
  const validSetup = parsedSensitivity !== null && parsedDpi !== null
  const normalizedSensitivity = parsedSensitivity === null ? null : normalizeSensitivity(parsedSensitivity, game)
  const pointerGain = getWarmupPointerGain(game, normalizedSensitivity ?? game.sensitivityMin, parsedDpi ?? 800)
  const exerciseConfig = EXERCISES.find((item) => item.id === exercise) ?? EXERCISES[0]

  useEffect(() => {
    if (phase !== 'countdown') return
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
  }, [phase, sessionId])

  const openSetup = (nextExercise: WarmupExercise) => {
    setExercise(nextExercise)
    setPhase('setup')
  }

  const start = () => {
    if (!validSetup || normalizedSensitivity === null || parsedDpi === null) return
    setSensitivity(String(normalizedSensitivity))
    setDpi(String(Math.round(parsedDpi)))
    setMetrics({ score: 0, accuracy: 0, hits: 0, shots: 0, remaining: WARMUP_DURATION })
    flushSync(() => {
      setSessionId((value) => value + 1)
      setPhase('countdown')
    })
    arenaRef.current?.requestPointerLock()
  }

  const repeat = () => {
    setMetrics({ score: 0, accuracy: 0, hits: 0, shots: 0, remaining: WARMUP_DURATION })
    flushSync(() => {
      setSessionId((value) => value + 1)
      setPhase('countdown')
    })
    arenaRef.current?.requestPointerLock()
  }

  if (phase === 'hub' || phase === 'setup' || phase === 'result') {
    return (
      <section className="warmup-workspace">
        <div className="warmup-heading">
          <div className="panel-label"><Sparkles size={15} /> {t('warmup.kicker')}</div>
          <h1>{t('warmup.title')}</h1>
          <p>{t('warmup.subtitle')}</p>
        </div>
        <div className="warmup-exercises">
          {EXERCISES.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                className={previewExercise === item.id ? 'preview-active' : ''}
                onPointerEnter={() => setPreviewExercise(item.id)}
                onPointerLeave={() => setPreviewExercise((current) => current === item.id ? null : current)}
                onFocus={() => setPreviewExercise(item.id)}
                onBlur={() => setPreviewExercise((current) => current === item.id ? null : current)}
                onClick={() => openSetup(item.id)}
              >
                <Icon size={26} />
                {previewExercise === item.id && <ExercisePreview exercise={item.id} name={t(item.name)} />}
                <strong>{t(item.name)}</strong>
                <small>{t(item.description)}</small>
                <i>{t('warmup.configure')} <Play size={13} /></i>
              </button>
            )
          })}
        </div>

        {phase === 'setup' && (
          <div className="modal-backdrop">
            <section className="modal setup-modal warmup-setup-modal">
              <button className="modal-close" onClick={() => setPhase('hub')} aria-label={t('common.close')}><X size={18} /></button>
              <Settings2 size={20} className="modal-icon" />
              <h2>{t('warmup.configureExercise', { exercise: t(exerciseConfig.name) })}</h2>
              <p>{t('warmup.sessionDuration', { description: t(exerciseConfig.description), seconds: WARMUP_DURATION })}</p>
              <div className="option-group game-grid" role="radiogroup" aria-label={t('common.gameReference')}>
                {GAMES.map((item) => (
                  <button key={item.id} className={selectedGame === item.id ? 'choice-card game-choice selected' : 'choice-card game-choice'} onClick={() => setSelectedGame(item.id)} type="button">
                    <div className={`game-logo game-logo-${item.id}`}><img src={`./game-icons/${item.iconFile ?? `${item.id}.png`}`} alt="" /></div>
                    <span className="game-card-name">{item.shortLabel}</span>
                  </button>
                ))}
              </div>
              <div className="setup-fields">
                <label>{t('calibration.currentSensitivity', { game: game.label })}<input type="text" inputMode="decimal" value={sensitivity} onChange={(event) => setSensitivity(event.target.value)} aria-invalid={parsedSensitivity === null} /></label>
                <label>{t('common.mouseDpi')}<input type="text" inputMode="numeric" value={dpi} onChange={(event) => setDpi(event.target.value)} aria-invalid={parsedDpi === null} /></label>
              </div>
              <div className="warmup-config-label">{t('warmup.difficulty')}</div>
              <div className="warmup-difficulty" role="radiogroup" aria-label={t('warmup.difficulty')}>
                {(Object.keys(WARMUP_DIFFICULTIES) as WarmupDifficulty[]).map((level) => (
                  <button type="button" key={level} className={difficulty === level ? 'selected' : ''} onClick={() => setDifficulty(level)}>
                    <strong>{t(`difficulty.${level}` as TranslationKey)}</strong><small>{t(`difficulty.${level}Description` as TranslationKey)}</small>
                  </button>
                ))}
              </div>
              <div className="warmup-config-label">{t('warmup.crosshair')}</div>
              <div className="warmup-crosshairs" role="radiogroup" aria-label={t('calibration.crosshairType')}>
                {CROSSHAIRS.map((item) => { const Icon = item.icon; return <button type="button" key={item.id} className={crosshair === item.id ? 'selected' : ''} onClick={() => setCrosshair(item.id)}><Icon size={16} /><span>{t(item.label)}</span></button> })}
              </div>
              <button className="primary-button wide" onClick={start} disabled={!validSetup}>{t('warmup.start')}</button>
            </section>
          </div>
        )}

        {phase === 'result' && (
          <div className="modal-backdrop">
            <section className="modal warmup-result-modal">
              <Sparkles size={22} className="modal-icon" />
              <div className="panel-label">{t('warmup.complete')}</div>
              <h2>{t(exerciseConfig.name)}</h2>
              <p>{t(`difficulty.${difficulty}` as TranslationKey)} · {game.label} · {WARMUP_DURATION}s</p>
              <div className="warmup-result-score"><span>{t('common.score')}</span><strong>{metrics.score}</strong></div>
              <div className="warmup-result-grid">
                <div><span>{t('common.accuracy')}</span><strong>{format(metrics.accuracy)}%</strong></div>
                <div><span>{exercise === 'tracking' ? t('warmup.timeOnTarget') : t('warmup.hits')}</span><strong>{exercise === 'tracking' ? `${format(metrics.accuracy)}%` : metrics.hits}</strong></div>
                <div><span>{t('warmup.difficulty')}</span><strong>{t(`difficulty.${difficulty}` as TranslationKey)}</strong></div>
              </div>
              <div className="warmup-result-actions">
                <button className="secondary-button" onClick={() => setPhase('hub')}><RotateCcw size={15} /> {t('warmup.chooseTraining')}</button>
                <button className="primary-button" onClick={repeat}><Play size={15} /> {t('warmup.repeat')}</button>
              </div>
            </section>
          </div>
        )}
      </section>
    )
  }

  return (
    <section className="warmup-game-workspace">
      <WarmupArena
        ref={arenaRef}
        phase={phase}
        countdown={countdown}
        exercise={exercise}
        difficulty={difficulty}
        crosshair={crosshair}
        pointerGain={pointerGain}
        sessionId={sessionId}
        sensitivityLabel={`${game.shortLabel} ${format(normalizedSensitivity ?? 0, 3)}`}
        instruction={t(exerciseConfig.instruction)}
        metrics={metrics}
        onMetrics={setMetrics}
        onComplete={(result) => { setMetrics(result); setPhase('result') }}
      />
      <aside className="warmup-side-panel">
        <span>{t(exerciseConfig.name)}</span>
        <strong>{format(metrics.remaining, 1)}<small>s</small></strong>
        <div><span>{t('common.score')}</span><b>{metrics.score}</b></div>
        <div><span>{t('common.accuracy')}</span><b>{format(metrics.accuracy)}%</b></div>
        <div><span>{t('warmup.level')}</span><b>{t(`difficulty.${difficulty}` as TranslationKey)}</b></div>
        <p><MousePointer2 size={14} /> {t(exerciseConfig.instruction)}</p>
      </aside>
    </section>
  )
}
