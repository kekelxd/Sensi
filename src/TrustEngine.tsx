import { useEffect, useRef, useState } from 'react'
import { Clipboard, LockKeyhole, Play, Ruler, ShieldCheck, X } from 'lucide-react'
import { getDegreesPerCount } from './aimModel'
import type { GameConfig } from './games'
import { useI18n } from './i18n'
import { requestStablePointerLock } from './pointerInput'
import { cmPer360FromSensitivity, countsPer360 } from './sensMath'
import { parsePositiveNumberInput } from './sensitivity'

type Props = { game: GameConfig, dpi: number, initialSensitivity: string, onClose: () => void }
const TEST_DURATION_MS = 15_000

export function TrustEngine({ game, dpi, initialSensitivity, onClose }: Props) {
  const { t } = useI18n()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [sensitivity, setSensitivity] = useState(initialSensitivity)
  const [started, setStarted] = useState(false)
  const [locked, setLocked] = useState(false)
  const [remaining, setRemaining] = useState(15)
  const [angle, setAngle] = useState(0)
  const [framePacing, setFramePacing] = useState<'waiting' | 'stable' | 'unstable'>('waiting')
  const [observedFps, setObservedFps] = useState(0)
  const parsedSensitivity = parsePositiveNumberInput(sensitivity)
  const cmPer360 = parsedSensitivity && game.yaw ? cmPer360FromSensitivity(parsedSensitivity, game.yaw, dpi) : null
  const expectedCounts = parsedSensitivity && game.yaw ? countsPer360(parsedSensitivity, game.yaw) : null
  const degreesPerCount = parsedSensitivity ? getDegreesPerCount(game, parsedSensitivity) : null
  const angleRef = useRef(0)

  useEffect(() => { angleRef.current = 0; setAngle(0) }, [game.id, sensitivity])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !started || !degreesPerCount) return
    let frame = 0
    let completed = false
    let elapsed = 0
    let lastFrame = 0
    let frameCount = 0
    let longFrames = 0
    let lastFpsUpdate = 0
    let isLocked = document.pointerLockElement === canvas
    const eventName = 'onpointerrawupdate' in window ? 'pointerrawupdate' : 'pointermove'

    const onLock = () => { isLocked = document.pointerLockElement === canvas; setLocked(isLocked) }
    const onMove = (event: PointerEvent) => {
      if (!isLocked) return
      const samples = event.getCoalescedEvents?.()
      for (const sample of samples && samples.length ? samples : [event]) {
        angleRef.current += sample.movementX * degreesPerCount
      }
      setAngle(angleRef.current)
    }
    const draw = (now: number) => {
      const rect = canvas.getBoundingClientRect()
      const ctx = canvas.getContext('2d')
      if (!ctx || !rect.width || !rect.height) return
      const scale = window.devicePixelRatio || 1
      if (canvas.width !== Math.round(rect.width * scale) || canvas.height !== Math.round(rect.height * scale)) {
        canvas.width = Math.round(rect.width * scale); canvas.height = Math.round(rect.height * scale); ctx.setTransform(scale, 0, 0, scale, 0, 0)
      }
      const rawDelta = lastFrame ? now - lastFrame : 0
      lastFrame = now
      if (isLocked && !completed) {
        elapsed += Math.min(250, Math.max(0, rawDelta))
        if (rawDelta > 0) { frameCount += 1; if (rawDelta > 25) longFrames += 1 }
        if (frameCount >= 60) setFramePacing(longFrames / frameCount <= .03 ? 'stable' : 'unstable')
        if (elapsed - lastFpsUpdate >= 500) { setObservedFps(Math.round(frameCount / Math.max(.001, elapsed / 1000))); lastFpsUpdate = elapsed }
        setRemaining(Math.max(0, (TEST_DURATION_MS - elapsed) / 1000))
        if (elapsed >= TEST_DURATION_MS) completed = true
      }
      const turns = angleRef.current / 360
      const normalized = ((angleRef.current % 360) + 360) % 360
      ctx.fillStyle = '#090c11'; ctx.fillRect(0, 0, rect.width, rect.height)
      ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = 1
      for (let x = 0; x < rect.width; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, rect.height); ctx.stroke() }
      for (let y = 0; y < rect.height; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(rect.width, y); ctx.stroke() }
      const centerX = rect.width / 2; const centerY = rect.height / 2; const radius = Math.min(rect.width, rect.height) * .23
      ctx.beginPath(); ctx.arc(centerX, centerY, radius, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(255,114,81,.32)'; ctx.lineWidth = 2; ctx.stroke()
      const radians = (normalized - 90) * Math.PI / 180
      ctx.beginPath(); ctx.moveTo(centerX, centerY); ctx.lineTo(centerX + Math.cos(radians) * radius, centerY + Math.sin(radians) * radius); ctx.strokeStyle = '#8dfbd3'; ctx.lineWidth = 3; ctx.stroke()
      ctx.beginPath(); ctx.arc(centerX, centerY, 6, 0, Math.PI * 2); ctx.fillStyle = '#ff7251'; ctx.fill()
      ctx.fillStyle = '#f2efe7'; ctx.font = '600 34px DM Mono, monospace'; ctx.textAlign = 'center'; ctx.fillText(`${turns.toFixed(2)}x`, centerX, centerY + radius + 58)
      ctx.fillStyle = '#89909b'; ctx.font = '500 10px DM Mono, monospace'; ctx.fillText(`${Math.round(angleRef.current)}°`, centerX, centerY + radius + 78)
      frame = requestAnimationFrame(draw)
    }
    document.addEventListener('pointerlockchange', onLock)
    canvas.addEventListener(eventName, onMove as EventListener, { passive: true })
    onLock(); frame = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(frame); document.removeEventListener('pointerlockchange', onLock); canvas.removeEventListener(eventName, onMove as EventListener) }
  }, [degreesPerCount, started])

  const start = () => {
    if (!degreesPerCount) return
    angleRef.current = 0; setAngle(0); setRemaining(15); setFramePacing('waiting'); setObservedFps(0); setStarted(true)
    requestAnimationFrame(() => { void requestStablePointerLock(canvasRef.current) })
  }
  const roundedTurns = angle / 360
  const withinOneTurn = Math.abs(roundedTurns - 1) <= .04
  const command = game.id === 'cs2' && parsedSensitivity ? `sensitivity ${parsedSensitivity.toFixed(3)}` : null
  const copy = async () => { if (command) await navigator.clipboard?.writeText(command) }

  return <div className="modal-backdrop trust-backdrop"><section className="modal trust-modal">
    <button className="modal-close" onClick={onClose} aria-label={t('common.close')}><X size={18} /></button>
    <ShieldCheck className="modal-icon" size={22} /><div className="panel-label">{t('trust.kicker')}</div><h2>{t('trust.title')}</h2><p>{t('trust.subtitle')}</p>
    <label>{t('trust.currentSensitivity')}<input value={sensitivity} inputMode="decimal" onChange={(event) => setSensitivity(event.target.value)} /></label>
    {cmPer360 !== null && expectedCounts !== null && <div className="trust-values"><div><Ruler size={15} /><span>{t('trust.distance')}</span><strong>{cmPer360.toFixed(2)} cm</strong></div><div><span>{t('trust.counts')}</span><strong>{Math.round(expectedCounts).toLocaleString()}</strong></div></div>}
    {!started ? <button className="primary-button wide" disabled={!degreesPerCount} onClick={() => void start()}><Play size={16} /> {t('trust.start')}</button> : <>
      <canvas ref={canvasRef} className="trust-canvas" onMouseDown={() => { if (!locked) void requestStablePointerLock(canvasRef.current) }} />
      <div className="trust-status-grid"><span><LockKeyhole size={13} /> {t('trust.pointerLock')} <b>{locked ? t('trust.active') : t('trust.waiting')}</b></span><span>{t('trust.rawInput')} <b>{t('trust.requested')}</b></span><span>{t('trust.framePacing')} <b>{t(`trust.${framePacing}` as 'trust.waiting')}{observedFps ? ` · ${observedFps} Hz` : ''}</b></span></div>
      <p className="trust-instruction">{t('trust.instruction', { distance: cmPer360?.toFixed(2) ?? '--' })}</p>
      {remaining <= 0 && <div className={`trust-result ${withinOneTurn ? 'pass' : 'retry'}`}><strong>{withinOneTurn ? t('trust.pass') : t('trust.retry')}</strong><span>{t('trust.turns', { turns: roundedTurns.toFixed(2) })}</span></div>}
    </>}
    <p className="trust-disclaimer">{t('trust.disclaimer')}</p>
    {command ? <div className="trust-command"><span>{t('trust.csCommand')}</span><code>{command}</code><button onClick={() => void copy()} aria-label={t('converter.copy')}><Clipboard size={14} /></button></div> : <p className="trust-game-note">{t('trust.gameNote', { game: game.label })}</p>}
  </section></div>
}
