import { useMemo, useState } from 'react'
import { ArrowLeftRight, Check, Copy, Info, RefreshCw } from 'lucide-react'
import { GAME_BY_ID, GAMES, GameId } from './games'

const formatSensitivity = (value: number) => value.toFixed(6).replace(/\.?0+$/, '')

export function SensitivityConverter() {
  const [sourceId, setSourceId] = useState<GameId>('cs2')
  const [targetId, setTargetId] = useState<GameId>('fortnite')
  const [sourceValue, setSourceValue] = useState('1')
  const [copied, setCopied] = useState(false)

  const source = GAME_BY_ID[sourceId]
  const target = GAME_BY_ID[targetId]
  const numericValue = Number(sourceValue.replace(',', '.'))
  const canConvert = Number.isFinite(numericValue) && numericValue >= 0 && source.yaw && target.yaw
  const result = useMemo(() => canConvert ? numericValue * source.yaw! / target.yaw! : null, [canConvert, numericValue, source.yaw, target.yaw])
  const formattedResult = result === null ? '--' : formatSensitivity(result)
  const estimated = Boolean(source.conversionEstimate || target.conversionEstimate)
  const outsideRange = result !== null && (result < target.sensitivityMin || result > target.sensitivityMax)

  const swapGames = () => {
    setSourceId(targetId)
    setTargetId(sourceId)
    if (result !== null) setSourceValue(formatSensitivity(result))
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
          <label className="converter-field">
            <span>Sensibilidade atual</span>
            <input type="text" inputMode="decimal" value={sourceValue} onChange={(event) => setSourceValue(event.target.value)} aria-label="Sensibilidade atual" />
          </label>
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
          <div className="converter-field converter-result">
            <span>Sensibilidade convertida</span>
            <strong>{formattedResult}</strong>
            <button onClick={copyResult} disabled={result === null} aria-label="Copiar sensibilidade convertida">{copied ? <Check size={18} /> : <Copy size={18} />}</button>
          </div>
        </div>
      </div>

      {!source.yaw || !target.yaw ? (
        <div className="converter-notice warning"><Info size={16} /><span>Este par inclui uma escala não linear. PUBG e Battlefield 6 exigem perfil específico de FOV e configuração para uma conversão confiável.</span></div>
      ) : (
        <div className={estimated || outsideRange ? 'converter-notice warning' : 'converter-notice'}>
          <Info size={16} />
          <span>{estimated ? 'ARC Raiders usa uma equivalência aproximada. Confirme com uma volta de 360° dentro do jogo.' : outsideRange ? `O resultado está fora do intervalo configurável de ${target.label}.` : 'Conversão linear de hipfire. DPI igual nos dois jogos; FOV e ADS podem alterar a sensação visual.'}</span>
        </div>
      )}
    </section>
  )
}
