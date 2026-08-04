import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { ArrowLeft, ArrowRight, Crosshair, Dot, Circle, Plus, Focus, Gauge, Grid3X3, LogOut, MoveHorizontal, MousePointer2, Play, RotateCcw, Settings2, Sparkles, Target, Zap, X, type LucideIcon } from 'lucide-react'
import { GAME_BY_ID, GAMES, type GameId } from './games'
import { normalizeSensitivity, parsePositiveNumberInput } from './sensitivity'
import type { CrosshairStyle } from './TrackingArena'
import { calculateWarmupAccuracy, getNextWarmupDifficulty, getWarmupPointerGain, WARMUP_DIFFICULTIES, WARMUP_DURATION, type WarmupDifficulty, type WarmupExercise } from './warmupConfig'
import { useI18n, type TranslationKey } from './i18n'
import { clampAimCoordinate, requestStablePointerLock, sanitizePointerMovement } from './pointerInput'

type WarmupMetrics = {
  score: number
  accuracy: number
  hits: number
  shots: number
  remaining: number
}

type WarmupPhase = 'hub' | 'setup' | 'countdown' | 'playing' | 'result'
type SetupStep = 1 | 2 | 3

const EXERCISES: Array<{ id: WarmupExercise, name: string, description: TranslationKey, instruction: TranslationKey, icon: LucideIcon }> = [
  { id: 'switch', name: 'Target Switch', description: 'warmup.switch.description', instruction: 'warmup.switch.instruction', icon: Focus },
  { id: 'tracking', name: 'Tracking', description: 'warmup.tracking.description', instruction: 'warmup.tracking.instruction', icon: Gauge },
  { id: 'flick', name: 'Target Shooting', description: 'warmup.flick.description', instruction: 'warmup.flick.instruction', icon: Target },
  { id: 'reflex', name: 'Reflex', description: 'warmup.reflex.description', instruction: 'warmup.reflex.instruction', icon: Zap },
  { id: 'gridshot', name: 'Gridshot', description: 'warmup.gridshot.description', instruction: 'warmup.gridshot.instruction', icon: Grid3X3 },
  { id: 'strafetrack', name: 'Strafetrack', description: 'warmup.strafetrack.description', instruction: 'warmup.strafetrack.instruction', icon: MoveHorizontal },
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
const isClickExercise = (exercise: WarmupExercise) => exercise === 'flick' || exercise === 'reflex' || exercise === 'gridshot'
const isTrackingExercise = (exercise: WarmupExercise) => exercise === 'tracking' || exercise === 'strafetrack'
const exerciseRadiusScale = (exercise: WarmupExercise) => exercise === 'gridshot' ? 0.78 : exercise === 'reflex' || exercise === 'strafetrack' ? 0.88 : 1
const reflexWindow = (targetScale: number) => targetScale > 1 ? 1250 : targetScale > 0.8 ? 900 : 650

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
  onPointerLockChange: (locked: boolean) => void
}

type ArenaHandle = { requestPointerLock: () => void }

