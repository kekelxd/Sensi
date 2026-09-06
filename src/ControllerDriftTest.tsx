import { useEffect, useRef, useState, type RefObject } from 'react'
import { Gamepad2, RotateCcw, TriangleAlert } from 'lucide-react'
import { analyzeDriftCollection, DRIFT_MOVEMENT_THRESHOLD, stickMagnitude, type DriftCollectionResult, type StickDriftStats } from './controllerDriftMetrics'
import { rawAxis, type StickPoint } from './gamepadMetrics'
import { selectActiveGamepad, subscribeGamepads, type GamepadSnapshot } from './gamepadInput'
import { useI18n } from './i18n'

const DRIFT_COUNTDOWN_MS = 3000
const DRIFT_SAMPLE_MS = 4000

type DriftPhase = 'waiting_for_controller' | 'ready' | 'countdown' | 'measuring' | 'completed' | 'invalid'
type LiveStick = { x: number; y: number; magnitude: number }
const EMPTY_LIVE: LiveStick = { x: 0, y: 0, magnitude: 0 }
const STICK_CLICK_BUTTONS = new Set([10, 11])

function isStartTriggerDown(gamepad: GamepadSnapshot) {
  return gamepad.buttons.some((button, index) => !STICK_CLICK_BUTTONS.has(index) && (button.pressed || button.value > .5))
}

function drawStick(canvas: HTMLCanvasElement | null, x: number, y: number) {
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  const ratio = window.devicePixelRatio || 1
  const width = Math.max(1, rect.width)
  const height = Math.max(1, rect.height)
  if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
    canvas.width = Math.round(width * ratio)
    canvas.height = Math.round(height * ratio)
  }
  const context = canvas.getContext('2d')
  if (!context) return
  context.setTransform(ratio, 0, 0, ratio, 0, 0)
  context.clearRect(0, 0, width, height)
  const size = Math.min(width, height)
  const centerX = width / 2
  const centerY = height / 2
  const radius = size * 0.39
  context.strokeStyle = 'rgba(255,255,255,.08)'
  context.lineWidth = 1
  for (const scale of [.33, .66, 1]) {
    context.beginPath(); context.arc(centerX, centerY, radius * scale, 0, Math.PI * 2); context.stroke()
  }
  context.beginPath(); context.moveTo(centerX - radius, centerY); context.lineTo(centerX + radius, centerY); context.moveTo(centerX, centerY - radius); context.lineTo(centerX, centerY + radius); context.stroke()
  const pointX = centerX + Math.max(-1, Math.min(1, x)) * radius
  const pointY = centerY + Math.max(-1, Math.min(1, y)) * radius
  context.strokeStyle = 'rgba(141,251,211,.38)'
  context.beginPath(); context.moveTo(centerX, centerY); context.lineTo(pointX, pointY); context.stroke()
  context.fillStyle = '#ff7251'
  context.shadowColor = 'rgba(255,114,81,.45)'
  context.shadowBlur = 12
  context.beginPath(); context.arc(pointX, pointY, 6, 0, Math.PI * 2); context.fill()
  context.shadowBlur = 0
}

function StickPanel({ side, canvasRef, live, result }: { side: 'left' | 'right'; canvasRef: RefObject<HTMLCanvasElement | null>; live: LiveStick; result: StickDriftStats | null }) {
  const { t } = useI18n()
  const data = result ? { x: result.meanX, y: result.meanY, magnitude: result.medianMagnitude } : live
  return <section className="drift-stick-panel">
    <header><strong>{side === 'left' ? t('drift.leftStick') : t('drift.rightStick')}</strong><span>{side === 'left' ? 'LS' : 'RS'}</span></header>
    <canvas ref={canvasRef} aria-label={side === 'left' ? t('drift.leftGraph') : t('drift.rightGraph')} />
    <div className="drift-live-values">
      <span>X<b>{data.x >= 0 ? '+' : ''}{data.x.toFixed(4)}</b></span>
      <span>Y<b>{data.y >= 0 ? '+' : ''}{data.y.toFixed(4)}</b></span>
      <span>{t('drift.magnitude')}<b>{(data.magnitude * 100).toFixed(2)}%</b></span>
    </div>
    <div className="drift-result-values">
      <div><span>{t('drift.centerOffsetLabel')}</span><b>{result ? `${(result.medianMagnitude * 100).toFixed(2)}%` : '--'}</b></div>
      <div><span>{t('drift.peak')}</span><b>{result ? `${(result.peakMagnitude * 100).toFixed(2)}%` : '--'}</b></div>
      <div><span>{t('drift.centerStability')}</span><b>{result ? `${result.centerStability.toFixed(1)}%` : '--'}</b></div>
    </div>
  </section>
}

