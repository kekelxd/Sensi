import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Play, RotateCcw } from 'lucide-react'
import { ROUND_DURATION, ROUND_WARMUP, SAMPLE_INTERVAL_MS, SMOOTHNESS_SPEED_CHANGE_PER_RADIUS, type RoundCapture, type RoundDiagnostics } from './calibration'
import { useI18n } from './i18n'
import { clampAimCoordinate, requestStablePointerLock, sanitizePointerMovement } from './pointerInput'
import { createTargetTrajectory, sampleTargetTrajectory, type TargetTrajectory } from './targetTrajectory'
import { getCanvasGain, getRelativeCanvasGain } from './aimModel'
import type { GameConfig } from './games'

export type CrosshairStyle = 'classic' | 'dot' | 'circle' | 'plus'

type LiveMetrics = {
  accuracy: number
  meanError: number
  smoothness: number
}

type Props = {
  active: boolean
  moving: boolean
  scoring: boolean
  paused: boolean
  multiplier: number
  game: GameConfig
  sensitivity: number
  horizontalFov: number
  targetSpeed: number
  trajectorySeed: number
  roundKey: string
  crosshair: CrosshairStyle
  countdownLabel: string
  idleMessage?: string
  idleHint?: string
  hasResults: boolean
  isComplete: boolean
  hud: {
    round: number
    totalRounds: number
    accuracy: string
    meanError: string
    sensitivity: string
    remaining: string
  }
  onStart: () => void
  onReset: () => void
  onShowResults: () => void
  onMetrics: (metrics: LiveMetrics) => void
  onRoundComplete: (capture: RoundCapture) => void
  onPointerLockChange: (locked: boolean) => void
}

export type TrackingArenaHandle = {
  requestPointerLock: () => void
}

const ROUND_DURATION_MS = ROUND_DURATION * 1000
const METRICS_UPDATE_INTERVAL_MS = 120
const LONG_FRAME_THRESHOLD_MS = 50
const getTargetRadius = (width: number, height: number) => Math.max(28, Math.min(width, height) * 0.055)

const createDiagnostics = (rawInputSupported: boolean, coalescedInputSupported: boolean): RoundDiagnostics => ({
  pointerLockLosses: 0,
  resizeCount: 0,
  frameCount: 0,
  longFrameCount: 0,
  inputEventCount: 0,
  rawInputSupported,
  coalescedInputSupported,
})

