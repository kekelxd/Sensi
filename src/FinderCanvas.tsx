import { useEffect, useRef, useState } from 'react'
import { Play, RotateCcw } from 'lucide-react'
import { getCanvasGain } from './aimModel'
import type { GameConfig } from './games'
import { requestStablePointerLock, sanitizePointerMovement } from './pointerInput'
import type { FinderTelemetry, FinderTrial } from './useBinarySensSearch'

type Props = {
  game: GameConfig
  sensitivity: number
  trial: FinderTrial
  round: number
  onComplete: (telemetry: FinderTelemetry) => void
  onExit: () => void
}

type Point = { x: number, y: number }
const radiusFor = (width: number, height: number) => Math.max(26, Math.min(width, height) * .047)
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

function targetFor(elapsed: number, width: number, height: number, tactical: boolean): Point {
  const centerX = width / 2
  const centerY = height / 2
  if (tactical) {
    const step = Math.floor(elapsed / 1300)
    const positions = [[-.34, -.22], [.28, -.17], [-.18, .25], [.31, .19], [0, -.31]]
    const [x, y] = positions[step % positions.length]
    return { x: centerX + x * width, y: centerY + y * height }
  }
  return {
    x: centerX + Math.sin(elapsed / 740) * width * .27 + Math.sin(elapsed / 320) * width * .07,
    y: centerY + Math.cos(elapsed / 880) * height * .24 + Math.sin(elapsed / 470) * height * .08,
  }
}

