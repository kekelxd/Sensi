import { useEffect, useRef, useState } from 'react'
import { Play, RotateCcw } from 'lucide-react'
import { getCanvasGain } from './aimModel'
import { flickTargetFor, isFlickHit, type TargetPoint } from './flickAcquisitionTest'
import { HYBRID_PHASES, phaseAt, phaseElapsedMs } from './hybridSensEngine'
import type { GameConfig } from './games'
import { requestStablePointerLock, sanitizePointerMovement } from './pointerInput'
import { stoppingTargetFor } from './stoppingPowerTest'
import type { FinderTelemetry, FinderTrial } from './useBinarySensSearch'

type Props = { game: GameConfig, sensitivity: number, trial: FinderTrial, round: number, onComplete: (telemetry: FinderTelemetry) => void, onExit: () => void }
type Point = TargetPoint
type StoppingState = { cycle: number, stopped: boolean, stopStartedAt: number, settled: boolean, lastSide: number, maxDistance: number }

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
const radiusFor = (width: number, height: number, phase: string) => Math.max(phase === 'flick' ? 15 : 24, Math.min(width, height) * (phase === 'flick' ? .027 : .045))

function trackingTargetFor(elapsedMs: number, width: number, height: number): Point {
  return { x: width / 2 + Math.sin(elapsedMs / 690) * width * .25 + Math.sin(elapsedMs / 290) * width * .06, y: height / 2 + Math.cos(elapsedMs / 820) * height * .21 + Math.sin(elapsedMs / 440) * height * .08 }
}

