import { useMemo, useState } from 'react'
import { ArrowLeftRight, Check, Copy, Info, RefreshCw } from 'lucide-react'
import { GAME_BY_ID, GAMES, GameId } from './games'
import { convertSensitivity, formatSensitivity, isSensitivityInRange } from './sensitivity'

export function SensitivityConverter() {
  const [sourceId, setSourceId] = useState<GameId>('cs2')
  const [targetId, setTargetId] = useState<GameId>('fortnite')
  const [sourceValue, setSourceValue] = useState('1')
  const [sourceDpi, setSourceDpi] = useState('800')
  const [targetDpi, setTargetDpi] = useState('800')
  const [copied, setCopied] = useState(false)

  const source = GAME_BY_ID[sourceId]
  const target = GAME_BY_ID[targetId]
  const numericValue = Number(sourceValue.replace(',', '.'))
  const numericSourceDpi = Number(sourceDpi.replace(',', '.'))
  const numericTargetDpi = Number(targetDpi.replace(',', '.'))
  const result = useMemo(
    () => convertSensitivity(numericValue, source, target, numericSourceDpi, numericTargetDpi),
    [numericSourceDpi, numericTargetDpi, numericValue, source, target],
  )
  const formattedResult = result === null ? '--' : formatSensitivity(result)
  const estimated = Boolean(source.conversionEstimate || target.conversionEstimate)
  const invalidInput = !Number.isFinite(numericValue) || numericValue <= 0
  const invalidDpi = !Number.isFinite(numericSourceDpi) || numericSourceDpi <= 0 || !Number.isFinite(numericTargetDpi) || numericTargetDpi <= 0
  const sourceOutsideRange = Number.isFinite(numericValue) && !isSensitivityInRange(numericValue, source)
  const targetOutsideRange = result !== null && !isSensitivityInRange(result, target)

  const swapGames = () => {
    setSourceId(targetId)
    setTargetId(sourceId)
    if (result !== null) setSourceValue(formatSensitivity(result))
    setSourceDpi(targetDpi)
    setTargetDpi(sourceDpi)
    setCopied(false)
  }

  const copyResult = async () => {
    if (result === null) return
    await navigator.clipboard.writeText(formattedResult)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }

  return (
    <section className="converter-workspace">
      <div className="converter-heading">
        <div className="panel-label"><ArrowLeftRight size={15} /> Conversão 360°</div>
        <h1>Conversor de sensibilidade</h1>
        <p>Transfira sua sensibilidade de hipfire mantendo a mesma distância física para completar uma volta de 360°.</p>
      </div>

      <div className="converter-card">
        <div className="converter-side">
          <span className="converter-label">Converter de</span>
          <label className="converter-select">
            <img src={`./game-icons/${source.iconFile ?? `${source.id}.png`}`} alt="" />
            <select value={sourceId} onChange={(event) => { setSourceId(event.target.value as GameId); setCopied(false) }}>
              {GAMES.map((game) => <option key={game.id} value={game.id}>{game.label}</option>)}
            </select>
          </label>
          <div className="converter-values">
            <label className="converter-field">
              <span>Sensibilidade atual</span>
              <input type="text" inputMode="decimal" value={sourceValue} onChange={(event) => setSourceValue(event.target.value)} aria-label="Sensibilidade atual" />
            </label>
            <label className="converter-field">
              <span>DPI de origem</span>
              <input type="text" inputMode="numeric" value={sourceDpi} onChange={(event) => setSourceDpi(event.target.value)} aria-label="DPI de origem" />
            </label>
          </div>
        </div>

        <button className="converter-swap" onClick={swapGames} aria-label="Inverter jogos"><RefreshCw size={18} /></button>

        <div className="converter-side">
          <span className="converter-label">Converter para</span>
          <label className="converter-select">
            <img src={`./game-icons/${target.iconFile ?? `${target.id}.png`}`} alt="" />
            <select value={targetId} onChange={(event) => { setTargetId(event.target.value as GameId); setCopied(false) }}>
              {GAMES.map((game) => <option key={game.id} value={game.id}>{game.label}</option>)}
            </select>
          </label>
          <div className="converter-values">
            <div className="converter-field converter-result">
              <span>Sensibilidade convertida</span>
              <strong>{formattedResult}</strong>
              <button onClick={copyResult} disabled={result === null} aria-label="Copiar sensibilidade convertida">{copied ? <Check size={18} /> : <Copy size={18} />}</button>
            </div>
            <label className="converter-field">
              <span>DPI de destino</span>
              <input type="text" inputMode="numeric" value={targetDpi} onChange={(event) => setTargetDpi(event.target.value)} aria-label="DPI de destino" />
            </label>
          </div>
        </div>
      </div>

      {!source.yaw || !target.yaw ? (
        <div className="converter-notice warning"><Info size={16} /><span>Este par inclui uma escala não linear. PUBG e Battlefield 6 exigem perfil específico de FOV e configuração para uma conversão confiável.</span></div>
      ) : invalidInput ? (
        <div className="converter-notice warning"><Info size={16} /><span>Informe uma sensibilidade válida e maior que zero.</span></div>
      ) : invalidDpi ? (
        <div className="converter-notice warning"><Info size={16} /><span>Informe valores de DPI válidos e maiores que zero.</span></div>
      ) : (
        <div className={estimated || sourceOutsideRange || targetOutsideRange ? 'converter-notice warning' : 'converter-notice'}>
          <Info size={16} />
          <span>{estimated ? 'ARC Raiders usa uma equivalência aproximada. Confirme com uma volta de 360° dentro do jogo.' : sourceOutsideRange ? `A sensibilidade informada está fora do intervalo configurável de ${source.label}.` : targetOutsideRange ? `O resultado está fora do intervalo configurável de ${target.label}.` : 'Conversão linear de hipfire com ajuste de DPI. FOV e ADS podem alterar a sensação visual.'}</span>
        </div>
      )}
    </section>
  )
}
