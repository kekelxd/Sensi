import { useEffect, useRef } from 'react'
import { Activity, ArrowRight, CheckCircle2, Crosshair, Flame, Gamepad2, Gauge, Keyboard, Lightbulb, LineChart, LockKeyhole, Mouse, MousePointer2, Target, TimerReset, type LucideIcon } from 'lucide-react'
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
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
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
      if (!reduceMotion) {
        animationFrame = window.requestAnimationFrame(render)
      }
    }

    const handleResize = () => {
      needsResize = true
    }
    resize()
    window.addEventListener('resize', handleResize, { passive: true })
    animationFrame = window.requestAnimationFrame(render)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (animationFrame) window.cancelAnimationFrame(animationFrame)
    }
  }, [])

  return <div className="home-gridshot-preview" aria-hidden="true">
    <canvas ref={canvasRef} className="home-gridshot-canvas" />
    <span className="home-gridshot-noise" />
    <div className="home-gridshot-hud">
      <small>GRIDSHOT</small>
      <strong>LIVE</strong>
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

  return <section className="home-taste">
    <div className="home-taste-shell">
      <section className="home-taste-hero" aria-labelledby="home-title">
        <div className="home-taste-copy">
          <h1 id="home-title" className="home-taste-title">
            <span>{t('home.aimLineOne')}</span>
            <span>{t('home.aimLineTwo')}</span>
            <span>{t('home.aimLineThree')}</span>
          </h1>
          <p className="home-taste-description">{t('home.simpleHeroDescription')}</p>

          <div className="home-taste-actions" aria-label="Ações principais">
            <button className="home-taste-primary" type="button" onClick={() => onNavigate('calibration')}>
              <Target size={18} />
              {t('home.primaryAction')}
            </button>
            <button className="home-taste-secondary" type="button" onClick={() => onNavigate('warmup')}>
              <Flame size={18} />
              {t('home.aimWarmupBadge')}
              <ArrowRight size={17} />
            </button>
          </div>
        </div>

        <div className="home-taste-preview" aria-label="Preview animado de Gridshot">
          <GridshotPreview />
        </div>
      </section>

      <section className="home-taste-tools" aria-labelledby="tools-title">
        <div className="home-taste-section-heading">
          <span>{t('home.simpleToolsKicker')}</span>
          <h2 id="tools-title">{t('home.simpleToolsTitle')}</h2>
        </div>

        <div className="home-taste-bento">
          {tools.map((tool) => {
            const Icon = tool.icon

            return <button key={tool.id} className={`home-taste-tool home-taste-tool-${tool.id}`} type="button" onClick={() => onNavigate(tool.id)}>
              <span className="home-taste-tool-icon"><Icon size={24} /></span>
              <span className="home-taste-tool-text">
                <strong>{tool.title}</strong>
                <small>{tool.description}</small>
              </span>
              <span className="home-taste-tool-visual" aria-hidden="true">
                {tool.id === 'calibration' && <><i /><b /><em /></>}
                {tool.id === 'warmup' && <><i /><i /><i /><b /></>}
                {tool.id === 'buttons' && <><Mouse size={17} /><Keyboard size={17} /><Gamepad2 size={17} /></>}
              </span>
              <span className="home-taste-tool-action">
                {tool.action}
                <ArrowRight size={16} />
              </span>
            </button>
          })}
        </div>
      </section>

      <section className="home-taste-method" aria-labelledby="method-title">
        <div className="home-taste-section-heading">
          <span>{t('home.simpleMethodKicker')}</span>
          <h2 id="method-title">{t('home.simpleMethodTitle')}</h2>
          <p>{t('home.simpleMethodDescription')}</p>
        </div>

        <div className="home-taste-steps">
          {method.map((item) => {
            const Icon = item.icon

            return <article className="home-taste-step" key={item.title}>
              <Icon size={22} />
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          })}
        </div>
      </section>

      <section className="home-taste-worth" aria-labelledby="worth-title">
        <article className="home-taste-worth-main">
          <span>{t('home.benefitKicker')}</span>
          <h2 id="worth-title">{t('home.benefitTitle')}</h2>
          <p>{t('home.benefitDescription')}</p>
          <button type="button" onClick={() => onNavigate('calibration')}>
            {t('home.benefitAction')}
            <ArrowRight size={17} />
          </button>
        </article>

        <div className="home-taste-benefits">
          {benefits.map((benefit) => {
            const Icon = benefit.icon

            return <article className={benefit.visual ? 'home-taste-benefit home-taste-benefit-wide' : 'home-taste-benefit'} key={benefit.title}>
              <Icon size={22} />
              <h3>{benefit.title}</h3>
              <p>{benefit.description}</p>
              {benefit.visual === 'comparison' && <span className="home-taste-bars" aria-hidden="true">
                <i />
                <i />
                <i />
                <b />
              </span>}
            </article>
          })}
        </div>
      </section>

      <section className="home-taste-disclosure" aria-labelledby="disclosure-title">
        <div className="home-taste-section-heading">
          <span>{t('home.simpleDisclosureKicker')}</span>
          <h2 id="disclosure-title">{t('home.simpleDisclosureTitle')}</h2>
          <p>{t('home.simpleDisclosureDescription')}</p>
        </div>

        <div className="home-taste-disclosure-grid">
          <article>
            <LockKeyhole size={20} />
            <h3>{t('home.simpleRawTitle')}</h3>
            <p>{t('home.simpleRawDescription')}</p>
          </article>
          <article>
            <Gauge size={20} />
            <h3>{t('home.simpleAccelerationTitle')}</h3>
            <p>{t('home.simpleAccelerationDescription')}</p>
          </article>
          <article>
            <LineChart size={20} />
            <h3>{t('home.simpleComparisonTitle')}</h3>
            <p>{t('home.simpleComparisonDescription')}</p>
          </article>
        </div>
      </section>
    </div>
  </section>
}
