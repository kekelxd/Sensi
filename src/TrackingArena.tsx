import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Play, RotateCcw } from 'lucide-react'
import { ROUND_DURATION, SMOOTHNESS_SPEED_CHANGE_PER_RADIUS } from './calibration'

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
}

export type TrackingArenaHandle = {
  requestPointerLock: () => void
}

const ROUND_DURATION_MS = ROUND_DURATION * 1000
const SAMPLE_INTERVAL_MS = 40
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
const randomBetween = (min: number, max: number) => min + Math.random() * (max - min)
const getTargetRadius = (width: number, height: number) => Math.max(28, Math.min(width, height) * 0.055)

function getRandomTarget(width: number, height: number, radius: number) {
  return {
    x: randomBetween(radius * 1.8, Math.max(radius * 1.8, width - radius * 1.8)),
    y: randomBetween(radius * 1.8, Math.max(radius * 1.8, height - radius * 1.8)),
  }
}

function requestCanvasPointerLock(canvas: HTMLCanvasElement | null) {
  canvas?.focus({ preventScroll: true })
  const request = canvas?.requestPointerLock() as unknown as Promise<void> | undefined
  if (typeof request?.catch === 'function') {
    request.catch(() => {
      // The UI keeps showing the resume button when the browser denies pointer lock.
    })
  }

  const fullscreenTarget = canvas?.parentElement
  if (fullscreenTarget && !document.fullscreenElement) {
    const fullscreenRequest = fullscreenTarget.requestFullscreen?.({ navigationUI: 'hide' } as FullscreenOptions) as Promise<void> | undefined
    if (typeof fullscreenRequest?.catch === 'function') {
      fullscreenRequest.catch(() => {})
    }
  }
}

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
  { active, moving, scoring, paused, multiplier, targetSpeed, crosshair, countdownLabel, hasResults, isComplete, hud, onStart, onReset, onShowResults, onMetrics, onRoundComplete },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [pointerLocked, setPointerLocked] = useState(false)
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
    targetX: 0,
    targetY: 0,
    destinationX: 0,
    destinationY: 0,
    startTime: 0,
    lastFrame: 0,
    distances: [] as number[],
    speeds: [] as number[],
    lastAimX: 0,
    lastAimY: 0,
    lastSample: 0,
    complete: false,
  })

  useImperativeHandle(ref, () => ({
    requestPointerLock: () => {
      requestCanvasPointerLock(canvasRef.current)
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

    const updatePointerLock = () => setPointerLocked(document.pointerLockElement === canvas)
    const handleMove = (event: MouseEvent) => {
      if (!activeRef.current || pausedRef.current || document.pointerLockElement !== canvas) return
      const state = stateRef.current
      state.aimX = clamp(state.aimX + event.movementX * multiplierRef.current, 0, canvas.clientWidth)
      state.aimY = clamp(state.aimY + event.movementY * multiplierRef.current, 0, canvas.clientHeight)
    }

    document.addEventListener('pointerlockchange', updatePointerLock)
    document.addEventListener('mousemove', handleMove)
    updatePointerLock()
    return () => {
      document.removeEventListener('pointerlockchange', updatePointerLock)
      document.removeEventListener('mousemove', handleMove)
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let animationFrame = 0

    const resize = () => {
      const ratio = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * ratio
      canvas.height = rect.height * ratio
      const ctx = canvas.getContext('2d')
      ctx?.setTransform(ratio, 0, 0, ratio, 0, 0)
      const state = stateRef.current
      if (!state.aimX) {
        state.aimX = rect.width / 2
        state.aimY = rect.height / 2
        state.lastAimX = state.aimX
        state.lastAimY = state.aimY
      }
    }

    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()

    const render = (time: number) => {
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      const state = stateRef.current
      const radius = getTargetRadius(width, height)

      ctx.clearRect(0, 0, width, height)
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
        if (!state.lastFrame) state.lastFrame = time
        const deltaSeconds = Math.min(0.05, (time - state.lastFrame) / 1000)
        state.lastFrame = time
        if (!state.destinationX || !state.destinationY) {
          const destination = getRandomTarget(width, height, radius)
          state.destinationX = destination.x
          state.destinationY = destination.y
        }

        const dx = state.destinationX - state.targetX
        const dy = state.destinationY - state.targetY
        const distanceToDestination = Math.hypot(dx, dy)
        const targetVelocity = Math.min(width, height) * 0.32 * targetSpeedRef.current

        if (distanceToDestination <= Math.max(8, targetVelocity * deltaSeconds)) {
          state.targetX = state.destinationX
          state.targetY = state.destinationY
          const destination = getRandomTarget(width, height, radius)
          state.destinationX = destination.x
          state.destinationY = destination.y
        } else {
          const step = targetVelocity * deltaSeconds
          state.targetX += dx / distanceToDestination * step
          state.targetY += dy / distanceToDestination * step
        }

        if (scoringRef.current && time - state.lastSample > SAMPLE_INTERVAL_MS) {
          const sampleSeconds = state.lastSample ? Math.max(0.001, (time - state.lastSample) / 1000) : SAMPLE_INTERVAL_MS / 1000
          const distance = Math.hypot(state.aimX - state.targetX, state.aimY - state.targetY)
          const speed = Math.hypot(state.aimX - state.lastAimX, state.aimY - state.lastAimY) / sampleSeconds
          state.distances.push(distance)
          state.speeds.push(speed)
          state.lastAimX = state.aimX
          state.lastAimY = state.aimY
          state.lastSample = time
          const recentDistances = state.distances.slice(-30)
          const recentSpeeds = state.speeds.slice(-30)
          const accuracy = recentDistances.filter((value) => value <= radius).length / recentDistances.length * 100
          const meanError = recentDistances.reduce((sum, value) => sum + value, 0) / recentDistances.length
          const changes = recentSpeeds.slice(1).map((value, index) => Math.abs(value - recentSpeeds[index]))
          const averageChange = changes.reduce((sum, value) => sum + value, 0) / Math.max(1, changes.length)
          const smoothness = Math.max(0, 100 * (1 - averageChange / (radius * SMOOTHNESS_SPEED_CHANGE_PER_RADIUS)))
          onMetricsRef.current({ accuracy, meanError, smoothness })
        }
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
    if (active) {
      const canvas = canvasRef.current
      const state = stateRef.current
      const width = canvas?.clientWidth ?? 0
      const height = canvas?.clientHeight ?? 0
      state.aimX = width / 2
      state.aimY = height / 2
      state.targetX = width / 2
      state.targetY = height / 2
      const radius = getTargetRadius(width, height)
      const destination = getRandomTarget(width, height, radius)
      state.destinationX = destination.x
      state.destinationY = destination.y
      state.startTime = 0
      state.lastFrame = 0
      state.distances = []
      state.speeds = []
      state.lastSample = 0
      state.complete = false
      roundRemainingMsRef.current = ROUND_DURATION_MS
    }
  }, [active, multiplier])

  useEffect(() => {
    if (scoring) {
      const state = stateRef.current
      state.distances = []
      state.speeds = []
      state.lastAimX = state.aimX
      state.lastAimY = state.aimY
      state.lastSample = 0
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
      <canvas ref={canvasRef} className="arena" tabIndex={0} onMouseDown={() => active && requestCanvasPointerLock(canvasRef.current)} />
      {active && (
        <div className="arena-hud" aria-live="polite">
          <div className="arena-hud-metrics">
            <div><span>Precisão</span><strong>{hud.accuracy}<small>%</small></strong></div>
            <div><span>Erro médio</span><strong>{hud.meanError}<small>px</small></strong></div>
            <div><span>Sensi em teste</span><strong>{hud.sensitivity}</strong></div>
            <div><span>Tempo</span><strong>{hud.remaining}<small>s</small></strong></div>
          </div>
          <div className="arena-hud-round">
            <span>Rodada atual</span>
            <strong>{hud.round}<small>/ {hud.totalRounds}</small></strong>
          </div>
        </div>
      )}
      {!active && (
        <div className="arena-prompt">
          <span>{isComplete ? 'Calibração concluída' : hasResults ? 'Rodada concluída' : 'Tudo pronto para calibrar'}</span>
          <small>{isComplete ? 'As cinco rodadas foram registradas.' : hasResults ? 'Continue quando estiver preparado.' : 'Inicie o teste para preparar a primeira rodada.'}</small>
          <div className="arena-controls">
            <button className="secondary-button" onClick={onReset}><RotateCcw size={16} /> Reiniciar</button>
            {isComplete
              ? <button className="primary-button" onClick={onShowResults}>Ver resultado</button>
              : <button className="primary-button" onClick={onStart}><Play size={17} /> {hasResults ? 'Próxima rodada' : 'Iniciar teste'}</button>}
          </div>
        </div>
      )}
      {active && !scoring && (
        <div className="arena-phase-overlay">
          <strong>{countdownLabel}</strong>
          <span>A rodada ainda não está pontuando</span>
        </div>
      )}
      {active && !pointerLocked && (
        <button className="lock-prompt" onClick={() => requestCanvasPointerLock(canvasRef.current)}>Clique para travar o cursor</button>
      )}
    </div>
  )
})
