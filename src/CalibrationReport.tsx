import { Activity, BrainCircuit, CheckCircle2, TrendingUp, TriangleAlert } from 'lucide-react'
import { type CalibrationReport, type CalibrationSessionSummary } from './calibration'
import type { GameConfig } from './games'
import { formatSensitivity } from './sensitivity'
import { useI18n, type TranslationKey } from './i18n'

type Props = {
  report: CalibrationReport
  previous: CalibrationSessionSummary | null
  game: GameConfig
  baseSensitivity: number
  recommendedSensitivity: number
  recommendedRangeMin: number
  recommendedRangeMax: number
  onRedo: () => void
}

const format = (value: number, digits = 1) => Number.isFinite(value) ? value.toFixed(digits) : '0'
const signed = (value: number, suffix = '') => `${value > 0 ? '+' : ''}${format(value, 1)}${suffix}`

const REASON_KEYS: Record<CalibrationReport['reason'], TranslationKey> = {
  confirmed: 'calibration.reasonConfirmed',
  'close-candidates': 'calibration.reasonCloseCandidates',
  'low-consistency': 'calibration.reasonLowConsistency',
  'low-signal': 'calibration.reasonLowSignal',
  incomplete: 'calibration.reasonIncomplete',
  'validation-conflict': 'calibration.reasonValidationConflict',
}

