import { useMemo, useState } from 'react'
import { ArrowLeftRight, Check, Copy, Info, RefreshCw } from 'lucide-react'
import { GAME_BY_ID, GAMES, GameId } from './games'
import { convertSensitivity, formatSensitivity, isSensitivityInRange } from './sensitivity'
import { useI18n } from './i18n'

export function SensitivityConverter() {
  const { t } = useI18n()
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
        <div className="panel-label"><ArrowLeftRight size={15} /> {t('converter.kicker')}</div>
        <h1>{t('converter.title')}</h1>
        <p>{t('converter.subtitle')}</p>
      </div>

      <div className="converter-card">
        <div className="converter-side">
          <span className="converter-label">{t('converter.from')}</span>
          <label className="converter-select">
            <img src={`./game-icons/${source.iconFile ?? `${source.id}.png`}`} alt="" />
            <select value={sourceId} onChange={(event) => { setSourceId(event.target.value as GameId); setCopied(false) }}>
              {GAMES.map((game) => <option key={game.id} value={game.id}>{game.label}</option>)}
            </select>
          </label>
          <div className="converter-values">
            <label className="converter-field">
              <span>{t('converter.currentSensitivity')}</span>
              <input type="text" inputMode="decimal" value={sourceValue} onChange={(event) => setSourceValue(event.target.value)} aria-label={t('converter.currentSensitivity')} />
            </label>
            <label className="converter-field">
              <span>{t('converter.sourceDpi')}</span>
              <input type="text" inputMode="numeric" value={sourceDpi} onChange={(event) => setSourceDpi(event.target.value)} aria-label={t('converter.sourceDpi')} />
            </label>
          </div>
        </div>

        <button className="converter-swap" onClick={swapGames} aria-label={t('converter.swap')}><RefreshCw size={18} /></button>

        <div className="converter-side">
          <span className="converter-label">{t('converter.to')}</span>
          <label className="converter-select">
            <img src={`./game-icons/${target.iconFile ?? `${target.id}.png`}`} alt="" />
            <select value={targetId} onChange={(event) => { setTargetId(event.target.value as GameId); setCopied(false) }}>
              {GAMES.map((game) => <option key={game.id} value={game.id}>{game.label}</option>)}
            </select>
          </label>
          <div className="converter-values">
            <div className="converter-field converter-result">
              <span>{t('converter.convertedSensitivity')}</span>
              <strong>{formattedResult}</strong>
              <button onClick={copyResult} disabled={result === null} aria-label={t('converter.copy')}>{copied ? <Check size={18} /> : <Copy size={18} />}</button>
            </div>
            <label className="converter-field">
              <span>{t('converter.targetDpi')}</span>
              <input type="text" inputMode="numeric" value={targetDpi} onChange={(event) => setTargetDpi(event.target.value)} aria-label={t('converter.targetDpi')} />
            </label>
          </div>
        </div>
      </div>

      {!source.yaw || !target.yaw ? (
        <div className="converter-notice warning"><Info size={16} /><span>{t('converter.nonlinear')}</span></div>
      ) : invalidInput ? (
        <div className="converter-notice warning"><Info size={16} /><span>{t('converter.invalidSensitivity')}</span></div>
      ) : invalidDpi ? (
        <div className="converter-notice warning"><Info size={16} /><span>{t('converter.invalidDpi')}</span></div>
      ) : (
        <div className={estimated || sourceOutsideRange || targetOutsideRange ? 'converter-notice warning' : 'converter-notice'}>
          <Info size={16} />
          <span>{estimated ? t('converter.estimated') : sourceOutsideRange ? t('converter.sourceRange', { game: source.label }) : targetOutsideRange ? t('converter.targetRange', { game: target.label }) : t('converter.linear')}</span>
        </div>
      )}
    </section>
  )
}