const WarmupArena = forwardRef<ArenaHandle, ArenaProps>(function WarmupArena({ phase, countdown, exercise, difficulty, crosshair, pointerGain, sessionId, sensitivityLabel, instruction, metrics, onMetrics, onComplete, onPointerLockChange }, ref) {
  const { t } = useI18n()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [pointerLocked, setPointerLocked] = useState(false)
  const pointerLockedAtRef = useRef(0)
  const pointerLockedRef = useRef(false)
  const inputPausedAtRef = useRef(0)
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
    onTargetMs: 0, dwellMs: 0, hiddenUntil: 0, targetExpiresAt: 0,
    extraTargets: [] as Array<{ x: number, y: number }>, strafeDirection: 1, nextDirectionChangeAt: 0,
    targetTrail: [] as Array<{ x: number, y: number, time: number }>, lastTrailSample: 0,
    hits: 0, shots: 0, score: 0, complete: false,
  })

  useImperativeHandle(ref, () => ({ requestPointerLock: () => { void requestStablePointerLock(canvasRef.current) } }), [])
  useEffect(() => { phaseRef.current = phase }, [phase])
  useEffect(() => { exerciseRef.current = exercise }, [exercise])
  useEffect(() => { configRef.current = WARMUP_DIFFICULTIES[difficulty] }, [difficulty])
  useEffect(() => { gainRef.current = pointerGain }, [pointerGain])
  useEffect(() => { crosshairRef.current = crosshair }, [crosshair])
  useEffect(() => { onMetricsRef.current = onMetrics }, [onMetrics])
  useEffect(() => { onCompleteRef.current = onComplete }, [onComplete])

  const placeTarget = (time = 0, slot = 0) => {
    const state = stateRef.current
    const exercise = exerciseRef.current
    const radius = Math.max(16, Math.min(state.width, state.height) * 0.048 * configRef.current.targetScale * exerciseRadiusScale(exercise))
    const existing = [{ x: state.targetX, y: state.targetY }, ...state.extraTargets].filter((_, index) => index !== slot)
    let next = { x: state.width / 2, y: state.height / 2 }
    for (let attempt = 0; attempt < 12; attempt += 1) {
      next = {
        x: randomBetween(radius * 1.7, Math.max(radius * 1.7, state.width - radius * 1.7)),
        y: randomBetween(radius * 1.7, Math.max(radius * 1.7, state.height - radius * 1.7)),
      }
      if (existing.every((target) => !target.x || Math.hypot(target.x - next.x, target.y - next.y) > radius * 3.2)) break
    }
    if (slot === 0) { state.targetX = next.x; state.targetY = next.y } else state.extraTargets[slot - 1] = next
    state.hiddenUntil = exercise === 'gridshot' ? 0 : time ? time + configRef.current.respawnMs : 0
    if (exercise === 'reflex') state.targetExpiresAt = time ? state.hiddenUntil + reflexWindow(configRef.current.targetScale) : 0
    state.dwellMs = 0
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const updateLock = () => {
      const locked = document.pointerLockElement === canvas
      if (locked) {
        const state = stateRef.current
        const now = performance.now()
        if (inputPausedAtRef.current && state.startedAt) state.startedAt += now - inputPausedAtRef.current
        inputPausedAtRef.current = 0
        state.aimX = canvas.clientWidth / 2
        state.aimY = canvas.clientHeight / 2
        state.visualAimX = state.aimX
        state.visualAimY = state.aimY
        state.lastFrame = now
        pointerLockedAtRef.current = now
      } else {
        pointerLockedAtRef.current = 0
        if (pointerLockedRef.current && phaseRef.current === 'playing') inputPausedAtRef.current = performance.now()
      }
      pointerLockedRef.current = locked
      setPointerLocked(locked)
      onPointerLockChange(locked)
    }
    const handleMove = (event: MouseEvent) => {
      if ((phaseRef.current !== 'countdown' && phaseRef.current !== 'playing') || document.pointerLockElement !== canvas) return
      const state = stateRef.current
      const movement = sanitizePointerMovement({
        movementX: event.movementX,
        movementY: event.movementY,
        gain: gainRef.current,
        width: canvas.clientWidth,
        height: canvas.clientHeight,
        elapsedSinceLock: performance.now() - pointerLockedAtRef.current,
      })
      if (!movement) return
      state.aimX = clampAimCoordinate(state.aimX + movement.x, canvas.clientWidth)
      state.aimY = clampAimCoordinate(state.aimY + movement.y, canvas.clientHeight)
    }
    const handleShot = (event: MouseEvent) => {
      if (event.button !== 0 || phaseRef.current !== 'playing' || !isClickExercise(exerciseRef.current) || document.pointerLockElement !== canvas) return
      const state = stateRef.current
      const exercise = exerciseRef.current
      const radius = Math.max(16, Math.min(state.width, state.height) * 0.048 * configRef.current.targetScale * exerciseRadiusScale(exercise))
      state.shots += 1
      const targets = [{ x: state.targetX, y: state.targetY }, ...(exercise === 'gridshot' ? state.extraTargets : [])]
      const hitIndex = targets.findIndex((target) => Math.hypot(state.visualAimX - target.x, state.visualAimY - target.y) <= radius)
      if (state.hiddenUntil <= performance.now() && hitIndex >= 0) {
        state.hits += 1
        state.score += 100
        placeTarget(performance.now(), hitIndex)
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
  }, [onPointerLockChange])

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
      state.extraTargets = state.extraTargets.map((target) => ({ x: target.x * rect.width / oldWidth, y: target.y * rect.height / oldHeight }))
      state.targetTrail = state.targetTrail.map((point) => ({ ...point, x: point.x * rect.width / oldWidth, y: point.y * rect.height / oldHeight }))
      state.aimX = clampAimCoordinate(state.aimX, rect.width)
      state.aimY = clampAimCoordinate(state.aimY, rect.height)
      state.visualAimX = clampAimCoordinate(state.visualAimX, rect.width)
      state.visualAimY = clampAimCoordinate(state.visualAimY, rect.height)
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
      const exercise = exerciseRef.current
      const radius = Math.max(16, Math.min(width, height) * 0.048 * config.targetScale * exerciseRadiusScale(exercise))
      if (!state.lastFrame) state.lastFrame = time
      const deltaMs = Math.min(50, Math.max(0, time - state.lastFrame))
      const deltaSeconds = deltaMs / 1000
      state.lastFrame = time

      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = '#0b0e14'; ctx.fillRect(0, 0, width, height)
      ctx.strokeStyle = 'rgba(255,255,255,.035)'; ctx.lineWidth = 1
      for (let x = 0; x < width; x += 42) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke() }
      for (let y = 0; y < height; y += 42) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke() }

      if ((phaseRef.current === 'countdown' || phaseRef.current === 'playing') && pointerLockedRef.current) {
        const aimBlend = 1 - Math.exp(-70 * deltaSeconds)
        state.visualAimX += (state.aimX - state.visualAimX) * aimBlend
        state.visualAimY += (state.aimY - state.visualAimY) * aimBlend
      }

      if (phaseRef.current === 'playing' && pointerLockedRef.current) {
        if (!state.startedAt) state.startedAt = time
        if (exercise === 'tracking') {
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

        if (exercise === 'strafetrack') {
          if (!state.nextDirectionChangeAt) state.nextDirectionChangeAt = time + randomBetween(900, 1800)
          if (time >= state.nextDirectionChangeAt) {
            state.strafeDirection *= -1
            state.nextDirectionChangeAt = time + randomBetween(850, 1750)
          }
          const speed = Math.min(width, height) * config.targetSpeed * 1.05
          state.targetX += state.strafeDirection * speed * deltaSeconds
          if (state.targetX <= radius || state.targetX >= width - radius) {
            state.targetX = clamp(state.targetX, radius, width - radius)
            state.strafeDirection *= -1
            state.nextDirectionChangeAt = time + randomBetween(850, 1750)
          }
        }

        if (isTrackingExercise(exercise) && time - state.lastTrailSample >= 18) {
          state.targetTrail.push({ x: state.targetX, y: state.targetY, time })
          if (state.targetTrail.length > 20) state.targetTrail.shift()
          state.lastTrailSample = time
        }

        if (exercise === 'reflex' && !state.targetExpiresAt) state.targetExpiresAt = time + reflexWindow(config.targetScale)
        if (exercise === 'reflex' && time >= state.targetExpiresAt) placeTarget(time)

        const visible = time >= state.hiddenUntil
        const onTarget = visible && Math.hypot(state.visualAimX - state.targetX, state.visualAimY - state.targetY) <= radius
        if (onTarget) {
          state.onTargetMs += deltaMs
          if (exercise === 'switch') {
            state.dwellMs += deltaMs
            if (state.dwellMs >= config.dwellMs) {
              state.hits += 1; state.shots += 1; state.score += 100
              placeTarget(time)
            }
          }
        } else if (exercise === 'switch') state.dwellMs = 0

        const elapsed = time - state.startedAt
        const remaining = Math.max(0, WARMUP_DURATION - elapsed / 1000)
        const trackingAccuracy = elapsed > 0 ? state.onTargetMs / elapsed * 100 : 0
        const trackingBasedAccuracy = exercise === 'switch' || isTrackingExercise(exercise)
        const metrics: WarmupMetrics = {
          score: isTrackingExercise(exercise) ? Math.round(state.onTargetMs / 10) : state.score,
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
      state.targetTrail = state.targetTrail.filter((point) => time - point.time <= 360)
      if (isTrackingExercise(exercise)) {
        for (const point of state.targetTrail) {
          const life = 1 - (time - point.time) / 360
          ctx.fillStyle = `rgba(255,114,81,${Math.max(0, life) * 0.2})`
          ctx.beginPath(); ctx.arc(point.x, point.y, radius * (0.22 + life * 0.42), 0, Math.PI * 2); ctx.fill()
        }
      }
      const drawTarget = (targetX: number, targetY: number) => {
        const glow = ctx.createRadialGradient(targetX, targetY, 0, targetX, targetY, radius * 2)
        glow.addColorStop(0, 'rgba(255,114,81,.28)'); glow.addColorStop(1, 'rgba(255,114,81,0)')
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(targetX, targetY, radius * 2, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#ff7251'; ctx.beginPath(); ctx.arc(targetX, targetY, radius, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,.72)'; ctx.beginPath(); ctx.arc(targetX, targetY, radius * .24, 0, Math.PI * 2); ctx.fill()
        if (exercise === 'switch' && state.dwellMs > 0) {
          ctx.strokeStyle = '#8dfbd3'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(targetX, targetY, radius + 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, state.dwellMs / config.dwellMs)); ctx.stroke()
        }
        if (exercise === 'reflex') {
          const progress = clamp((state.targetExpiresAt - time) / reflexWindow(config.targetScale), 0, 1)
          ctx.strokeStyle = progress > .35 ? '#8dfbd3' : '#ff7251'; ctx.lineWidth = 3
          ctx.beginPath(); ctx.arc(targetX, targetY, radius + 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress); ctx.stroke()
        }
      }
      if (state.targetX && visible) {
        drawTarget(state.targetX, state.targetY)
        if (exercise === 'gridshot') state.extraTargets.forEach((target) => drawTarget(target.x, target.y))
      }
      if (phaseRef.current === 'countdown' || phaseRef.current === 'playing') {
        const targets = [{ x: state.targetX, y: state.targetY }, ...(exercise === 'gridshot' ? state.extraTargets : [])]
        const onTarget = visible && targets.some((target) => Math.hypot(state.visualAimX - target.x, state.visualAimY - target.y) <= radius)
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
      onTargetMs: 0, dwellMs: 0, hiddenUntil: 0, targetExpiresAt: 0, extraTargets: [],
      strafeDirection: Math.random() > .5 ? 1 : -1, nextDirectionChangeAt: 0, targetTrail: [], lastTrailSample: 0,
      hits: 0, shots: 0, score: 0, complete: false,
    })
    inputPausedAtRef.current = 0
    placeTarget()
    if (exerciseRef.current === 'gridshot') { placeTarget(0, 1); placeTarget(0, 2) }
  }, [sessionId])

  const active = phase === 'countdown' || phase === 'playing'
  return (
    <div className="warmup-arena-wrap">
      <canvas ref={canvasRef} className="warmup-arena" tabIndex={0} onMouseDown={() => active && void requestStablePointerLock(canvasRef.current)} />
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
      {active && !pointerLocked && <button className="lock-prompt" onClick={() => void requestStablePointerLock(canvasRef.current)}>{t('arena.lockCursor')}</button>}
    </div>
  )
})

