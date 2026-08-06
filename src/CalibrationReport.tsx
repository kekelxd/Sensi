import { Activity, BrainCircuit, CheckCircle2, Target, TrendingUp, TriangleAlert } from 'lucide-react'
import { type CalibrationReport, type CalibrationSessionSummary } from './calibration'
import type { GameConfig } from './games'
import { formatSensitivity, normalizeSensitivity } from './sensitivity'
import { useI18n, type TranslationKey } from './i18n'

type Props = {
  report: CalibrationReport
  previous: CalibrationSessionSummary | null
  game: GameConfig
  baseSensitivity: number
  recommendedSensitivity: number
  recommendedRangeMin: number
  recommendedRangeMax: number
  onRefine: () => void
  onRedo: () => void
}

const format = (value: number, digits = 1) => Number.isFinite(value) ? value.toFixed(digits) : '0'
const signed = (value: number, suffix = '') => `${value > 0 ? '+' : ''}${format(value, 1)}${suffix}`

const REASON_KEYS: Record<CalibrationReport['reason'], TranslationKey> = {
  confirmed: 'calibration.reasonConfirmed',
  'close-candidates': 'calibration.reasonCloseCandidates',
  'split-candidates': 'calibration.reasonSplitCandidates',
  'low-consistency': 'calibration.reasonLowConsistency',
  'low-signal': 'calibration.reasonLowSignal',
  incomplete: 'calibration.reasonIncomplete',
  'validation-conflict': 'calibration.reasonValidationConflict',
}

const DIRECTION_KEYS: Record<CalibrationReport['direction'], TranslationKey> = {
  lower: 'calibration.directionLower',
  higher: 'calibration.directionHigher',
  'near-base': 'calibration.directionNearBase',
}

const HERO_LABEL_KEYS: Record<CalibrationReport['resultKind'], TranslationKey> = {
  recommended: 'calibration.confirmedValue',
  range: 'calibration.startingPoint',
  inconclusive: 'calibration.bestObserved',
  invalid: 'calibration.bestObserved',
}

function getConclusionKey(report: CalibrationReport): TranslationKey {
  if (report.reason === 'confirmed') return 'calibration.conclusionConfirmed'
  if (report.reason === 'close-candidates') return 'calibration.conclusionRange'
  if (report.reason === 'split-candidates') return 'calibration.conclusionSplit'
  if (report.reason === 'validation-conflict') return 'calibration.conclusionValidationConflict'
  if (report.reason === 'low-consistency') return 'calibration.conclusionLowConsistency'
  if (report.reason === 'incomplete') return 'calibration.conclusionIncomplete'
  return 'calibration.conclusionLowSignal'
}

