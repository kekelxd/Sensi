import { useEffect, useRef } from 'react'
import { Activity, ArrowRight, CheckCircle2, CircleAlert, Crosshair, Flame, Gamepad2, Gauge, Keyboard, Lightbulb, LineChart, LockKeyhole, Mouse, MousePointer2, ShieldCheck, Target, TimerReset, type LucideIcon } from 'lucide-react'
import { useI18n } from './i18n'

export type HomeDestination = 'calibration' | 'warmup' | 'buttons'

type Props = { onNavigate: (destination: HomeDestination) => void }

function GridshotPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    let animationFrame = 0
    let width = 0
    let height = 0
    let dpr = 1
    let needsResize = true
    const targets = [
      { x: 0.24, y: 0.30 },
      { x: 0.74, y: 0.27 },
      { x: 0.56, y: 0.70 },
      { x: 0.32, y: 0.62 },
    ]

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const nextDpr = Math.min(window.devicePixelRatio || 1, 1.5)
      const nextWidth = Math.max(1, Math.floor(rect.width))
      const nextHeight = Math.max(1, Math.floor(rect.height))
      if (nextWidth === width && nextHeight === height && nextDpr === dpr) return
      dpr = nextDpr
      width = nextWidth
      height = nextHeight
      canvas.width = Math.floor(nextWidth * nextDpr)
      canvas.height = Math.floor(nextHeight * nextDpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const drawGrid = (time: number) => {
      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = '#07090c'
      ctx.fillRect(0, 0, width, height)

      const offset = (time * 0.012) % 38
      ctx.strokeStyle = 'rgba(255,255,255,.045)'
      ctx.lineWidth = 1
      for (let x = -offset; x < width; x += 38) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
      }
      for (let y = -offset; y < height; y += 38) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }

      const gradient = ctx.createRadialGradient(width * .55, height * .5, 8, width * .55, height * .5, width * .45)
      gradient.addColorStop(0, 'rgba(255,48,74,.16)')
      gradient.addColorStop(1, 'rgba(255,48,74,0)')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)
    }

    const drawTarget = (x: number, y: number, radius: number, alpha: number) => {
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.strokeStyle = '#ff304a'
      ctx.lineWidth = 2
      ctx.shadowColor = 'rgba(255,48,74,.52)'
      ctx.shadowBlur = 18
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = '#ff304a'
      ctx.beginPath()
      ctx.arc(x, y, radius * .32, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    const drawCrosshair = (x: number, y: number) => {
      ctx.save()
      ctx.strokeStyle = '#8dfbd3'
      ctx.lineWidth = 2
      ctx.shadowColor = 'rgba(141,251,211,.55)'
      ctx.shadowBlur = 7
      ctx.beginPath()
      ctx.moveTo(x - 13, y)
      ctx.lineTo(x + 13, y)
      ctx.moveTo(x, y - 13)
      ctx.lineTo(x, y + 13)
      ctx.stroke()
      ctx.restore()
    }

    const drawImpact = (x: number, y: number, progress: number) => {
      const alpha = Math.max(0, 1 - progress)
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.strokeStyle = '#ff304a'
      ctx.lineWidth = 2
      ctx.shadowColor = 'rgba(255,48,74,.7)'
      ctx.shadowBlur = 16
      ctx.beginPath()
      ctx.arc(x, y, 22 + progress * 28, 0, Math.PI * 2)
      ctx.stroke()
      for (let i = 0; i < 8; i += 1) {
        const angle = (Math.PI * 2 * i) / 8
        const inner = 18 + progress * 18
        const outer = 34 + progress * 42
        ctx.beginPath()
        ctx.moveTo(x + Math.cos(angle) * inner, y + Math.sin(angle) * inner)
        ctx.lineTo(x + Math.cos(angle) * outer, y + Math.sin(angle) * outer)
        ctx.stroke()
      }
      ctx.restore()
    }

    const render = (time: number) => {
      if (needsResize) {
        needsResize = false
        resize()
      }
      drawGrid(time)
      const cycle = 1180
      const raw = time / cycle
      const index = Math.floor(raw) % targets.length
      const previous = targets[(index + targets.length - 1) % targets.length]
      const current = targets[index]
      const local = raw - Math.floor(raw)
      const travel = Math.min(1, local / .42)
      const ease = 1 - Math.pow(1 - travel, 3)
      const targetX = current.x * width
      const targetY = current.y * height
      const crossX = (previous.x + (current.x - previous.x) * ease) * width
      const crossY = (previous.y + (current.y - previous.y) * ease) * height
      const hitProgress = local > .52 && local < .82 ? (local - .52) / .3 : -1
      const targetAlpha = hitProgress >= 0 ? Math.max(0, 1 - hitProgress * 1.5) : 1
      const radius = 34 + (hitProgress > 0 ? hitProgress * 6 : Math.sin(time * .006) * 2)

      drawTarget(targetX, targetY, radius, targetAlpha)
      if (hitProgress >= 0) drawImpact(targetX, targetY, hitProgress)
      drawCrosshair(crossX, crossY)
      animationFrame = window.requestAnimationFrame(render)
    }

    const handleResize = () => {
      needsResize = true
    }
    resize()
    window.addEventListener('resize', handleResize, { passive: true })
    animationFrame = window.requestAnimationFrame(render)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.cancelAnimationFrame(animationFrame)
    }
  }, [])

  return <div className="home-gridshot-preview" aria-hidden="true">
    <canvas ref={canvasRef} className="home-gridshot-canvas" />
    <span className="home-gridshot-noise" />
    <div className="home-gridshot-hud">
      <small>GRIDSHOT</small>
      <strong>+128</strong>
      <span>target chain</span>
    </div>
    <div className="home-gridshot-feed">
      <span />
      <span />
      <span />
      <span />
    </div>
  </div>
}

