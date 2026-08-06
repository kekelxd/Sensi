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
export type CalibrationReason = 'confirmed' | 'close-candidates' | 'split-candidates' | 'low-consistency' | 'low-signal' | 'incomplete' | 'validation-reversed' | 'validation-split'

export type CalibrationDirection = 'lower' | 'higher' | 'near-base'
export type CalibrationZoneKind = 'confirmed' | 'continuous' | 'single' | 'split' | 'none'
export type CalibrationValidationStatus = 'confirmed' | 'split' | 'reversed' | 'unavailable'

export type CalibrationReport = {
  resultKind: CalibrationResultKind
  reason: CalibrationReason
  recommendation: number
  range: { min: number, max: number }
  zoneKind: CalibrationZoneKind
  zoneResults: CandidateResult[]
  direction: CalibrationDirection
  changePercent: number
  refinementMultipliers: number[]
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
  collectionQualityScore: number
  playerConsistencyScore: number
  recommendationStrengthScore: number
  repeatabilityScore: number
  blockAgreementScore: number
  validationAgreementScore: number | null
  validationStatus: CalibrationValidationStatus
  validationWinner: CandidateResult | null
  validationScoreGap: number | null
  validationConfirmedRounds: number
  validationAlternativeRounds: number
  validationTiedRounds: number
  validationTotalRounds: number
  separationScore: number
  scoreGap: number
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
  collectionQualityScore: number
  playerConsistencyScore: number
  recommendationStrengthScore: number
  resultKind: CalibrationResultKind
}

export type TargetSpeedMode = 'normal' | 'fast'

export const ROUND_DURATION = 20
export const ROUND_WARMUP = 2
export const SAMPLE_INTERVAL_MS = 40
export const SMOOTHNESS_SPEED_CHANGE_PER_RADIUS = 18
export const COMPETITIVE_SCORE_DELTA = 4
export const CONTIGUOUS_ZONE_SCORE_DELTA = 1.75
export const SPLIT_CANDIDATE_SCORE_DELTA = 2.5

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

const VALIDATION_BLOCK_TIE_SCORE_DELTA = 0.75
const VALIDATION_AVERAGE_TIE_SCORE_DELTA = 0.75

type ValidationSummary = {
  status: CalibrationValidationStatus
  agreementScore: number | null
  confirmedBlocks: number
  alternativeBlocks: number
  tiedBlocks: number
  totalBlocks: number
  winner: CandidateResult | null
  scoreGap: number | null
}

