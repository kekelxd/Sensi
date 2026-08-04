import { useEffect, useRef, useState } from 'react'
import { Mouse, RotateCcw } from 'lucide-react'

const BUTTONS = [
  { code: 0, label: 'Esquerdo', short: 'LMB' },
  { code: 1, label: 'Scroll', short: 'MMB' },
  { code: 2, label: 'Direito', short: 'RMB' },
  { code: 3, label: 'Voltar', short: 'M4' },
  { code: 4, label: 'Avançar', short: 'M5' },
]

type WheelDirection = 'up' | 'down' | null

export function MouseButtonTest() {
  const zoneRef = useRef<HTMLDivElement>(null)
  const wheelTimerRef = useRef<number | null>(null)
  const [pressed, setPressed] = useState<Set<number>>(() => new Set())
  const [counts, setCounts] = useState<Record<number, number>>({})
  const [wheelDirection, setWheelDirection] = useState<WheelDirection>(null)
  const [wheelCounts, setWheelCounts] = useState({ up: 0, down: 0 })

  useEffect(() => {
    const zone = zoneRef.current
    if (!zone) return

    const pressButton = (event: PointerEvent) => {
      if (event.pointerType && event.pointerType !== 'mouse') return
      event.preventDefault()
      zone.focus({ preventScroll: true })
      setPressed((current) => new Set(current).add(event.button))
      setCounts((current) => ({ ...current, [event.button]: (current[event.button] ?? 0) + 1 }))
    }
    const releaseButton = (event: PointerEvent) => {
      setPressed((current) => {
        const next = new Set(current)
        next.delete(event.button)
        return next
      })
    }
    const preventBrowserAction = (event: Event) => event.preventDefault()
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      const direction: Exclude<WheelDirection, null> = event.deltaY < 0 ? 'up' : 'down'
      setWheelDirection(direction)
      setWheelCounts((current) => ({ ...current, [direction]: current[direction] + 1 }))
      if (wheelTimerRef.current) window.clearTimeout(wheelTimerRef.current)
      wheelTimerRef.current = window.setTimeout(() => setWheelDirection(null), 180)
    }

    zone.addEventListener('pointerdown', pressButton)
    window.addEventListener('pointerup', releaseButton)
    zone.addEventListener('contextmenu', preventBrowserAction)
    zone.addEventListener('auxclick', preventBrowserAction)
    zone.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      zone.removeEventListener('pointerdown', pressButton)
      window.removeEventListener('pointerup', releaseButton)
      zone.removeEventListener('contextmenu', preventBrowserAction)
      zone.removeEventListener('auxclick', preventBrowserAction)
      zone.removeEventListener('wheel', handleWheel)
      if (wheelTimerRef.current) window.clearTimeout(wheelTimerRef.current)
    }
  }, [])

  const reset = () => {
    setPressed(new Set())
    setCounts({})
    setWheelCounts({ up: 0, down: 0 })
    setWheelDirection(null)
  }

  const activeLabels = BUTTONS.filter((button) => pressed.has(button.code)).map((button) => button.label)
  if (wheelDirection) activeLabels.push(wheelDirection === 'up' ? 'Scroll para cima' : 'Scroll para baixo')

  return (
    <section className="button-test-workspace">
      <div className="button-test-heading">
        <div className="panel-label"><Mouse size={15} /> Diagnóstico de cliques</div>
        <h1>Teste os botões do mouse</h1>
        <p>Clique dentro da área abaixo. Cada botão pressionado acende no desenho e incrementa seu contador.</p>
      </div>

      <div ref={zoneRef} className="button-test-zone" tabIndex={0} aria-label="Área de teste dos botões do mouse">
        <div className="mouse-visual" aria-hidden="true">
          <div className={pressed.has(0) ? 'mouse-key mouse-left active' : 'mouse-key mouse-left'}><span>LMB</span></div>
          <div className={pressed.has(2) ? 'mouse-key mouse-right active' : 'mouse-key mouse-right'}><span>RMB</span></div>
          <div className={pressed.has(1) ? 'mouse-wheel active' : 'mouse-wheel'}>
            <i className={wheelDirection === 'up' ? 'wheel-up active' : 'wheel-up'} />
            <b>MMB</b>
            <i className={wheelDirection === 'down' ? 'wheel-down active' : 'wheel-down'} />
          </div>
          <div className={pressed.has(3) ? 'mouse-side mouse-back active' : 'mouse-side mouse-back'}><span>M4</span></div>
          <div className={pressed.has(4) ? 'mouse-side mouse-forward active' : 'mouse-side mouse-forward'}><span>M5</span></div>
          <div className="mouse-palm"><Mouse size={42} /></div>
        </div>

        <div className={activeLabels.length ? 'pressed-status active' : 'pressed-status'}>
          <span>{activeLabels.length ? 'Pressionado agora' : 'Aguardando entrada'}</span>
          <strong>{activeLabels.join(' + ') || 'Clique ou role o mouse'}</strong>
        </div>
      </div>

      <div className="button-counters">
        {BUTTONS.map((button) => (
          <div key={button.code} className={pressed.has(button.code) ? 'active' : ''}>
            <span>{button.short}</span><strong>{counts[button.code] ?? 0}</strong><small>{button.label}</small>
          </div>
        ))}
        <div className={wheelDirection ? 'active' : ''}><span>WHEEL</span><strong>{wheelCounts.up + wheelCounts.down}</strong><small>Rolagens</small></div>
      </div>

      <button className="secondary-button button-test-reset" onClick={reset}><RotateCcw size={16} /> Zerar contadores</button>
    </section>
  )
}
