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

function XboxButton({ x, y, label, pressed, tone = 'neutral' }: { x: number, y: number, label: string, pressed: boolean, tone?: 'neutral' | 'a' | 'b' | 'x' | 'y' }) {
  return <g className={`xbox-button xbox-button-${tone} ${pressed ? 'active' : ''}`} transform={`translate(${x} ${y})`}>
    <circle r="20" />
    <text textAnchor="middle" dominantBaseline="central">{label}</text>
  </g>
}

function XboxStick({ x, y, label, pressed, axisX, axisY }: { x: number, y: number, label: string, pressed: boolean, axisX: number, axisY: number }) {
  return <g className={`xbox-stick ${pressed ? 'active' : ''}`} transform={`translate(${x} ${y})`}>
    <circle className="xbox-stick-ring" r="42" />
    <circle className="xbox-stick-cap" cx={clampAxis(axisX) * 10} cy={clampAxis(axisY) * 10} r="29" />
    <text textAnchor="middle" dominantBaseline="central">{label}</text>
  </g>
}

function XboxController({ gamepad, leftX, leftY, rightX, rightY }: { gamepad: GamepadSnapshot, leftX: number, leftY: number, rightX: number, rightY: number }) {
  return <svg className="xbox-controller" viewBox="0 0 720 430" role="img" aria-label="Xbox controller input layout">
    <defs>
      <linearGradient id="xbox-body" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#2a3440" /><stop offset=".55" stopColor="#151d27" /><stop offset="1" stopColor="#0c1118" /></linearGradient>
      <radialGradient id="xbox-stick" cx="35%" cy="28%"><stop stopColor="#3b4654" /><stop offset="1" stopColor="#10161e" /></radialGradient>
    </defs>
    <path className="xbox-body" d="M151 78C192 48 247 55 302 61C337 64 383 64 418 61C473 55 528 48 569 78C621 117 650 181 641 244L619 334C609 377 584 400 558 391C527 381 505 365 476 338H244C215 365 193 381 162 391C136 400 111 377 101 334L79 244C70 181 99 117 151 78Z" />
    <path className="xbox-top-seam" d="M158 80C205 98 221 115 231 139M562 80C515 98 499 115 489 139" />
    <rect className="xbox-trigger" x="104" y="22" width="130" height="31" rx="12" /><rect className="xbox-trigger-fill" x="104" y="22" width={130 * buttonValue(gamepad, 6)} height="31" rx="12" /><text className="xbox-trigger-label" x="169" y="42" textAnchor="middle">LT</text>
    <rect className="xbox-trigger" x="486" y="22" width="130" height="31" rx="12" /><rect className="xbox-trigger-fill" x="486" y="22" width={130 * buttonValue(gamepad, 7)} height="31" rx="12" /><text className="xbox-trigger-label" x="551" y="42" textAnchor="middle">RT</text>
    <rect className={`xbox-bumper ${isPressed(gamepad, 4) ? 'active' : ''}`} x="126" y="62" width="126" height="24" rx="10" /><text className="xbox-bumper-label" x="189" y="78" textAnchor="middle">LB</text>
    <rect className={`xbox-bumper ${isPressed(gamepad, 5) ? 'active' : ''}`} x="468" y="62" width="126" height="24" rx="10" /><text className="xbox-bumper-label" x="531" y="78" textAnchor="middle">RB</text>
    <circle className={`xbox-home ${isPressed(gamepad, 16) ? 'active' : ''}`} cx="360" cy="111" r="19" /><text className="xbox-home-mark" x="360" y="116" textAnchor="middle">⊙</text>
    <g className="xbox-menu-buttons"><rect className={`xbox-menu ${isPressed(gamepad, 8) ? 'active' : ''}`} x="313" y="145" width="32" height="19" rx="8" /><text x="329" y="158" textAnchor="middle">◫</text><rect className={`xbox-menu ${isPressed(gamepad, 9) ? 'active' : ''}`} x="375" y="145" width="32" height="19" rx="8" /><text x="391" y="158" textAnchor="middle">☰</text></g>
    <XboxStick x={220} y={172} label="L3" pressed={isPressed(gamepad, 10)} axisX={leftX} axisY={leftY} />
    <g className="xbox-dpad" transform="translate(0 -12)">
      <circle className="xbox-dpad-base" cx="273" cy="279" r="54" />
      <path className={isPressed(gamepad, 12) ? 'active' : ''} d="M256 228H290V262H256Z" /><path className={isPressed(gamepad, 14) ? 'active' : ''} d="M222 262H256V296H222Z" /><path className={isPressed(gamepad, 15) ? 'active' : ''} d="M290 262H324V296H290Z" /><path className={isPressed(gamepad, 13) ? 'active' : ''} d="M256 296H290V330H256Z" />
    </g>
    <XboxStick x={445} y={262} label="R3" pressed={isPressed(gamepad, 11)} axisX={rightX} axisY={rightY} />
    <XboxButton x={535} y={132} label="Y" tone="y" pressed={isPressed(gamepad, 3)} /><XboxButton x={503} y={164} label="X" tone="x" pressed={isPressed(gamepad, 2)} /><XboxButton x={567} y={164} label="B" tone="b" pressed={isPressed(gamepad, 1)} /><XboxButton x={535} y={196} label="A" tone="a" pressed={isPressed(gamepad, 0)} />
  </svg>
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
            <XboxController gamepad={active} leftX={leftX} leftY={leftY} rightX={rightX} rightY={rightY} />
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