function drawCrosshair(ctx: CanvasRenderingContext2D, x: number, y: number, style: CrosshairStyle, color: string) {
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = style === 'plus' ? 2.2 : 1.5

  if (style === 'dot') {
    ctx.beginPath()
    ctx.arc(x, y, 4.2, 0, Math.PI * 2)
    ctx.fill()
    return
  }

  if (style === 'circle') {
    ctx.beginPath()
    ctx.arc(x, y, 10, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(x, y, 2.4, 0, Math.PI * 2)
    ctx.fill()
    return
  }

  const gap = style === 'plus' ? 2 : 7
  const length = style === 'plus' ? 12 : 14
  ctx.beginPath()
  ctx.moveTo(x - gap - length, y); ctx.lineTo(x - gap, y)
  ctx.moveTo(x + gap, y); ctx.lineTo(x + gap + length, y)
  ctx.moveTo(x, y - gap - length); ctx.lineTo(x, y - gap)
  ctx.moveTo(x, y + gap); ctx.lineTo(x, y + gap + length)
  ctx.stroke()

  if (style === 'classic') {
    ctx.beginPath()
    ctx.arc(x, y, 2, 0, Math.PI * 2)
    ctx.fill()
  }
}

export const TrackingArena = forwardRef<TrackingArenaHandle, Props>(function TrackingArena(
  {
    active,
    moving,
    scoring,
    paused,
    multiplier,
    game,
    sensitivity,
    horizontalFov,
    targetSpeed,
    trajectorySeed,
    roundKey,
    crosshair,
    countdownLabel,
    idleMessage,
    idleHint,
    hasResults,
    isComplete,
    hud,
    onStart,
    onReset,
    onShowResults,
    onMetrics,
    onRoundComplete,
    onPointerLockChange,
  },
  ref,
) {
  const { t } = useI18n()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [pointerLocked, setPointerLocked] = useState(false)
  const pointerLockedAtRef = useRef(0)
  const hasLockedThisRoundRef = useRef(false)
  const wasPointerLockedRef = useRef(false)
  const activeRef = useRef(active)
  const movingRef = useRef(moving)
  const scoringRef = useRef(scoring)
  const pausedRef = useRef(paused)
  const multiplierRef = useRef(multiplier)
  const gameRef = useRef(game)
  const sensitivityRef = useRef(sensitivity)
  const horizontalFovRef = useRef(horizontalFov)
  const crosshairRef = useRef(crosshair)
  const onMetricsRef = useRef(onMetrics)
  const onCompleteRef = useRef(onRoundComplete)
  const onPointerLockChangeRef = useRef(onPointerLockChange)
  const roundRemainingMsRef = useRef(ROUND_DURATION_MS)
  const rawInputSupportedRef = useRef(false)
  const coalescedInputSupportedRef = useRef(false)
  const trajectoryRef = useRef<TargetTrajectory>(createTargetTrajectory(trajectorySeed, targetSpeed))

  const stateRef = useRef({
    aimX: 0,
    aimY: 0,
    targetX: 0,
    targetY: 0,
    trajectoryElapsedMs: 0,
    lastFrame: 0,
    distances: [] as number[],
    speeds: [] as number[],
    lastAimX: 0,
    lastAimY: 0,
    lastSample: 0,
    lastMetricsUpdate: 0,
    targetTrail: [] as Array<{ x: number, y: number, time: number }>,
    lastTrailSample: 0,
    canvasWidth: 0,
    canvasHeight: 0,
    complete: false,
    diagnostics: createDiagnostics(false, false),
  })

  useImperativeHandle(ref, () => ({
    requestPointerLock: () => {
      void requestStablePointerLock(canvasRef.current)
    },
  }), [])

  useEffect(() => { activeRef.current = active }, [active])
  useEffect(() => { movingRef.current = moving }, [moving])
  useEffect(() => { scoringRef.current = scoring }, [scoring])
  useEffect(() => { pausedRef.current = paused }, [paused])
  useEffect(() => { multiplierRef.current = multiplier }, [multiplier])
  useEffect(() => { gameRef.current = game }, [game])
  useEffect(() => { sensitivityRef.current = sensitivity }, [sensitivity])
  useEffect(() => { horizontalFovRef.current = horizontalFov }, [horizontalFov])
  useEffect(() => { crosshairRef.current = crosshair }, [crosshair])
  useEffect(() => { onMetricsRef.current = onMetrics }, [onMetrics])
  useEffect(() => { onCompleteRef.current = onRoundComplete }, [onRoundComplete])
  useEffect(() => { onPointerLockChangeRef.current = onPointerLockChange }, [onPointerLockChange])

  useEffect(() => {
    trajectoryRef.current = createTargetTrajectory(trajectorySeed, targetSpeed)
  }, [targetSpeed, trajectorySeed])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    rawInputSupportedRef.current = 'onpointerrawupdate' in window
    coalescedInputSupportedRef.current = typeof PointerEvent !== 'undefined'
      && 'getCoalescedEvents' in PointerEvent.prototype
    const eventName = rawInputSupportedRef.current ? 'pointerrawupdate' : 'pointermove'

    const updatePointerLock = () => {
      const locked = document.pointerLockElement === canvas
      const state = stateRef.current

      if (locked) {
        if (!hasLockedThisRoundRef.current) {
          state.aimX = canvas.clientWidth / 2
          state.aimY = canvas.clientHeight / 2
          state.lastAimX = state.aimX
          state.lastAimY = state.aimY
          hasLockedThisRoundRef.current = true
        }
        pointerLockedAtRef.current = performance.now()
      } else {
        pointerLockedAtRef.current = 0
        if (wasPointerLockedRef.current && activeRef.current && scoringRef.current && !state.complete) {
          state.diagnostics.pointerLockLosses += 1
        }
      }

      wasPointerLockedRef.current = locked
      setPointerLocked(locked)
      onPointerLockChangeRef.current(locked)
    }

    const handlePointer = (event: PointerEvent) => {
      if (!activeRef.current || pausedRef.current || document.pointerLockElement !== canvas) return
      const state = stateRef.current
      const groupedEvents = event.getCoalescedEvents?.()
      const events = groupedEvents && groupedEvents.length > 0 ? groupedEvents : [event]
      const elapsedSinceLock = performance.now() - pointerLockedAtRef.current

      for (const currentEvent of events) {
        const gain = getCanvasGain(
          gameRef.current,
          sensitivityRef.current,
          horizontalFovRef.current,
          canvas.clientWidth,
        ) ?? getRelativeCanvasGain(multiplierRef.current)
        const movement = sanitizePointerMovement({
          movementX: currentEvent.movementX,
          movementY: currentEvent.movementY,
          gain,
          width: canvas.clientWidth,
          height: canvas.clientHeight,
          elapsedSinceLock,
        })
        if (!movement) continue
        state.aimX = clampAimCoordinate(state.aimX + movement.x, canvas.clientWidth)
        state.aimY = clampAimCoordinate(state.aimY + movement.y, canvas.clientHeight)
        if (scoringRef.current) state.diagnostics.inputEventCount += 1
      }
    }

    document.addEventListener('pointerlockchange', updatePointerLock)
    document.addEventListener(eventName, handlePointer as EventListener, { passive: true })
    updatePointerLock()

    return () => {
      document.removeEventListener('pointerlockchange', updatePointerLock)
      document.removeEventListener(eventName, handlePointer as EventListener)
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true }) as CanvasRenderingContext2D | null
    if (!ctx) return
    let animationFrame = 0

    const resize = () => {
      const ratio = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      const state = stateRef.current

      if (state.canvasWidth > 0 && state.canvasHeight > 0 && scoringRef.current && !state.complete) {
        state.diagnostics.resizeCount += 1
      }

      canvas.width = Math.max(1, Math.round(rect.width * ratio))
      canvas.height = Math.max(1, Math.round(rect.height * ratio))
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)

      if (state.canvasWidth > 0 && state.canvasHeight > 0) {
        const scaleX = rect.width / state.canvasWidth
        const scaleY = rect.height / state.canvasHeight
        state.aimX = clampAimCoordinate(state.aimX * scaleX, rect.width)
        state.aimY = clampAimCoordinate(state.aimY * scaleY, rect.height)
        state.lastAimX = clampAimCoordinate(state.lastAimX * scaleX, rect.width)
        state.lastAimY = clampAimCoordinate(state.lastAimY * scaleY, rect.height)
        for (const point of state.targetTrail) {
          point.x *= scaleX
          point.y *= scaleY
        }
      } else {
        state.aimX = rect.width / 2
        state.aimY = rect.height / 2
        state.lastAimX = state.aimX
        state.lastAimY = state.aimY
      }

      state.canvasWidth = rect.width
      state.canvasHeight = rect.height
    }

    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()

    const render = (time: number) => {
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      const state = stateRef.current
      const radius = getTargetRadius(width, height)
      if (!state.lastFrame) state.lastFrame = time
      const rawDeltaMs = Math.max(0, time - state.lastFrame)
      const deltaMs = Math.min(250, rawDeltaMs)
      state.lastFrame = time

      ctx.fillStyle = '#0b0e14'
      ctx.fillRect(0, 0, width, height)
      ctx.strokeStyle = 'rgba(255,255,255,.035)'
      ctx.lineWidth = 1

      for (let x = 0; x < width; x += 42) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke()
      }
      for (let y = 0; y < height; y += 42) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke()
      }

      if (movingRef.current && !pausedRef.current) {
        state.trajectoryElapsedMs += deltaMs
        const target = sampleTargetTrajectory(trajectoryRef.current, state.trajectoryElapsedMs, width, height, radius)
        state.targetX = target.x
        state.targetY = target.y

        if (time - state.lastTrailSample >= 18) {
          state.targetTrail.push({ x: state.targetX, y: state.targetY, time })
          state.lastTrailSample = time
        }
      }

      if (scoringRef.current && !pausedRef.current) {
        state.diagnostics.frameCount += 1
        if (rawDeltaMs > LONG_FRAME_THRESHOLD_MS) state.diagnostics.longFrameCount += 1

        if (time - state.lastSample >= SAMPLE_INTERVAL_MS) {
          const sampleSeconds = state.lastSample ? Math.max(0.001, (time - state.lastSample) / 1000) : SAMPLE_INTERVAL_MS / 1000
          const distance = Math.hypot(state.aimX - state.targetX, state.aimY - state.targetY)
          const speed = Math.hypot(state.aimX - state.lastAimX, state.aimY - state.lastAimY) / sampleSeconds
          state.distances.push(distance)
          state.speeds.push(speed)
          state.lastAimX = state.aimX
          state.lastAimY = state.aimY
          state.lastSample = time

          if (time - state.lastMetricsUpdate >= METRICS_UPDATE_INTERVAL_MS) {
            const startIndex = Math.max(0, state.distances.length - 30)
            const sampleCount = state.distances.length - startIndex
            let hits = 0
            let errorSum = 0
            const speedChanges: number[] = []

            for (let index = startIndex; index < state.distances.length; index += 1) {
              if (state.distances[index] <= radius) hits += 1
              errorSum += state.distances[index]
              if (index > startIndex) speedChanges.push(Math.abs(state.speeds[index] - state.speeds[index - 1]))
            }

            speedChanges.sort((left, right) => left - right)
            const middle = Math.floor(speedChanges.length / 2)
            const robustChange = speedChanges.length === 0
              ? 0
              : speedChanges.length % 2
                ? speedChanges[middle]
                : (speedChanges[middle - 1] + speedChanges[middle]) / 2
            const accuracy = sampleCount > 0 ? hits / sampleCount * 100 : 0
            const meanError = sampleCount > 0 ? errorSum / sampleCount : 0
            const smoothness = Math.max(0, 100 * (1 - robustChange / (radius * SMOOTHNESS_SPEED_CHANGE_PER_RADIUS)))

            state.lastMetricsUpdate = time
            onMetricsRef.current({ accuracy, meanError, smoothness })
          }
        }
      }

      let activeTrailCount = 0
      for (let index = 0; index < state.targetTrail.length; index += 1) {
        if (time - state.targetTrail[index].time <= 360) {
          state.targetTrail[activeTrailCount] = state.targetTrail[index]
          activeTrailCount += 1
        }
      }
      state.targetTrail.length = activeTrailCount

      for (const point of state.targetTrail) {
        const life = 1 - (time - point.time) / 360
        ctx.fillStyle = `rgba(255,114,81,${Math.max(0, life) * 0.2})`
        ctx.beginPath(); ctx.arc(point.x, point.y, radius * (0.22 + life * 0.42), 0, Math.PI * 2); ctx.fill()
      }

      if (state.targetX > 0) {
        const glow = ctx.createRadialGradient(state.targetX, state.targetY, 0, state.targetX, state.targetY, radius * 2)
        glow.addColorStop(0, 'rgba(255,111,78,.28)')
        glow.addColorStop(1, 'rgba(255,111,78,0)')
        ctx.fillStyle = glow
        ctx.beginPath(); ctx.arc(state.targetX, state.targetY, radius * 2, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#ff7251'
        ctx.beginPath(); ctx.arc(state.targetX, state.targetY, radius, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,.72)'
        ctx.beginPath(); ctx.arc(state.targetX, state.targetY, radius * 0.27, 0, Math.PI * 2); ctx.fill()
      }

      if (activeRef.current) {
        const onTarget = Math.hypot(state.aimX - state.targetX, state.aimY - state.targetY) <= radius
        drawCrosshair(ctx, state.aimX, state.aimY, crosshairRef.current, onTarget ? '#8dfbd3' : '#f4f2eb')
      }

      animationFrame = requestAnimationFrame(render)
    }

    animationFrame = requestAnimationFrame(render)
    return () => {
      cancelAnimationFrame(animationFrame)
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    const state = stateRef.current
    const width = canvas?.clientWidth ?? 0
    const height = canvas?.clientHeight ?? 0
    const radius = getTargetRadius(width, height)
    const initialTarget = sampleTargetTrajectory(trajectoryRef.current, 0, width, height, radius)

    hasLockedThisRoundRef.current = false
    state.aimX = width / 2
    state.aimY = height / 2
    state.lastAimX = state.aimX
    state.lastAimY = state.aimY
    state.targetX = initialTarget.x
    state.targetY = initialTarget.y
    state.trajectoryElapsedMs = 0
    state.lastFrame = 0
    state.distances = []
    state.speeds = []
    state.lastSample = 0
    state.lastMetricsUpdate = 0
    state.targetTrail = []
    state.lastTrailSample = 0
    state.complete = false
    state.diagnostics = createDiagnostics(rawInputSupportedRef.current, coalescedInputSupportedRef.current)
    roundRemainingMsRef.current = ROUND_DURATION_MS
  }, [active, roundKey])

  useEffect(() => {
    if (!moving) return
    const state = stateRef.current
    state.trajectoryElapsedMs = 0
    state.lastFrame = 0
  }, [moving, roundKey])

  useEffect(() => {
    if (!scoring) return
    const state = stateRef.current
    state.trajectoryElapsedMs = ROUND_WARMUP * 1000
    state.distances = []
    state.speeds = []
    state.lastAimX = state.aimX
    state.lastAimY = state.aimY
    state.lastSample = 0
    state.lastMetricsUpdate = 0
    state.complete = false
  }, [scoring, roundKey])

  const finishRound = () => {
    const state = stateRef.current
    if (state.complete) return
    state.complete = true
    const radius = getTargetRadius(canvasRef.current?.clientWidth ?? 0, canvasRef.current?.clientHeight ?? 0)
    onCompleteRef.current({
      distances: [...state.distances],
      speeds: [...state.speeds],
      targetRadius: radius,
      diagnostics: { ...state.diagnostics },
    })
  }

  useEffect(() => {
    if (!scoring || paused) return
    const started = performance.now()
    const initialRemaining = roundRemainingMsRef.current
    const roundState = stateRef.current
    const timer = window.setTimeout(finishRound, initialRemaining)

    return () => {
      window.clearTimeout(timer)
      if (!roundState.complete) {
        roundRemainingMsRef.current = Math.max(0, initialRemaining - (performance.now() - started))
      }
    }
  }, [paused, roundKey, scoring])

  return (
    <div className="arena-wrap">
      <canvas ref={canvasRef} className="arena" tabIndex={0} onMouseDown={() => active && void requestStablePointerLock(canvasRef.current)} />
      {active ? (
        <div className="arena-hud" aria-live="polite">
          <div className="arena-hud-metrics">
            <div><span>{t('common.accuracy')}</span><strong>{hud.accuracy}<small>%</small></strong></div>
            <div><span>{t('common.meanError')}</span><strong>{hud.meanError}<small>px</small></strong></div>
            <div><span>{t('arena.testSensitivity')}</span><strong>{hud.sensitivity}</strong></div>
            <div><span>{t('common.time')}</span><strong>{hud.remaining}<small>s</small></strong></div>
          </div>
          <div className="arena-hud-round">
            <span>{t('arena.currentRound')}</span>
            <strong>{hud.round}<small>/ {hud.totalRounds}</small></strong>
          </div>
        </div>
      ) : null}

      {!active ? (
        <div className="arena-prompt">
          <span>{idleMessage ?? (isComplete ? t('arena.calibrationComplete') : hasResults ? t('arena.roundComplete') : t('arena.ready'))}</span>
          <small>{idleHint ?? (isComplete ? t('arena.allRounds') : hasResults ? t('arena.continueReady') : t('arena.startHint'))}</small>
          <div className="arena-controls">
            <button className="secondary-button" onClick={onReset}><RotateCcw size={16} /> {t('common.restart')}</button>
            {isComplete
              ? <button className="primary-button" onClick={onShowResults}>{t('arena.viewResult')}</button>
              : <button className="primary-button" onClick={onStart}><Play size={17} /> {hasResults ? t('arena.nextRound') : t('arena.startTest')}</button>}
          </div>
        </div>
      ) : null}

      {active && !scoring ? (
        <div className="arena-phase-overlay">
          <strong>{countdownLabel}</strong>
          <span>{t('arena.notScoring')}</span>
        </div>
      ) : null}

      {active && !pointerLocked ? (
        <button className="lock-prompt" onClick={() => void requestStablePointerLock(canvasRef.current)}>{t('arena.lockCursor')}</button>
      ) : null}
    </div>
  )
})
