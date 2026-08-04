import { Activity, BrainCircuit, Crosshair, TrendingUp } from 'lucide-react'
import { buildCalibrationHeatmap, type CalibrationReport, type CalibrationSessionSummary, type RoundResult } from './calibration'
import type { GameConfig } from './games'
import { formatSensitivity, normalizeSensitivity } from './sensitivity'
import { useI18n, type TranslationKey } from './i18n'

type Props = {
  report: CalibrationReport
  results: RoundResult[]
  previous: CalibrationSessionSummary | null
  game: GameConfig
  baseSensitivity: number
  recommendedSensitivity: number
  onRedo: () => void
}

const format = (value: number, digits = 1) => Number.isFinite(value) ? value.toFixed(digits) : '0'
const signed = (value: number, suffix = '') => `${value > 0 ? '+' : ''}${format(value, 1)}${suffix}`

function getBiasKey(x: number, y: number): TranslationKey {
  if (Math.hypot(x, y) < 0.08) return 'calibration.biasCentered'
  if (Math.abs(x) > Math.abs(y) * 1.2) return x > 0 ? 'calibration.biasRight' : 'calibration.biasLeft'
  return y > 0 ? 'calibration.biasDown' : 'calibration.biasUp'
}

export function CalibrationReportView({ report, results, previous, game, baseSensitivity, recommendedSensitivity, onRedo }: Props) {
  const { t } = useI18n()
  const cells = buildCalibrationHeatmap(report.competitiveResults)
  const samples = report.competitiveResults.flatMap((result) => result.aimOffsets)
  const meanOffset = samples.reduce((sum, sample) => ({ x: sum.x + sample.x, y: sum.y + sample.y }), { x: 0, y: 0 })
  const biasX = samples.length ? meanOffset.x / samples.length : 0
  const biasY = samples.length ? meanOffset.y / samples.length : 0
  const biasKey = getBiasKey(biasX, biasY)
  const baseline = report.baselineResult
  const confidenceKey = `calibration.confidence${report.confidence[0].toUpperCase()}${report.confidence.slice(1)}` as TranslationKey
  const sortedResults = [...results].sort((a, b) => a.multiplier - b.multiplier)
  const competitiveMultipliers = report.competitiveResults.map((result) => result.multiplier)
  const minCompetitive = Math.min(...competitiveMultipliers)
  const maxCompetitive = Math.max(...competitiveMultipliers)

  return (
    <>
      <div className="calibration-result-hero">
        <div>
          <span>{game.label}</span>
          <strong>{formatSensitivity(recommendedSensitivity, 6)}</strong>
          <small>{format(report.recommendation, 3)}× {t('calibration.fromBaseSensitivity', { sensitivity: formatSensitivity(baseSensitivity, 6) })}</small>
        </div>
        <div className={`calibration-confidence confidence-${report.confidence}`}>
          <span>{t('calibration.confidence')}</span>
          <strong>{report.confidenceScore}%</strong>
          <small>{t(confidenceKey)}</small>
        </div>
      </div>

      <div className="calibration-report-dashboard">
        <div className="calibration-report-primary">
      <section className="calibration-explanation">
        <div className="report-section-heading"><div><BrainCircuit size={16} /><span>{t('calibration.whyTitle')}</span></div></div>
        <p>{t('calibration.technicalConclusion', {
          multiplier: format(report.recommendation, 3),
          min: format(minCompetitive, 2),
          max: format(maxCompetitive, 2),
          best: format(report.bestResult.multiplier, 2),
          count: report.competitiveResults.length,
        })}</p>
        <div className="calibration-reason-grid">
          <div><span>{t('common.accuracy')}</span><strong>{format(report.accuracy)}%</strong><small>{signed(report.accuracy - baseline.accuracy, ' pp')} {t('calibration.vsBase')}</small></div>
          <div><span>{t('common.meanError')}</span><strong>{format(report.meanError)}px</strong><small>{signed(report.meanError - baseline.meanError, ' px')} {t('calibration.vsBase')}</small></div>
          <div><span>{t('common.smoothness')}</span><strong>{format(report.smoothness)}%</strong><small>{signed(report.smoothness - baseline.smoothness, ' pp')} {t('calibration.vsBase')}</small></div>
          <div><span>{t('calibration.overshoots')}</span><strong>{format(report.overshoots)}</strong><small>{signed(report.overshoots - baseline.overshoots)} {t('calibration.vsBase')}</small></div>
        </div>
      </section>

        <section className="calibration-error-map">
          <div className="report-section-heading">
            <div><Crosshair size={16} /><span>{t('calibration.errorMap')}</span></div>
            <small>{t('calibration.errorMapLegend')}</small>
          </div>
          <div className="calibration-heatmap" role="img" aria-label={t('calibration.errorMap')}>
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <path d="M50 0V100M0 50H100" stroke="rgba(255,255,255,.055)" strokeWidth=".45" />
              <circle cx="50" cy="50" r="25" fill="rgba(141,251,211,.035)" stroke="rgba(141,251,211,.48)" strokeWidth=".7" />
              {cells.map((cell) => <circle key={`${cell.x}-${cell.y}`} cx={cell.x} cy={cell.y} r={1.2 + cell.intensity * 4.2} fill={cell.insideTarget ? `rgba(141,251,211,${0.2 + cell.intensity * 0.66})` : `rgba(255,114,81,${0.16 + cell.intensity * 0.64})`} />)}
              <circle cx="50" cy="50" r="1.2" fill="#f4f1ea" />
            </svg>
          </div>
          <div className="calibration-bias"><span>{t('calibration.aimBias')}</span><strong>{t(biasKey)}</strong><small>{format(Math.hypot(biasX, biasY), 2)}r</small></div>
        </section>
        </div>

        <div className="calibration-report-secondary">
        <section className="calibration-formula">
          <div className="report-section-heading"><div><Activity size={16} /><span>{t('calibration.howCalculated')}</span></div></div>
          <div className="formula-line"><span>55%</span><strong>{t('common.accuracy')}</strong></div>
          <div className="formula-line"><span>30%</span><strong>{t('calibration.errorControl')}</strong></div>
          <div className="formula-line"><span>15%</span><strong>{t('common.smoothness')}</strong></div>
          <div className="formula-line penalty"><span>−</span><strong>{t('calibration.overshootPenalty')}</strong></div>
          <p>{t('calibration.formulaExplanation')}</p>
          <small>{t('calibration.confidenceExplanation')}</small>
        </section>

      <section className="calibration-candidates">
        <div className="report-section-heading"><div><TrendingUp size={16} /><span>{t('calibration.candidateEvidence')}</span></div><small>{t('calibration.competitiveHint')}</small></div>
        <div className="candidate-table">
          <div className="candidate-table-head"><span>{t('common.sensitivity')}</span><span>{t('common.accuracy')}</span><span>{t('common.meanError')}</span><span>{t('common.smoothness')}</span><span>{t('common.score')}</span></div>
          {sortedResults.map((result) => {
            const competitive = competitiveMultipliers.includes(result.multiplier)
            const best = result === report.bestResult
            return <div key={result.multiplier} className={best ? 'best' : competitive ? 'competitive' : ''}>
              <span><b>{formatSensitivity(normalizeSensitivity(baseSensitivity * result.multiplier, game), 6)}</b><small>{format(result.multiplier, 2)}×</small></span>
              <span>{format(result.accuracy)}%</span><span>{format(result.meanError)}px</span><span>{format(result.smoothness)}%</span>
              <span><i><em style={{ width: `${result.score}%` }} /></i><b>{format(result.score)}</b></span>
            </div>
          })}
        </div>
      </section>
        </div>
      </div>

      <section className="calibration-previous">
        <div className="report-section-heading"><div><TrendingUp size={16} /><span>{t('calibration.previousSession')}</span></div></div>
        {previous ? <div>
          <span>{t('common.sensitivity')} <strong>{signed(recommendedSensitivity - previous.sensitivity)}</strong></span>
          <span>{t('common.score')} <strong>{signed(report.score - previous.score)}</strong></span>
          <span>{t('common.accuracy')} <strong>{signed(report.accuracy - previous.accuracy, ' pp')}</strong></span>
          <span>{t('common.meanError')} <strong>{signed(report.meanError - previous.meanError, ' px')}</strong></span>
        </div> : <p>{t('calibration.firstSession')}</p>}
      </section>

      <small className="disclaimer">{t('calibration.disclaimer')}</small>
      <button className="primary-button wide" onClick={onRedo}>{t('calibration.redo')}</button>
    </>
  )
}