export function FinderCanvas({ game, sensitivity, trial, round, onComplete, onExit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [locked, setLocked] = useState(false)
  const [started, setStarted] = useState(false)
  const [remaining, setRemaining] = useState(trial.duration)
  const [readyTrialId, setReadyTrialId] = useState(trial.id)
  const callbackRef = useRef(onComplete)
  const lockedAtRef = useRef(0)
  const displayedRemainingRef = useRef(trial.duration)
  useEffect(() => { callbackRef.current = onComplete }, [onComplete])
  useEffect(() => {
    displayedRemainingRef.current = trial.duration
    setRemaining(trial.duration)
  }, [trial.duration, trial.id])
  const isRoundTransition = started && readyTrialId !== trial.id

  useEffect(() => {
    if (!started || readyTrialId === trial.id) return
    const timer = window.setTimeout(() => setReadyTrialId(trial.id), 1800)
    return () => window.clearTimeout(timer)
  }, [readyTrialId, started, trial.id])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let frame = 0
    let lastFrame = 0
    let elapsedMs = 0
    let lastInputTimestamp = 0
    let hasInput = false
    let lastRelative: Point | null = null
    let timeOnTarget = 0
    let totalTime = 0
    let overshoots = 0
    let jitterChanges = 0
    let movementSamples = 0
    let completed = false
    let speedSum = 0
    let speedSquaredSum = 0
    let previousMoveX = 0
    let previousMoveY = 0
    let hasPreviousMove = false
    let hasLocked = false
    let locked = document.pointerLockElement === canvas
    let width = 0
    let height = 0
    let gain = .5
    let aim = { x: 0, y: 0 }

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const scale = window.devicePixelRatio || 1
      width = rect.width
      height = rect.height
      gain = getCanvasGain(game, sensitivity, 103, width) ?? .5
      canvas.width = Math.max(1, Math.round(rect.width * scale))
      canvas.height = Math.max(1, Math.round(rect.height * scale))
      const ctx = canvas.getContext('2d')
      ctx?.setTransform(scale, 0, 0, scale, 0, 0)
      if (!aim.x && !aim.y) aim = { x: rect.width / 2, y: rect.height / 2 }
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)

    const onLock = () => {
      const isLocked = document.pointerLockElement === canvas
      locked = isLocked
      setLocked(isLocked)
      if (isLocked) {
        lockedAtRef.current = performance.now()
        if (!hasLocked) {
          aim = { x: width / 2, y: height / 2 }
          hasLocked = true
        }
      }
    }
    const onMove = (event: PointerEvent) => {
      if (!locked || !started || isRoundTransition) return
      const inputEvents = event.getCoalescedEvents?.()
      const samples = inputEvents && inputEvents.length ? inputEvents : [event]
      for (const sample of samples) {
        const movement = sanitizePointerMovement({ movementX: sample.movementX, movementY: sample.movementY, gain, width, height, elapsedSinceLock: performance.now() - lockedAtRef.current })
        if (!movement) continue
        aim.x = clamp(aim.x + movement.x, 0, width)
        aim.y = clamp(aim.y + movement.y, 0, height)

        const timestamp = Number.isFinite(sample.timeStamp) ? sample.timeStamp : performance.now()
        if (hasInput) {
          const delta = timestamp - lastInputTimestamp
          if (delta > 0 && delta <= 100) {
            const speed = Math.hypot(movement.x, movement.y) / delta
            if (speed > .01) {
              speedSum += speed
              speedSquaredSum += speed * speed
              movementSamples += 1
              if (hasPreviousMove && Math.hypot(previousMoveX, previousMoveY) < 4 && movement.x * previousMoveX + movement.y * previousMoveY < 0) jitterChanges += 1
              previousMoveX = movement.x
              previousMoveY = movement.y
              hasPreviousMove = true
            }
          }
        }
        hasInput = true
        lastInputTimestamp = timestamp

        const target = targetFor(elapsedMs, width, height, game.id === 'cs2' || game.id === 'valorant')
        const relative = { x: aim.x - target.x, y: aim.y - target.y }
        const radius = radiusFor(width, height)
        if (lastRelative && Math.hypot(lastRelative.x, lastRelative.y) > radius * .45 && lastRelative.x * relative.x + lastRelative.y * relative.y < -radius * radius * .16) overshoots += 1
        lastRelative = relative
      }
    }
    document.addEventListener('pointerlockchange', onLock)
    const eventName = 'onpointerrawupdate' in window ? 'pointerrawupdate' : 'pointermove'
    canvas.addEventListener(eventName, onMove as EventListener, { passive: true })
    onLock()

    const draw = (now: number) => {
      const rect = canvas.getBoundingClientRect()
      const ctx = canvas.getContext('2d')
      if (!ctx || !rect.width || !rect.height) return
      const running = started && !isRoundTransition && locked
      const rawDelta = lastFrame ? Math.max(0, now - lastFrame) : 0
      const delta = Math.min(250, rawDelta)
      lastFrame = now
      if (running) elapsedMs = Math.min(trial.duration * 1000, elapsedMs + delta)
      const elapsed = elapsedMs
      if (running) {
        const nextRemaining = Math.max(0, trial.duration - elapsed / 1000)
        if (Math.abs(nextRemaining - displayedRemainingRef.current) >= .1) {
          displayedRemainingRef.current = nextRemaining
          setRemaining(nextRemaining)
        }
      }
      const target = targetFor(elapsed, rect.width, rect.height, game.id === 'cs2' || game.id === 'valorant')
      const radius = radiusFor(rect.width, rect.height)
      if (running && delta > 0) {
        totalTime += delta
        const distance = Math.hypot(aim.x - target.x, aim.y - target.y)
        if (distance <= radius) timeOnTarget += delta
        if (!completed && elapsed >= trial.duration * 1000) {
          completed = true
          const meanSpeed = movementSamples ? speedSum / movementSamples : 0
          const deviation = movementSamples ? Math.sqrt(Math.max(0, speedSquaredSum / movementSamples - meanSpeed * meanSpeed)) : 0
          const smoothness = meanSpeed ? clamp(100 - deviation / meanSpeed * 55, 0, 100) : 0
          const jitter = movementSamples ? clamp(jitterChanges / movementSamples * 100, 0, 100) : 100
          callbackRef.current({
            timeOnTarget: totalTime ? timeOnTarget / totalTime * 100 : 0,
            smoothness,
            jitter,
            overshoots,
            meanSpeed: meanSpeed * 1000,
            stability: smoothness,
          })
          return
        }
      }

      ctx.clearRect(0, 0, rect.width, rect.height)
      ctx.fillStyle = '#0a0d12'; ctx.fillRect(0, 0, rect.width, rect.height)
      ctx.strokeStyle = 'rgba(255,255,255,.035)'; ctx.lineWidth = 1
      for (let x = 0; x < rect.width; x += 46) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, rect.height); ctx.stroke() }
      for (let y = 0; y < rect.height; y += 46) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(rect.width, y); ctx.stroke() }
      ctx.beginPath(); ctx.arc(target.x, target.y, radius, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,114,81,.16)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#ff7251'; ctx.stroke()
      ctx.beginPath(); ctx.arc(target.x, target.y, 3, 0, Math.PI * 2); ctx.fillStyle = '#ffad95'; ctx.fill()
      ctx.strokeStyle = '#8dfbd3'; ctx.lineWidth = 1.7
      ctx.beginPath(); ctx.moveTo(aim.x - 11, aim.y); ctx.lineTo(aim.x - 4, aim.y); ctx.moveTo(aim.x + 4, aim.y); ctx.lineTo(aim.x + 11, aim.y); ctx.moveTo(aim.x, aim.y - 11); ctx.lineTo(aim.x, aim.y - 4); ctx.moveTo(aim.x, aim.y + 4); ctx.lineTo(aim.x, aim.y + 11); ctx.stroke()
      frame = window.requestAnimationFrame(draw)
    }
    frame = window.requestAnimationFrame(draw)
    return () => { window.cancelAnimationFrame(frame); observer.disconnect(); document.removeEventListener('pointerlockchange', onLock); canvas.removeEventListener(eventName, onMove as EventListener) }
  }, [game, sensitivity, isRoundTransition, started, trial])

  const begin = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    await requestStablePointerLock(canvas)
    setStarted(true)
  }

  return <section className="finder-canvas-shell">
    <canvas ref={canvasRef} className="finder-canvas" onMouseDown={() => { if (started && !locked) void requestStablePointerLock(canvasRef.current) }} />
    <div className="finder-hud"><span>{trial.phase === 'bracket' ? 'DESCOBERTA' : trial.phase === 'adaptive' ? 'BUSCA ADAPTATIVA' : 'VALIDAÇÃO FINAL'}</span><strong>{trial.variant === 'final' ? 'FINAL' : `VARIANTE ${trial.variant}`}</strong><b>{remaining.toFixed(0)}s</b></div>
    {isRoundTransition && <div className="finder-round-transition"><span>PRÓXIMO ROUND</span><strong>{round}</strong><p>Prepare a mão. O próximo alvo começa em instantes.</p></div>}
    {!started && <div className="finder-canvas-prompt"><strong>Pronto para o teste cego</strong><span>Mantenha o alvo sob a mira. Os valores ficam ocultos durante todo o teste.</span><button className="primary-button" onClick={() => { void begin() }}><Play size={16} /> Iniciar teste</button><button className="secondary-button" onClick={onExit}><RotateCcw size={15} /> Sair</button></div>}
    {started && !locked && <div className="finder-lock-message">Clique na arena para restaurar a captura do mouse.</div>}
  </section>
}
