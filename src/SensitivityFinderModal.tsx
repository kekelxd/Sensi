import { useEffect, useState } from 'react'
import { Check, Clipboard, Save, Settings2, Target, X } from 'lucide-react'
import { FinderCanvas } from './FinderCanvas'
import { CalibrationLanding } from './CalibrationLanding'
import { GAME_BY_ID, type GameId } from './games'
import { cmPer360FromSensitivity } from './sensMath'
import { saveRecommendedSensitivity } from './settingsService'
import { useBinarySensSearch } from './useBinarySensSearch'
import { useI18n } from './i18n'

const FINDER_GAMES: GameId[] = ['cs2', 'valorant', 'overwatch2', 'warzone']
const DPI_PRESETS = [400, 800, 1600, 3200]

export function SensitivityFinderModal() {
  const { t } = useI18n()
  const [setupOpen, setSetupOpen] = useState(false)
  const [gameId, setGameId] = useState<GameId>('cs2')
  const [dpi, setDpi] = useState('800')
  const [baseSensitivity, setBaseSensitivity] = useState('1')
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const search = useBinarySensSearch()
  const game = GAME_BY_ID[gameId]
  const parsedDpi = Number(dpi.replace(',', '.'))
  const parsedBaseSensitivity = Number(baseSensitivity.replace(',', '.'))
  const sensitivity = search.finalSensitivity

  useEffect(() => {
    if (search.stage !== 'complete') return
    document.exitPointerLock?.()
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
  }, [search.stage])

  const start = () => {
    if (!game.yaw || !Number.isFinite(parsedDpi) || parsedDpi <= 0 || !Number.isFinite(parsedBaseSensitivity) || parsedBaseSensitivity < game.sensitivityMin || parsedBaseSensitivity > game.sensitivityMax) return
    setSaved(false); setCopied(false); setSetupOpen(false)
    search.start(parsedBaseSensitivity)
  }
  const save = () => {
    const cmPer360 = sensitivity === null || !game.yaw ? null : cmPer360FromSensitivity(sensitivity, game.yaw, parsedDpi)
    if (sensitivity === null || cmPer360 === null) return
    saveRecommendedSensitivity(window.localStorage, { gameId, sensitivity, cmPer360, savedAt: new Date().toISOString() })
    setSaved(true)
  }
  const copy = async () => {
    if (sensitivity === null) return
    await navigator.clipboard?.writeText(sensitivity.toFixed(game.sensitivityStep < .01 ? 3 : 2))
    setCopied(true)
  }
  const exitFinder = () => {
    search.reset()
    document.exitPointerLock?.()
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
  }

  if (search.currentTrial) {
    return <section className="finder-run-workspace">
      <div className="finder-run-top"><div><span>{t('finder.round')}</span><strong>{search.results.length + 1} / {search.totalRounds}</strong></div><p>{search.currentTrial.phase === 'baseline' ? t('finder.baseline') : search.currentTrial.phase === 'macro' ? t('finder.macro') : search.currentTrial.phase === 'refinement' ? t('finder.refinement') : search.currentTrial.phase === 'extension' ? t('finder.extension') : t('finder.validation')}</p></div>
      <FinderCanvas game={game} sensitivity={search.currentTrial.sensitivity} trial={search.currentTrial} round={search.results.length + 1} onComplete={search.completeTrial} onExit={exitFinder} />
    </section>
  }

  if (search.stage === 'complete' && sensitivity !== null && search.baseSensitivity !== null) {
    const cmPer360 = game.yaw ? cmPer360FromSensitivity(sensitivity, game.yaw, parsedDpi) : null
    const baseCmPer360 = game.yaw ? cmPer360FromSensitivity(search.baseSensitivity, game.yaw, parsedDpi) : null
    const difference = (sensitivity / search.baseSensitivity - 1) * 100
    const baseline = search.results[0]
    const best = [...search.results].sort((left, right) => right.score - left.score)[0]
    return <section className="finder-report-workspace">
      <div className="panel-label"><Check size={15} /> {t('finder.complete')}</div>
      <h1>{t('finder.resultTitle')}</h1>
      <p>{t('finder.resultDescription')}</p>
      <div className="finder-result-hero"><div><span>{t('finder.useSensitivity')}</span><strong>{sensitivity.toFixed(3)}</strong><small>{game.label}</small></div><div><span>{t('finder.comparedBase')}</span><strong>{difference >= 0 ? '+' : ''}{difference.toFixed(1)}%</strong><small>{t('finder.original', { value: search.baseSensitivity.toFixed(3) })}</small></div></div>
      <div className="finder-telemetry-grid">
        <div><span>{t('finder.confidence')}</span><strong>{search.confidence?.toFixed(0) ?? '--'}%</strong></div>
        <div><span>{t('finder.brakingGain')}</span><strong>{baseline && best ? `${Math.max(0, baseline.settlingTimeMs - best.settlingTimeMs).toFixed(0)} ms` : '--'}</strong></div>
        <div><span>{t('finder.overshootReduction')}</span><strong>{baseline && best ? `${Math.max(0, baseline.overshootPixels - best.overshootPixels).toFixed(0)} px` : '--'}</strong></div>
        <div><span>{t('finder.physicalDistance')}</span><strong>{cmPer360 ? `${cmPer360.toFixed(1)} cm/360°` : '--'}</strong></div>
      </div>
      <section className="finder-explanation"><Target size={17} /><p><strong>{t('finder.why')}</strong> {t('finder.whyDescription')} {baseCmPer360 && cmPer360 ? t('finder.distanceChanged', { from: baseCmPer360.toFixed(1), to: cmPer360.toFixed(1) }) : ''}</p></section>
      <div className="finder-report-actions"><button className="secondary-button" onClick={() => void copy()}><Clipboard size={16} /> {copied ? t('finder.copied') : t('finder.copy')}</button><button className="primary-button" onClick={save}><Save size={16} /> {saved ? t('finder.saved') : t('finder.save')}</button><button className="secondary-button" onClick={search.reset}><RotateIcon /> {t('finder.new')}</button></div>
    </section>
  }

  return <><CalibrationLanding finder rounds="6 + 2" seconds="30s" onStart={() => setSetupOpen(true)} />
    {setupOpen && <div className="modal-backdrop"><section className="modal finder-setup-modal"><button className="modal-close" onClick={() => setSetupOpen(false)} aria-label={t('common.close')}><X size={18} /></button><Settings2 className="modal-icon" size={21} /><h2>{t('finder.setupTitle')}</h2><p>{t('finder.setupDescription')}</p>
      <label>{t('finder.targetGame')}<div className="finder-game-picker">{FINDER_GAMES.map((id) => <button key={id} className={gameId === id ? 'selected' : ''} onClick={() => setGameId(id)}>{GAME_BY_ID[id].shortLabel}</button>)}</div></label>
      <label>{t('finder.currentSensitivity', { game: game.shortLabel })}<input value={baseSensitivity} inputMode="decimal" onChange={(event) => setBaseSensitivity(event.target.value)} aria-label={t('finder.currentSensitivity', { game: game.shortLabel })} /></label>
      <label>{t('common.mouseDpi')}<div className="finder-dpi-picker">{DPI_PRESETS.map((value) => <button key={value} className={dpi === String(value) ? 'selected' : ''} onClick={() => setDpi(String(value))}>{value}</button>)}<input value={dpi} inputMode="numeric" onChange={(event) => setDpi(event.target.value)} aria-label={t('common.mouseDpi')} /></div></label>
      <button className="primary-button wide" disabled={!game.yaw || !Number.isFinite(parsedDpi) || parsedDpi <= 0 || !Number.isFinite(parsedBaseSensitivity) || parsedBaseSensitivity < game.sensitivityMin || parsedBaseSensitivity > game.sensitivityMax} onClick={start}>{t('finder.start')}</button>
    </section></div>}
  </>
}

function RotateIcon() { return <span aria-hidden="true">↻</span> }
