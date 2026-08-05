import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Play, RotateCcw } from 'lucide-react'
import { ROUND_DURATION, SMOOTHNESS_SPEED_CHANGE_PER_RADIUS } from './calibration'
import { useI18n } from './i18n'
import { clampAimCoordinate, requestStablePointerLock, sanitizePointerMovement } from './pointerInput'

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
  targetSpeed: number
  crosshair: CrosshairStyle
  countdownLabel: string
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
  onRoundComplete: (distances: number[], speeds: number[], targetRadius: number) => void
  onPointerLockChange: (locked: boolean) => void
}

export type TrackingArenaHandle = {
  requestPointerLock: () => void
}

const ROUND_DURATION_MS = ROUND_DURATION * 1000
const SAMPLE_INTERVAL_MS = 40
const METRICS_UPDATE_INTERVAL_MS = 120
const TARGET_TURN_RATE = 6
const AIM_RENDER_RESPONSE = 70
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
const randomBetween = (min: number, max: number) => min + Math.random() * (max - min)
const getTargetRadius = (width: number, height: number) => Math.max(28, Math.min(width, height) * 0.055)

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
  { active, moving, scoring, paused, multiplier, targetSpeed, crosshair, countdownLabel, hasResults, isComplete, hud, onStart, onReset, onShowResults, onMetrics, onRoundComplete, onPointerLockChange },
  ref,
) {
  const { t } = useI18n()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  // Refs para bypass do React na atualização visual da HUD
  const accuracyRef = useRef<HTMLSpanElement>(null)
  const meanErrorRef = useRef<HTMLSpanElement>(null)
  
  const [pointerLocked, setPointerLocked] = useState(false)
  const pointerLockedAtRef = useRef(0)
  const activeRef = useRef(active)
  const movingRef = useRef(moving)
  const scoringRef = useRef(scoring)
  const pausedRef = useRef(paused)
  const multiplierRef = useRef(multiplier)
  const targetSpeedRef = useRef(targetSpeed)
  const crosshairRef = useRef(crosshair)
  const onMetricsRef = useRef(onMetrics)
  const onCompleteRef = useRef(onRoundComplete)
  const roundRemainingMsRef = useRef(ROUND_DURATION_MS)
  
  const stateRef = useRef({
    aimX: 0,
    aimY: 0,
    visualAimX: 0,
    visualAimY: 0,
    targetX: 0,
    targetY: 0,
    destinationX: 0,
    destinationY: 0,
    directionX: 0,
    directionY: 0,
    startTime: 0,
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
  useEffect(() => { targetSpeedRef.current = targetSpeed }, [targetSpeed])
  useEffect(() => { crosshairRef.current = crosshair }, [crosshair])
  useEffect(() => { onMetricsRef.current = onMetrics }, [onMetrics])
  useEffect(() => { onCompleteRef.current = onRoundComplete }, [onRoundComplete])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const updatePointerLock = () => {
      const locked = document.pointerLockElement === canvas
      if (locked) {
        const state = stateRef.current
        state.aimX = canvas.clientWidth / 2
        state.aimY = canvas.clientHeight / 2
        state.visualAimX = state.aimX
        state.visualAimY = state.aimY
        state.lastAimX = state.aimX
        state.lastAimY = state.aimY
        pointerLockedAtRef.current = performance.now()
      } else pointerLockedAtRef.current = 0
      setPointerLocked(locked)
      onPointerLockChange(locked)
    }

    const handlePointer = (event: PointerEvent) => {
      if (!activeRef.current || pausedRef.current || document.pointerLockElement !== canvas) return
      const state = stateRef.current
      
      // Otimização de Hardware: Coleta eventos agrupados de mouses de alto polling rate
      const coalesced = event.getCoalescedEvents?.() || [event]
      
      for (const ev of coalesced) {
        const movement = sanitizePointerMovement({
          movementX: ev.movementX,
          movementY: ev.movementY,
          gain: multiplierRef.current,
          width: canvas.clientWidth,
          height: canvas.clientHeight,
          elapsedSinceLock: performance.now() - pointerLockedAtRef.current,
        })
        if (!movement) continue
        state.aimX = clampAimCoordinate(state.aimX + movement.x, canvas.clientWidth)
        state.aimY = clampAimCoordinate(state.aimY + movement.y, canvas.clientHeight)
      }
    }

    // Otimização: Capturar dados brutos da porta USB ignorando V-Sync (onde suportado)
    const eventName = 'onpointerrawupdate' in window ? 'pointerrawupdate' : 'pointermove'

    document.addEventListener('pointerlockchange', updatePointerLock)
    document.addEventListener(eventName, handlePointer as EventListener, { passive: true })
    
    updatePointerLock()
    return () => {
      document.removeEventListener('pointerlockchange', updatePointerLock)
      document.removeEventListener(eventName, handlePointer as EventListener)
    }
  }, [onPointerLockChange])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let animationFrame = 0

    const resize = () => {
      const ratio = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * ratio
      canvas.height = rect.height * ratio
      
      // Otimização de Canvas: Desync para minimizar latência (onde suportado)
      const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true }) as CanvasRenderingContext2D
      ctx?.setTransform(ratio, 0, 0, ratio, 0, 0)
      
      const state = stateRef.current
      if (state.canvasWidth > 0 && state.canvasHeight > 0) {
        const scaleX = rect.width / state.canvasWidth
        const scaleY = rect.height / state.canvasHeight
        state.aimX *= scaleX
        state.aimY *= scaleY
        state.visualAimX *= scaleX
        state.visualAimY *= scaleY
        state.targetX *= scaleX
        state.targetY *= scaleY
        state.destinationX *= scaleX
        state.destinationY *= scaleY
        state.targetTrail = state.targetTrail.map((point) => ({ ...point, x: point.x * scaleX, y: point.y * scaleY }))
        state.aimX = clampAimCoordinate(state.aimX, rect.width)
        state.aimY = clampAimCoordinate(state.aimY, rect.height)
        state.visualAimX = clampAimCoordinate(state.visualAimX, rect.width)
        state.visualAimY = clampAimCoordinate(state.visualAimY, rect.height)
      } else {
        state.aimX = rect.width / 2
        state.aimY = rect.height / 2
        state.visualAimX = state.aimX
        state.visualAimY = state.aimY
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
      const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true }) as CanvasRenderingContext2D
      if (!ctx) return
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      const state = stateRef.current
      const radius = getTargetRadius(width, height)
      if (!state.lastFrame) state.lastFrame = time
      const deltaSeconds = Math.min(0.05, Math.max(0, (time - state.lastFrame) / 1000))
      state.lastFrame = time

      // Fundo opaco para melhorar tempo de composição GPU
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

      if (activeRef.current && !pausedRef.current) {
        const aimBlend = 1 - Math.exp(-AIM_RENDER_RESPONSE * deltaSeconds)
        state.visualAimX += (state.aimX - state.visualAimX) * aimBlend
        state.visualAimY += (state.aimY - state.visualAimY) * aimBlend
      }

      if (movingRef.current && !pausedRef.current) {
        if (!state.destinationX || !state.destinationY) {
          state.destinationX = randomBetween(radius * 1.8, Math.max(radius * 1.8, width - radius * 1.8))
          state.destinationY = randomBetween(radius * 1.8, Math.max(radius * 1.8, height - radius * 1.8))
        }

        const targetVelocity = Math.min(width, height) * 0.32 * targetSpeedRef.current
        let dx = state.destinationX - state.targetX
        let dy = state.destinationY - state.targetY
        let distanceToDestination = Math.hypot(dx, dy)

        if (distanceToDestination <= Math.max(radius * 0.65, targetVelocity * deltaSeconds * 2)) {
          // Otimização GC: Evita alocar objetos para novos destinos
          state.destinationX = randomBetween(radius * 1.8, Math.max(radius * 1.8, width - radius * 1.8))
          state.destinationY = randomBetween(radius * 1.8, Math.max(radius * 1.8, height - radius * 1.8))
          dx = state.destinationX - state.targetX
          dy = state.destinationY - state.targetY
          distanceToDestination = Math.hypot(dx, dy)
        }

        const desiredX = distanceToDestination ? dx / distanceToDestination : state.directionX
        const desiredY = distanceToDestination ? dy / distanceToDestination : state.directionY
        const turnBlend = 1 - Math.exp(-TARGET_TURN_RATE * deltaSeconds)
        let directionX = state.directionX + (desiredX - state.directionX) * turnBlend
        let directionY = state.directionY + (desiredY - state.directionY) * turnBlend
        const directionLength = Math.hypot(directionX, directionY) || 1
        directionX /= directionLength
        directionY /= directionLength
        state.directionX = directionX
        state.directionY = directionY

        const step = targetVelocity * deltaSeconds
        state.targetX = clamp(state.targetX + directionX * step, radius, width - radius)
        state.targetY = clamp(state.targetY + directionY * step, radius, height - radius)

        if (time - state.lastTrailSample >= 18) {
          state.targetTrail.push({ x: state.targetX, y: state.targetY, time })
          state.lastTrailSample = time
        }

        if (scoringRef.current && time - state.lastSample > SAMPLE_INTERVAL_MS) {
          const sampleSeconds = state.lastSample ? Math.max(0.001, (time - state.lastSample) / 1000) : SAMPLE_INTERVAL_MS / 1000
          const distance = Math.hypot(state.visualAimX - state.targetX, state.visualAimY - state.targetY)
          const speed = Math.hypot(state.visualAimX - state.lastAimX, state.visualAimY - state.lastAimY) / sampleSeconds
          state.distances.push(distance)
          state.speeds.push(speed)
          state.lastAimX = state.visualAimX
          state.lastAimY = state.visualAimY
          state.lastSample = time
          
          if (time - state.lastMetricsUpdate >= METRICS_UPDATE_INTERVAL_MS) {
            // Otimização GC: Calcula as métricas diretamente sobre o array existente sem invocar `.slice()`
            const startIdx = Math.max(0, state.distances.length - 30)
            const count = state.distances.length - startIdx
            let accHits = 0
            let meanSum = 0
            let speedChangeSum = 0

            for (let i = startIdx; i < state.distances.length; i++) {
              if (state.distances[i] <= radius) accHits++
              meanSum += state.distances[i]
              if (i > startIdx) {
                speedChangeSum += Math.abs(state.speeds[i] - state.speeds[i - 1])
              }
            }

            const accuracy = count > 0 ? (accHits / count) * 100 : 0
            const meanError = count > 0 ? meanSum / count : 0
            const averageChange = count > 1 ? speedChangeSum / (count - 1) : 0
            const smoothness = Math.max(0, 100 * (1 - averageChange / (radius * SMOOTHNESS_SPEED_CHANGE_PER_RADIUS)))

            state.lastMetricsUpdate = time
            onMetricsRef.current({ accuracy, meanError, smoothness })

            // Otimização DOM: Atualização visual imediata ignorando a Virtual Tree do React
            if (accuracyRef.current) accuracyRef.current.innerText = accuracy.toFixed(0)
            if (meanErrorRef.current) meanErrorRef.current.innerText = meanError.toFixed(0)
          }
        }
      }

      // Otimização GC: O Rastro reescreve os elementos sem criar novos Arrays e engasgar a CPU
      let activeTrailCount = 0
      for (let i = 0; i < state.targetTrail.length; i++) {
        if (time - state.targetTrail[i].time <= 360) {
          state.targetTrail[activeTrailCount++] = state.targetTrail[i]
        }
      }
      state.targetTrail.length = activeTrailCount

      for (let i = 0; i < state.targetTrail.length; i++) {
        const point = state.targetTrail[i]
        const life = 1 - (time - point.time) / 360
        ctx.fillStyle = `rgba(255,114,81,${Math.max(0, life) * 0.2})`
        ctx.beginPath(); ctx.arc(point.x, point.y, radius * (0.22 + life * 0.42), 0, Math.PI * 2); ctx.fill()
      }

      if (state.targetX) {
        const glow = ctx.createRadialGradient(state.targetX, state.targetY, 0, state.targetX, state.targetY, radius * 2)
        glow.addColorStop(0, 'rgba(255,111,78,.28)')
        glow.addColorStop(1, 'rgba(255,111,78,0)')
        ctx.fillStyle = glow
        ctx.beginPath(); ctx.arc(state.targetX, state.targetY, radius * 2, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#ff7251'
        ctx.beginPath(); ctx.arc(state.targetX, state.targetY, radius, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,.72)'
        ctx.beginPath(); ctx.arc(state.targetX, state.targetY, radius * .27, 0, Math.PI * 2); ctx.fill()
      }

      if (activeRef.current) {
        const onTarget = Math.hypot(state.visualAimX - state.targetX, state.visualAimY - state.targetY) <= radius
        drawCrosshair(ctx, state.visualAimX, state.visualAimY, crosshairRef.current, onTarget ? '#8dfbd3' : '#f4f2eb')
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
    if (active) {
      const canvas = canvasRef.current
      const state = stateRef.current
      const width = canvas?.clientWidth ?? 0
      const height = canvas?.clientHeight ?? 0
      state.aimX = width / 2
      state.aimY = height / 2
      state.visualAimX = state.aimX
      state.visualAimY = state.aimY
      state.targetX = width / 2
      state.targetY = height / 2
      const radius = getTargetRadius(width, height)
      
      state.destinationX = randomBetween(radius * 1.8, Math.max(radius * 1.8, width - radius * 1.8))
      state.destinationY = randomBetween(radius * 1.8, Math.max(radius * 1.8, height - radius * 1.8))
      const initialDistance = Math.hypot(state.destinationX - state.targetX, state.destinationY - state.targetY) || 1
      state.directionX = (state.destinationX - state.targetX) / initialDistance
      state.directionY = (state.destinationY - state.targetY) / initialDistance
      
      state.startTime = 0
      state.lastFrame = 0
      state.distances = []
      state.speeds = []
      state.lastSample = 0
      state.lastMetricsUpdate = 0
      state.targetTrail = []
      state.lastTrailSample = 0
      state.complete = false
      roundRemainingMsRef.current = ROUND_DURATION_MS
    }
  }, [active, multiplier])

  useEffect(() => {
    if (scoring) {
      const state = stateRef.current
      state.distances = []
      state.speeds = []
      state.lastAimX = state.visualAimX
      state.lastAimY = state.visualAimY
      state.lastSample = 0
      state.lastMetricsUpdate = 0
      state.complete = false
    }
  }, [scoring, multiplier])

  const finishRound = () => {
    const state = stateRef.current
    if (!state.complete) {
      state.complete = true
      const radius = getTargetRadius(canvasRef.current?.clientWidth ?? 0, canvasRef.current?.clientHeight ?? 0)
      onCompleteRef.current(state.distances, state.speeds, radius)
    }
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
  }, [scoring, paused, multiplier])

  return (
    <div className="arena-wrap">
      <canvas ref={canvasRef} className="arena" tabIndex={0} onMouseDown={() => active && void requestStablePointerLock(canvasRef.current)} />
      {active && (
        <div className="arena-hud" aria-live="polite">
          <div className="arena-hud-metrics">
            <div><span>{t('common.accuracy')}</span><strong><span ref={accuracyRef}>{hud.accuracy}</span><small>%</small></strong></div>
            <div><span>{t('common.meanError')}</span><strong><span ref={meanErrorRef}>{hud.meanError}</span><small>px</small></strong></div>
            <div><span>{t('arena.testSensitivity')}</span><strong>{hud.sensitivity}</strong></div>
            <div><span>{t('common.time')}</span><strong>{hud.remaining}<small>s</small></strong></div>
          </div>
          <div className="arena-hud-round">
            <span>{t('arena.currentRound')}</span>
            <strong>{hud.round}<small>/ {hud.totalRounds}</small></strong>
          </div>
        </div>
      )}
      {!active && (
        <div className="arena-prompt">
          <span>{isComplete ? t('arena.calibrationComplete') : hasResults ? t('arena.roundComplete') : t('arena.ready')}</span>
          <small>{isComplete ? t('arena.fiveRounds') : hasResults ? t('arena.continueReady') : t('arena.startHint')}</small>
          <div className="arena-controls">
            <button className="secondary-button" onClick={onReset}><RotateCcw size={16} /> {t('common.restart')}</button>
            {isComplete
              ? <button className="primary-button" onClick={onShowResults}>{t('arena.viewResult')}</button>
              : <button className="primary-button" onClick={onStart}><Play size={17} /> {hasResults ? t('arena.nextRound') : t('arena.startTest')}</button>}
          </div>
        </div>
      )}
      {active && !scoring && (
        <div className="arena-phase-overlay">
          <strong>{countdownLabel}</strong>
          <span>{t('arena.notScoring')}</span>
        </div>
      )}
      {active && !pointerLocked && (
        <button className="lock-prompt" onClick={() => void requestStablePointerLock(canvasRef.current)}>{t('arena.lockCursor')}</button>
      )}
    </div>
  )
})