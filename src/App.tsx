import { useEffect, useMemo, useState } from 'react'
import { Activity, Circle, Crosshair, Dot, Info, MousePointer2, Pause, Play, Plus, RotateCcw, Settings2, Target, X, type LucideIcon } from 'lucide-react'
import { calculateRoundResult, getRoundMultipliers, getTargetSpeed, recommendMultiplier, ROUND_DURATION, RoundResult, TestMode, VALORANT_RATIO } from './calibration'
import { CrosshairStyle, TrackingArena } from './TrackingArena'

type Game = 'cs2' | 'valorant'
type RoundPhase = 'idle' | 'countdown' | 'running'

const CROSSHAIRS: Array<{ id: CrosshairStyle, label: string, description: string, icon: LucideIcon }> = [
  { id: 'classic', label: 'Clássica', description: 'Linhas finas com centro aberto', icon: Crosshair },
  { id: 'dot', label: 'Bolinha', description: 'Ponto central limpo', icon: Dot },
  { id: 'circle', label: 'Circular', description: 'Anel com ponto central', icon: Circle },
  { id: 'plus', label: 'Cruz cheia', description: 'Mira compacta e direta', icon: Plus },
]

const GAME_LABEL: Record<Game, string> = {
  cs2: 'Counter-Strike 2',
  valorant: 'Valorant',
}

const MODE_LABEL: Record<TestMode, string> = {
  quick: 'Rápido',
  extensive: 'Extensivo',
}