export function CalibrationReportView({
  report,
  previous,
  game,
  baseSensitivity,
  recommendedSensitivity,
  recommendedRangeMin,
  recommendedRangeMax,
  onRefine,
  onRedo,
}: Props) {
  const { t } = useI18n()
  const baseline = report.baselineResult
  const confidenceKey = `calibration.confidence${report.confidence[0].toUpperCase()}${report.confidence.slice(1)}` as TranslationKey
  const StatusIcon = report.resultKind === 'inconclusive' || report.resultKind === 'invalid' ? TriangleAlert : CheckCircle2
  const sortedByScore = [...report.candidateResults].sort((left, right) => right.score - left.score)
  const secondResult = sortedByScore[1] ?? report.bestResult
  const zoneIsRange = report.zoneResults.length > 1
  const rangeText = zoneIsRange
    ? `${formatSensitivity(recommendedRangeMin, 6)} – ${formatSensitivity(recommendedRangeMax, 6)}`
    : report.resultKind === 'recommended'
      ? formatSensitivity(recommendedSensitivity, 6)
      : t('calibration.refinementRequired')
  const zoneHint = zoneIsRange
    ? t('calibration.zoneHint')
    : report.resultKind === 'recommended'
      ? t('calibration.singlePointHint')
      : t('calibration.noContinuousZoneHint')
  const refinementValues = report.refinementMultipliers
    .map((multiplier) => normalizeSensitivity(baseSensitivity * multiplier, game))
    .map((sensitivity) => formatSensitivity(sensitivity, 6))
    .join(' · ')
  const directionText = t(DIRECTION_KEYS[report.direction], {
    percent: format(Math.abs(report.changePercent), 0),
    base: formatSensitivity(baseSensitivity, 6),
  })
  const validationText = report.validationTotalRounds === 0
    ? t('calibration.validationUnavailable')
    : report.validationConfirmedRounds === report.validationTotalRounds
      ? t('calibration.validationConfirmedCount', {
          confirmed: report.validationConfirmedRounds,
          total: report.validationTotalRounds,
        })
      : t('calibration.validationConflictCount', {
          confirmed: report.validationConfirmedRounds,
          total: report.validationTotalRounds,
        })
  const conclusionText = t(getConclusionKey(report), {
    best: formatSensitivity(report.bestResult.sensitivity, 6),
    second: formatSensitivity(secondResult.sensitivity, 6),
    bestScore: format(report.bestResult.score),
    secondScore: format(secondResult.score),
    gap: format(report.scoreGap),
    zoneMin: formatSensitivity(recommendedRangeMin, 6),
    zoneMax: formatSensitivity(recommendedRangeMax, 6),
    base: formatSensitivity(baseSensitivity, 6),
    repeatability: format(report.repeatabilityScore, 0),
    blockAgreement: format(report.blockAgreementScore, 0),
  })

  return (
    <>
      <div className={`calibration-result-status result-${report.resultKind}`}>
        <StatusIcon size={16} />
        <span>{t(REASON_KEYS[report.reason])}</span>
      </div>

      <div className="calibration-result-hero">
        <div>
          <span>{t(HERO_LABEL_KEYS[report.resultKind])} · {game.label}</span>
          <strong>{formatSensitivity(recommendedSensitivity, 6)}</strong>
          <small>{directionText}</small>
        </div>
        <div className={`calibration-confidence confidence-${report.confidence}`}>
          <span>{t('calibration.recommendationStrength')}</span>
          <strong>{report.recommendationStrengthScore}%</strong>
          <small>{t(confidenceKey)}</small>
        </div>
      </div>

      <section className="calibration-action-panel">
        <div className="report-section-heading"><div><Target size={16} /><span>{t('calibration.whatToDoNow')}</span></div></div>
        <div className="calibration-action-grid">
          <div>
            <span>{t('calibration.directionIndicated')}</span>
            <strong>{signed(report.changePercent, '%')}</strong>
            <small>{directionText}</small>
          </div>
          <div>
            <span>{t('calibration.adjustmentZone')}</span>
            <strong>{rangeText}</strong>
            <small>{zoneHint}</small>
          </div>
          <div>
            <span>{t('calibration.nextTest')}</span>
            <strong>{refinementValues}</strong>
            <small>{t('calibration.nextTestHint')}</small>
          </div>
          <div>
            <span>{t('calibration.finalValidation')}</span>
            <strong>{report.validationConfirmedRounds}/{report.validationTotalRounds || '—'}</strong>
            <small>{validationText}</small>
          </div>
        </div>
      </section>

      <div className="calibration-report-dashboard">
        <div className="calibration-report-primary">
          <section className="calibration-explanation">
            <div className="report-section-heading"><div><BrainCircuit size={16} /><span>{t('calibration.whyTitle')}</span></div></div>
            <p>{conclusionText}</p>
            <div className="calibration-reason-grid">
              <div><span>{t('common.accuracy')}</span><strong>{format(report.bestResult.accuracy)}%</strong><small>{signed(report.bestResult.accuracy - baseline.accuracy, ' pp')} {t('calibration.vsBase')}</small></div>
              <div><span>{t('common.meanError')}</span><strong>{format(report.bestResult.meanError)}px</strong><small>{signed(report.bestResult.meanError - baseline.meanError, ' px')} {t('calibration.vsBase')}</small></div>
              <div><span>{t('common.score')}</span><strong>{format(report.bestResult.score)}</strong><small>{t('calibration.scoreGapHint', { gap: format(report.scoreGap) })}</small></div>
              <div><span>{t('calibration.playerConsistency')}</span><strong>{format(report.playerConsistencyScore)}%</strong><small>{t('calibration.playerConsistencyHint')}</small></div>
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
            <small>{t('calibration.strengthExplanation')}</small>
          </section>

          <section className="calibration-candidates">
            <div className="report-section-heading"><div><TrendingUp size={16} /><span>{t('calibration.candidateEvidenceV2')}</span></div><small>{t('calibration.candidateTableHint')}</small></div>
            <div className="candidate-table candidate-table-v2">
              <div className="candidate-table-head"><span>{t('common.sensitivity')}</span><span>{t('common.accuracy')}</span><span>{t('common.meanError')}</span><span>{t('calibration.repeatability')}</span><span>{t('common.score')}</span></div>
              {report.candidateResults.map((candidate) => {
                const competitive = report.competitiveResults.some((item) => item.candidateId === candidate.candidateId)
                const inZone = report.zoneResults.some((item) => item.candidateId === candidate.candidateId)
                const best = candidate.candidateId === report.bestResult.candidateId
                const className = best ? 'best' : inZone ? 'zone' : competitive ? 'competitive' : ''
                return (
                  <div key={candidate.candidateId} className={className}>
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
        <div><span>{t('calibration.collectionQuality')}</span><strong>{format(report.collectionQualityScore)}%</strong><small>{t('calibration.collectionQualityHint')}</small></div>
        <div><span>{t('calibration.playerConsistency')}</span><strong>{format(report.playerConsistencyScore)}%</strong><small>{t('calibration.playerConsistencyHint')}</small></div>
        <div><span>{t('calibration.recommendationStrength')}</span><strong>{format(report.recommendationStrengthScore)}%</strong><small>{t('calibration.recommendationStrengthHint')}</small></div>
        <div><span>{t('calibration.completedRounds')}</span><strong>{report.validRoundCount}/{report.expectedRoundCount}</strong><small>{t('calibration.completedRoundsHint')}</small></div>
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

      <small className="disclaimer">{t('calibration.disclaimerV3')}</small>
      <div className="calibration-result-actions">
        <button className="secondary-button" onClick={onRedo}>{t('calibration.redo')}</button>
        <button className="primary-button" onClick={onRefine}>{t('calibration.refine')}</button>
      </div>
    </>
  )
}
