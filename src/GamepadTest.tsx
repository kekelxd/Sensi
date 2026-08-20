import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Gamepad2, RotateCcw, Vibrate } from 'lucide-react'
import { clampAxis, circularityError, rawAxis, type StickPoint } from './gamepadMetrics'
import { useI18n } from './i18n'

type GamepadSnapshot = {
  index: number
  id: string
  connected: boolean
  timestamp: number
  axes: number[]
  buttons: Array<{ pressed: boolean, value: number }>
}

type StickName = 'left' | 'right'

const EMPTY_SNAPSHOT: GamepadSnapshot = { index: 0, id: '', connected: false, timestamp: 0, axes: [0, 0, 0, 0], buttons: [] }
const buttonValue = (gamepad: GamepadSnapshot, index: number) => gamepad.buttons[index]?.value ?? 0
const isPressed = (gamepad: GamepadSnapshot, index: number) => Boolean(gamepad.buttons[index]?.pressed || buttonValue(gamepad, index) > .5)

function snapshotGamepad(gamepad: Gamepad): GamepadSnapshot {
  return {
    index: gamepad.index,
    id: gamepad.id,
    connected: gamepad.connected,
    timestamp: gamepad.timestamp,
    axes: Array.from(gamepad.axes, rawAxis),
    buttons: Array.from(gamepad.buttons, (button) => ({ pressed: button.pressed, value: button.value })),
  }
}

function StickVisualizer({ name, x, y, points, error }: { name: StickName, x: number, y: number, points: StickPoint[], error: number | null }) {
  const { t } = useI18n()
  const label = name === 'left' ? 'LS' : 'RS'
  return (
    <section className="gamepad-stick-card">
      <div className="gamepad-stick-heading"><strong>{label}</strong><span>{name === 'left' ? t('gamepad.leftStick') : t('gamepad.rightStick')}</span></div>
      <div className="gamepad-stick-scope" aria-label={label}>
        <i className="gamepad-stick-center" />
        <svg viewBox="-1 -1 2 2" aria-hidden="true">
          {points.length > 1 && <polyline points={points.map((point) => `${point.x},${point.y}`).join(' ')} />}
        </svg>
        <b style={{ '--stick-x': clampAxis(x), '--stick-y': clampAxis(y) } as CSSProperties} />
      </div>
      <div className="gamepad-stick-values"><span>X <b>{rawAxis(x).toFixed(5)}</b></span><span>Y <b>{rawAxis(y).toFixed(5)}</b></span></div>
      <p>{t('gamepad.circularity')} <strong>{error === null ? '--' : `${error.toFixed(2)}%`}</strong></p>
    </section>
  )
}

function PadButton({ label, pressed, className = '' }: { label: string, pressed: boolean, className?: string }) {
  return <div className={`gamepad-button ${pressed ? 'active' : ''} ${className}`.trim()}>{label}</div>
}

