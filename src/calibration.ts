import type { CalibrationCandidate, CalibrationRoundPlan } from './calibrationPlan'

export type RoundIssue = 'insufficient-samples' | 'canvas-resized' | 'unstable-frame-time' | 'too-many-interruptions'

export type RoundDiagnostics = {
  pointerLockLosses: number
  resizeCount: number
  frameCount: number
  longFrameCount: number
  inputEventCount: number
  rawInputSupported: boolean
  coalescedInputSupported: boolean
}

export type RoundCapture = {
  distances: number[]
  speeds: number[]
  targetRadius: number
  diagnostics: RoundDiagnostics
}

export type RoundResult = {
  roundId: string
  stage: CalibrationRoundPlan['stage']
  candidateId: string
  blockIndex: number
  repetitionIndex: number
  trajectorySeed: number
  sensitivity: number
  multiplier: number
  accuracy: number
  meanError: number
  smoothness: number
  overshoots: number
  score: number
  errorControl: number
  overshootPenalty: number
  sampleCount: number
  targetRadius: number
  qualityScore: number
  valid: boolean
  issues: RoundIssue[]
  diagnostics: RoundDiagnostics
}

export type CandidateResult = {
  candidateId: string
  sensitivity: number
  multiplier: number
  rounds: RoundResult[]
  measurementRounds: RoundResult[]
  validationRounds: RoundResult[]
  accuracy: number
  meanError: number
  smoothness: number
  overshoots: number
  score: number
  validationScore: number | null
  scoreDeviation: number
  repeatability: number
  qualityScore: number
  sampleCount: number
}

export type CalibrationConfidence = 'high' | 'medium' | 'exploratory'
export type CalibrationResultKind = 'recommended' | 'range' | 'inconclusive' | 'invalid'
export type CalibrationReason = 'confirmed' | 'close-candidates' | 'low-consistency' | 'low-signal' | 'incomplete' | 'validation-conflict'

export type CalibrationReport = {
  resultKind: CalibrationResultKind
  reason: CalibrationReason
  recommendation: number
  range: { min: number, max: number }
  bestResult: CandidateResult
  baselineResult: CandidateResult
  candidateResults: CandidateResult[]
  competitiveResults: CandidateResult[]
  accuracy: number
  meanError: number
  smoothness: number
  overshoots: number
  score: number
  confidence: CalibrationConfidence
  confidenceScore: number
  repeatabilityScore: number
  blockAgreementScore: number
  validationAgreementScore: number | null
  separationScore: number
  completenessScore: number
  sampleQualityScore: number
  expectedRoundCount: number
  validRoundCount: number
}

export type CalibrationSessionSummary = {
  sensitivity: number
  rangeMinSensitivity: number
  rangeMaxSensitivity: number
  multiplier: number
  score: number
  accuracy: number
  meanError: number
  smoothness: number
  overshoots: number
  confidenceScore: number
  resultKind: CalibrationResultKind
}

export type TargetSpeedMode = 'normal' | 'fast'

export const ROUND_DURATION = 20
export const ROUND_WARMUP = 2
export const SAMPLE_INTERVAL_MS = 40
export const SMOOTHNESS_SPEED_CHANGE_PER_RADIUS = 18
export const COMPETITIVE_SCORE_DELTA = 4

const clamp01 = (value: number) => Math.max(0, Math.min(1, value))
const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0

