import { useEffect, useRef, useState } from 'react'
import { Activity, ArrowLeftRight, Circle, Crosshair, Dot, Flame, Gauge, Languages, Mouse, MousePointer2, Pause, Play, Plus, Settings2, Target, X, type LucideIcon } from 'lucide-react'
import { calculateRoundResult, getTargetSpeed, isCalibrationComplete, recommendMultiplier, ROUND_DURATION, ROUND_MULTIPLIERS, ROUND_WARMUP, RoundResult, TargetSpeedMode } from './calibration'
import { GAME_BY_ID, GAMES, GameId } from './games'
import { MouseButtonTest } from './MouseButtonTest'
import { PollingRateTest } from './PollingRateTest'
import { SensitivityConverter } from './SensitivityConverter'
import { normalizeSensitivity, parsePositiveNumberInput } from './sensitivity'
import { CrosshairStyle, TrackingArena, TrackingArenaHandle } from './TrackingArena'
import { Warmup } from './Warmup'
import { useI18n, type Locale, type TranslationKey } from './i18n'

type RoundPhase = 'idle' | 'countdown' | 'warmup' | 'running'
type AppView = 'warmup' | 'calibration' | 'converter' | 'polling' | 'buttons'

const CROSSHAIRS: Array<{ id: CrosshairStyle, label: TranslationKey, description: TranslationKey, icon: LucideIcon }> = [
  { id: 'classic', label: 'crosshair.classic', description: 'crosshair.classicDescription', icon: Crosshair },
  { id: 'dot', label: 'crosshair.dot', description: 'crosshair.dotDescription', icon: Dot },
  { id: 'circle', label: 'crosshair.circle', description: 'crosshair.circleDescription', icon: Circle },
  { id: 'plus', label: 'crosshair.plus', description: 'crosshair.plusDescription', icon: Plus },
]

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
  const { locale, setLocale, t } = useI18n()
  const arenaRef = useRef<TrackingArenaHandle>(null)
  const phaseRemainingMsRef = useRef(3000)
  const [view, setView] = useState<AppView>('warmup')
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
        <nav className="app-tabs" aria-label="$ENSI">
          <button className={view === 'warmup' ? 'active' : ''} onClick={() => setView('warmup')} disabled={active}><Flame size={15} /> {t('nav.warmup')}</button>
          <button className={view === 'calibration' ? 'active' : ''} onClick={() => setView('calibration')} disabled={active}><Crosshair size={15} /> {t('nav.calibration')}</button>
          <button className={view === 'converter' ? 'active' : ''} onClick={() => setView('converter')} disabled={active}><ArrowLeftRight size={15} /> {t('nav.converter')}</button>
          <button className={view === 'polling' ? 'active' : ''} onClick={() => setView('polling')} disabled={active}><Gauge size={15} /> Polling Rate</button>
          <button className={view === 'buttons' ? 'active' : ''} onClick={() => setView('buttons')} disabled={active}><Mouse size={15} /> {t('nav.buttons')}</button>
        </nav>
        <div className="brand"><span>$</span>ENSI</div>
        <div className="header-actions">
          <label className="language-switcher" aria-label={t('language.selector')}>
            <Languages size={15} />
            <select value={locale} onChange={(event) => setLocale(event.target.value as Locale)} aria-label={t('language.selector')}>
              <option value="pt">Português</option><option value="en">English</option><option value="es">Español</option>
            </select>
          </label>
          {view === 'calibration' ? (
            <>
              <span>{t('header.rounds', { completed: results.length, total: totalRounds })}</span>
              <button className="icon-button" onClick={openSetup} aria-label={t('header.openSettings')}><Settings2 size={17} /></button>
            </>
          ) : view !== 'warmup' && <span>{view === 'converter' ? t('header.conversion') : view === 'buttons' ? t('header.inputDiagnostics') : t('header.mouseDiagnostics')}</span>}
        </div>
      </header>

      {view === 'warmup' ? <Warmup /> : view === 'calibration' ? <><section className="workspace">
        <aside className="metrics-rail">
          <div className="rail-heading"><Activity size={15} /> {t('calibration.live')}</div>
          <Metric label={t('common.accuracy')} value={format(metrics.accuracy)} suffix="%" tone="#8dfbd3" />
          <Metric label={t('common.meanError')} value={format(metrics.meanError)} suffix="px" />
          <Metric label={t('common.smoothness')} value={format(metrics.smoothness)} suffix="%" />
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
            <div className="panel-label">{t('calibration.roundOf', { round: Math.min(round + 1, totalRounds), total: totalRounds })}</div>
            <div className="round-progress"><i style={{ width: `${((round + (tracking ? 0.5 : 0)) / totalRounds) * 100}%` }} /></div>
          </div>
          <div className="test-value">
            <span>{t('calibration.testSensitivity')}</span>
            <strong>{format(displayedCandidate, 3)}</strong>
            <small>{GAME_BY_ID[confirmedGame].label} · {format(multiplier, 2)}× · {t('calibration.speed', { speed: speedMode === 'normal' ? t('calibration.normal') : t('calibration.fastBadge') })}</small>
          </div>
          <div className={phase === 'countdown' ? 'timer countdown-timer' : 'timer'}>
            {phase === 'countdown' ? countdown : active ? format(remaining, 1) : format(ROUND_DURATION, 1)}
            <small>{phase === 'countdown' ? '' : 's'}</small>
          </div>
          <p>
            {phase === 'countdown'
              ? t('calibration.prepareHand')
              : phase === 'warmup'
                ? t('calibration.warmup')
                : t('calibration.guidance')}
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
        <div className="footer-status">{active && <><MousePointer2 size={16} /> {t('calibration.trackingActive')}</>}</div>
        <div className="controls">
          {active && <button className="secondary-button" onClick={() => setPaused((value) => !value)}>{paused ? <Play size={16} /> : <Pause size={16} />}{paused ? t('calibration.resume') : t('calibration.pause')}</button>}
        </div>
        <div className="dpi-status">DPI <b>{dpi}</b></div>
      </footer></> : view === 'converter' ? <SensitivityConverter /> : view === 'polling' ? <PollingRateTest /> : <MouseButtonTest />}

      {view === 'calibration' && setupOpen && (
        <div className="modal-backdrop">
          <section className="modal setup-modal">
            <button className="modal-close" onClick={closeSetup} aria-label={t('common.close')}><X size={18} /></button>
            <Settings2 size={22} className="modal-icon" />
            <h2>{t('calibration.setupTitle')}</h2>
            <p>{t('calibration.setupDescription', { rounds: totalRounds, seconds: ROUND_DURATION })}</p>

            <div className="option-group game-grid" role="radiogroup" aria-label={t('common.gameReference')}>
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
                {t('calibration.currentSensitivity', { game: selectedGameConfig.label })}
                <input type="text" inputMode="decimal" value={sensitivityInput} onChange={(event) => setSensitivityInput(event.target.value)} aria-invalid={parsedSensitivityInput === null} />
              </label>
              <label>{t('common.mouseDpi')}<input type="number" min="100" max="6400" value={dpi} onChange={(event) => setDpi(Number(event.target.value))} /></label>
            </div>

            <div className="option-group mode-group" role="radiogroup" aria-label="Velocidade da bolinha">
              {(['normal', 'fast'] as TargetSpeedMode[]).map((mode) => (
                <button
                  key={mode}
                  className={selectedSpeedMode === mode ? 'choice-card selected' : 'choice-card'}
                  onClick={() => setSelectedSpeedMode(mode)}
                  type="button"
                >
                  <span>{mode === 'normal' ? t('calibration.normal') : t('calibration.fast')}</span>
                  <small>{mode === 'normal' ? t('calibration.normalDescription') : t('calibration.fastDescription')}</small>
                </button>
              ))}
            </div>

            <div className="crosshair-picker" role="radiogroup" aria-label={t('calibration.crosshairType')}>
              {CROSSHAIRS.map((item) => {
                const Icon = item.icon
                return (
                  <button key={item.id} className={selectedCrosshair === item.id ? 'crosshair-option selected' : 'crosshair-option'} onClick={() => setSelectedCrosshair(item.id)} type="button">
                    <Icon size={18} />
                    <span>{t(item.label)}</span>
                    <small>{t(item.description)}</small>
                  </button>
                )
              })}
            </div>

            <div className="conversion single-conversion">
              <span>{t('calibration.baseSensitivity', { game: selectedGameConfig.shortLabel })} <strong>{sensitivityPreview === null ? '--' : format(sensitivityPreview, 3)}</strong></span>
            </div>
            <button className="primary-button wide" onClick={saveSetup} disabled={parsedSensitivityInput === null}>{startAfterSetup ? t('calibration.saveStart') : t('calibration.save')}</button>
          </section>
        </div>
      )}

      {view === 'calibration' && resultOpen && (
        <div className="modal-backdrop">
          <section className="modal result-modal">
            <button className="modal-close" onClick={() => setResultOpen(false)} aria-label={t('common.close')}><X size={18} /></button>
            <Target size={24} className="modal-icon" />
            <div className="panel-label">{t('common.result')}</div>
            <h2>{t('calibration.resultTitle')}</h2>
            <p>{t('calibration.resultDescription', { multiplier: format(recommendation, 2), speed: speedMode === 'normal' ? t('calibration.normal') : t('calibration.fastBadge') })}</p>
            <div className="recommendations single-recommendation">
              <div><span>{GAME_BY_ID[confirmedGame].label}</span><strong>{format(recommendedSelected, 3)}</strong></div>
            </div>
            <div className="result-bars">
              {[...results].sort((a, b) => b.score - a.score).map((result, index) => (
                <div key={`${index}-${result.multiplier}`}><span>{format(result.multiplier, 2)}×</span><i><b style={{ width: `${result.score}%` }} /></i><strong>{format(result.score)}</strong></div>
              ))}
            </div>
            <small className="disclaimer">{t('calibration.disclaimer')}</small>
            <button className="primary-button wide" onClick={reset}>{t('calibration.redo')}</button>
          </section>
        </div>
      )}
    </main>
  )
}

export default App
