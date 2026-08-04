import { useEffect, useRef, useState } from 'react'
import { Activity, ArrowLeftRight, Circle, Crosshair, Dot, Gauge, Mouse, MousePointer2, Pause, Play, Plus, Settings2, Target, X, type LucideIcon } from 'lucide-react'
import { calculateRoundResult, getTargetSpeed, isCalibrationComplete, recommendMultiplier, ROUND_DURATION, ROUND_MULTIPLIERS, ROUND_WARMUP, RoundResult, TargetSpeedMode } from './calibration'
import { GAME_BY_ID, GAMES, GameId } from './games'
import { MouseButtonTest } from './MouseButtonTest'
import { PollingRateTest } from './PollingRateTest'
import { SensitivityConverter } from './SensitivityConverter'
import { normalizeSensitivity, parsePositiveNumberInput } from './sensitivity'
import { CrosshairStyle, TrackingArena, TrackingArenaHandle } from './TrackingArena'

type RoundPhase = 'idle' | 'countdown' | 'warmup' | 'running'
type AppView = 'calibration' | 'converter' | 'polling' | 'buttons'

const CROSSHAIRS: Array<{ id: CrosshairStyle, label: string, description: string, icon: LucideIcon }> = [
  { id: 'classic', label: 'Clássica', description: 'Linhas finas com centro aberto', icon: Crosshair },
  { id: 'dot', label: 'Bolinha', description: 'Ponto central limpo', icon: Dot },
  { id: 'circle', label: 'Circular', description: 'Anel com ponto central', icon: Circle },
  { id: 'plus', label: 'Cruz cheia', description: 'Mira compacta e direta', icon: Plus },
]

const SPEED_LABEL: Record<TargetSpeedMode, string> = {
  normal: 'Normal',
  fast: 'Rápido',
}

const SPEED_BADGE: Record<TargetSpeedMode, string> = {
  normal: 'Normal',
  fast: 'Rápida',
}

const format = (value: number, digits = 0) => Number.isFinite(value) ? value.toFixed(digits) : '0'

const leaveFullscreen = () => {
  if (!document.fullscreenElement) return
  const request = document.exitFullscreen?.()
  request?.catch(() => {})
}

function Metric({ label, value, suffix, tone }: { label: string, value: string, suffix?: string, tone?: string }) {
  return (
    <div className="metric">
      <div className="metric-label">{label}</div>
      <div className="metric-value" style={{ color: tone }}>{value}<small>{suffix}</small></div>
    </div>
  )
}

