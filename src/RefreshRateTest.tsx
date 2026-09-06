import { useEffect, useRef, useState } from 'react'
import { Activity, MonitorUp, Play, RotateCcw, TriangleAlert } from 'lucide-react'
import { analyzeRefreshIntervals, type RefreshRateStats } from './refreshRateMetrics'
import { useI18n } from './i18n'

const REFRESH_WARMUP_MS = 750
const REFRESH_SAMPLE_MS = 4000

type RefreshStatus = 'idle' | 'running' | 'done' | 'invalid'
type InvalidReason = 'interrupted' | 'insufficient-samples' | 'throttled'

const motionRates = (observedHz: number) => [observedHz, observedHz / 2, observedHz / 4]

function MotionComparison({ observedHz }: { observedHz: number }) {
  const { localeTag, t } = useI18n()
  const [speed, setSpeed] = useState(.5)
  const speedRef = useRef(speed)
  const trackRefs = useRef<Array<HTMLDivElement | null>>([])
  const targetRefs = useRef<Array<HTMLDivElement | null>>([])
  const rates = motionRates(observedHz)
  const labels = [t('refresh.observedCadence'), t('refresh.halfCadence'), t('refresh.quarterCadence')]

  useEffect(() => { speedRef.current = speed }, [speed])

  useEffect(() => {
    const rates = motionRates(observedHz)
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const travelDistance = [0, 0, 0]
    const lastUpdate = [0, 0, 0]
    const updateTravelDistance = (index: number) => {
      const track = trackRefs.current[index]
      travelDistance[index] = track ? Math.max(0, track.clientWidth - 28) : 0
    }
    const observers = trackRefs.current.map((track, index) => {
      if (!track) return null
      updateTravelDistance(index)
      const observer = new ResizeObserver(() => updateTravelDistance(index))
      observer.observe(track)
      return observer
    })
    const moveTarget = (index: number, progress: number) => {
      const target = targetRefs.current[index]
      if (target) target.style.transform = `translate3d(${travelDistance[index] * progress}px, -50%, 0)`
    }

    if (reducedMotion) {
      rates.forEach((_, index) => moveTarget(index, .5))
      return () => observers.forEach((observer) => observer?.disconnect())
    }

    let frame = 0
    const tick = (timestamp: number) => {
      const travelDuration = 2600 - speedRef.current * 1600
      const progress = (timestamp % travelDuration) / travelDuration
      rates.forEach((rate, index) => {
        if (timestamp - lastUpdate[index] >= 1000 / Math.max(1, rate)) {
          moveTarget(index, progress)
          lastUpdate[index] = timestamp
        }
      })
      frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)
    return () => {
      window.cancelAnimationFrame(frame)
      observers.forEach((observer) => observer?.disconnect())
    }
  }, [observedHz])

  return <section className="motion-comparison" aria-labelledby="motion-comparison-title">
    <header>
      <div><span className="panel-label">{t('refresh.comparisonTitle')}</span><h2 id="motion-comparison-title">{t('refresh.comparisonTitle')}</h2></div>
      <p>{t('refresh.comparisonDescription')}</p>
    </header>
    <div className="motion-comparison-lanes">
      {rates.map((rate, index) => <div className="motion-comparison-lane" key={labels[index]}>
        <span>{labels[index]}</span>
        <div className="motion-comparison-track" ref={(node) => { trackRefs.current[index] = node }}>
          <div className="motion-comparison-target" ref={(node) => { targetRefs.current[index] = node }} aria-label={`${labels[index]}: ${Math.round(rate).toLocaleString(localeTag)} Hz`}><i /></div>
        </div>
        <strong>{Math.round(rate).toLocaleString(localeTag)} <small>Hz</small></strong>
      </div>)}
    </div>
    <label className="motion-comparison-speed">
      <span>{t('refresh.slow')}</span>
      <input type="range" min="0" max="1" step="0.05" value={speed} aria-label={t('refresh.speed')} onChange={(event) => setSpeed(Number(event.target.value))} />
      <span>{t('refresh.fast')}</span>
    </label>
    <p className="motion-comparison-disclaimer">{t('refresh.comparisonDisclaimer')}</p>
  </section>
}