export function Warmup() {
  const { t } = useI18n()
  const arenaRef = useRef<ArenaHandle>(null)
  const [phase, setPhase] = useState<WarmupPhase>('hub')
  const [setupStep, setSetupStep] = useState<SetupStep>(1)
  const [inputReady, setInputReady] = useState(false)
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
  const nextDifficulty = getNextWarmupDifficulty(difficulty)

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

  const openSetup = (nextExercise: WarmupExercise) => {
    setExercise(nextExercise)
    setSetupStep(1)
    setPhase('setup')
  }

  const start = () => {
    if (!validSetup || normalizedSensitivity === null || parsedDpi === null) return
    setSensitivity(String(normalizedSensitivity))
    setDpi(String(Math.round(parsedDpi)))
    setInputReady(false)
    setMetrics({ score: 0, accuracy: 0, hits: 0, shots: 0, remaining: WARMUP_DURATION })
    flushSync(() => {
      setSessionId((value) => value + 1)
      setPhase('countdown')
    })
    arenaRef.current?.requestPointerLock()
  }

  const repeat = () => {
    setInputReady(false)
    setMetrics({ score: 0, accuracy: 0, hits: 0, shots: 0, remaining: WARMUP_DURATION })
    flushSync(() => {
      setSessionId((value) => value + 1)
      setPhase('countdown')
    })
    arenaRef.current?.requestPointerLock()
  }

  const playNextRound = () => {
    setDifficulty(nextDifficulty)
    setInputReady(false)
    setMetrics({ score: 0, accuracy: 0, hits: 0, shots: 0, remaining: WARMUP_DURATION })
    flushSync(() => {
      setSessionId((value) => value + 1)
      setPhase('countdown')
    })
    arenaRef.current?.requestPointerLock()
  }

  const exitToHub = () => {
    document.exitPointerLock?.()
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
    setInputReady(false)
    setCountdown(3)
    setPhase('hub')
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
                {previewExercise === item.id && <ExercisePreview exercise={item.id} name={item.name} />}
                <strong>{item.name}</strong>
                <small>{t(item.description)}</small>
                <i>{t('warmup.configure')} <Play size={13} /></i>
              </button>
            )
          })}
        </div>

        {phase === 'setup' && (
          <div className="modal-backdrop">
            <section className="modal setup-modal warmup-setup-modal">
              <button className="modal-close" onClick={exitToHub} aria-label={t('common.close')}><X size={18} /></button>
              <Settings2 size={20} className="modal-icon" />
              <h2>{t('warmup.configureExercise', { exercise: exerciseConfig.name })}</h2>
              <p>{t(exerciseConfig.description)}</p>

              <div className="warmup-stepper" aria-label={t('warmup.configure')}>
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
                      <button type="button" key={level} className={difficulty === level ? 'selected' : ''} onClick={() => setDifficulty(level)}>
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
                  : <button className="primary-button" onClick={start} disabled={!validSetup}><Play size={15} /> {t('warmup.start')}</button>}
              </div>
            </section>
          </div>
        )}

        {phase === 'result' && (
          <div className="modal-backdrop">
            <section className="modal warmup-result-modal">
              <Sparkles size={22} className="modal-icon" />
              <div className="panel-label">{t('warmup.complete')}</div>
              <h2>{exerciseConfig.name}</h2>
              <p>{t(`difficulty.${difficulty}` as TranslationKey)} · {game.label} · {WARMUP_DURATION}s</p>
              <div className="warmup-result-score"><span>{t('common.score')}</span><strong>{metrics.score}</strong></div>
              <div className="warmup-result-grid">
                <div><span>{t('common.accuracy')}</span><strong>{format(metrics.accuracy)}%</strong></div>
                <div><span>{isTrackingExercise(exercise) ? t('warmup.timeOnTarget') : t('warmup.hits')}</span><strong>{isTrackingExercise(exercise) ? `${format(metrics.accuracy)}%` : metrics.hits}</strong></div>
                <div><span>{t('warmup.difficulty')}</span><strong>{t(`difficulty.${difficulty}` as TranslationKey)}</strong></div>
              </div>
              <div className="warmup-next-hint">
                {difficulty === 'hard'
                  ? t('warmup.keepHardHint')
                  : t('warmup.nextLevelHint', { level: t(`difficulty.${nextDifficulty}` as TranslationKey) })}
              </div>
              <div className="warmup-result-actions">
                <button className="secondary-button" onClick={exitToHub}><LogOut size={15} /> {t('warmup.exit')}</button>
                <button className="secondary-button" onClick={repeat}><RotateCcw size={15} /> {t('warmup.repeat')}</button>
                <button className="primary-button" onClick={playNextRound}>{t('warmup.nextRound')} <ArrowRight size={15} /></button>
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
        onPointerLockChange={setInputReady}
      />
      <aside className="warmup-side-panel">
        <span>{exerciseConfig.name}</span>
        <strong>{format(metrics.remaining, 1)}<small>s</small></strong>
        <div><span>{t('common.score')}</span><b>{metrics.score}</b></div>
        <div><span>{t('common.accuracy')}</span><b>{format(metrics.accuracy)}%</b></div>
        <div><span>{t('warmup.level')}</span><b>{t(`difficulty.${difficulty}` as TranslationKey)}</b></div>
        <p><MousePointer2 size={14} /> {t(exerciseConfig.instruction)}</p>
      </aside>
    </section>
  )
}
