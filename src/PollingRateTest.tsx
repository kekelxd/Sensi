import { useCallback, useEffect, useRef, useState } from 'react'
import { Gauge, MousePointer2, Play, RotateCcw, ShieldCheck, Zap } from 'lucide-react'

const TEST_DURATION = 8
const STANDARD_RATES = [125, 250, 500, 1000, 2000, 4000, 8000]

type TestStatus = 'idle' | 'running' | 'done'

type PollingStats = {
  measured: number
  classified: number
  peak: number
  stability: number
  samples: number
}

const EMPTY_STATS: PollingStats = { measured: 0, classified: 0, peak: 0, stability: 0, samples: 0 }

function percentile(sorted: number[], ratio: number) {
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))] ?? 0
}

function trimmedAverage(values: number[], trimRatio = 0.05) {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const trim = Math.min(Math.floor(sorted.length * trimRatio), Math.floor((sorted.length - 1) / 2))
  const trimmed = sorted.slice(trim, sorted.length - trim)
  return trimmed.reduce((sum, value) => sum + value, 0) / trimmed.length
}

function calculateStats(intervals: number[]): PollingStats {
  if (intervals.length < 2) return { ...EMPTY_STATS, samples: intervals.length }

  const averageInterval = trimmedAverage(intervals)
  const measured = averageInterval > 0 ? 1000 / averageInterval : 0
  const classified = STANDARD_RATES.reduce((closest, rate) => (
    Math.abs(Math.log(rate / measured)) < Math.abs(Math.log(closest / measured)) ? rate : closest
  ))
  const windowSize = Math.min(64, Math.max(8, Math.floor(intervals.length / 20)))
  const windowRates: number[] = []
  for (let index = 0; index + windowSize <= intervals.length; index += windowSize) {
    const windowAverage = trimmedAverage(intervals.slice(index, index + windowSize), 0.03)
    if (windowAverage > 0) windowRates.push(1000 / windowAverage)
  }
  const peak = windowRates.length ? percentile(windowRates.sort((a, b) => a - b), 0.9) : measured
  const stabilityTolerance = Math.max(averageInterval * 0.25, 0.11)
  const stableSamples = intervals.filter((interval) => Math.abs(interval - averageInterval) <= stabilityTolerance).length

  return {
    measured: Math.min(9999, measured),
    classified,
    peak: Math.min(9999, peak),
    stability: stableSamples / intervals.length * 100,
    samples: intervals.length,
  }
}