export function RefreshRateTest() {
  const { localeTag, t } = useI18n()
  const [status, setStatus] = useState<RefreshStatus>('idle')
  const [warming, setWarming] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<RefreshRateStats | null>(null)
  const [invalidReason, setInvalidReason] = useState<InvalidReason | null>(null)
  const runIdRef = useRef(0)

  useEffect(() => {
    if (status !== 'running') return
    const runId = runIdRef.current
    const intervals: number[] = []
    let frame = 0
    let startedAt = 0
    let lastSampleAt = 0
    let lastProgressAt = 0
    let warmupComplete = false
    let active = true

    const invalidate = (reason: InvalidReason) => {
      if (!active || runId !== runIdRef.current) return
      active = false
      setInvalidReason(reason)
      setStatus('invalid')
    }
    const interrupt = () => invalidate('interrupted')
    const checkVisibility = () => { if (document.hidden) interrupt() }
    const tick = (timestamp: number) => {
      if (!active || runId !== runIdRef.current) return
      if (document.hidden || !document.hasFocus()) {
        interrupt()
        return
      }
      if (!startedAt) startedAt = timestamp
      const elapsed = timestamp - startedAt
      if (elapsed < REFRESH_WARMUP_MS) {
        if (timestamp - lastProgressAt >= 100) {
          setProgress(elapsed / (REFRESH_WARMUP_MS + REFRESH_SAMPLE_MS) * 100)
          lastProgressAt = timestamp
        }
      } else {
        if (!warmupComplete) {
          warmupComplete = true
          setWarming(false)
        }
        if (lastSampleAt) intervals.push(timestamp - lastSampleAt)
        lastSampleAt = timestamp
        const measurementElapsed = elapsed - REFRESH_WARMUP_MS
        if (timestamp - lastProgressAt >= 100) {
          setProgress(Math.min(100, elapsed / (REFRESH_WARMUP_MS + REFRESH_SAMPLE_MS) * 100))
          lastProgressAt = timestamp
        }
        if (measurementElapsed >= REFRESH_SAMPLE_MS) {
          active = false
          const next = analyzeRefreshIntervals(intervals)
          setResult(next.valid ? next : null)
          setProgress(100)
          if (next.valid) setStatus('done')
          else {
            setInvalidReason(next.reason ?? 'insufficient-samples')
            setStatus('invalid')
          }
          return
        }
      }
      frame = window.requestAnimationFrame(tick)
    }

    window.addEventListener('blur', interrupt)
    document.addEventListener('visibilitychange', checkVisibility)
    frame = window.requestAnimationFrame(tick)
    return () => {
      active = false
      window.cancelAnimationFrame(frame)
      window.removeEventListener('blur', interrupt)
      document.removeEventListener('visibilitychange', checkVisibility)
    }
  }, [status])

  const start = () => {
    runIdRef.current += 1
    setResult(null)
    setInvalidReason(null)
    setProgress(0)
    setWarming(true)
    setStatus('running')
  }

  const invalidMessage = invalidReason === 'interrupted'
    ? t('refresh.interrupted')
    : invalidReason === 'throttled'
      ? t('refresh.throttled')
      : t('refresh.insufficient')
  const classification = result ? t(`refresh.${result.classification}` as 'refresh.stable' | 'refresh.moderate' | 'refresh.unstable') : '--'

  return <section className="diagnostic-tool-workspace refresh-workspace">
    <header className="diagnostic-tool-heading">
      <div className="panel-label"><MonitorUp size={15} /> {t('refresh.diagnostics')}</div>
      <h1>{t('refresh.title')}</h1>
      <p>{t('refresh.subtitle')}</p>
    </header>

    <div className={`refresh-stage ${status}`} aria-live="polite">
      <div className="refresh-orbit" aria-hidden="true"><i /><i /><i /></div>
      {status === 'invalid' ? <div className="diagnostic-invalid"><TriangleAlert size={24} /><strong>{t('refresh.invalidTitle')}</strong><p>{invalidMessage}</p></div> : <>
        <span>{status === 'running' ? warming ? t('refresh.warming') : t('refresh.measuring') : status === 'done' ? t('refresh.complete') : t('refresh.ready')}</span>
        <strong>{result ? result.observedHz.toLocaleString(localeTag, { maximumFractionDigits: 1 }) : '--'}<small>Hz</small></strong>
        <p>{result ? t('refresh.observedSentence', { hz: result.observedHz.toLocaleString(localeTag, { maximumFractionDigits: 1 }) }) : t('refresh.keepActive')}</p>
      </>}
      <div className="diagnostic-progress" aria-label={t('refresh.progress')}><i style={{ width: `${progress}%` }} /></div>
      <button type="button" className="primary-button" onClick={start} disabled={status === 'running'}>{status === 'done' || status === 'invalid' ? <RotateCcw size={16} /> : <Play size={16} />}{status === 'done' || status === 'invalid' ? t('refresh.again') : t('refresh.start')}</button>
    </div>

    <div className="diagnostic-metrics-grid refresh-metrics">
      <div><span>{t('refresh.observed')}</span><strong>{result ? `${result.observedHz.toFixed(1)} Hz` : '--'}</strong></div>
      <div><span>{t('refresh.frameInterval')}</span><strong>{result ? `${result.frameIntervalMs.toFixed(2)} ms` : '--'}</strong></div>
      <div><span>{t('refresh.stability')}</span><strong>{result ? `${result.stability.toFixed(1)}%` : '--'}<small>{result ? classification : ''}</small></strong></div>
      <div><span>{t('refresh.delayed')}</span><strong>{result ? result.delayedFrames : '--'}</strong></div>
    </div>

    {result && <MotionComparison observedHz={result.observedHz} />}

    <details className="diagnostic-details">
      <summary><Activity size={15} /> {t('refresh.details')}</summary>
      <div><span>{t('refresh.mean')}</span><b>{result ? `${result.meanIntervalMs.toFixed(3)} ms` : '--'}</b></div>
      <div><span>{t('refresh.p95')}</span><b>{result ? `${result.p95IntervalMs.toFixed(3)} ms` : '--'}</b></div>
      <div><span>{t('refresh.samples')}</span><b>{result?.samples ?? '--'}</b></div>
      <div><span>{t('refresh.outliers')}</span><b>{result?.outliers ?? '--'}</b></div>
    </details>
    <p className="diagnostic-disclaimer">{t('refresh.disclaimer')}</p>
  </section>
}