export function Home({ onNavigate }: Props) {
  const { t } = useI18n()
  const method: Array<{ icon: LucideIcon, title: string, description: string }> = [
    { icon: MousePointer2, title: t('home.simpleSetupTitle'), description: t('home.simpleSetupDescription') },
    { icon: Activity, title: t('home.simpleMeasureTitle'), description: t('home.simpleMeasureDescription') },
    { icon: LineChart, title: t('home.simpleCompareTitle'), description: t('home.simpleCompareDescription') },
  ]
  const tools: Array<{ id: HomeDestination, icon: LucideIcon, title: string, description: string, action: string }> = [
    { id: 'calibration', icon: Crosshair, title: t('home.calibrationTitle'), description: t('home.simpleCalibrationDescription'), action: t('home.calibrationAction') },
    { id: 'warmup', icon: Flame, title: t('home.warmupTitle'), description: t('home.simpleWarmupDescription'), action: t('home.warmupAction') },
    { id: 'buttons', icon: Mouse, title: t('home.diagnosticsTitle'), description: t('home.simpleDiagnosticsDescription'), action: t('home.diagnosticsAction') },
  ]
  const benefits: Array<{ icon: LucideIcon, title: string, description: string, visual?: 'comparison' }> = [
    { icon: CheckCircle2, title: t('home.benefitLessGuessTitle'), description: t('home.benefitLessGuessDescription'), visual: 'comparison' },
    { icon: Lightbulb, title: t('home.benefitUnderstandTitle'), description: t('home.benefitUnderstandDescription') },
    { icon: TimerReset, title: t('home.benefitReadyTitle'), description: t('home.benefitReadyDescription') },
  ]

  return <section className="home-v2-workspace home-awwwards">
    <section className="home-v2-hero">
      <div className="home-v2-hero-copy">
        <h1><span>{t('home.aimLineOne')}</span><strong>{t('home.aimLineTwo')}</strong><span>{t('home.aimLineThree')}</span></h1>
        <p>{t('home.simpleHeroDescription')}</p>
        <div className="home-aim-actions">
          <button className="home-aim-primary" onClick={() => onNavigate('calibration')}><Target size={17} /> {t('home.primaryAction')}</button>
          <button className="home-aim-secondary" onClick={() => onNavigate('warmup')}><span /> {t('home.aimWarmupBadge')}</button>
        </div>
        <div className="home-aim-proof"><span><ShieldCheck size={15} /> {t('home.simpleLocal')}</span><span><Activity size={15} /> {t('home.simpleGuided')}</span></div>
      </div>
      <div className="home-hero-stage">
        <GridshotPreview />
        <div className="home-live-panel home-live-panel-score"><small>ACCURACY</small><strong>92</strong><span>clean hits</span></div>
        <div className="home-live-panel home-live-panel-error"><small>PACE</small><strong>0.41s</strong><span>reaction window</span></div>
      </div>
    </section>

    <section className="home-v2-method">
      <div className="home-v2-section-intro"><span>{t('home.simpleMethodKicker')}</span><h2>{t('home.simpleMethodTitle')}</h2><p>{t('home.simpleMethodDescription')}</p></div>
      <div className="home-v2-method-steps">
        {method.map((item, index) => {
          const Icon = item.icon
          return <article key={item.title}><span className="home-v2-step-index">0{index + 1}</span><Icon size={20} /><div><strong>{item.title}</strong><p>{item.description}</p></div></article>
        })}
      </div>
    </section>

    <section className="home-v2-tools">
      <div className="home-v2-section-intro"><span>{t('home.simpleToolsKicker')}</span><h2>{t('home.simpleToolsTitle')}</h2></div>
      <div className="home-v2-tool-list">{tools.map((tool, index) => {
        const Icon = tool.icon
        return <button key={tool.id} className={`home-tool-${tool.id}`} onClick={() => onNavigate(tool.id)}>
          <span className="home-v2-tool-index">0{index + 1}</span>
          <span className="home-v2-tool-icon"><Icon size={19} /></span>
          <span className="home-v2-tool-copy"><strong>{tool.title}</strong><small>{tool.description}</small></span>
          <span className="home-v2-tool-visual" aria-hidden="true">
            {tool.id === 'calibration' && <><i /><b /><em /></>}
            {tool.id === 'warmup' && <><i /><i /><i /><b /></>}
            {tool.id === 'buttons' && <><Mouse size={17} /><Keyboard size={17} /><Gamepad2 size={17} /></>}
          </span>
          <span className="home-v2-tool-action">{tool.action} <ArrowRight size={15} /></span>
        </button>
      })}</div>
    </section>

    <section className="home-v2-worth">
      <div className="home-v2-worth-copy"><span>{t('home.benefitKicker')}</span><h2>{t('home.benefitTitle')}</h2><p>{t('home.benefitDescription')}</p><button className="home-v2-text-action" onClick={() => onNavigate('calibration')}>{t('home.benefitAction')} <ArrowRight size={16} /></button></div>
      <div className="home-v2-worth-points">{benefits.map((benefit) => {
        const Icon = benefit.icon
        return <div key={benefit.title} className={benefit.visual ? 'home-worth-featured' : undefined}>
          <Icon size={19} />
          <strong>{benefit.title}</strong>
          <p>{benefit.description}</p>
          {benefit.visual === 'comparison' && <span className="home-worth-visual" aria-hidden="true">
            <i />
            <i />
            <i />
            <b />
            <em />
          </span>}
        </div>
      })}</div>
    </section>

    <section className="home-v2-disclosure">
      <div className="home-v2-disclosure-heading"><span className="home-v2-disclosure-icon"><CircleAlert size={19} /></span><div><span>{t('home.simpleDisclosureKicker')}</span><h2>{t('home.simpleDisclosureTitle')}</h2></div></div>
      <p>{t('home.simpleDisclosureDescription')}</p>
      <div className="home-v2-disclosure-points"><div><LockKeyhole size={17} /><strong>{t('home.simpleRawTitle')}</strong><span>{t('home.simpleRawDescription')}</span></div><div><Gauge size={17} /><strong>{t('home.simpleAccelerationTitle')}</strong><span>{t('home.simpleAccelerationDescription')}</span></div><div><LineChart size={17} /><strong>{t('home.simpleComparisonTitle')}</strong><span>{t('home.simpleComparisonDescription')}</span></div></div>
    </section>
  </section>
}