export function GamepadTest({ embedded = false }: { embedded?: boolean }) {
  const { t } = useI18n()
  const [gamepads, setGamepads] = useState<GamepadSnapshot[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [leftPointsByPad, setLeftPointsByPad] = useState<Record<number, StickPoint[]>>({})
  const [rightPointsByPad, setRightPointsByPad] = useState<Record<number, StickPoint[]>>({})
  const activeIndexRef = useRef(activeIndex)

  useEffect(() => { activeIndexRef.current = activeIndex }, [activeIndex])

  useEffect(() => {
    let frame = 0
    const poll = () => {
      const next = Array.from(navigator.getGamepads?.() ?? []).filter((gamepad): gamepad is Gamepad => Boolean(gamepad?.connected)).map(snapshotGamepad)
      setGamepads(next)
      const selected = next.find((gamepad) => gamepad.index === activeIndexRef.current) ?? next[0]
      if (selected && selected.index !== activeIndexRef.current) setActiveIndex(selected.index)
      if (selected) {
        const left = { x: rawAxis(selected.axes[0]), y: rawAxis(selected.axes[1]) }
        const right = { x: rawAxis(selected.axes[2]), y: rawAxis(selected.axes[3]) }
        if (Math.hypot(left.x, left.y) > .08) setLeftPointsByPad((points) => ({ ...points, [selected.index]: [...(points[selected.index] ?? []).slice(-799), left] }))
        if (Math.hypot(right.x, right.y) > .08) setRightPointsByPad((points) => ({ ...points, [selected.index]: [...(points[selected.index] ?? []).slice(-799), right] }))
      }
      frame = window.requestAnimationFrame(poll)
    }
    const refresh = () => { frame ||= window.requestAnimationFrame(poll) }
    window.addEventListener('gamepadconnected', refresh)
    window.addEventListener('gamepaddisconnected', refresh)
    frame = window.requestAnimationFrame(poll)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('gamepadconnected', refresh)
      window.removeEventListener('gamepaddisconnected', refresh)
    }
  }, [])

  const active = gamepads.find((gamepad) => gamepad.index === activeIndex) ?? gamepads[0] ?? EMPTY_SNAPSHOT
  const leftX = rawAxis(active.axes[0])
  const leftY = rawAxis(active.axes[1])
  const rightX = rawAxis(active.axes[2])
  const rightY = rawAxis(active.axes[3])
  const leftPoints = leftPointsByPad[active.index] ?? []
  const rightPoints = rightPointsByPad[active.index] ?? []
  const leftError = circularityError(leftPoints)
  const rightError = circularityError(rightPoints)
  const pressedCount = active.buttons.filter((button) => button.pressed || button.value > .5).length

  const rumble = async () => {
    const original = navigator.getGamepads?.()[active.index] as (Gamepad & { vibrationActuator?: { playEffect?: (effect: 'dual-rumble', params: { duration: number, startDelay: number, strongMagnitude: number, weakMagnitude: number }) => Promise<unknown> } }) | null
    await original?.vibrationActuator?.playEffect?.('dual-rumble', { duration: 300, startDelay: 0, strongMagnitude: .8, weakMagnitude: .45 })
  }

  return (
    <section className={embedded ? 'gamepad-embedded' : 'gamepad-workspace'}>
      {!embedded && <header className="gamepad-heading">
        <div className="panel-label"><Gamepad2 size={15} /> {t('gamepad.diagnostics')}</div>
        <h1>{t('gamepad.title')}</h1>
        <p>{t('gamepad.subtitle')}</p>
      </header>}

      {!gamepads.length ? <div className="gamepad-empty"><Gamepad2 size={28} /><strong>{t('gamepad.waitingTitle')}</strong><span>{t('gamepad.waitingDescription')}</span></div> : <>
        <div className="gamepad-selector" role="tablist" aria-label={t('gamepad.connectedControllers')}>
          {gamepads.map((gamepad) => <button key={gamepad.index} role="tab" aria-selected={active.index === gamepad.index} className={active.index === gamepad.index ? 'active' : ''} onClick={() => setActiveIndex(gamepad.index)}>{t('gamepad.controller')} {gamepad.index + 1}</button>)}
        </div>

        <div className="gamepad-device-card">
          <div><span>{t('gamepad.controller')}</span><strong title={active.id}>{active.id || t('gamepad.unknown')}</strong></div>
          <div><span>{t('gamepad.index')}</span><strong>{active.index}</strong></div>
          <div><span>{t('gamepad.timestamp')}</span><strong>{active.timestamp.toFixed(2)} ms</strong></div>
          <div><span>{t('gamepad.status')}</span><strong className="connected">{t('gamepad.connected')}</strong></div>
          <button className="secondary-button gamepad-rumble" onClick={() => { void rumble() }} disabled={!active.connected}><Vibrate size={15} /> {t('gamepad.rumble')}</button>
        </div>

        <div className="gamepad-diagnostics-grid">
          <div className="gamepad-controller-shell">
            <div className="gamepad-trigger-row"><div><span>LT</span><i style={{ '--trigger-value': buttonValue(active, 6) } as CSSProperties} /></div><div><span>RT</span><i style={{ '--trigger-value': buttonValue(active, 7) } as CSSProperties} /></div></div>
            <div className="gamepad-bumper-row"><PadButton label="LB" pressed={isPressed(active, 4)} /><PadButton label="RB" pressed={isPressed(active, 5)} /></div>
            <div className="gamepad-controller-body">
              <div className="gamepad-dpad"><PadButton label="↑" pressed={isPressed(active, 12)} /><PadButton label="←" pressed={isPressed(active, 14)} /><PadButton label="→" pressed={isPressed(active, 15)} /><PadButton label="↓" pressed={isPressed(active, 13)} /></div>
              <div className="gamepad-center-buttons"><PadButton label="BACK" pressed={isPressed(active, 8)} /><PadButton label="HOME" pressed={isPressed(active, 16)} /><PadButton label="START" pressed={isPressed(active, 9)} /></div>
              <div className="gamepad-face-buttons"><PadButton label="Y" pressed={isPressed(active, 3)} /><PadButton label="X" pressed={isPressed(active, 2)} /><PadButton label="B" pressed={isPressed(active, 1)} /><PadButton label="A" pressed={isPressed(active, 0)} /></div>
              <div className="gamepad-stick-mini left" style={{ '--stick-x': clampAxis(leftX), '--stick-y': clampAxis(leftY) } as CSSProperties}><i /><span>L3</span><b className={isPressed(active, 10) ? 'active' : ''} /></div>
              <div className="gamepad-stick-mini right" style={{ '--stick-x': clampAxis(rightX), '--stick-y': clampAxis(rightY) } as CSSProperties}><i /><span>R3</span><b className={isPressed(active, 11) ? 'active' : ''} /></div>
            </div>
            <div className="gamepad-pressed-summary"><span>{t('gamepad.pressed')}</span><strong>{pressedCount} / {active.buttons.length}</strong></div>
          </div>

          <div className="gamepad-sticks-grid">
            <StickVisualizer name="left" x={leftX} y={leftY} points={leftPoints} error={leftError} />
            <StickVisualizer name="right" x={rightX} y={rightY} points={rightPoints} error={rightError} />
          </div>
        </div>

        <section className="gamepad-raw-values">
          <div className="report-section-heading"><div><Gamepad2 size={15} /> {t('gamepad.rawAxes')}</div><button className="secondary-button" onClick={() => { setLeftPointsByPad({}); setRightPointsByPad({}) }}><RotateCcw size={14} /> {t('gamepad.resetPath')}</button></div>
          <div>{active.axes.map((axis, index) => <span key={index}>AXIS {index}<b>{rawAxis(axis).toFixed(5)}</b></span>)}</div>
        </section>
      </>}
    </section>
  )
}