function median(values: number[]) {
  if (!values.length) return 0
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

function standardDeviation(values: number[]) {
  if (values.length < 2) return 0
  const mean = average(values)
  return Math.sqrt(average(values.map((value) => (value - mean) ** 2)))
}

export function getTargetSpeed(mode: TargetSpeedMode) {
  return mode === 'fast' ? 1.12 : 1
}

export function isCalibrationComplete(completedRounds: number, totalRounds: number) {
  return totalRounds > 0 && completedRounds >= totalRounds
}

function calculateRoundQuality(sampleCount: number, diagnostics: RoundDiagnostics) {
  const issues: RoundIssue[] = []
  const minimumSamples = Math.floor((ROUND_DURATION * 1000 / SAMPLE_INTERVAL_MS) * 0.65)
  const longFrameRatio = diagnostics.frameCount > 0 ? diagnostics.longFrameCount / diagnostics.frameCount : 0

  if (sampleCount < minimumSamples) issues.push('insufficient-samples')
  if (diagnostics.resizeCount > 0) issues.push('canvas-resized')
  if (longFrameRatio > 0.12) issues.push('unstable-frame-time')
  if (diagnostics.pointerLockLosses > 0) issues.push('too-many-interruptions')

  const sampleScore = clamp01(sampleCount / Math.max(1, ROUND_DURATION * 1000 / SAMPLE_INTERVAL_MS))
  const frameScore = clamp01(1 - longFrameRatio / 0.12)
  const interruptionScore = diagnostics.pointerLockLosses === 0 ? 1 : 0
  const resizeScore = diagnostics.resizeCount === 0 ? 1 : 0
  const qualityScore = (sampleScore * 0.4 + frameScore * 0.3 + interruptionScore * 0.2 + resizeScore * 0.1) * 100

  return { issues, qualityScore }
}

export function calculateRoundResult(
  round: CalibrationRoundPlan,
  candidate: CalibrationCandidate,
  capture: RoundCapture,
): RoundResult {
  const { distances, speeds, targetRadius, diagnostics } = capture
  const safeRadius = Math.max(1, targetRadius)
  const { issues, qualityScore } = calculateRoundQuality(distances.length, diagnostics)

  if (!distances.length) {
    return {
      roundId: round.id,
      stage: round.stage,
      candidateId: candidate.id,
      blockIndex: round.blockIndex,
      repetitionIndex: round.repetitionIndex,
      trajectorySeed: round.trajectorySeed,
      sensitivity: candidate.sensitivity,
      multiplier: candidate.multiplier,
      accuracy: 0,
      meanError: 999,
      smoothness: 0,
      overshoots: 0,
      score: 0,
      errorControl: 0,
      overshootPenalty: 0,
      sampleCount: 0,
      targetRadius: safeRadius,
      qualityScore,
      valid: false,
      issues: issues.includes('insufficient-samples') ? issues : ['insufficient-samples', ...issues],
      diagnostics,
    }
  }

  const hitCount = distances.reduce((count, distance) => count + Number(distance <= safeRadius), 0)
  const accuracy = hitCount / distances.length
  const meanError = average(distances)
  const speedChanges: number[] = []

  for (let index = 1; index < speeds.length; index += 1) {
    speedChanges.push(Math.abs(speeds[index] - speeds[index - 1]))
  }

  const robustSpeedChange = median(speedChanges)
  const smoothnessReference = Math.max(1, safeRadius * SMOOTHNESS_SPEED_CHANGE_PER_RADIUS)
  const smoothness = clamp01(1 - robustSpeedChange / smoothnessReference)
  let overshoots = 0

  for (let index = 1; index < distances.length; index += 1) {
    if (distances[index - 1] < safeRadius * 0.72 && distances[index] > safeRadius * 1.35) overshoots += 1
  }

  const errorScore = clamp01(1 - meanError / (safeRadius * 4.2))
  const overshootPenalty = Math.min(0.15, overshoots / distances.length * 3)
  const score = Math.max(0, accuracy * 0.52 + errorScore * 0.33 + smoothness * 0.15 - overshootPenalty)

  return {
    roundId: round.id,
    stage: round.stage,
    candidateId: candidate.id,
    blockIndex: round.blockIndex,
    repetitionIndex: round.repetitionIndex,
    trajectorySeed: round.trajectorySeed,
    sensitivity: candidate.sensitivity,
    multiplier: candidate.multiplier,
    accuracy: accuracy * 100,
    meanError,
    smoothness: smoothness * 100,
    overshoots,
    score: score * 100,
    errorControl: errorScore * 100,
    overshootPenalty: overshootPenalty * 100,
    sampleCount: distances.length,
    targetRadius: safeRadius,
    qualityScore,
    valid: issues.length === 0,
    issues,
    diagnostics,
  }
}

function aggregateCandidate(candidate: CalibrationCandidate, results: RoundResult[]): CandidateResult {
  const rounds = results.filter((result) => result.valid && result.candidateId === candidate.id)
  const measurementRounds = rounds.filter((result) => result.stage === 'measurement')
  const validationRounds = rounds.filter((result) => result.stage === 'validation')
  const sourceRounds = measurementRounds.length ? measurementRounds : rounds
  const measurementScores = measurementRounds.map((result) => result.score)
  const scoreDeviation = standardDeviation(measurementScores)
  const repeatability = Math.max(0, 100 - scoreDeviation * 6)

  return {
    candidateId: candidate.id,
    sensitivity: candidate.sensitivity,
    multiplier: candidate.multiplier,
    rounds,
    measurementRounds,
    validationRounds,
    accuracy: average(sourceRounds.map((result) => result.accuracy)),
    meanError: average(sourceRounds.map((result) => result.meanError)),
    smoothness: average(sourceRounds.map((result) => result.smoothness)),
    overshoots: average(sourceRounds.map((result) => result.overshoots)),
    score: average(sourceRounds.map((result) => result.score)),
    validationScore: validationRounds.length ? average(validationRounds.map((result) => result.score)) : null,
    scoreDeviation,
    repeatability,
    qualityScore: average(rounds.map((result) => result.qualityScore)),
    sampleCount: rounds.reduce((sum, result) => sum + result.sampleCount, 0),
  }
}

function getCompetitiveResults(candidateResults: CandidateResult[]) {
  const valid = candidateResults.filter((candidate) => candidate.measurementRounds.length > 0 && Number.isFinite(candidate.score))
  if (!valid.length) return { valid, competitive: valid, competitiveFloor: 0 }
  const bestScore = Math.max(...valid.map((candidate) => candidate.score))
  const competitiveFloor = bestScore - COMPETITIVE_SCORE_DELTA
  return {
    valid,
    competitive: valid.filter((candidate) => candidate.score >= competitiveFloor),
    competitiveFloor,
  }
}

const getCompetitiveWeight = (candidate: CandidateResult, competitiveFloor: number) => {
  const performanceWeight = Math.max(1, candidate.score - competitiveFloor + 1) ** 1.3
  const repeatabilityWeight = 0.65 + candidate.repeatability / 100 * 0.35
  return performanceWeight * repeatabilityWeight
}

export function recommendMultiplier(candidateResults: CandidateResult[]) {
  const { valid, competitive, competitiveFloor } = getCompetitiveResults(candidateResults)
  if (!valid.length) return 1
  const bestScore = Math.max(...valid.map((candidate) => candidate.score))
  if (bestScore <= 0) return 1

  const weightTotal = competitive.reduce((sum, candidate) => sum + getCompetitiveWeight(candidate, competitiveFloor), 0)
  const recommendation = competitive.reduce((sum, candidate) => sum + candidate.multiplier * getCompetitiveWeight(candidate, competitiveFloor), 0) / weightTotal
  const minimum = Math.min(...valid.map((candidate) => candidate.multiplier))
  const maximum = Math.max(...valid.map((candidate) => candidate.multiplier))
  return Math.min(maximum, Math.max(minimum, recommendation))
}

function calculateBlockAgreement(results: RoundResult[], orderedCandidates: CandidateResult[]) {
  const measurementResults = results.filter((result) => result.valid && result.stage === 'measurement')
  const blocks = [...new Set(measurementResults.map((result) => result.blockIndex))]
  const winners = blocks.map((blockIndex) => {
    const blockResults = measurementResults.filter((result) => result.blockIndex === blockIndex)
    return blockResults.reduce<RoundResult | null>((best, result) => !best || result.score > best.score ? result : best, null)
  }).filter((result): result is RoundResult => Boolean(result))

  if (winners.length < 2) return 50
  const uniqueWinners = new Set(winners.map((winner) => winner.candidateId))
  if (uniqueWinners.size === 1) return 100

  const indexes = winners.map((winner) => orderedCandidates.findIndex((candidate) => candidate.candidateId === winner.candidateId))
  const maximumDistance = Math.max(...indexes) - Math.min(...indexes)
  return maximumDistance <= 1 ? 70 : maximumDistance <= 2 ? 45 : 20
}

function calculateValidationAgreement(bestResult: CandidateResult, candidateResults: CandidateResult[]) {
  const finalists = candidateResults.filter((candidate) => candidate.validationScore !== null)
  if (!finalists.length) return null
  const validationWinner = finalists.reduce((best, candidate) => (candidate.validationScore ?? -Infinity) > (best.validationScore ?? -Infinity) ? candidate : best)
  if (validationWinner.candidateId === bestResult.candidateId) return 100

  const bestValidation = bestResult.validationScore
  const winnerValidation = validationWinner.validationScore
  if (bestValidation !== null && winnerValidation !== null) {
    const validationGap = winnerValidation - bestValidation
    if (validationGap <= 2) return 70
    if (validationGap <= 5 && Math.abs(validationWinner.multiplier - bestResult.multiplier) <= 0.11) return 50
  }
  return 20
}

export function buildCalibrationReport(
  results: RoundResult[],
  candidates: CalibrationCandidate[],
  expectedMeasurementRounds: number,
  expectedValidationRounds = 0,
): CalibrationReport | null {
  const candidateResults = candidates.map((candidate) => aggregateCandidate(candidate, results))
  const { valid, competitive, competitiveFloor } = getCompetitiveResults(candidateResults)
  if (!valid.length || !competitive.length) return null

  const sortedByScore = [...valid].sort((left, right) => right.score - left.score)
  const bestResult = sortedByScore[0]
  const secondResult = sortedByScore[1]
  const baselineResult = valid.reduce((closest, candidate) => Math.abs(candidate.multiplier - 1) < Math.abs(closest.multiplier - 1) ? candidate : closest)
  const weightedRecommendation = recommendMultiplier(valid)
  const weightTotal = competitive.reduce((sum, candidate) => sum + getCompetitiveWeight(candidate, competitiveFloor), 0)
  const weighted = (selector: (candidate: CandidateResult) => number) => competitive.reduce((sum, candidate) => sum + selector(candidate) * getCompetitiveWeight(candidate, competitiveFloor), 0) / weightTotal
  const validRoundCount = results.filter((result) => result.valid).length
  const expectedRoundCount = expectedMeasurementRounds + expectedValidationRounds
  const completenessScore = expectedRoundCount > 0 ? Math.min(100, validRoundCount / expectedRoundCount * 100) : 0
  const sampleQualityScore = average(results.filter((result) => result.valid).map((result) => result.qualityScore))
  const repeatabilityScore = weighted((candidate) => candidate.repeatability)
  const blockAgreementScore = calculateBlockAgreement(results, [...valid].sort((left, right) => left.multiplier - right.multiplier))
  const validationAgreementScore = calculateValidationAgreement(bestResult, candidateResults)
  const scoreGap = secondResult ? bestResult.score - secondResult.score : COMPETITIVE_SCORE_DELTA
  const separationScore = Math.min(100, Math.max(0, scoreGap / 8 * 100))

  const validationComponent = validationAgreementScore ?? blockAgreementScore
  const rawConfidenceScore = Math.round(
    completenessScore * 0.18
    + sampleQualityScore * 0.18
    + repeatabilityScore * 0.22
    + blockAgreementScore * 0.17
    + separationScore * 0.1
    + validationComponent * 0.15,
  )
  let resultKind: CalibrationResultKind = 'range'
  let reason: CalibrationReason = 'close-candidates'

  if (completenessScore < 100) {
    resultKind = 'invalid'
    reason = 'incomplete'
  } else if (bestResult.score < 40) {
    resultKind = 'inconclusive'
    reason = 'low-signal'
  } else if (repeatabilityScore < 42) {
    resultKind = 'inconclusive'
    reason = 'low-consistency'
  } else if (validationAgreementScore !== null && validationAgreementScore < 40) {
    resultKind = 'inconclusive'
    reason = 'validation-conflict'
  } else if (validationAgreementScore !== null && validationAgreementScore >= 75 && scoreGap >= 3 && rawConfidenceScore >= 68) {
    resultKind = 'recommended'
    reason = 'confirmed'
  }

  // Um resultado único usa uma sensibilidade realmente testada. A média ponderada
  // fica restrita aos resultados em faixa, onde funciona como ponto central opcional.
  const recommendation = resultKind === 'recommended'
    ? bestResult.multiplier
    : weightedRecommendation

  const rangeSource = resultKind === 'inconclusive' || resultKind === 'invalid'
    ? (() => {
        const validated = candidateResults.filter((candidate) => candidate.validationScore !== null)
        return validated.length >= 2 ? validated : sortedByScore.slice(0, Math.min(2, sortedByScore.length))
      })()
    : competitive
  const range = {
    min: Math.min(...rangeSource.map((candidate) => candidate.multiplier)),
    max: Math.max(...rangeSource.map((candidate) => candidate.multiplier)),
  }

  // Uma sessão inconclusiva não deve exibir confiança alta mesmo quando parte dos
  // indicadores internos é forte. O limite comunica a qualidade da conclusão final.
  const confidenceScore = resultKind === 'invalid'
    ? Math.min(rawConfidenceScore, 39)
    : resultKind === 'inconclusive'
      ? Math.min(rawConfidenceScore, 59)
      : rawConfidenceScore
  const confidence: CalibrationConfidence = confidenceScore >= 78 ? 'high' : confidenceScore >= 60 ? 'medium' : 'exploratory'

  return {
    resultKind,
    reason,
    recommendation,
    range,
    bestResult,
    baselineResult,
    candidateResults: [...candidateResults].sort((left, right) => left.multiplier - right.multiplier),
    competitiveResults: [...competitive].sort((left, right) => right.score - left.score),
    accuracy: weighted((candidate) => candidate.accuracy),
    meanError: weighted((candidate) => candidate.meanError),
    smoothness: weighted((candidate) => candidate.smoothness),
    overshoots: weighted((candidate) => candidate.overshoots),
    score: weighted((candidate) => candidate.score),
    confidence,
    confidenceScore,
    repeatabilityScore,
    blockAgreementScore,
    validationAgreementScore,
    separationScore,
    completenessScore,
    sampleQualityScore,
    expectedRoundCount,
    validRoundCount,
  }
}

export function selectValidationCandidateIds(report: CalibrationReport, count = 2) {
  const ordered = [...report.competitiveResults]
  for (const candidate of [...report.candidateResults].sort((left, right) => right.score - left.score)) {
    if (!ordered.some((item) => item.candidateId === candidate.candidateId)) ordered.push(candidate)
  }
  return ordered.slice(0, count).map((candidate) => candidate.candidateId)
}

export function createCalibrationSessionSummary(
  report: CalibrationReport,
  sensitivity: number,
  rangeMinSensitivity: number,
  rangeMaxSensitivity: number,
): CalibrationSessionSummary {
  return {
    sensitivity,
    rangeMinSensitivity,
    rangeMaxSensitivity,
    multiplier: report.recommendation,
    score: report.score,
    accuracy: report.accuracy,
    meanError: report.meanError,
    smoothness: report.smoothness,
    overshoots: report.overshoots,
    confidenceScore: report.confidenceScore,
    resultKind: report.resultKind,
  }
}

const calibrationSessionStorageKey = (game: string) => `sensi-calibration-session:v2:${game}`

export function readCalibrationSession(storage: Storage, game: string): CalibrationSessionSummary | null {
  try {
    const saved = storage.getItem(calibrationSessionStorageKey(game))
    if (!saved) return null
    const parsed = JSON.parse(saved) as CalibrationSessionSummary
    return Number.isFinite(parsed.sensitivity)
      && Number.isFinite(parsed.score)
      && Number.isFinite(parsed.rangeMinSensitivity)
      && Number.isFinite(parsed.rangeMaxSensitivity)
      ? parsed
      : null
  } catch {
    return null
  }
}

export function writeCalibrationSession(storage: Storage, game: string, summary: CalibrationSessionSummary) {
  try {
    storage.setItem(calibrationSessionStorageKey(game), JSON.stringify(summary))
  } catch {
    // A calibração continua funcionando quando o armazenamento local está indisponível.
  }
}
