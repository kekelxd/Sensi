import { useMemo, useState } from 'react'
import { Check, Clipboard, Crosshair, MousePointer2, Save, Settings2, Target, X } from 'lucide-react'
import { FinderCanvas } from './FinderCanvas'
import { GAME_BY_ID, type GameId } from './games'
import { MOUSEPAD_RANGES, type MousepadSize } from './sensMath'
import { saveRecommendedSensitivity } from './settingsService'
import { useBinarySensSearch } from './useBinarySensSearch'

const FINDER_GAMES: GameId[] = ['cs2', 'valorant', 'overwatch2', 'warzone']
const DPI_PRESETS = [400, 800, 1600, 3200]

export function SensitivityFinderModal() {
  const [setupOpen, setSetupOpen] = useState(false)
  const [gameId, setGameId] = useState<GameId>('cs2')
  const [dpi, setDpi] = useState('800')
  const [mousepad, setMousepad] = useState<MousepadSize>('medium')
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const search = useBinarySensSearch()
  const game = GAME_BY_ID[gameId]
  const parsedDpi = Number(dpi)
  const sensitivity = search.sensitivity(game, parsedDpi)
  const result = useMemo(() => search.results.at(-1), [search.results])

  const start = () => {
    if (!game.yaw || !Number.isFinite(parsedDpi) || parsedDpi <= 0) return
    setSaved(false); setCopied(false); setSetupOpen(false)
    search.start(MOUSEPAD_RANGES[mousepad])
  }
  const save = () => {
    if (sensitivity === null || search.finalCmPer360 === null) return
    saveRecommendedSensitivity(window.localStorage, { gameId, sensitivity, cmPer360: search.finalCmPer360, savedAt: new Date().toISOString() })
    setSaved(true)
  }
  const copy = async () => {
    if (sensitivity === null) return
    await navigator.clipboard?.writeText(sensitivity.toFixed(game.sensitivityStep < .01 ? 3 : 2))
    setCopied(true)
  }

  if (search.currentTrial) {
    const currentSensitivity = game.yaw ? 360 * 2.54 / (search.currentTrial.cmPer360 * parsedDpi * game.yaw) : null
    if (currentSensitivity === null) return null
    return <section className="finder-run-workspace">
      <div className="finder-run-top"><div><span>BLIND SENSITIVITY FINDER</span><strong>{search.results.length + 1} / {search.trials.length}</strong></div><p>{search.currentTrial.phase === 'bracket' ? 'Discovering your physical control range.' : search.currentTrial.phase === 'adaptive' ? 'Narrowing the range with hidden A/B comparisons.' : 'Validating the refined result for your game profile.'}</p></div>
      <FinderCanvas key={search.currentTrial.id} game={game} sensitivity={currentSensitivity} trial={search.currentTrial} onComplete={search.completeTrial} onExit={search.reset} />
    </section>
  }

  if (search.stage === 'complete' && sensitivity !== null && search.finalCmPer360 !== null) {
    const profile = search.finalCmPer360 >= 45 ? 'Arm Player' : search.finalCmPer360 <= 30 ? 'Fingertip / Hybrid' : 'Wrist Player'
    return <section className="finder-report-workspace">
      <div className="panel-label"><Check size={15} /> SENSITIVITY FINDER COMPLETE</div>
      <h1>Your physical sensitivity profile</h1>
      <p>Blind comparisons converged within a physical range smaller than 1.5 cm/360° before the final validation.</p>
      <div className="finder-result-hero"><div><span>Recommended sensitivity</span><strong>{sensitivity.toFixed(game.sensitivityStep < .01 ? 3 : 2)}</strong><small>{game.label}</small></div><div><span>Physical distance</span><strong>{search.finalCmPer360.toFixed(1)} <small>cm/360°</small></strong><small>{profile}</small></div></div>
      <div className="finder-telemetry-grid">
        <div><span>Time on target</span><strong>{result ? `${result.timeOnTarget.toFixed(1)}%` : '--'}</strong></div>
        <div><span>Smoothness</span><strong>{result ? `${result.smoothness.toFixed(1)}%` : '--'}</strong></div>
        <div><span>Correction speed</span><strong>{result ? result.meanSpeed.toFixed(0) : '--'}</strong></div>
        <div><span>Stability index</span><strong>{result ? `${result.stability.toFixed(1)}%` : '--'}</strong></div>
      </div>
      <section className="finder-explanation"><Target size={17} /><p><strong>Why this result:</strong> time on target and smooth correction carried the highest weight. Jitter and target overshoots reduced the score in every blind comparison, so the final value is based on repeatable motor control rather than a preference for a visible number.</p></section>
      <div className="finder-report-actions"><button className="secondary-button" onClick={() => void copy()}><Clipboard size={16} /> {copied ? 'Copied' : 'Copy value'}</button><button className="primary-button" onClick={save}><Save size={16} /> {saved ? 'Saved to settings' : 'Save to settings'}</button><button className="secondary-button" onClick={search.reset}><RotateIcon /> New finder</button></div>
    </section>
  }

  return <section className="finder-landing">
    <div className="finder-landing-copy"><div className="panel-label"><Crosshair size={15} /> BLIND SENSITIVITY FINDER</div><h1>Find sensitivity from your movement, not a starting number.</h1><p>Controlled A/B trials use your DPI, game yaw and available mousepad space to converge on a physical sensitivity range. Values remain hidden until the report.</p><button className="primary-button finder-start" onClick={() => setSetupOpen(true)}><MousePointer2 size={17} /> Configure finder</button></div>
    <div className="finder-method-card"><span>01</span><strong>Bracket the range</strong><p>Two hidden extremes expose control and reach limits.</p><span>02</span><strong>Binary search</strong><p>Blind A/B tracking narrows the best physical half.</p><span>03</span><strong>Validate</strong><p>A final profile-specific trial confirms the result.</p></div>
    {setupOpen && <div className="modal-backdrop"><section className="modal finder-setup-modal"><button className="modal-close" onClick={() => setSetupOpen(false)}><X size={18} /></button><Settings2 className="modal-icon" size={21} /><h2>Set up the finder</h2><p>No current sensitivity is needed. We begin with the physical range your desk space allows.</p>
      <label>Target game<div className="finder-game-picker">{FINDER_GAMES.map((id) => <button key={id} className={gameId === id ? 'selected' : ''} onClick={() => setGameId(id)}>{GAME_BY_ID[id].shortLabel}</button>)}</div></label>
      <label>Mouse DPI<div className="finder-dpi-picker">{DPI_PRESETS.map((value) => <button key={value} className={dpi === String(value) ? 'selected' : ''} onClick={() => setDpi(String(value))}>{value}</button>)}<input value={dpi} inputMode="numeric" onChange={(event) => setDpi(event.target.value)} aria-label="Custom DPI" /></div></label>
      <label>Available mousepad space<div className="finder-pad-picker">{(['small', 'medium', 'large'] as MousepadSize[]).map((size) => <button key={size} className={mousepad === size ? 'selected' : ''} onClick={() => setMousepad(size)}><strong>{size === 'small' ? 'Small' : size === 'medium' ? 'Medium' : 'Large / deskmat'}</strong><span>{MOUSEPAD_RANGES[size].min}–{MOUSEPAD_RANGES[size].max} cm/360°</span></button>)}</div></label>
      <button className="primary-button wide" disabled={!game.yaw || !Number.isFinite(parsedDpi) || parsedDpi <= 0} onClick={start}>Start blind finder</button>
    </section></div>}
  </section>
}

function RotateIcon() { return <span aria-hidden="true">↻</span> }
