import { useMemo, useState } from 'react'
import { Check, Clipboard, Save, Settings2, Target, X } from 'lucide-react'
import { FinderCanvas } from './FinderCanvas'
import { CalibrationLanding } from './CalibrationLanding'
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
      <div className="finder-run-top"><div><span>ACHADOR CEGO DE SENSIBILIDADE</span><strong>{search.results.length + 1} / {search.trials.length}</strong></div><p>{search.currentTrial.phase === 'bracket' ? 'Descobrindo sua faixa física de controle.' : search.currentTrial.phase === 'adaptive' ? 'Afunilando a faixa com comparações A/B ocultas.' : 'Validando o resultado refinado para o perfil do jogo.'}</p></div>
      <FinderCanvas key={search.currentTrial.id} game={game} sensitivity={currentSensitivity} trial={search.currentTrial} onComplete={search.completeTrial} onExit={search.reset} />
    </section>
  }

  if (search.stage === 'complete' && sensitivity !== null && search.finalCmPer360 !== null) {
    const profile = search.finalCmPer360 >= 45 ? 'Jogador de braço' : search.finalCmPer360 <= 30 ? 'Ponta dos dedos / híbrido' : 'Jogador de pulso'
    return <section className="finder-report-workspace">
      <div className="panel-label"><Check size={15} /> ACHADOR DE SENSIBILIDADE CONCLUÍDO</div>
      <h1>Seu perfil físico de sensibilidade</h1>
      <p>As comparações cegas convergiram para uma faixa física menor que 1,5 cm/360° antes da validação final.</p>
      <div className="finder-result-hero"><div><span>Sensibilidade recomendada</span><strong>{sensitivity.toFixed(game.sensitivityStep < .01 ? 3 : 2)}</strong><small>{game.label}</small></div><div><span>Distância física</span><strong>{search.finalCmPer360.toFixed(1)} <small>cm/360°</small></strong><small>{profile}</small></div></div>
      <div className="finder-telemetry-grid">
        <div><span>Tempo no alvo</span><strong>{result ? `${result.timeOnTarget.toFixed(1)}%` : '--'}</strong></div>
        <div><span>Suavidade</span><strong>{result ? `${result.smoothness.toFixed(1)}%` : '--'}</strong></div>
        <div><span>Velocidade de correção</span><strong>{result ? result.meanSpeed.toFixed(0) : '--'}</strong></div>
        <div><span>Índice de estabilidade</span><strong>{result ? `${result.stability.toFixed(1)}%` : '--'}</strong></div>
      </div>
      <section className="finder-explanation"><Target size={17} /><p><strong>Por que este resultado:</strong> tempo no alvo e correção suave tiveram o maior peso. Ruído e ultrapassagens do alvo reduziram a pontuação em cada comparação cega, então o valor final se baseia em controle motor repetível, não em preferência por um número visível.</p></section>
      <div className="finder-report-actions"><button className="secondary-button" onClick={() => void copy()}><Clipboard size={16} /> {copied ? 'Copiado' : 'Copiar valor'}</button><button className="primary-button" onClick={save}><Save size={16} /> {saved ? 'Salvo nas configurações' : 'Salvar nas configurações'}</button><button className="secondary-button" onClick={search.reset}><RotateIcon /> Novo achador</button></div>
    </section>
  }

  return <><CalibrationLanding finder rounds="Até 11" seconds="15–20 segundos" onStart={() => setSetupOpen(true)} />
    {setupOpen && <div className="modal-backdrop"><section className="modal finder-setup-modal"><button className="modal-close" onClick={() => setSetupOpen(false)}><X size={18} /></button><Settings2 className="modal-icon" size={21} /><h2>Configure o achador</h2><p>Não é necessário informar a sensibilidade atual. Começamos pela faixa física permitida pelo seu espaço.</p>
      <label>Jogo alvo<div className="finder-game-picker">{FINDER_GAMES.map((id) => <button key={id} className={gameId === id ? 'selected' : ''} onClick={() => setGameId(id)}>{GAME_BY_ID[id].shortLabel}</button>)}</div></label>
      <label>DPI do mouse<div className="finder-dpi-picker">{DPI_PRESETS.map((value) => <button key={value} className={dpi === String(value) ? 'selected' : ''} onClick={() => setDpi(String(value))}>{value}</button>)}<input value={dpi} inputMode="numeric" onChange={(event) => setDpi(event.target.value)} aria-label="DPI personalizado" /></div></label>
      <label>Espaço disponível no mousepad<div className="finder-pad-picker">{(['small', 'medium', 'large'] as MousepadSize[]).map((size) => <button key={size} className={mousepad === size ? 'selected' : ''} onClick={() => setMousepad(size)}><strong>{size === 'small' ? 'Pequeno' : size === 'medium' ? 'Médio' : 'Grande / deskmat'}</strong><span>{MOUSEPAD_RANGES[size].min}–{MOUSEPAD_RANGES[size].max} cm/360°</span></button>)}</div></label>
      <button className="primary-button wide" disabled={!game.yaw || !Number.isFinite(parsedDpi) || parsedDpi <= 0} onClick={start}>Iniciar achador cego</button>
    </section></div>}
  </>
}

function RotateIcon() { return <span aria-hidden="true">↻</span> }