function calculateValidationSummary(
  measurementBest: CandidateResult,
  candidateResults: CandidateResult[],
  results: RoundResult[],
): ValidationSummary {
  const finalists = candidateResults.filter((testedValue) => testedValue.validationScore !== null)
  const validationRounds = results.filter((result) => result.valid && result.stage === 'validation')
  const blocks = [...new Set(validationRounds.map((result) => result.blockIndex))].sort((left, right) => left - right)

  if (finalists.length !== 2 || blocks.length < 2) {
    return {
      status: 'unavailable',
      agreementScore: null,
      confirmedBlocks: 0,
      alternativeBlocks: 0,
      tiedBlocks: 0,
      totalBlocks: blocks.length,
      winner: null,
      scoreGap: null,
    }
  }

  const alternative = finalists.find((testedValue) => testedValue.candidateId !== measurementBest.candidateId)
  if (!alternative) {
    return {
      status: 'unavailable',
      agreementScore: null,
      confirmedBlocks: 0,
      alternativeBlocks: 0,
      tiedBlocks: 0,
      totalBlocks: blocks.length,
      winner: null,
      scoreGap: null,
    }
  }

  let confirmedBlocks = 0
  let alternativeBlocks = 0
  let tiedBlocks = 0

  for (const blockIndex of blocks) {
    const blockRounds = validationRounds.filter((round) => round.blockIndex === blockIndex)
    const initialRound = blockRounds.find((round) => round.candidateId === measurementBest.candidateId)
    const alternativeRound = blockRounds.find((round) => round.candidateId === alternative.candidateId)

    if (!initialRound || !alternativeRound) continue
    const delta = initialRound.score - alternativeRound.score
    if (Math.abs(delta) <= VALIDATION_BLOCK_TIE_SCORE_DELTA) tiedBlocks += 1
    else if (delta > 0) confirmedBlocks += 1
    else alternativeBlocks += 1
  }

  const comparedBlocks = confirmedBlocks + alternativeBlocks + tiedBlocks
  if (comparedBlocks < 2) {
    return {
      status: 'unavailable',
      agreementScore: null,
      confirmedBlocks,
      alternativeBlocks,
      tiedBlocks,
      totalBlocks: comparedBlocks,
      winner: null,
      scoreGap: null,
    }
  }

  const initialValidation = measurementBest.validationScore ?? 0
  const alternativeValidation = alternative.validationScore ?? 0
  const averageDelta = initialValidation - alternativeValidation
  const scoreGap = Math.abs(averageDelta)
  const winner = scoreGap <= VALIDATION_AVERAGE_TIE_SCORE_DELTA
    ? null
    : averageDelta > 0 ? measurementBest : alternative

  if (confirmedBlocks === comparedBlocks) {
    return {
      status: 'confirmed',
      agreementScore: 100,
      confirmedBlocks,
      alternativeBlocks,
      tiedBlocks,
      totalBlocks: comparedBlocks,
      winner: measurementBest,
      scoreGap,
    }
  }

  if (alternativeBlocks === comparedBlocks) {
    return {
      status: 'reversed',
      agreementScore: 20,
      confirmedBlocks,
      alternativeBlocks,
      tiedBlocks,
      totalBlocks: comparedBlocks,
      winner: alternative,
      scoreGap,
    }
  }

  const initialShare = (confirmedBlocks + tiedBlocks * 0.5) / comparedBlocks
  return {
    status: 'split',
    agreementScore: Math.round(35 + initialShare * 35),
    confirmedBlocks,
    alternativeBlocks,
    tiedBlocks,
    totalBlocks: comparedBlocks,
    winner,
    scoreGap,
  }
}

function buildContinuousZone(bestResult: CandidateResult, orderedCandidates: CandidateResult[]) {
  const bestIndex = orderedCandidates.findIndex((candidate) => candidate.candidateId === bestResult.candidateId)
  if (bestIndex < 0) return [bestResult]

  const neighbors = [orderedCandidates[bestIndex - 1], orderedCandidates[bestIndex + 1]]
    .filter((candidate): candidate is CandidateResult => Boolean(candidate))
    .filter((candidate) => bestResult.score - candidate.score <= CONTIGUOUS_ZONE_SCORE_DELTA)
    .filter((candidate) => candidate.repeatability >= 42)
    .sort((left, right) => right.score - left.score)

  // A zona final deve ser estreita. Mantemos o melhor valor e, no máximo,
  // o vizinho imediato mais forte. Isso impede que toda a busca ampla seja
  // apresentada como uma faixa útil para o jogador.
  return neighbors.length
    ? [bestResult, neighbors[0]].sort((left, right) => left.multiplier - right.multiplier)
    : [bestResult]
}