function App() {
  const arenaRef = useRef<TrackingArenaHandle>(null)
  const phaseRemainingMsRef = useRef(3000)
  const [view, setView] = useState<AppView>('calibration')
  const [round, setRound] = useState(0)
  const [results, setResults] = useState<RoundResult[]>([])
  const [phase, setPhase] = useState<RoundPhase>('idle')
  const [paused, setPaused] = useState(false)
  const [remaining, setRemaining] = useState(ROUND_DURATION)
  const [countdown, setCountdown] = useState(3)
  const [setupOpen, setSetupOpen] = useState(false)
  const [startAfterSetup, setStartAfterSetup] = useState(false)
  const [resultOpen, setResultOpen] = useState(false)
  const [selectedGame, setSelectedGame] = useState<GameId>('cs2')
  const [sensitivityInput, setSensitivityInput] = useState('1')
  const [confirmedGame, setConfirmedGame] = useState<GameId>('cs2')
  const [speedMode, setSpeedMode] = useState<TargetSpeedMode>('normal')
  const [selectedSpeedMode, setSelectedSpeedMode] = useState<TargetSpeedMode>('normal')
  const [baseSensitivity, setBaseSensitivity] = useState(1)
  const [crosshair, setCrosshair] = useState<CrosshairStyle>('classic')
  const [selectedCrosshair, setSelectedCrosshair] = useState<CrosshairStyle>('classic')
  const [dpi, setDpi] = useState(800)
  const [metrics, setMetrics] = useState({ accuracy: 0, meanError: 0, smoothness: 0 })

  const active = phase !== 'idle'
  const tracking = phase === 'running'
  const moving = phase === 'warmup' || phase === 'running'
  const totalRounds = ROUND_MULTIPLIERS.length
  const calibrationComplete = isCalibrationComplete(results.length, totalRounds)
  const nominalMultiplier = ROUND_MULTIPLIERS[round] ?? 1
  const targetSpeed = getTargetSpeed(speedMode)
  const recommendation = recommendMultiplier(results)
  const confirmedGameConfig = GAME_BY_ID[confirmedGame]
  const recommendedSelected = normalizeSensitivity(baseSensitivity * recommendation, confirmedGameConfig)
  const displayedCandidate = normalizeSensitivity(baseSensitivity * nominalMultiplier, confirmedGameConfig)
  const multiplier = displayedCandidate / baseSensitivity
  const selectedGameConfig = GAME_BY_ID[selectedGame]
  const parsedSensitivityInput = parsePositiveNumberInput(sensitivityInput)
  const sensitivityPreview = parsedSensitivityInput === null ? null : normalizeSensitivity(parsedSensitivityInput, selectedGameConfig)
  useEffect(() => {
    if (phase === 'idle' || paused) return

    const started = performance.now()
    const initialRemaining = phaseRemainingMsRef.current
    let transitioned = false
    const updateTimer = () => {
      const nextRemaining = Math.max(0, initialRemaining - (performance.now() - started))
      phaseRemainingMsRef.current = nextRemaining
      if (phase === 'countdown') setCountdown(Math.ceil(nextRemaining / 1000))
      else setRemaining(nextRemaining / 1000)

      if (nextRemaining > 0 || phase === 'running') return
      transitioned = true
      if (phase === 'countdown') {
        phaseRemainingMsRef.current = ROUND_WARMUP * 1000
        setRemaining(ROUND_WARMUP)
        setPhase('warmup')
      } else {
        phaseRemainingMsRef.current = ROUND_DURATION * 1000
        setRemaining(ROUND_DURATION)
        setPhase('running')
      }
    }

    updateTimer()
    const timer = window.setInterval(updateTimer, 100)
    return () => {
      window.clearInterval(timer)
      if (!transitioned) phaseRemainingMsRef.current = Math.max(0, initialRemaining - (performance.now() - started))
    }
  }, [phase, paused, round])

  const beginRound = () => {
    if (resultOpen || calibrationComplete) {
      setResultOpen(true)
      leaveFullscreen()
      return
    }
    setMetrics({ accuracy: 0, meanError: 0, smoothness: 0 })
    phaseRemainingMsRef.current = 3000
    setCountdown(3)
    setRemaining(ROUND_DURATION)
    setPaused(false)
    arenaRef.current?.requestPointerLock()
    setPhase('countdown')
  }

  const saveSetup = () => {
    if (parsedSensitivityInput === null) return
    const cleanSensitivity = normalizeSensitivity(parsedSensitivityInput, selectedGameConfig)
    const configurationChanged = selectedGame !== confirmedGame
      || cleanSensitivity !== baseSensitivity
      || selectedSpeedMode !== speedMode
      || selectedCrosshair !== crosshair
    setSensitivityInput(String(cleanSensitivity))
    setConfirmedGame(selectedGame)
    setBaseSensitivity(cleanSensitivity)
    setSpeedMode(selectedSpeedMode)
    setCrosshair(selectedCrosshair)
    if (configurationChanged && results.length) {
      setResults([])
      setRound(0)
      setResultOpen(false)
    }
    setSetupOpen(false)
    if (startAfterSetup) {
      setStartAfterSetup(false)
      beginRound()
    }
  }

  const start = () => {
    if (calibrationComplete) {
      setResultOpen(true)
      leaveFullscreen()
      return
    }
    if (!results.length) {
      setSelectedSpeedMode(speedMode)
      setSelectedCrosshair(crosshair)
      setStartAfterSetup(true)
      setSetupOpen(true)
      return
    }
    beginRound()
  }

  const openSetup = () => {
    setSelectedGame(confirmedGame)
    setSensitivityInput(String(baseSensitivity))
    setSelectedSpeedMode(speedMode)
    setSelectedCrosshair(crosshair)
    setStartAfterSetup(false)
    setSetupOpen(true)
  }

  const closeSetup = () => {
    setStartAfterSetup(false)
    setSetupOpen(false)
  }

  const completeRound = (distances: number[], speeds: number[], targetRadius: number) => {
    const result = calculateRoundResult(multiplier, distances, speeds, targetRadius)
    const nextResults = [...results, result]
    const completed = isCalibrationComplete(nextResults.length, totalRounds)
    setResults(nextResults)
    setPhase('idle')
    setRemaining(ROUND_DURATION)
    document.exitPointerLock?.()
    if (completed) {
      setRound(totalRounds - 1)
      setResultOpen(true)
      leaveFullscreen()
    } else {
      window.setTimeout(() => setRound(nextResults.length), 250)
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
    phaseRemainingMsRef.current = 3000
    document.exitPointerLock?.()
  }

  return (
    <main className={view === 'calibration' ? 'app-shell' : 'app-shell tool-shell'}>
      <header className="app-header">
        <nav className="app-tabs" aria-label="Ferramentas do $ENSI">
          <button className={view === 'calibration' ? 'active' : ''} onClick={() => setView('calibration')} disabled={active}><Crosshair size={15} /> Calibração Sensi</button>
          <button className={view === 'converter' ? 'active' : ''} onClick={() => setView('converter')} disabled={active}><ArrowLeftRight size={15} /> Conversor</button>
          <button className={view === 'polling' ? 'active' : ''} onClick={() => setView('polling')} disabled={active}><Gauge size={15} /> Polling Rate</button>
          <button className={view === 'buttons' ? 'active' : ''} onClick={() => setView('buttons')} disabled={active}><Mouse size={15} /> Teste de botões</button>
        </nav>
        <div className="brand"><span>$</span>ENSI</div>
        <div className="header-actions">
          {view === 'calibration' ? (
            <>
              <span>{results.length}/{totalRounds} rodadas</span>
              <button className="icon-button" onClick={openSetup} aria-label="Abrir configurações"><Settings2 size={17} /></button>
            </>
          ) : <span>{view === 'converter' ? 'Conversão 360°' : view === 'buttons' ? 'Diagnóstico de entrada' : 'Diagnóstico do mouse'}</span>}
        </div>
      </header>

      {view === 'calibration' ? <><section className="workspace">
        <aside className="metrics-rail">
          <div className="rail-heading"><Activity size={15} /> Ao vivo</div>
          <Metric label="Precisão" value={format(metrics.accuracy)} suffix="%" tone="#8dfbd3" />
          <Metric label="Erro médio" value={format(metrics.meanError)} suffix="px" />
          <Metric label="Suavidade" value={format(metrics.smoothness)} suffix="%" />
        </aside>

        <TrackingArena
          ref={arenaRef}
          active={active}
          moving={moving}
          scoring={tracking}
          paused={paused}
          multiplier={multiplier}
          targetSpeed={targetSpeed}
          crosshair={crosshair}
          countdownLabel={phase === 'countdown' ? String(countdown) : phase === 'warmup' ? 'AJUSTE' : ''}
          hasResults={results.length > 0}
          isComplete={calibrationComplete}
          hud={{
            round: Math.min(round + 1, totalRounds),
            totalRounds,
            accuracy: format(metrics.accuracy),
            meanError: format(metrics.meanError),
            sensitivity: format(displayedCandidate, 3),
            remaining: phase === 'countdown' ? String(countdown) : format(remaining, 1),
          }}
          onStart={start}
          onReset={reset}
          onShowResults={() => {
            setResultOpen(true)
            leaveFullscreen()
          }}
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
            <small>{GAME_BY_ID[confirmedGame].label} · {format(multiplier, 2)}× · Velocidade {SPEED_BADGE[speedMode]}</small>
          </div>
          <div className={phase === 'countdown' ? 'timer countdown-timer' : 'timer'}>
            {phase === 'countdown' ? countdown : active ? format(remaining, 1) : format(ROUND_DURATION, 1)}
            <small>{phase === 'countdown' ? '' : 's'}</small>
          </div>
          <p>
            {phase === 'countdown'
              ? 'Prepare a mão. A rodada ainda não pontua.'
              : phase === 'warmup'
                ? 'A bolinha já está em movimento. Use este segundo para encaixar o tracking.'
                : 'Faça movimentos naturais. A bolinha segue velocidade fixa com mudanças aleatórias de direção.'}
          </p>
          <div className="candidate-list">
            {ROUND_MULTIPLIERS.map((value, index) => {
              const effectiveMultiplier = normalizeSensitivity(baseSensitivity * value, confirmedGameConfig) / baseSensitivity
              return (
                <div key={`${index}-${value}`} className={index === round ? 'current' : index < results.length ? 'done' : ''}>
                  <span>{String(index + 1).padStart(2, '0')}</span><i /><b>{format(effectiveMultiplier, 2)}×</b>
                </div>
              )
            })}
          </div>
        </aside>
      </section>

      <footer>
        <div className="footer-status"><MousePointer2 size={16} /> {active ? 'Tracking ativo · se soltar, clique na arena' : `Base: ${GAME_BY_ID[confirmedGame].label}`}</div>
        <div className="controls">
          {active && <button className="secondary-button" onClick={() => setPaused((value) => !value)}>{paused ? <Play size={16} /> : <Pause size={16} />}{paused ? 'Retomar' : 'Pausar'}</button>}
        </div>
        <div className="dpi-status">DPI <b>{dpi}</b></div>
      </footer></> : view === 'converter' ? <SensitivityConverter /> : view === 'polling' ? <PollingRateTest /> : <MouseButtonTest />}

      {view === 'calibration' && setupOpen && (
        <div className="modal-backdrop">
          <section className="modal setup-modal">
            <button className="modal-close" onClick={closeSetup}><X size={18} /></button>
            <Settings2 size={22} className="modal-icon" />
            <h2>Configurar antes do teste</h2>
            <p>Escolha o jogo, informe sua sensibilidade atual e selecione a velocidade da bolinha. O teste usa {totalRounds} rodadas de {ROUND_DURATION} segundos para calibrar a mira.</p>

            <div className="option-group game-grid" role="radiogroup" aria-label="Jogo de referência">
              {GAMES.map((game) => (
                <button
                  key={game.id}
                  className={selectedGame === game.id ? 'choice-card game-choice selected' : 'choice-card game-choice'}
                  onClick={() => setSelectedGame(game.id)}
                  type="button"
                >
                  <div className={`game-logo game-logo-${game.id}`}>
                    <img src={`./game-icons/${game.iconFile ?? `${game.id}.png`}`} alt="" />
                  </div>
                  <span className="game-card-name">{game.shortLabel}</span>
                </button>
              ))}
            </div>

            <div className="setup-fields">
              <label>
                Sensibilidade atual no {selectedGameConfig.label}
                <input type="text" inputMode="decimal" value={sensitivityInput} onChange={(event) => setSensitivityInput(event.target.value)} aria-invalid={parsedSensitivityInput === null} />
              </label>
              <label>DPI do mouse<input type="number" min="100" max="6400" value={dpi} onChange={(event) => setDpi(Number(event.target.value))} /></label>
            </div>

            <div className="option-group mode-group" role="radiogroup" aria-label="Velocidade da bolinha">
              {(['normal', 'fast'] as TargetSpeedMode[]).map((mode) => (
                <button
                  key={mode}
                  className={selectedSpeedMode === mode ? 'choice-card selected' : 'choice-card'}
                  onClick={() => setSelectedSpeedMode(mode)}
                  type="button"
                >
                  <span>{SPEED_LABEL[mode]}</span>
                  <small>{mode === 'normal' ? 'Velocidade equilibrada para calibração padrão' : 'Bolinha mais rápida para tracking mais exigente'}</small>
                </button>
              ))}
            </div>

            <div className="crosshair-picker" role="radiogroup" aria-label="Tipo de mira">
              {CROSSHAIRS.map((item) => {
                const Icon = item.icon
                return (
                  <button key={item.id} className={selectedCrosshair === item.id ? 'crosshair-option selected' : 'crosshair-option'} onClick={() => setSelectedCrosshair(item.id)} type="button">
                    <Icon size={18} />
                    <span>{item.label}</span>
                    <small>{item.description}</small>
                  </button>
                )
              })}
            </div>

            <div className="conversion single-conversion">
              <span>Sensibilidade base em {selectedGameConfig.shortLabel} <strong>{sensitivityPreview === null ? '--' : format(sensitivityPreview, 3)}</strong></span>
            </div>
            <button className="primary-button wide" onClick={saveSetup} disabled={parsedSensitivityInput === null}>{startAfterSetup ? 'Salvar e iniciar teste' : 'Salvar configuração'}</button>
          </section>
        </div>
      )}

      {view === 'calibration' && resultOpen && (
        <div className="modal-backdrop">
          <section className="modal result-modal">
            <button className="modal-close" onClick={() => setResultOpen(false)}><X size={18} /></button>
            <Target size={24} className="modal-icon" />
            <div className="panel-label">Resultado</div>
            <h2>Sensibilidade recomendada</h2>
            <p>Seu melhor equilíbrio entre precisão, controle e suavidade apareceu em <b>{format(recommendation, 2)}×</b> da configuração inicial com velocidade {SPEED_BADGE[speedMode]}.</p>
            <div className="recommendations single-recommendation">
              <div><span>{GAME_BY_ID[confirmedGame].label}</span><strong>{format(recommendedSelected, 3)}</strong></div>
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