export function CalibrationReportView({
  report,
  previous,
  game,
  baseSensitivity,
  recommendedSensitivity,
  recommendedRangeMin,
  recommendedRangeMax,
  onRedo,
}: Props) {
  const { t } = useI18n()
  const baseline = report.baselineResult
  const confidenceKey = `calibration.confidence${report.confidence[0].toUpperCase()}${report.confidence.slice(1)}` as TranslationKey
  const isSingleRecommendation = report.resultKind === 'recommended'
  const resultValue = isSingleRecommendation
    ? formatSensitivity(recommendedSensitivity, 6)
    : `${formatSensitivity(recommendedRangeMin, 6)} – ${formatSensitivity(recommendedRangeMax, 6)}`
  const StatusIcon = report.resultKind === 'inconclusive' || report.resultKind === 'invalid' ? TriangleAlert : CheckCircle2

  return (
    <>
      <div className={`calibration-result-status result-${report.resultKind}`}>
        <StatusIcon size={16} />
        <span>{t(REASON_KEYS[report.reason])}</span>
      </div>

      <div className="calibration-result-hero">
        <div>
          <span>{game.label}</span>
          <strong>{resultValue}</strong>
          <small>
            {isSingleRecommendation
              ? `${format(report.recommendation, 3)}× ${t('calibration.fromBaseSensitivity', { sensitivity: formatSensitivity(baseSensitivity, 6) })}`
              : t('calibration.rangeFromBase', { min: format(report.range.min, 3), max: format(report.range.max, 3) })}
          </small>
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
            <p>{t('calibration.technicalConclusionV2', {
              rounds: report.validRoundCount,
              candidates: report.candidateResults.length,
              min: format(report.range.min, 2),
              max: format(report.range.max, 2),
              repeatability: format(report.repeatabilityScore, 0),
              validation: report.validationAgreementScore === null ? '--' : format(report.validationAgreementScore, 0),
            })}</p>
            <div className="calibration-reason-grid">
              <div><span>{t('common.accuracy')}</span><strong>{format(report.accuracy)}%</strong><small>{signed(report.accuracy - baseline.accuracy, ' pp')} {t('calibration.vsBase')}</small></div>
              <div><span>{t('common.meanError')}</span><strong>{format(report.meanError)}px</strong><small>{signed(report.meanError - baseline.meanError, ' px')} {t('calibration.vsBase')}</small></div>
              <div><span>{t('calibration.repeatability')}</span><strong>{format(report.repeatabilityScore)}%</strong><small>{t('calibration.repeatabilityHint')}</small></div>
              <div><span>{t('calibration.validationAgreement')}</span><strong>{report.validationAgreementScore === null ? '--' : `${format(report.validationAgreementScore)}%`}</strong><small>{t('calibration.validationAgreementHint')}</small></div>
            </div>
          </section>
        </div>

        <div className="calibration-report-secondary">
          <section className="calibration-formula">
            <div className="report-section-heading"><div><Activity size={16} /><span>{t('calibration.howCalculated')}</span></div></div>
            <div className="formula-line"><span>52%</span><strong>{t('common.accuracy')}</strong></div>
            <div className="formula-line"><span>33%</span><strong>{t('calibration.errorControl')}</strong></div>
            <div className="formula-line"><span>15%</span><strong>{t('common.smoothness')}</strong></div>
            <div className="formula-line penalty"><span>−</span><strong>{t('calibration.overshootPenalty')}</strong></div>
            <p>{t('calibration.formulaExplanationV2')}</p>
            <small>{t('calibration.confidenceExplanationV2')}</small>
          </section>

          <section className="calibration-candidates">
            <div className="report-section-heading"><div><TrendingUp size={16} /><span>{t('calibration.candidateEvidenceV2')}</span></div><small>{t('calibration.competitiveHintV2')}</small></div>
            <div className="candidate-table candidate-table-v2">
              <div className="candidate-table-head"><span>{t('common.sensitivity')}</span><span>{t('common.accuracy')}</span><span>{t('common.meanError')}</span><span>{t('calibration.repeatability')}</span><span>{t('common.score')}</span></div>
              {report.candidateResults.map((candidate) => {
                const competitive = report.competitiveResults.some((item) => item.candidateId === candidate.candidateId)
                const best = candidate.candidateId === report.bestResult.candidateId
                return (
                  <div key={candidate.candidateId} className={best ? 'best' : competitive ? 'competitive' : ''}>
                    <span>
                      <b>{formatSensitivity(candidate.sensitivity, 6)}</b>
                      <small>{format(candidate.multiplier, 2)}× · {candidate.measurementRounds.length}+{candidate.validationRounds.length}</small>
                    </span>
                    <span>{format(candidate.accuracy)}%</span>
                    <span>{format(candidate.meanError)}px</span>
                    <span>{format(candidate.repeatability)}%</span>
                    <span><i><em style={{ width: `${candidate.score}%` }} /></i><b>{format(candidate.score)}</b></span>
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      </div>

      <section className="calibration-quality">
        <div><span>{t('calibration.sampleQuality')}</span><strong>{format(report.sampleQualityScore)}%</strong></div>
        <div><span>{t('calibration.blockAgreement')}</span><strong>{format(report.blockAgreementScore)}%</strong></div>
        <div><span>{t('calibration.separation')}</span><strong>{format(report.separationScore)}%</strong></div>
        <div><span>{t('calibration.completedRounds')}</span><strong>{report.validRoundCount}/{report.expectedRoundCount}</strong></div>
      </section>

      {report.resultKind === 'recommended' || report.resultKind === 'range' ? (
        <section className="calibration-previous">
          <div className="report-section-heading"><div><TrendingUp size={16} /><span>{t('calibration.previousSession')}</span></div></div>
          {previous ? <div>
            <span>{t('common.sensitivity')} <strong>{signed(recommendedSensitivity - previous.sensitivity)}</strong></span>
            <span>{t('common.score')} <strong>{signed(report.score - previous.score)}</strong></span>
            <span>{t('common.accuracy')} <strong>{signed(report.accuracy - previous.accuracy, ' pp')}</strong></span>
            <span>{t('common.meanError')} <strong>{signed(report.meanError - previous.meanError, ' px')}</strong></span>
          </div> : <p>{t('calibration.firstSession')}</p>}
        </section>
      ) : null}

      <small className="disclaimer">{t('calibration.disclaimerV2')}</small>
      <button className="primary-button wide" onClick={onRedo}>{t('calibration.redo')}</button>
    </>
  )
}