export function PollingRateTest() {
  const zoneRef = useRef<HTMLDivElement>(null)
  const intervalsRef = useRef<number[]>([])
  const lastTimestampRef = useRef(0)
  const [status, setStatus] = useState<TestStatus>('idle')
  const [remaining, setRemaining] = useState(TEST_DURATION)
  const [stats, setStats] = useState<PollingStats>(EMPTY_STATS)
  const supportsRawInput = 'onpointerrawupdate' in window

  const finishTest = useCallback(() => {
    setStats(calculateStats(intervalsRef.current))
    setRemaining(0)
    setStatus('done')
    if (document.pointerLockElement) document.exitPointerLock?.()
  }, [])

  useEffect(() => {
    if (status !== 'running') return

    const started = performance.now()
    const eventName = supportsRawInput ? 'pointerrawupdate' : 'pointermove'
    const handlePointer = (event: PointerEvent) => {
      if (event.pointerType && event.pointerType !== 'mouse') return
      const coalesced = event.getCoalescedEvents?.() ?? []
      const samples = coalesced.length ? coalesced : [event]

      for (const sample of samples) {
        const timestamp = sample.timeStamp
        const lastTimestamp = lastTimestampRef.current
        if (lastTimestamp) {
          const interval = timestamp - lastTimestamp
          if (interval >= 0.04 && interval <= 20) intervalsRef.current.push(interval)
        }
        lastTimestampRef.current = timestamp
      }
    }

    document.addEventListener(eventName, handlePointer as EventListener, { passive: true })
    let lastStatsUpdate = 0
    const timer = window.setInterval(() => {
      const elapsed = (performance.now() - started) / 1000
      setRemaining(Math.max(0, TEST_DURATION - elapsed))
      if (elapsed - lastStatsUpdate >= 0.25) {
        const intervals = intervalsRef.current
        const liveStats = calculateStats(intervals.slice(-6000))
        setStats({ ...liveStats, samples: intervals.length })
        lastStatsUpdate = elapsed
      }
      if (elapsed >= TEST_DURATION) finishTest()
    }, 100)

    return () => {
      document.removeEventListener(eventName, handlePointer as EventListener)
      window.clearInterval(timer)
    }
  }, [finishTest, status, supportsRawInput])

  const startTest = () => {
    intervalsRef.current = []
    lastTimestampRef.current = 0
    setStats(EMPTY_STATS)
    setRemaining(TEST_DURATION)
    setStatus('running')
    zoneRef.current?.requestPointerLock?.()
  }

  const resetTest = () => {
    intervalsRef.current = []
    lastTimestampRef.current = 0
    setStats(EMPTY_STATS)
    setRemaining(TEST_DURATION)
    setStatus('idle')
    if (document.pointerLockElement) document.exitPointerLock?.()
  }

  const progress = status === 'done' ? 100 : (TEST_DURATION - remaining) / TEST_DURATION * 100
  const displayedRate = status === 'done' && stats.classified ? stats.classified : stats.measured

  return (
    <section className="polling-workspace">
      <aside className="polling-info">
        <div className="rail-heading"><Gauge size={15} /> Diagnóstico</div>
        <h2>Teste de polling rate</h2>
        <p>Meça a frequência com que o navegador recebe atualizações do seu mouse.</p>
        <div className="polling-tip"><MousePointer2 size={17} /><span>Faça movimentos rápidos e circulares durante os 8 segundos.</span></div>
        <div className="polling-tip"><ShieldCheck size={17} /><span>Feche programas pesados para reduzir interferências no resultado.</span></div>
        <small>{supportsRawInput ? 'Entrada bruta suportada neste navegador.' : 'Usando modo compatível. Para maior precisão, prefira Chrome ou Edge.'}</small>
      </aside>

      <div
        ref={zoneRef}
        className={`polling-zone ${status}`}
        onMouseDown={() => status === 'running' && zoneRef.current?.requestPointerLock?.()}
      >
        <div className="polling-grid" />
        <div className="polling-center">
          <div className="polling-kicker"><Zap size={14} /> {status === 'running' ? 'MEDINDO AGORA' : status === 'done' ? 'TESTE CONCLUÍDO' : 'PRONTO PARA MEDIR'}</div>
          <strong>{displayedRate ? Math.round(displayedRate).toLocaleString('pt-BR') : '--'}</strong>
          <span>{status === 'done' ? 'Hz prováveis' : 'Hz observados'}</span>
          {status === 'done' && stats.measured > 0 && <div className="polling-observed">{Math.round(stats.measured).toLocaleString('pt-BR')} Hz observados pelo navegador</div>}
          <div className="polling-progress"><i style={{ width: `${progress}%` }} /></div>
          <div className="polling-time">{status === 'running' ? `${remaining.toFixed(1)}s restantes` : status === 'done' ? `${stats.samples.toLocaleString('pt-BR')} amostras válidas` : `${TEST_DURATION} segundos de teste`}</div>
          <div className="polling-actions">
            {status !== 'idle' && <button className="secondary-button" onClick={resetTest}><RotateCcw size={16} /> Reiniciar</button>}
            {status !== 'running' && <button className="primary-button" onClick={startTest}><Play size={17} /> {status === 'done' ? 'Testar novamente' : 'Iniciar teste'}</button>}
          </div>
        </div>
      </div>

      <aside className="polling-results">
        <div className="panel-label">Resultado</div>
        <div className="polling-primary-result">
          <span>Taxa observada</span>
          <strong>{stats.measured ? Math.round(stats.measured).toLocaleString('pt-BR') : '--'}<small>Hz</small></strong>
        </div>
        <div className="polling-result-row"><span>Polling rate provável</span><b>{stats.classified ? stats.classified.toLocaleString('pt-BR') : '--'} Hz</b></div>
        <div className="polling-result-row"><span>Pico observado</span><b>{stats.peak ? Math.round(stats.peak).toLocaleString('pt-BR') : '--'} Hz</b></div>
        <div className="polling-result-row"><span>Estabilidade</span><b>{stats.samples ? `${stats.stability.toFixed(0)}%` : '--'}</b></div>
        <div className="polling-result-row"><span>Amostras</span><b>{stats.samples.toLocaleString('pt-BR')}</b></div>
        <div className="rate-scale">
          {STANDARD_RATES.map((rate) => <i key={rate} className={stats.classified === rate ? 'selected' : ''}><span>{rate >= 1000 ? `${rate / 1000}K` : rate}</span></i>)}
        </div>
        <p className="polling-disclaimer">Resultado estimado pelos eventos entregues ao navegador. Sistema operacional, carga da CPU e agrupamento de eventos podem alterar a medição, especialmente em 4K e 8K.</p>
      </aside>
    </section>
  )
}
