import type { GameConfig } from './games'
import { normalizeSensitivity } from './sensitivity'

export const BASE_CANDIDATE_MULTIPLIERS = [0.8, 0.9, 1, 1.1, 1.2] as const
export const CALIBRATION_REPETITIONS = 2
export const VALIDATION_FINALIST_COUNT = 2
export const MAX_CALIBRATION_CANDIDATES = 5
export const MIN_CALIBRATION_CANDIDATES = 3
export const MAX_CANDIDATE_DEVIATION = 0.35

export type CalibrationStage = 'measurement' | 'validation'

export type CalibrationCandidate = {
  id: string
  sensitivity: number
  multiplier: number
  sourceMultiplier: number
}

export type CalibrationRoundPlan = {
  id: string
  stage: CalibrationStage
  candidateId: string
  candidateIndex: number
  blockIndex: number
  repetitionIndex: number
  trajectorySeed: number
}

export type CalibrationPlan = {
  sessionSeed: number
  candidates: CalibrationCandidate[]
  rounds: CalibrationRoundPlan[]
  repetitions: number
  measurementRoundCount: number
  validationRoundCount: number
}

const UINT32_MAX = 0xffffffff

export function createSessionSeed() {
  const cryptoApi = globalThis.crypto
  if (cryptoApi?.getRandomValues) {
    const value = new Uint32Array(1)
    cryptoApi.getRandomValues(value)
    return value[0] || 1
  }

  return (Date.now() ^ Math.floor(Math.random() * UINT32_MAX)) >>> 0 || 1
}

export function deriveSeed(seed: number, salt: number) {
  let value = (seed ^ Math.imul(salt + 1, 0x9e3779b1)) >>> 0
  value ^= value >>> 16
  value = Math.imul(value, 0x85ebca6b) >>> 0
  value ^= value >>> 13
  value = Math.imul(value, 0xc2b2ae35) >>> 0
  value ^= value >>> 16
  return value || 1
}

export function createSeededRandom(seed: number) {
  let value = seed >>> 0
  return () => {
    value += 0x6d2b79f5
    let result = value
    result = Math.imul(result ^ result >>> 15, result | 1)
    result ^= result + Math.imul(result ^ result >>> 7, result | 61)
    return ((result ^ result >>> 14) >>> 0) / 4294967296
  }
}

export function seededShuffle<T>(items: readonly T[], seed: number) {
  const shuffled = [...items]
  const random = createSeededRandom(seed)

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    const current = shuffled[index]
    shuffled[index] = shuffled[swapIndex]
    shuffled[swapIndex] = current
  }

  return shuffled
}

const sensitivityKey = (value: number) => value.toPrecision(12)

export function buildCalibrationCandidates(baseSensitivity: number, game: GameConfig) {
  const normalizedBase = normalizeSensitivity(baseSensitivity, game)
  const sensitivities = new Map<string, { sensitivity: number, sourceMultiplier: number }>()

  const addCandidate = (rawSensitivity: number, sourceMultiplier: number) => {
    const sensitivity = normalizeSensitivity(rawSensitivity, game)
    const multiplier = sensitivity / normalizedBase
    if (Math.abs(multiplier - 1) > MAX_CANDIDATE_DEVIATION) return
    sensitivities.set(sensitivityKey(sensitivity), { sensitivity, sourceMultiplier })
  }

  for (const multiplier of BASE_CANDIDATE_MULTIPLIERS) {
    addCandidate(normalizedBase * multiplier, multiplier)
  }

  // Jogos com passos grandes podem colapsar vários multiplicadores no mesmo valor.
  // Preenche as vagas com os passos configuráveis mais próximos da sensibilidade base.
  for (let distance = 1; sensitivities.size < MAX_CALIBRATION_CANDIDATES && distance <= 64; distance += 1) {
    addCandidate(normalizedBase - game.sensitivityStep * distance, 1 - distance * game.sensitivityStep / normalizedBase)
    if (sensitivities.size >= MAX_CALIBRATION_CANDIDATES) break
    addCandidate(normalizedBase + game.sensitivityStep * distance, 1 + distance * game.sensitivityStep / normalizedBase)
  }

  return [...sensitivities.values()]
    .sort((left, right) => left.sensitivity - right.sensitivity)
    .slice(0, MAX_CALIBRATION_CANDIDATES)
    .map(({ sensitivity, sourceMultiplier }) => ({
      id: `candidate-${sensitivityKey(sensitivity)}`,
      sensitivity,
      multiplier: sensitivity / normalizedBase,
      sourceMultiplier,
    }))
}