export function ControllerDriftTest() {
  const { t } = useI18n()
  const leftCanvasRef = useRef<HTMLCanvasElement>(null)
  const rightCanvasRef = useRef<HTMLCanvasElement>(null)
  const selectedIndexRef = useRef(0)
  const phaseRef = useRef<DriftPhase>('waiting_for_controller')
  const countdownEndsRef = useRef(0)
  const measurementStartedRef = useRef(0)
  const leftSamplesRef = useRef<StickPoint[]>([])
  const rightSamplesRef = useRef<StickPoint[]>([])
  const deviceSignatureRef = useRef('')
  const lastUiUpdateRef = useRef(0)
  const lastProgressUpdateRef = useRef(0)
  const startTriggerWasDownRef = useRef(false)
  const [phase, setPhase] = useState<DriftPhase>('waiting_for_controller')
  const [gamepads, setGamepads] = useState<GamepadSnapshot[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [countdown, setCountdown] = useState(3)
  const [progress, setProgress] = useState(0)
  const [leftLive, setLeftLive] = useState<LiveStick>(EMPTY_LIVE)
  const [rightLive, setRightLive] = useState<LiveStick>(EMPTY_LIVE)
  const [result, setResult] = useState<DriftCollectionResult | null>(null)

  useEffect(() => { selectedIndexRef.current = selectedIndex }, [selectedIndex])
  useEffect(() => {
    drawStick(leftCanvasRef.current, 0, 0)
    drawStick(rightCanvasRef.current, 0, 0)
    return subscribeGamepads((next, frameTime) => {
      const signature = next.map((gamepad) => `${gamepad.index}:${gamepad.id}`).join('|')
      if (signature !== deviceSignatureRef.current) {
        deviceSignatureRef.current = signature
        setGamepads(next)
      }
      const active = selectActiveGamepad(next, selectedIndexRef.current)
      if (!active) {
        startTriggerWasDownRef.current = false
        drawStick(leftCanvasRef.current, 0, 0)
        drawStick(rightCanvasRef.current, 0, 0)
        if (phaseRef.current !== 'waiting_for_controller') {
          phaseRef.current = 'waiting_for_controller'
          setPhase('waiting_for_controller')
          setResult(null)
        }
        return
      }
      if (active.index !== selectedIndexRef.current) {
        selectedIndexRef.current = active.index
        setSelectedIndex(active.index)
      }
      const left = { x: rawAxis(active.axes[0]), y: rawAxis(active.axes[1]) }
      const right = { x: rawAxis(active.axes[2]), y: rawAxis(active.axes[3]) }
      const leftMagnitude = stickMagnitude(left.x, left.y)
      const rightMagnitude = stickMagnitude(right.x, right.y)
      drawStick(leftCanvasRef.current, left.x, left.y)
      drawStick(rightCanvasRef.current, right.x, right.y)

      if (frameTime - lastUiUpdateRef.current >= 100) {
        setLeftLive({ ...left, magnitude: leftMagnitude })
        setRightLive({ ...right, magnitude: rightMagnitude })
        lastUiUpdateRef.current = frameTime
      }

      const startTriggerDown = isStartTriggerDown(active)
      if (phaseRef.current === 'waiting_for_controller') {
        startTriggerWasDownRef.current = startTriggerDown
        phaseRef.current = 'ready'
        setPhase('ready')
        return
      }
      if (phaseRef.current === 'ready') {
        if (startTriggerDown && !startTriggerWasDownRef.current) {
          leftSamplesRef.current = []
          rightSamplesRef.current = []
          setResult(null)
          setProgress(0)
          setCountdown(3)
          countdownEndsRef.current = performance.now() + DRIFT_COUNTDOWN_MS
          phaseRef.current = 'countdown'
          setPhase('countdown')
        }
        startTriggerWasDownRef.current = startTriggerDown
        return
      }
      startTriggerWasDownRef.current = startTriggerDown

      if (phaseRef.current === 'countdown') {
        const remaining = Math.max(0, countdownEndsRef.current - performance.now())
        if (frameTime - lastProgressUpdateRef.current >= 100) {
          setCountdown(Math.max(1, Math.ceil(remaining / 1000)))
          lastProgressUpdateRef.current = frameTime
        }
        if (remaining <= 0) {
          leftSamplesRef.current = []
          rightSamplesRef.current = []
          measurementStartedRef.current = performance.now()
          phaseRef.current = 'measuring'
          setPhase('measuring')
        }
        return
      }

      if (phaseRef.current !== 'measuring') return
      leftSamplesRef.current.push(left)
      rightSamplesRef.current.push(right)
      if (leftMagnitude > DRIFT_MOVEMENT_THRESHOLD || rightMagnitude > DRIFT_MOVEMENT_THRESHOLD) {
        phaseRef.current = 'invalid'
        setPhase('invalid')
        setResult(null)
        return
      }
      const elapsed = performance.now() - measurementStartedRef.current
      if (frameTime - lastProgressUpdateRef.current >= 100) {
        setProgress(Math.min(100, elapsed / DRIFT_SAMPLE_MS * 100))
        lastProgressUpdateRef.current = frameTime
      }
      if (elapsed >= DRIFT_SAMPLE_MS) {
        const nextResult = analyzeDriftCollection(leftSamplesRef.current, rightSamplesRef.current)
        setResult(nextResult)
        phaseRef.current = nextResult.valid ? 'completed' : 'invalid'
        setPhase(phaseRef.current)
        setProgress(100)
      }
    })
  }, [])

  const measureAgain = () => {
    if (!gamepads.length) return
    leftSamplesRef.current = []
    rightSamplesRef.current = []
    setResult(null)
    setProgress(0)
    setCountdown(3)
    countdownEndsRef.current = performance.now() + DRIFT_COUNTDOWN_MS
    phaseRef.current = 'countdown'
    setPhase('countdown')
  }

  const active = selectActiveGamepad(gamepads, selectedIndex)
  const leftResult = result?.valid ? result.left : null
  const rightResult = result?.valid ? result.right : null
  const message = phase === 'countdown' ? t('drift.release') : phase === 'measuring' ? t('drift.doNotTouch') : phase === 'completed' ? t('drift.complete') : phase === 'invalid' ? t('drift.invalid') : t('drift.pressAnyButton')

  return <section className="diagnostic-tool-workspace drift-workspace">
    <header className="diagnostic-tool-heading">
      <div className="panel-label"><Gamepad2 size={15} /> {t('drift.diagnostics')}</div>
      <h1>{t('drift.title')}</h1>
      <p>{t('drift.subtitle')}</p>
    </header>

    {!active ? <div className="gamepad-empty drift-empty" aria-live="polite"><Gamepad2 size={28} /><strong>{t('drift.noController')}</strong><span>{t('drift.connectPrompt')}</span></div> : <>
      <div className="drift-device-row">
        <div><span>{t('drift.detected')}</span><strong title={active.id}>{active.id || t('gamepad.unknown')}</strong></div>
        {gamepads.length > 1 && <div className="gamepad-selector" role="tablist" aria-label={t('gamepad.connectedControllers')}>{gamepads.map((gamepad) => <button type="button" role="tab" aria-selected={gamepad.index === active.index} className={gamepad.index === active.index ? 'active' : ''} key={gamepad.index} onClick={() => setSelectedIndex(gamepad.index)}>{t('gamepad.controller')} {gamepad.index + 1}</button>)}</div>}
        {(phase === 'completed' || phase === 'invalid') && <button type="button" className="primary-button" onClick={measureAgain}><RotateCcw size={16} />{t('drift.again')}</button>}
      </div>

      {phase === 'ready' ? <section className="drift-ready-callout" aria-live="polite">
        <div className="drift-ready-icon" aria-hidden="true"><Gamepad2 size={21} /></div>
        <div>
          <span>{t('drift.readyLabel')}</span>
          <strong>{t('drift.readyTitle')}</strong>
          <p>{t('drift.readyDescription')}</p>
        </div>
      </section> : <>
        <div className={`drift-status ${phase}`} aria-live="polite">
          {phase === 'invalid' && <TriangleAlert size={17} />}
          <strong>{message}{phase === 'countdown' && <b>{countdown}</b>}</strong>
          <span>{t('drift.restWindow')}</span>
        </div>
        <div className="diagnostic-progress"><i style={{ width: `${progress}%` }} /></div>
      </>}

      <div className="drift-sticks-grid">
        <StickPanel side="left" canvasRef={leftCanvasRef} live={leftLive} result={leftResult} />
        <StickPanel side="right" canvasRef={rightCanvasRef} live={rightLive} result={rightResult} />
      </div>

      {result?.valid && <div className="drift-summary">
        {([['left', leftResult], ['right', rightResult]] as const).map(([side, stats]) => stats && <div key={side}><span>{side === 'left' ? t('drift.leftStick') : t('drift.rightStick')}</span><strong>{t(`drift.${stats.classification}` as 'drift.low' | 'drift.moderate' | 'drift.high')}</strong><small>{t('drift.dominantAxis')}: {t(`drift.axis.${stats.dominantAxis}` as 'drift.axis.x' | 'drift.axis.y' | 'drift.axis.balanced')}</small></div>)}
      </div>}
    </>}
    <p className="diagnostic-disclaimer">{t('drift.disclaimer')}</p>
  </section>
}
