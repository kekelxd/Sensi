import { useEffect, useMemo, useState } from 'react'
import { Activity, Crosshair, Info, MousePointer2, Pause, Play, RotateCcw, Settings2, Target, X } from 'lucide-react'
import { calculateRoundResult, recommendMultiplier, ROUND_DURATION, ROUND_MULTIPLIERS, RoundResult, VALORANT_RATIO } from './calibration'
import { TrackingArena } from './TrackingArena'

const format = (value: number, digits = 0) => Number.isFinite(value) ? value.toFixed(digits) : '0'

function Metric({ label, value, suffix, tone }: { label: string, value: string, suffix?: string, tone?: string }) {
  return (
    <div className="metric">
      <div className="metric-label">{label}</div>
      <div className="metric-value" style={{ color: tone }}>{value}<small>{suffix}</small></div>
    </div>
  )
}

function App() {
  const [round, setRound] = useState(0)
  const [results, setResults] = useState<RoundResult[]>([])
  const [active, setActive] = useState(false)
  const [paused, setPaused] = useState(false)
  const [remaining, setRemaining] = useState(ROUND_DURATION)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [resultOpen, setResultOpen] = useState(false)
  const [baseCS, setBaseCS] = useState(1)
  const [dpi, setDpi] = useState(800)
  const [metrics, setMetrics] = useState({ accuracy: 0, meanError: 0, smoothness: 0 })

  const multiplier = ROUND_MULTIPLIERS[round] ?? 1
  const recommendation = useMemo(() => recommendMultiplier(results), [results])
  const recommendedCS = baseCS * recommendation
  const recommendedValorant = recommendedCS / VALORANT_RATIO

  useEffect(() => {
    if (!active || paused) return
    setRemaining(ROUND_DURATION)
    const started = Date.now()
    const timer = window.setInterval(() => {
      setRemaining(Math.max(0, ROUND_DURATION - (Date.now() - started) / 1000))
    }, 100)
    return () => window.clearInterval(timer)
  }, [active, paused, round])

  const start = () => {
    if (resultOpen || results.length === ROUND_MULTIPLIERS.length) {
      setResults([])
      setRound(0)
      setResultOpen(false)
    }
    setMetrics({ accuracy: 0, meanError: 0, smoothness: 0 })
    setRemaining(ROUND_DURATION)
    setPaused(false)
    setActive(true)
  }

  const completeRound = (distances: number[], speeds: number[], targetRadius: number) => {
    const result = calculateRoundResult(multiplier, distances, speeds, targetRadius)
    const nextResults = [...results, result]
    setResults(nextResults)
    setActive(false)
    setRemaining(ROUND_DURATION)
    document.exitPointerLock?.()
    if (round >= ROUND_MULTIPLIERS.length - 1) {
      setResultOpen(true)
    } else {
      window.setTimeout(() => setRound((value) => value + 1), 250)
    }
  }

  const reset = () => {
    setActive(false)
    setPaused(false)
    setRound(0)
    setResults([])
    setResultOpen(false)
    setRemaining(ROUND_DURATION)
    setMetrics({ accuracy: 0, meanError: 0, smoothness: 0 })
    document.exitPointerLock?.()
  }

  return (
    <main className="app-shell">
      <header>
        <div className="brand"><Crosshair size={20} /> SENSI</div>
        <div className="header-title">Calibração de tracking</div>
        <div className="header-actions">
          <span>{results.length}/{ROUND_MULTIPLIERS.length} rodadas</span>
          <button className="icon-button" onClick={() => setSettingsOpen(true)} aria-label="Abrir configurações"><Settings2 size={17} /></button>
        </div>
      </header>

      <section className="workspace">
        <aside className="metrics-rail">
          <div className="rail-heading"><Activity size={15} /> Ao vivo</div>
          <Metric label="Precisão" value={format(metrics.accuracy)} suffix="%" tone="#8dfbd3" />
          <Metric label="Erro médio" value={format(metrics.meanError)} suffix="px" />
          <Metric label="Suavidade" value={format(metrics.smoothness)} suffix="%" />
          <div className="rail-note"><Info size={14} /> Mantenha a mira no centro do alvo.</div>
        </aside>

        <TrackingArena active={active} paused={paused} multiplier={multiplier} onMetrics={setMetrics} onRoundComplete={completeRound} />

        <aside className="round-panel">
          <div>
            <div className="panel-label">Rodada {Math.min(round + 1, 5)} de 5</div>
            <div className="round-progress"><i style={{ width: `${((round + (active ? 0.5 : 0)) / 5) * 100}%` }} /></div>
          </div>
          <div className="test-value">
            <span>Sensibilidade em teste</span>
            <strong>{format(baseCS * multiplier, 3)}</strong>
            <small>CS2 · {format(multiplier, 2)}× do ponto inicial</small>
          </div>
          <div className="timer">{format(remaining, 1)}<small>s</small></div>
          <p>Faça movimentos naturais. O alvo muda de direção para medir correções e overshoot.</p>
          <div className="candidate-list">
            {ROUND_MULTIPLIERS.map((value, index) => (
              <div key={value} className={index === round ? 'current' : index < results.length ? 'done' : ''}>
                <span>0{index + 1}</span><i /><b>{format(value, 2)}×</b>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <footer>
        <div className="footer-status"><MousePointer2 size={16} /> {active ? 'Mouse capturado · ESC libera o cursor' : 'Pronto para calibrar'}</div>
        <div className="controls">
          <button className="secondary-button" onClick={reset}><RotateCcw size={16} /> Reiniciar</button>
          {active && <button className="secondary-button" onClick={() => setPaused((value) => !value)}>{paused ? <Play size={16} /> : <Pause size={16} />}{paused ? 'Retomar' : 'Pausar'}</button>}
          <button className="primary-button" onClick={start} disabled={active}><Play size={17} /> {results.length ? 'Próxima rodada' : 'Iniciar teste'}</button>
        </div>
        <div className="dpi-status">DPI <b>{dpi}</b></div>
      </footer>

      {settingsOpen && (
        <div className="modal-backdrop">
          <section className="modal settings-modal">
            <button className="modal-close" onClick={() => setSettingsOpen(false)}><X size={18} /></button>
            <Settings2 size={22} className="modal-icon" />
            <h2>Ponto de partida</h2>
            <p>Use sua configuração atual. O teste encontra um multiplicador mais controlável a partir dela.</p>
            <label>DPI do mouse<input type="number" min="100" max="6400" value={dpi} onChange={(event) => setDpi(Number(event.target.value))} /></label>
            <label>Sensibilidade atual no CS2<input type="number" min="0.05" max="10" step="0.05" value={baseCS} onChange={(event) => setBaseCS(Number(event.target.value))} /></label>
            <div className="conversion">Equivalente atual no Valorant <strong>{format(baseCS / VALORANT_RATIO, 3)}</strong></div>
            <button className="primary-button wide" onClick={() => setSettingsOpen(false)}>Salvar configuração</button>
          </section>
        </div>
      )}

      {resultOpen && (
        <div className="modal-backdrop">
          <section className="modal result-modal">
            <button className="modal-close" onClick={() => setResultOpen(false)}><X size={18} /></button>
            <Target size={24} className="modal-icon" />
            <div className="panel-label">Resultado</div>
            <h2>Sensibilidade recomendada</h2>
            <p>Seu melhor equilíbrio entre precisão, controle e suavidade apareceu em <b>{format(recommendation, 2)}×</b> da configuração inicial.</p>
            <div className="recommendations">
              <div><span>Counter-Strike 2</span><strong>{format(recommendedCS, 3)}</strong></div>
              <div><span>Valorant</span><strong>{format(recommendedValorant, 3)}</strong></div>
            </div>
            <div className="result-bars">
              {[...results].sort((a, b) => b.score - a.score).map((result) => (
                <div key={result.multiplier}><span>{format(result.multiplier, 2)}×</span><i><b style={{ width: `${result.score}%` }} /></i><strong>{format(result.score)}</strong></div>
              ))}
            </div>
            <small className="disclaimer">Estimativa baseada nesta sessão. Valide a recomendação no campo de treino do jogo antes de competir.</small>
            <button className="primary-button wide" onClick={reset}>Refazer calibração</button>
          </section>
        </div>
      )}
    </main>
  )
}

export default App