export function FinderCanvas({ game, sensitivity, trial, round, onComplete, onExit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [locked, setLocked] = useState(false)
  const [started, setStarted] = useState(false)
  const [remaining, setRemaining] = useState(trial.duration)
  const [phaseLabel, setPhaseLabel] = useState(HYBRID_PHASES[0].label)
  const phaseLabelRef = useRef(HYBRID_PHASES[0].label)
  const [readyTrialId, setReadyTrialId] = useState(trial.id)
  const callbackRef = useRef(onComplete)
  const lockedAtRef = useRef(0)
  const displayedRemainingRef = useRef(trial.duration)
  useEffect(() => { callbackRef.current = onComplete }, [onComplete])
  useEffect(() => { displayedRemainingRef.current = trial.duration; phaseLabelRef.current = HYBRID_PHASES[0].label; setRemaining(trial.duration); setPhaseLabel(HYBRID_PHASES[0].label) }, [trial.duration, trial.id])
  const isRoundTransition = started && readyTrialId !== trial.id

  useEffect(() => {
    if (!started || readyTrialId === trial.id) return
    const timer = window.setTimeout(() => setReadyTrialId(trial.id), 1_800)
    return () => window.clearTimeout(timer)
  }, [readyTrialId, started, trial.id])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let frame = 0; let lastFrame = 0; let elapsedMs = 0; let width = 0; let height = 0; let gain = .5
    let aim: Point = { x: 0, y: 0 }; let isLocked = document.pointerLockElement === canvas; let completed = false
    let flickIndex = 0; let flickVisibleAt = 0; let flickAttempts = 0; let flickHits = 0; let flickHitTimeSum = 0; let firstClickErrorSum = 0
    let stopping: StoppingState = { cycle: -1, stopped: false, stopStartedAt: 0, settled: false, lastSide: 0, maxDistance: 0 }
    let settlingSum = 0; let settlingSamples = 0; let overshootPixels = 0; let overshootOscillations = 0; let trackingTime = 0; let timeOnTarget = 0
    let movementSamples = 0; let speedSum = 0; let speedSquaredSum = 0; let jitterChanges = 0; let lastInputTimestamp = 0; let previousMove: Point | null = null
    const resize = () => {
      const rect = canvas.getBoundingClientRect(); const scale = window.devicePixelRatio || 1
      width = rect.width; height = rect.height; gain = getCanvasGain(game, sensitivity, 103, width) ?? .5
      canvas.width = Math.max(1, Math.round(width * scale)); canvas.height = Math.max(1, Math.round(height * scale)); canvas.getContext('2d')?.setTransform(scale, 0, 0, scale, 0, 0)
      if (!aim.x && !aim.y) aim = { x: width / 2, y: height / 2 }
    }
    resize()
    const observer = new ResizeObserver(resize); observer.observe(canvas)
    const currentTarget = (): Point => {
      const phase = phaseAt(elapsedMs); const localElapsed = phaseElapsedMs(elapsedMs, phase.id)
      if (phase.id === 'flick') return flickTargetFor(flickIndex, width, height)
      if (phase.id === 'stopping') return stoppingTargetFor(localElapsed, width, height)
      return trackingTargetFor(localElapsed, width, height)
    }
    const onLock = () => { isLocked = document.pointerLockElement === canvas; setLocked(isLocked); if (isLocked) lockedAtRef.current = performance.now() }
    const onMove = (event: PointerEvent) => {
      if (!isLocked || !started || isRoundTransition || completed) return
      const samples = event.getCoalescedEvents?.() || [event]
      for (const sample of samples) {
        const movement = sanitizePointerMovement({ movementX: sample.movementX, movementY: sample.movementY, gain, width, height, elapsedSinceLock: performance.now() - lockedAtRef.current })
        if (!movement) continue
        aim.x = clamp(aim.x + movement.x, 0, width); aim.y = clamp(aim.y + movement.y, 0, height)
        if (phaseAt(elapsedMs).id !== 'tracking') continue
        const timestamp = Number.isFinite(sample.timeStamp) ? sample.timeStamp : performance.now(); const delta = timestamp - lastInputTimestamp
        if (lastInputTimestamp && delta > 0 && delta <= 100) {
          const speed = Math.hypot(movement.x, movement.y) / delta
          if (speed > .01) {
            movementSamples += 1; speedSum += speed; speedSquaredSum += speed * speed
            if (previousMove && Math.hypot(previousMove.x, previousMove.y) < 4 && movement.x * previousMove.x + movement.y * previousMove.y < 0) jitterChanges += 1
            previousMove = movement
          }
        }
        lastInputTimestamp = timestamp
      }
    }
    const onClick = () => {
      if (!isLocked || !started || isRoundTransition || phaseAt(elapsedMs).id !== 'flick') return
      const target = currentTarget(); const radius = radiusFor(width, height, 'flick')
      flickAttempts += 1; firstClickErrorSum += Math.hypot(aim.x - target.x, aim.y - target.y)
      if (isFlickHit(aim, target, radius)) { flickHits += 1; flickHitTimeSum += Math.max(0, elapsedMs - flickVisibleAt) }
      flickIndex += 1; flickVisibleAt = elapsedMs
    }
    document.addEventListener('pointerlockchange', onLock)
    const eventName = 'onpointerrawupdate' in window ? 'pointerrawupdate' : 'pointermove'
    canvas.addEventListener(eventName, onMove as EventListener, { passive: true }); canvas.addEventListener('mousedown', onClick); onLock()
    const complete = () => {
      if (completed) return
      completed = true
      const meanSpeed = movementSamples ? speedSum / movementSamples : 0
      const deviation = movementSamples ? Math.sqrt(Math.max(0, speedSquaredSum / movementSamples - meanSpeed * meanSpeed)) : 0
      callbackRef.current({ timeToFirstHitMs: flickHits ? flickHitTimeSum / flickHits : 0, firstClickErrorPx: flickAttempts ? firstClickErrorSum / flickAttempts : 0, flickAttempts, flickHits, overshootPixels, overshootOscillations, settlingTimeMs: settlingSamples ? settlingSum / settlingSamples : 10_000, timeOnTargetPct: trackingTime ? timeOnTarget / trackingTime * 100 : 0, smoothnessIndex: meanSpeed ? clamp(100 - deviation / meanSpeed * 55, 0, 100) : 0, jitterVariance: movementSamples ? clamp(jitterChanges / movementSamples * 100, 0, 100) : 100 })
    }
    const draw = (now: number) => {
      const rect = canvas.getBoundingClientRect(); const ctx = canvas.getContext('2d')
      if (!ctx || !rect.width || !rect.height) return
      const running = started && !isRoundTransition && isLocked && !completed; const rawDelta = lastFrame ? Math.max(0, now - lastFrame) : 0; const delta = Math.min(250, rawDelta); lastFrame = now
      if (running) elapsedMs = Math.min(trial.duration * 1_000, elapsedMs + delta)
      const phase = phaseAt(elapsedMs); const localElapsed = phaseElapsedMs(elapsedMs, phase.id)
      if (phase.label !== phaseLabelRef.current) { phaseLabelRef.current = phase.label; setPhaseLabel(phase.label) }
      if (running) { const nextRemaining = Math.max(0, trial.duration - elapsedMs / 1_000); if (Math.abs(nextRemaining - displayedRemainingRef.current) >= .1) { displayedRemainingRef.current = nextRemaining; setRemaining(nextRemaining) } }
      if (phase.id === 'flick' && elapsedMs - flickVisibleAt > 1_250) { flickIndex += 1; flickVisibleAt = elapsedMs }
      const target = currentTarget(); const radius = radiusFor(rect.width, rect.height, phase.id); const distance = Math.hypot(aim.x - target.x, aim.y - target.y)
      if (running && phase.id === 'tracking') { trackingTime += delta; if (distance <= radius) timeOnTarget += delta }
      if (phase.id === 'stopping') {
        const stopTarget = stoppingTargetFor(localElapsed, rect.width, rect.height)
        if (stopTarget.cycle !== stopping.cycle) stopping = { cycle: stopTarget.cycle, stopped: false, stopStartedAt: 0, settled: false, lastSide: 0, maxDistance: 0 }
        if (stopTarget.stopped && !stopping.stopped) { stopping.stopped = true; stopping.stopStartedAt = elapsedMs }
        if (running && stopping.stopped) {
          const side = Math.sign(aim.x - target.x); stopping.maxDistance = Math.max(stopping.maxDistance, distance)
          if (stopping.lastSide && side && side !== stopping.lastSide) overshootOscillations += 1
          if (side) stopping.lastSide = side
          if (!stopping.settled && distance <= radius * .35) { stopping.settled = true; settlingSamples += 1; settlingSum += elapsedMs - stopping.stopStartedAt; overshootPixels += Math.max(0, stopping.maxDistance - radius * .35) }
        }
      }
      if (running && elapsedMs >= trial.duration * 1_000) { complete(); return }
      ctx.clearRect(0, 0, rect.width, rect.height); ctx.fillStyle = '#0a0d12'; ctx.fillRect(0, 0, rect.width, rect.height); ctx.strokeStyle = 'rgba(255,255,255,.035)'; ctx.lineWidth = 1
      for (let x = 0; x < rect.width; x += 46) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, rect.height); ctx.stroke() }
      for (let y = 0; y < rect.height; y += 46) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(rect.width, y); ctx.stroke() }
      ctx.beginPath(); ctx.arc(target.x, target.y, radius, 0, Math.PI * 2); ctx.fillStyle = phase.id === 'flick' ? 'rgba(255,193,91,.16)' : 'rgba(255,114,81,.16)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = phase.id === 'flick' ? '#ffc15b' : '#ff7251'; ctx.stroke()
      ctx.beginPath(); ctx.arc(target.x, target.y, 3, 0, Math.PI * 2); ctx.fillStyle = '#ffdf9f'; ctx.fill(); ctx.strokeStyle = '#8dfbd3'; ctx.lineWidth = 1.7
      ctx.beginPath(); ctx.moveTo(aim.x - 11, aim.y); ctx.lineTo(aim.x - 4, aim.y); ctx.moveTo(aim.x + 4, aim.y); ctx.lineTo(aim.x + 11, aim.y); ctx.moveTo(aim.x, aim.y - 11); ctx.lineTo(aim.x, aim.y - 4); ctx.moveTo(aim.x, aim.y + 4); ctx.lineTo(aim.x, aim.y + 11); ctx.stroke()
      frame = window.requestAnimationFrame(draw)
    }
    frame = window.requestAnimationFrame(draw)
    return () => { window.cancelAnimationFrame(frame); observer.disconnect(); document.removeEventListener('pointerlockchange', onLock); canvas.removeEventListener(eventName, onMove as EventListener); canvas.removeEventListener('mousedown', onClick) }
  }, [game, sensitivity, isRoundTransition, started, trial])

  const begin = async () => { const canvas = canvasRef.current; if (!canvas) return; await requestStablePointerLock(canvas); setStarted(true) }
  return <section className="finder-canvas-shell">
    <canvas ref={canvasRef} className="finder-canvas" onMouseDown={() => { if (started && !locked) void requestStablePointerLock(canvasRef.current) }} />
    <div className="finder-hud"><span>{trial.phase === 'bracket' ? 'DESCOBERTA' : trial.phase === 'adaptive' ? 'BUSCA ADAPTATIVA' : 'VALIDAÇÃO FINAL'}</span><strong>{phaseLabel}</strong><b>{remaining.toFixed(0)}s</b></div>
    {isRoundTransition && <div className="finder-round-transition"><span>PRÓXIMO ROUND</span><strong>{round}</strong><p>Prepare a mão. A próxima sequência começa em instantes.</p></div>}
    {!started && <div className="finder-canvas-prompt"><strong>Pronto para o teste cego</strong><span>Você fará micro-flick, frenagem e tracking. Os valores ficam ocultos durante todo o teste.</span><button className="primary-button" onClick={() => { void begin() }}><Play size={16} /> Iniciar teste</button><button className="secondary-button" onClick={onExit}><RotateCcw size={15} /> Sair</button></div>}
    {started && !locked && <div className="finder-lock-message">Clique na arena para restaurar a captura do mouse.</div>}
  </section>
}