function buildRefinementMultipliers(bestResult: CandidateResult, orderedCandidates: CandidateResult[]) {
  const orderedMultipliers = orderedCandidates.map((candidate) => candidate.multiplier)
  const bestIndex = orderedCandidates.findIndex((candidate) => candidate.candidateId === bestResult.candidateId)
  const spacings: number[] = []

  for (let index = 1; index < orderedMultipliers.length; index += 1) {
    const spacing = orderedMultipliers[index] - orderedMultipliers[index - 1]
    if (spacing > 0) spacings.push(spacing)
  }

  const coarseSpacing = median(spacings) || 0.1
  const refinementStep = Math.max(0.005, coarseSpacing / 2)
  const minimum = orderedMultipliers[0] ?? bestResult.multiplier
  const maximum = orderedMultipliers[orderedMultipliers.length - 1] ?? bestResult.multiplier
  let values = [bestResult.multiplier - refinementStep, bestResult.multiplier, bestResult.multiplier + refinementStep]

  if (bestIndex === 0) {
    values = [bestResult.multiplier, bestResult.multiplier + refinementStep, bestResult.multiplier + refinementStep * 2]
  } else if (bestIndex === orderedCandidates.length - 1) {
    values = [bestResult.multiplier - refinementStep * 2, bestResult.multiplier - refinementStep, bestResult.multiplier]
  }

  return [...new Set(values
    .map((value) => Math.max(minimum, Math.min(maximum, value)))
    .map((value) => Number(value.toFixed(6))))]
    .sort((left, right) => left - right)
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
  const orderedCandidates = [...valid].sort((left, right) => left.multiplier - right.multiplier)
  const bestResult = sortedByScore[0]
  const secondResult = sortedByScore[1]
  const baselineResult = valid.reduce((closest, candidate) =>
    Math.abs(candidate.multiplier - 1) < Math.abs(closest.multiplier - 1) ? candidate : closest,
  )
  const weightTotal = competitive.reduce((sum, candidate) => sum + getCompetitiveWeight(candidate, competitiveFloor), 0)
  const weighted = (selector: (candidate: CandidateResult) => number) =>
    competitive.reduce((sum, candidate) => sum + selector(candidate) * getCompetitiveWeight(candidate, competitiveFloor), 0) / weightTotal
  const validRoundCount = results.filter((result) => result.valid).length
  const expectedRoundCount = expectedMeasurementRounds + expectedValidationRounds
  const completenessScore = expectedRoundCount > 0 ? Math.min(100, validRoundCount / expectedRoundCount * 100) : 0
  const validResults = results.filter((result) => result.valid)
  const sampleQualityScore = average(validResults.map((result) => result.qualityScore))
  const repeatabilityScore = weighted((candidate) => candidate.repeatability)
  const blockAgreementScore = calculateBlockAgreement(results, orderedCandidates)
  const validationSummary = calculateValidationSummary(bestResult, candidateResults, results)
  const validationAgreementScore = validationSummary.agreementScore
  const scoreGap = secondResult ? bestResult.score - secondResult.score : COMPETITIVE_SCORE_DELTA
  const separationScore = Math.min(100, Math.max(0, scoreGap / 8 * 100))
  const collectionQualityScore = Math.round(completenessScore * 0.55 + sampleQualityScore * 0.45)
  const playerConsistencyScore = Math.round(repeatabilityScore * 0.65 + blockAgreementScore * 0.35)
  const validationComponent = validationAgreementScore ?? blockAgreementScore
  const continuousZone = buildContinuousZone(bestResult, orderedCandidates)
  const bestIndex = orderedCandidates.findIndex((candidate) => candidate.candidateId === bestResult.candidateId)
  const secondIndex = secondResult
    ? orderedCandidates.findIndex((candidate) => candidate.candidateId === secondResult.candidateId)
    : bestIndex
  const splitCandidates = Boolean(
    secondResult
    && Math.abs(bestIndex - secondIndex) > 1
    && scoreGap <= SPLIT_CANDIDATE_SCORE_DELTA,
  )

  let resultKind: CalibrationResultKind = 'inconclusive'
  let reason: CalibrationReason = 'low-signal'
  let zoneKind: CalibrationZoneKind = 'single'

  if (completenessScore < 100) {
    resultKind = 'invalid'
    reason = 'incomplete'
    zoneKind = 'none'
  } else if (bestResult.score < 40) {
    resultKind = 'inconclusive'
    reason = 'low-signal'
    zoneKind = 'single'
  } else if (repeatabilityScore < 42) {
    resultKind = 'inconclusive'
    reason = 'low-consistency'
    zoneKind = 'single'
  } else if (validationSummary.status === 'reversed') {
    resultKind = 'inconclusive'
    reason = 'validation-reversed'
    zoneKind = 'split'
  } else if (splitCandidates) {
    resultKind = 'inconclusive'
    reason = 'split-candidates'
    zoneKind = 'split'
  } else if (continuousZone.length >= 2) {
    resultKind = 'range'
    reason = 'close-candidates'
    zoneKind = 'continuous'
  } else if (validationSummary.status === 'split') {
    resultKind = 'inconclusive'
    reason = 'validation-split'
    zoneKind = 'single'
  } else if (validationSummary.status === 'confirmed' && scoreGap >= 3) {
    resultKind = 'recommended'
    reason = 'confirmed'
    zoneKind = 'confirmed'
  }

  // O ponto inicial é sempre uma sensibilidade realmente testada. A faixa fica
  // restrita à zona contínua ao redor do melhor resultado e nunca usa pontos
  // fortes separados por um valor intermediário mais fraco.
  const recommendation = bestResult.multiplier
  const zoneResults = resultKind === 'range' ? continuousZone : [bestResult]
  const range = {
    min: Math.min(...zoneResults.map((candidate) => candidate.multiplier)),
    max: Math.max(...zoneResults.map((candidate) => candidate.multiplier)),
  }
  const changePercent = (recommendation - 1) * 100
  const direction: CalibrationDirection = Math.abs(changePercent) <= 2.5
    ? 'near-base'
    : changePercent < 0 ? 'lower' : 'higher'
  const refinementMultipliers = buildRefinementMultipliers(bestResult, orderedCandidates)

  let recommendationStrengthScore = Math.round(
    separationScore * 0.35
    + validationComponent * 0.3
    + blockAgreementScore * 0.2
    + repeatabilityScore * 0.15,
  )

  // Limites obrigatórios impedem que uma coleta tecnicamente boa esconda uma
  // conclusão fraca ou contraditória.
  if (collectionQualityScore < 80) recommendationStrengthScore = Math.min(recommendationStrengthScore, 60)
  if (blockAgreementScore < 50) recommendationStrengthScore = Math.min(recommendationStrengthScore, 50)
  if (separationScore < 15) recommendationStrengthScore = Math.min(recommendationStrengthScore, 65)
  if (zoneKind === 'split') recommendationStrengthScore = Math.min(recommendationStrengthScore, 55)
  if (reason === 'validation-reversed') recommendationStrengthScore = Math.min(recommendationStrengthScore, 40)
  if (reason === 'validation-split') recommendationStrengthScore = Math.min(recommendationStrengthScore, 60)
  if (reason === 'low-consistency') recommendationStrengthScore = Math.min(recommendationStrengthScore, 55)
  if (resultKind === 'range') recommendationStrengthScore = Math.min(recommendationStrengthScore, 75)
  if (resultKind === 'inconclusive') recommendationStrengthScore = Math.min(recommendationStrengthScore, 55)
  if (resultKind === 'invalid') recommendationStrengthScore = Math.min(recommendationStrengthScore, 39)

  const confidenceScore = recommendationStrengthScore
  const confidence: CalibrationConfidence = confidenceScore >= 78
    ? 'high'
    : confidenceScore >= 60 ? 'medium' : 'exploratory'

  return {
    resultKind,
    reason,
    recommendation,
    range,
    zoneKind,
    zoneResults,
    direction,
    changePercent,
    refinementMultipliers,
    bestResult,
    baselineResult,
    candidateResults: [...candidateResults].sort((left, right) => left.multiplier - right.multiplier),
    competitiveResults: [...competitive].sort((left, right) => right.score - left.score),
    accuracy: bestResult.accuracy,
    meanError: bestResult.meanError,
    smoothness: bestResult.smoothness,
    overshoots: bestResult.overshoots,
    score: bestResult.score,
    confidence,
    confidenceScore,
    collectionQualityScore,
    playerConsistencyScore,
    recommendationStrengthScore,
    repeatabilityScore,
    blockAgreementScore,
    validationAgreementScore,
    validationStatus: validationSummary.status,
    validationWinner: validationSummary.winner,
    validationScoreGap: validationSummary.scoreGap,
    validationConfirmedRounds: validationSummary.confirmedBlocks,
    validationAlternativeRounds: validationSummary.alternativeBlocks,
    validationTiedRounds: validationSummary.tiedBlocks,
    validationTotalRounds: validationSummary.totalBlocks,
    separationScore,
    scoreGap,
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
    collectionQualityScore: report.collectionQualityScore,
    playerConsistencyScore: report.playerConsistencyScore,
    recommendationStrengthScore: report.recommendationStrengthScore,
    resultKind: report.resultKind,
  }
}

const calibrationSessionStorageKey = (game: string) => `sensi-calibration-session:v3:${game}`

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