export function buildCalibrationCandidatesFromMultipliers(
  baseSensitivity: number,
  game: GameConfig,
  multipliers: readonly number[],
) {
  const normalizedBase = normalizeSensitivity(baseSensitivity, game)
  const sensitivities = new Map<string, { sensitivity: number, sourceMultiplier: number }>()

  for (const sourceMultiplier of multipliers) {
    if (!Number.isFinite(sourceMultiplier) || sourceMultiplier <= 0) continue
    const sensitivity = normalizeSensitivity(normalizedBase * sourceMultiplier, game)
    sensitivities.set(sensitivityKey(sensitivity), { sensitivity, sourceMultiplier })
  }

  return [...sensitivities.values()]
    .sort((left, right) => left.sensitivity - right.sensitivity)
    .slice(0, MAX_CALIBRATION_CANDIDATES)
    .map(({ sensitivity, sourceMultiplier }) => ({
      id: `candidate-${sensitivityKey(sensitivity)}`,
      sensitivity,
      multiplier: sensitivity / normalizedBase,
      sourceMultiplier,
    }))
}

function createPlanFromCandidates(
  candidates: CalibrationCandidate[],
  sessionSeed: number,
  repetitions: number,
): CalibrationPlan {
  const baseOrder = seededShuffle(candidates, deriveSeed(sessionSeed, 101))
  const rounds: CalibrationRoundPlan[] = []

  for (let blockIndex = 0; blockIndex < repetitions; blockIndex += 1) {
    const order = blockIndex % 2 === 0
      ? baseOrder
      : [...baseOrder].reverse()
    const trajectorySeed = deriveSeed(sessionSeed, 1000 + blockIndex)

    order.forEach((candidate, repetitionIndex) => {
      rounds.push({
        id: `measurement-${blockIndex}-${candidate.id}`,
        stage: 'measurement',
        candidateId: candidate.id,
        candidateIndex: candidates.findIndex((item) => item.id === candidate.id),
        blockIndex,
        repetitionIndex,
        trajectorySeed,
      })
    })
  }

  return {
    sessionSeed,
    candidates,
    rounds,
    repetitions,
    measurementRoundCount: rounds.length,
    validationRoundCount: 0,
  }
}

export function createCalibrationPlan(
  baseSensitivity: number,
  game: GameConfig,
  sessionSeed = createSessionSeed(),
  repetitions = CALIBRATION_REPETITIONS,
): CalibrationPlan {
  return createPlanFromCandidates(
    buildCalibrationCandidates(baseSensitivity, game),
    sessionSeed,
    repetitions,
  )
}

export function createRefinementPlan(
  baseSensitivity: number,
  game: GameConfig,
  multipliers: readonly number[],
  sessionSeed = createSessionSeed(),
  repetitions = CALIBRATION_REPETITIONS,
): CalibrationPlan {
  return createPlanFromCandidates(
    buildCalibrationCandidatesFromMultipliers(baseSensitivity, game, multipliers),
    sessionSeed,
    repetitions,
  )
}

export function appendValidationRounds(plan: CalibrationPlan, finalistIds: readonly string[]) {
  const uniqueFinalists = [...new Set(finalistIds)]
    .map((id) => plan.candidates.find((candidate) => candidate.id === id))
    .filter((candidate): candidate is CalibrationCandidate => Boolean(candidate))
    .slice(0, VALIDATION_FINALIST_COUNT)

  if (!uniqueFinalists.length || plan.validationRoundCount > 0) return plan

  const trajectorySeed = deriveSeed(plan.sessionSeed, 9001)
  const orderedFinalists = seededShuffle(uniqueFinalists, deriveSeed(plan.sessionSeed, 9002))
  const validationRounds = orderedFinalists.map((candidate, repetitionIndex): CalibrationRoundPlan => ({
    id: `validation-${candidate.id}`,
    stage: 'validation',
    candidateId: candidate.id,
    candidateIndex: plan.candidates.findIndex((item) => item.id === candidate.id),
    blockIndex: plan.repetitions,
    repetitionIndex,
    trajectorySeed,
  }))

  return {
    ...plan,
    rounds: [...plan.rounds, ...validationRounds],
    validationRoundCount: validationRounds.length,
  }
}