const format = (value: number, digits = 0) => Number.isFinite(value) ? value.toFixed(digits) : '0'
const toBaseCS = (game: Game, sensitivity: number) => game === 'cs2' ? sensitivity : sensitivity * VALORANT_RATIO
const fromBaseCS = (game: Game, csSensitivity: number) => game === 'cs2' ? csSensitivity : csSensitivity / VALORANT_RATIO

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
  const [phase, setPhase] = useState<RoundPhase>('idle')
  const [paused, setPaused] = useState(false)
  const [remaining, setRemaining] = useState(ROUND_DURATION)
  const [countdown, setCountdown] = useState(3)
  const [setupOpen, setSetupOpen] = useState(true)
  const [setupConfirmed, setSetupConfirmed] = useState(false)
  const [resultOpen, setResultOpen] = useState(false)
  const [selectedGame, setSelectedGame] = useState<Game>('cs2')
  const [sensitivityInput, setSensitivityInput] = useState(1)
  const [confirmedGame, setConfirmedGame] = useState<Game>('cs2')
  const [testMode, setTestMode] = useState<TestMode>('extensive')
  const [baseCS, setBaseCS] = useState(1)
  const [crosshair, setCrosshair] = useState<CrosshairStyle>('classic')
  const [dpi, setDpi] = useState(800)
  const [metrics, setMetrics] = useState({ accuracy: 0, meanError: 0, smoothness: 0 })

  const active = phase !== 'idle'
  const tracking = phase === 'running'
  const roundMultipliers = useMemo(() => getRoundMultipliers(testMode, results), [testMode, results])
  const totalRounds = roundMultipliers.length
  const multiplier = roundMultipliers[round] ?? 1
  const targetSpeed = getTargetSpeed(round, testMode)
  const recommendation = useMemo(() => recommendMultiplier(results), [results])
  const recommendedCS = baseCS * recommendation
  const recommendedValorant = recommendedCS / VALORANT_RATIO
  const displayedCandidate = fromBaseCS(confirmedGame, baseCS * multiplier)
  const canStart = sensitivityInput > 0 && !active

  useEffect(() => {
    if (phase !== 'countdown' || paused) return
    setCountdown(3)
    const started = Date.now()
    const timer = window.setInterval(() => {
      const next = Math.max(0, 3 - Math.floor((Date.now() - started) / 1000))
      setCountdown(next)
      if (Date.now() - started >= 3000) {
        window.clearInterval(timer)
        setRemaining(ROUND_DURATION)
        setPhase('running')
      }
    }, 100)
    return () => window.clearInterval(timer)
  }, [phase, paused, round])

  useEffect(() => {
    if (phase !== 'running' || paused) return
    setRemaining(ROUND_DURATION)
    const started = Date.now()
    const timer = window.setInterval(() => {
      setRemaining(Math.max(0, ROUND_DURATION - (Date.now() - started) / 1000))
    }, 100)
    return () => window.clearInterval(timer)
  }, [phase, paused, round])

  const saveSetup = () => {
    const cleanSensitivity = Math.max(0.01, sensitivityInput)
    setSensitivityInput(cleanSensitivity)
    setConfirmedGame(selectedGame)
    setBaseCS(toBaseCS(selectedGame, cleanSensitivity))
    setSetupConfirmed(true)
    setSetupOpen(false)
  }

  const start = () => {
    if (resultOpen || results.length === totalRounds) {
      setResults([])
      setRound(0)
      setResultOpen(false)
    }
    saveSetup()
    setMetrics({ accuracy: 0, meanError: 0, smoothness: 0 })
    setCountdown(3)
    setRemaining(ROUND_DURATION)
    setPaused(false)
    setPhase('countdown')
  }

  const completeRound = (distances: number[], speeds: number[], targetRadius: number) => {
    const result = calculateRoundResult(multiplier, distances, speeds, targetRadius)
    const nextResults = [...results, result]
    setResults(nextResults)
    setPhase('idle')
    setRemaining(ROUND_DURATION)
    document.exitPointerLock?.()
    if (round >= totalRounds - 1) {
      setResultOpen(true)
    } else {
      window.setTimeout(() => setRound((value) => value + 1), 250)
    }
  }

  const reset = () => {
    setPhase('idle')
    setPaused(false)
    setRound(0)
    setResults([])
    setResultOpen(false)
    setRemaining(ROUND_DURATION)
    setCountdown(3)
    setMetrics({ accuracy: 0, meanError: 0, smoothness: 0 })
    document.exitPointerLock?.()
  }

  return (
    <main className="app-shell">
      <header>
        <div className="brand"><Crosshair size={20} /> SENSI</div>
        <div className="header-title">Calibração de tracking</div>
        <div className="header-actions">
          <span>{results.length}/{totalRounds} rodadas</span>
          <button className="icon-button" onClick={() => setSetupOpen(true)} aria-label="Abrir configurações"><Settings2 size={17} /></button>
        </div>
      </header>

      <section className="workspace">
        <aside className="metrics-rail">
          <div className="rail-heading"><Activity size={15} /> Ao vivo</div>
          <Metric label="Precisão" value={format(metrics.accuracy)} suffix="%" tone="#8dfbd3" />
          <Metric label="Erro médio" value={format(metrics.meanError)} suffix="px" />
          <Metric label="Suavidade" value={format(metrics.smoothness)} suffix="%" />
          <div className="rail-note"><Info size={14} /> A pontuação só começa depois do 3, 2, 1.</div>
        </aside>

        <TrackingArena
          active={active}
          tracking={tracking}
          paused={paused}
          multiplier={multiplier}
          targetSpeed={targetSpeed}
          crosshair={crosshair}
          onMetrics={setMetrics}
          onRoundComplete={completeRound}
        />

        <aside className="round-panel">
          <div>
            <div className="panel-label">Rodada {Math.min(round + 1, totalRounds)} de {totalRounds}</div>
            <div className="round-progress"><i style={{ width: `${((round + (tracking ? 0.5 : 0)) / totalRounds) * 100}%` }} /></div>
          </div>
          <div className="test-value">
            <span>Sensibilidade em teste</span>
            <strong>{format(displayedCandidate, 3)}</strong>
            <small>{GAME_LABEL[confirmedGame]} · {format(multiplier, 2)}× · {MODE_LABEL[testMode]}</small>
          </div>
          <div className={phase === 'countdown' ? 'timer countdown-timer' : 'timer'}>
            {phase === 'countdown' ? countdown : phase === 'running' ? format(remaining, 1) : format(ROUND_DURATION, 1)}
            <small>{phase === 'countdown' ? '' : 's'}</small>
          </div>
          <p>
            {phase === 'countdown'
              ? 'Prepare a mão. A rodada começa quando a contagem zerar.'
              : testMode === 'extensive' && round >= 5
                ? 'Fase 2 extensiva: o alvo está ligeiramente mais rápido para refinar precisão e reação.'
                : 'Faça movimentos naturais. O alvo muda de direção para medir correções e overshoot.'}
          </p>
          <div className="candidate-list">
            {roundMultipliers.map((value, index) => (
              <div key={`${index}-${value}`} className={index === round ? 'current' : index < results.length ? 'done' : ''}>
                <span>{String(index + 1).padStart(2, '0')}</span><i /><b>{format(value, 2)}×</b>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <footer>
        <div className="footer-status"><MousePointer2 size={16} /> {active ? 'Mouse capturado · ESC libera o cursor' : `Base: ${GAME_LABEL[confirmedGame]}`}</div>
        <div className="controls">
          <button className="secondary-button" onClick={reset}><RotateCcw size={16} /> Reiniciar</button>
          {active && <button className="secondary-button" onClick={() => setPaused((value) => !value)}>{paused ? <Play size={16} /> : <Pause size={16} />}{paused ? 'Retomar' : 'Pausar'}</button>}
          <button className="primary-button" onClick={start} disabled={!canStart}><Play size={17} /> {results.length ? 'Próxima rodada' : 'Iniciar teste'}</button>
        </div>
        <div className="dpi-status">DPI <b>{dpi}</b></div>
      </footer>

      {setupOpen && (
        <div className="modal-backdrop">
          <section className="modal setup-modal">
            <button className="modal-close" onClick={() => setSetupOpen(false)} disabled={!setupConfirmed}><X size={18} /></button>
            <Settings2 size={22} className="modal-icon" />
            <h2>Configurar antes do teste</h2>
            <p>Escolha o jogo, informe sua sensibilidade atual e selecione o tipo de teste. O modo extensivo usa 10 rodadas para refinar melhor o resultado.</p>

            <div className="option-group" role="radiogroup" aria-label="Jogo de referência">
              {(['cs2', 'valorant'] as Game[]).map((game) => (
                <button
                  key={game}
                  className={selectedGame === game ? 'choice-card selected' : 'choice-card'}
                  onClick={() => setSelectedGame(game)}
                  type="button"
                >
                  <span>{GAME_LABEL[game]}</span>
                  <small>Usar sensi do {game === 'cs2' ? 'CS2' : 'Valorant'}</small>
                </button>
              ))}
            </div>

            <label>
              Sensibilidade atual no {GAME_LABEL[selectedGame]}
              <input type="number" min="0.01" max="20" step="0.001" value={sensitivityInput} onChange={(event) => setSensitivityInput(Number(event.target.value))} />
            </label>
            <label>DPI do mouse<input type="number" min="100" max="6400" value={dpi} onChange={(event) => setDpi(Number(event.target.value))} /></label>

            <div className="option-group mode-group" role="radiogroup" aria-label="Modo de teste">
              {(['quick', 'extensive'] as TestMode[]).map((mode) => (
                <button
                  key={mode}
                  className={testMode === mode ? 'choice-card selected' : 'choice-card'}
                  onClick={() => setTestMode(mode)}
                  type="button"
                >
                  <span>{MODE_LABEL[mode]}</span>
                  <small>{mode === 'quick' ? '5 rodadas para estimativa rápida' : '10 rodadas maior refinamento'}</small>
                </button>
              ))}
            </div>

            <div className="crosshair-picker" role="radiogroup" aria-label="Tipo de mira">
              {CROSSHAIRS.map((item) => {
                const Icon = item.icon
                return (
                  <button key={item.id} className={crosshair === item.id ? 'crosshair-option selected' : 'crosshair-option'} onClick={() => setCrosshair(item.id)} type="button">
                    <Icon size={18} />
                    <span>{item.label}</span>
                    <small>{item.description}</small>
                  </button>
                )
              })}
            </div>

            <div className="conversion">
              <span>Equivalente CS2 <strong>{format(toBaseCS(selectedGame, sensitivityInput), 3)}</strong></span>
              <span>Equivalente Valorant <strong>{format(toBaseCS(selectedGame, sensitivityInput) / VALORANT_RATIO, 3)}</strong></span>
            </div>
            <button className="primary-button wide" onClick={saveSetup}>Salvar e continuar</button>
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
            <p>Seu melhor equilíbrio entre precisão, controle e suavidade apareceu em <b>{format(recommendation, 2)}×</b> da configuração inicial no modo {MODE_LABEL[testMode]}.</p>
            <div className="recommendations">
              <div><span>Counter-Strike 2</span><strong>{format(recommendedCS, 3)}</strong></div>
              <div><span>Valorant</span><strong>{format(recommendedValorant, 3)}</strong></div>
            </div>
            <div className="result-bars">
              {[...results].sort((a, b) => b.score - a.score).map((result, index) => (
                <div key={`${index}-${result.multiplier}`}><span>{format(result.multiplier, 2)}×</span><i><b style={{ width: `${result.score}%` }} /></i><strong>{format(result.score)}</strong></div>
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
