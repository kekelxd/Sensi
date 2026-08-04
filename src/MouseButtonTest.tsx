import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Keyboard, Mouse, RotateCcw } from 'lucide-react'
import { pressInput, releaseInput } from './inputState'
import { useI18n, type TranslationKey } from './i18n'

const BUTTONS = [
  { code: 0, mask: 1, label: 'mouse.left' as TranslationKey, short: 'LMB' },
  { code: 1, mask: 4, label: 'mouse.middle' as TranslationKey, short: 'MMB' },
  { code: 2, mask: 2, label: 'mouse.right' as TranslationKey, short: 'RMB' },
  { code: 3, mask: 8, label: 'mouse.back' as TranslationKey, short: 'M4' },
  { code: 4, mask: 16, label: 'mouse.forward' as TranslationKey, short: 'M5' },
]

type KeyboardKey = { code: string, label: string, width?: number }

const KEYBOARD_ROWS: KeyboardKey[][] = [
  [
    { code: 'Escape', label: 'Esc' },
    { code: 'F1', label: 'F1' }, { code: 'F2', label: 'F2' }, { code: 'F3', label: 'F3' }, { code: 'F4', label: 'F4' },
    { code: 'F5', label: 'F5' }, { code: 'F6', label: 'F6' }, { code: 'F7', label: 'F7' }, { code: 'F8', label: 'F8' },
    { code: 'F9', label: 'F9' }, { code: 'F10', label: 'F10' }, { code: 'F11', label: 'F11' }, { code: 'F12', label: 'F12' },
  ],
  [
    { code: 'Backquote', label: '`' }, { code: 'Digit1', label: '1' }, { code: 'Digit2', label: '2' }, { code: 'Digit3', label: '3' },
    { code: 'Digit4', label: '4' }, { code: 'Digit5', label: '5' }, { code: 'Digit6', label: '6' }, { code: 'Digit7', label: '7' },
    { code: 'Digit8', label: '8' }, { code: 'Digit9', label: '9' }, { code: 'Digit0', label: '0' }, { code: 'Minus', label: '-' },
    { code: 'Equal', label: '=' }, { code: 'Backspace', label: 'Backspace', width: 2 },
  ],
  [
    { code: 'Tab', label: 'Tab', width: 1.5 }, { code: 'KeyQ', label: 'Q' }, { code: 'KeyW', label: 'W' }, { code: 'KeyE', label: 'E' },
    { code: 'KeyR', label: 'R' }, { code: 'KeyT', label: 'T' }, { code: 'KeyY', label: 'Y' }, { code: 'KeyU', label: 'U' },
    { code: 'KeyI', label: 'I' }, { code: 'KeyO', label: 'O' }, { code: 'KeyP', label: 'P' }, { code: 'BracketLeft', label: '[' },
    { code: 'BracketRight', label: ']' }, { code: 'Backslash', label: '\\', width: 1.5 },
  ],
  [
    { code: 'CapsLock', label: 'Caps', width: 1.8 }, { code: 'KeyA', label: 'A' }, { code: 'KeyS', label: 'S' }, { code: 'KeyD', label: 'D' },
    { code: 'KeyF', label: 'F' }, { code: 'KeyG', label: 'G' }, { code: 'KeyH', label: 'H' }, { code: 'KeyJ', label: 'J' },
    { code: 'KeyK', label: 'K' }, { code: 'KeyL', label: 'L' }, { code: 'Semicolon', label: ';' }, { code: 'Quote', label: "'" },
    { code: 'Enter', label: 'Enter', width: 2.2 },
  ],
  [
    { code: 'ShiftLeft', label: 'Shift', width: 2.3 }, { code: 'KeyZ', label: 'Z' }, { code: 'KeyX', label: 'X' }, { code: 'KeyC', label: 'C' },
    { code: 'KeyV', label: 'V' }, { code: 'KeyB', label: 'B' }, { code: 'KeyN', label: 'N' }, { code: 'KeyM', label: 'M' },
    { code: 'Comma', label: ',' }, { code: 'Period', label: '.' }, { code: 'Slash', label: '/' }, { code: 'ShiftRight', label: 'Shift', width: 2.7 },
  ],
  [
    { code: 'ControlLeft', label: 'Ctrl', width: 1.4 }, { code: 'MetaLeft', label: 'Win', width: 1.2 }, { code: 'AltLeft', label: 'Alt', width: 1.2 },
    { code: 'Space', label: 'Espaço', width: 6.2 }, { code: 'AltRight', label: 'Alt Gr', width: 1.2 },
    { code: 'ArrowLeft', label: '←' }, { code: 'ArrowDown', label: '↓' }, { code: 'ArrowUp', label: '↑' }, { code: 'ArrowRight', label: '→' },
  ],
]

