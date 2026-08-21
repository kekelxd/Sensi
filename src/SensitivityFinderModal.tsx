import { useEffect, useState } from 'react'
import { Check, Clipboard, Save, Settings2, Target, X } from 'lucide-react'
import { FinderCanvas } from './FinderCanvas'
import { CalibrationLanding } from './CalibrationLanding'
import { GAME_BY_ID, type GameId } from './games'
import { cmPer360FromSensitivity } from './sensMath'
import { saveRecommendedSensitivity } from './settingsService'
import { useBinarySensSearch } from './useBinarySensSearch'

const FINDER_GAMES: GameId[] = ['cs2', 'valorant', 'overwatch2', 'warzone']
const DPI_PRESETS = [400, 800, 1600, 3200]

export function SensitivityFinderModal() {
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
      <div className="finder-run-top"><div><span>ROUND</span><strong>{search.results.length + 1} / {search.totalRounds}</strong></div><p>{search.currentTrial.phase === 'baseline' ? 'Criando a linha de base da sua mira.' : search.currentTrial.phase === 'macro' ? 'Comparando mudanças maiores a partir da sua sensibilidade base.' : search.currentTrial.phase === 'refinement' ? 'Refinando o lado que ficou mais estável.' : search.currentTrial.phase === 'extension' ? 'Refinando calibração para máxima consistência...' : 'Validando o melhor ponto encontrado.'}</p></div>
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
      <div className="panel-label"><Check size={15} /> CALIBRAÇÃO ADAPTATIVA CONCLUÍDA</div>
      <h1>Encontramos sua sensibilidade refinada</h1>
      <p>Partimos do seu valor atual e comparamos pequenos ajustes. O valor abaixo teve o melhor equilíbrio entre precisão, frenagem e estabilidade.</p>
      <div className="finder-result-hero"><div><span>Use esta sensibilidade</span><strong>{sensitivity.toFixed(3)}</strong><small>no {game.label}</small></div><div><span>Comparado à sua base</span><strong>{difference >= 0 ? '+' : ''}{difference.toFixed(1)}%</strong><small>{search.baseSensitivity.toFixed(3)} original</small></div></div>
      <div className="finder-telemetry-grid">
        <div><span>Confiança da amostra</span><strong>{search.confidence?.toFixed(0) ?? '--'}%</strong></div>
        <div><span>Ganho na frenagem</span><strong>{baseline && best ? `${Math.max(0, baseline.settlingTimeMs - best.settlingTimeMs).toFixed(0)} ms` : '--'}</strong></div>
        <div><span>Redução de overshoot</span><strong>{baseline && best ? `${Math.max(0, baseline.overshootPixels - best.overshootPixels).toFixed(0)} px` : '--'}</strong></div>
        <div><span>Distância física</span><strong>{cmPer360 ? `${cmPer360.toFixed(1)} cm/360°` : '--'}</strong></div>
      </div>
      <section className="finder-explanation"><Target size={17} /><p><strong>Por que escolhemos este número:</strong> ele ajudou você a acertar alvos pequenos e parar a mira com menos correções. A diferença é pequena de propósito: a ideia é melhorar seu controle sem mudar a sensação que sua mão já conhece. {baseCmPer360 && cmPer360 ? ` Sua distância mudou de ${baseCmPer360.toFixed(1)} para ${cmPer360.toFixed(1)} cm por giro.` : ''}</p></section>
      <div className="finder-report-actions"><button className="secondary-button" onClick={() => void copy()}><Clipboard size={16} /> {copied ? 'Copiado' : 'Copiar valor'}</button><button className="primary-button" onClick={save}><Save size={16} /> {saved ? 'Salvo nas configurações' : 'Salvar nas configurações'}</button><button className="secondary-button" onClick={search.reset}><RotateIcon /> Novo achador</button></div>
    </section>
  }

  return <><CalibrationLanding finder rounds="6 rounds + até 2 extras" seconds="30 segundos por round" onStart={() => setSetupOpen(true)} />
    {setupOpen && <div className="modal-backdrop"><section className="modal finder-setup-modal"><button className="modal-close" onClick={() => setSetupOpen(false)}><X size={18} /></button><Settings2 className="modal-icon" size={21} /><h2>Configure o calibrador</h2><p>Vamos partir da sua sensibilidade atual e testar ajustes pequenos para encontrar um ponto mais estável.</p>
      <label>Jogo alvo<div className="finder-game-picker">{FINDER_GAMES.map((id) => <button key={id} className={gameId === id ? 'selected' : ''} onClick={() => setGameId(id)}>{GAME_BY_ID[id].shortLabel}</button>)}</div></label>
      <label>Sensibilidade atual no {game.shortLabel}<input value={baseSensitivity} inputMode="decimal" onChange={(event) => setBaseSensitivity(event.target.value)} aria-label="Sensibilidade atual" /></label>
      <label>DPI do mouse<div className="finder-dpi-picker">{DPI_PRESETS.map((value) => <button key={value} className={dpi === String(value) ? 'selected' : ''} onClick={() => setDpi(String(value))}>{value}</button>)}<input value={dpi} inputMode="numeric" onChange={(event) => setDpi(event.target.value)} aria-label="DPI personalizado" /></div></label>
      <button className="primary-button wide" disabled={!game.yaw || !Number.isFinite(parsedDpi) || parsedDpi <= 0 || !Number.isFinite(parsedBaseSensitivity) || parsedBaseSensitivity < game.sensitivityMin || parsedBaseSensitivity > game.sensitivityMax} onClick={start}>Iniciar calibração</button>
    </section></div>}
  </>
}

function RotateIcon() { return <span aria-hidden="true">↻</span> }