const KEY_LABELS = new Map(KEYBOARD_ROWS.flat().map((key) => [key.code, key.label]))
type TestDevice = 'mouse' | 'keyboard'
type WheelDirection = 'up' | 'down' | null

export function MouseButtonTest() {
  const { t } = useI18n()
  const zoneRef = useRef<HTMLDivElement>(null)
  const wheelTimerRef = useRef<number | null>(null)
  const mousePressedRef = useRef<Set<number>>(new Set())
  const keyboardPressedRef = useRef<Set<string>>(new Set())
  const [device, setDevice] = useState<TestDevice>('mouse')
  const [mousePressed, setMousePressed] = useState<Set<number>>(() => new Set())
  const [mouseCounts, setMouseCounts] = useState<Record<number, number>>({})
  const [keyboardPressed, setKeyboardPressed] = useState<Set<string>>(() => new Set())
  const [keyboardCounts, setKeyboardCounts] = useState<Record<string, number>>({})
  const [wheelDirection, setWheelDirection] = useState<WheelDirection>(null)
  const [wheelCounts, setWheelCounts] = useState({ up: 0, down: 0 })

  useEffect(() => {
    const zone = zoneRef.current
    if (!zone || device !== 'mouse') return

    const syncPressedButtons = (buttonsMask: number, countNewButtons: boolean) => {
      const next = new Set(BUTTONS.filter((button) => (buttonsMask & button.mask) !== 0).map((button) => button.code))
      if (countNewButtons) {
        const newButtons = [...next].filter((code) => !mousePressedRef.current.has(code))
        if (newButtons.length) {
          setMouseCounts((current) => {
            const updated = { ...current }
            for (const code of newButtons) updated[code] = (updated[code] ?? 0) + 1
            return updated
          })
        }
      }
      mousePressedRef.current = next
      setMousePressed(next)
    }
    const pressButton = (event: MouseEvent) => {
      event.preventDefault()
      zone.focus({ preventScroll: true })
      syncPressedButtons(event.buttons, true)
    }
    const releaseButton = (event: MouseEvent) => syncPressedButtons(event.buttons, false)
    const clearPressedButtons = () => syncPressedButtons(0, false)
    const preventBrowserAction = (event: Event) => event.preventDefault()
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      const direction: Exclude<WheelDirection, null> = event.deltaY < 0 ? 'up' : 'down'
      setWheelDirection(direction)
      setWheelCounts((current) => ({ ...current, [direction]: current[direction] + 1 }))
      if (wheelTimerRef.current) window.clearTimeout(wheelTimerRef.current)
      wheelTimerRef.current = window.setTimeout(() => setWheelDirection(null), 180)
    }

    zone.addEventListener('mousedown', pressButton)
    window.addEventListener('mouseup', releaseButton)
    window.addEventListener('blur', clearPressedButtons)
    zone.addEventListener('contextmenu', preventBrowserAction)
    zone.addEventListener('auxclick', preventBrowserAction)
    zone.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      zone.removeEventListener('mousedown', pressButton)
      window.removeEventListener('mouseup', releaseButton)
      window.removeEventListener('blur', clearPressedButtons)
      zone.removeEventListener('contextmenu', preventBrowserAction)
      zone.removeEventListener('auxclick', preventBrowserAction)
      zone.removeEventListener('wheel', handleWheel)
      if (wheelTimerRef.current) window.clearTimeout(wheelTimerRef.current)
      clearPressedButtons()
    }
  }, [device])

  useEffect(() => {
    const zone = zoneRef.current
    if (!zone || device !== 'keyboard') return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (document.activeElement !== zone) return
      event.preventDefault()
      const result = pressInput(keyboardPressedRef.current, event.code)
      keyboardPressedRef.current = result.pressed
      setKeyboardPressed(result.pressed)
      if (result.isNew) setKeyboardCounts((current) => ({ ...current, [event.code]: (current[event.code] ?? 0) + 1 }))
    }
    const handleKeyUp = (event: KeyboardEvent) => {
      const next = releaseInput(keyboardPressedRef.current, event.code)
      keyboardPressedRef.current = next
      setKeyboardPressed(next)
    }
    const clearPressedKeys = () => {
      keyboardPressedRef.current = new Set()
      setKeyboardPressed(new Set())
    }

    zone.focus({ preventScroll: true })
    window.addEventListener('keydown', handleKeyDown, true)
    window.addEventListener('keyup', handleKeyUp, true)
    window.addEventListener('blur', clearPressedKeys)
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
      window.removeEventListener('keyup', handleKeyUp, true)
      window.removeEventListener('blur', clearPressedKeys)
      clearPressedKeys()
    }
  }, [device])

  const selectDevice = (nextDevice: TestDevice) => {
    setDevice(nextDevice)
    window.requestAnimationFrame(() => zoneRef.current?.focus({ preventScroll: true }))
  }

  const reset = () => {
    if (device === 'mouse') {
      mousePressedRef.current = new Set()
      setMousePressed(new Set())
      setMouseCounts({})
      setWheelCounts({ up: 0, down: 0 })
      setWheelDirection(null)
    } else {
      keyboardPressedRef.current = new Set()
      setKeyboardPressed(new Set())
      setKeyboardCounts({})
    }
    zoneRef.current?.focus({ preventScroll: true })
  }

  const mouseLabels = BUTTONS.filter((button) => mousePressed.has(button.code)).map((button) => t(button.label))
  if (wheelDirection) mouseLabels.push(wheelDirection === 'up' ? t('buttons.scrollUp') : t('buttons.scrollDown'))
  const keyboardLabels = [...keyboardPressed].map((code) => code === 'Space' ? t('key.space') : KEY_LABELS.get(code) ?? code)
  const activeLabels = device === 'mouse' ? mouseLabels : keyboardLabels
  const keyboardTotal = Object.values(keyboardCounts).reduce((total, count) => total + count, 0)
  const testedKeys = Object.values(keyboardCounts).filter((count) => count > 0).length

  return (
    <section className="button-test-workspace">
      <div className="button-test-heading">
        <div className="panel-label">{device === 'mouse' ? <Mouse size={15} /> : <Keyboard size={15} />} {t('buttons.diagnostics')}</div>
        <h1>{t('buttons.title')}</h1>
        <p>{t('buttons.subtitle')}</p>
        <div className="input-device-toggle" role="tablist" aria-label={t('buttons.device')}>
          <button type="button" role="tab" aria-selected={device === 'mouse'} className={device === 'mouse' ? 'active' : ''} onClick={() => selectDevice('mouse')}><Mouse size={16} /> {t('buttons.mouse')}</button>
          <button type="button" role="tab" aria-selected={device === 'keyboard'} className={device === 'keyboard' ? 'active' : ''} onClick={() => selectDevice('keyboard')}><Keyboard size={16} /> {t('buttons.keyboard')}</button>
        </div>
      </div>

      <div
        ref={zoneRef}
        className={device === 'keyboard' ? 'button-test-zone keyboard-test-zone' : 'button-test-zone'}
        tabIndex={0}
        aria-label={device === 'mouse' ? t('buttons.mouseArea') : t('buttons.keyboardArea')}
        onMouseDown={() => device === 'keyboard' && zoneRef.current?.focus({ preventScroll: true })}
      >
        {device === 'mouse' ? (
          <div className="mouse-visual" aria-hidden="true">
            <div className={mousePressed.has(0) ? 'mouse-key mouse-left active' : 'mouse-key mouse-left'}><span>LMB</span></div>
            <div className={mousePressed.has(2) ? 'mouse-key mouse-right active' : 'mouse-key mouse-right'}><span>RMB</span></div>
            <div className={mousePressed.has(1) ? 'mouse-wheel active' : 'mouse-wheel'}>
              <i className={wheelDirection === 'up' ? 'wheel-up active' : 'wheel-up'} />
              <b>MMB</b>
              <i className={wheelDirection === 'down' ? 'wheel-down active' : 'wheel-down'} />
            </div>
            <div className={mousePressed.has(3) ? 'mouse-side mouse-back active' : 'mouse-side mouse-back'}><span>M4</span></div>
            <div className={mousePressed.has(4) ? 'mouse-side mouse-forward active' : 'mouse-side mouse-forward'}><span>M5</span></div>
            <div className="mouse-palm"><Mouse size={42} /></div>
          </div>
        ) : (
          <div className="keyboard-visual" aria-hidden="true">
            {KEYBOARD_ROWS.map((row, rowIndex) => (
              <div className="keyboard-row" key={rowIndex}>
                {row.map((key) => (
                  <div key={key.code} className={keyboardPressed.has(key.code) ? 'keyboard-key active' : 'keyboard-key'} style={{ '--key-width': key.width ?? 1 } as CSSProperties}>
                    <span>{key.code === 'Space' ? t('key.space') : key.label}</span>
                    {keyboardCounts[key.code] > 0 && <small>{keyboardCounts[key.code]}</small>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        <div className={activeLabels.length ? 'pressed-status active' : 'pressed-status'}>
          <span>{activeLabels.length ? t('buttons.pressedNow') : t('buttons.waiting')}</span>
          <strong>{activeLabels.join(' + ') || (device === 'mouse' ? t('buttons.mousePrompt') : t('buttons.keyboardPrompt'))}</strong>
        </div>
      </div>

      {device === 'mouse' ? (
        <div className="button-counters">
          {BUTTONS.map((button) => (
            <div key={button.code} className={mousePressed.has(button.code) ? 'active' : ''}>
              <span>{button.short}</span><strong>{mouseCounts[button.code] ?? 0}</strong><small>{t(button.label)}</small>
            </div>
          ))}
          <div className={wheelDirection ? 'active' : ''}><span>WHEEL</span><strong>{wheelCounts.up + wheelCounts.down}</strong><small>{t('buttons.scrolls')}</small></div>
        </div>
      ) : (
        <div className="button-counters keyboard-counters">
          <div><span>{t('buttons.coverage')}</span><strong>{testedKeys}</strong><small>{t('buttons.keysTested')}</small></div>
          <div><span>{t('buttons.actions')}</span><strong>{keyboardTotal}</strong><small>{t('buttons.totalRecorded')}</small></div>
          <div className={keyboardPressed.size > 1 ? 'active' : ''}><span>{t('buttons.simultaneous')}</span><strong>{keyboardPressed.size}</strong><small>{t('buttons.pressedCount')}</small></div>
        </div>
      )}

      <button className="secondary-button button-test-reset" onClick={reset}><RotateCcw size={16} /> {t('buttons.reset')}</button>
    </section>
  )
}
