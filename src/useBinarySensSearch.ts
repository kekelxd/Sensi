import { useCallback, useMemo, useState } from 'react'
import type { HybridTelemetry } from './hybridSensEngine'
import { calculateRoundScore, toRoundTelemetry } from './scoringPipeline'

export type FinderTelemetry = HybridTelemetry
export type FinderPhase = 'baseline' | 'macro' | 'refinement' | 'validation' | 'extension'
export type FinderTrial = { id: string, phase: FinderPhase, sensitivity: number, duration: number }
export type FinderResult = FinderTrial & FinderTelemetry & { score: number }
type FinderStage = 'ready' | 'running' | 'extending' | 'complete'

const ROUND_DURATION_SECONDS = 30
const BASE_ROUNDS = 6
const MAX_ROUNDS = 8
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
const roundSensitivity = (value: number) => Math.round(value * 1_000_000) / 1_000_000

function bestResult(results: FinderResult[]) {
  return [...results].sort((left, right) => right.score - left.score)[0]
}

function sampleConfidence(results: FinderResult[]) {
  if (!results.length) return 0
  const scores = results.map((result) => result.score)
  const mean = scores.reduce((total, score) => total + score, 0) / scores.length
  const deviation = Math.sqrt(scores.reduce((total, score) => total + (score - mean) ** 2, 0) / scores.length)
  const quality = Math.min(100, 60 + mean * .55)
  return clamp(quality - deviation * .7, 0, 100)
}

function provisionalSensitivity(results: FinderResult[]) {
  const ranked = [...results].sort((left, right) => right.score - left.score).slice(0, 2)
  if (!ranked.length) return null
  const weight = ranked.reduce((total, result) => total + Math.max(1, result.score), 0)
  return roundSensitivity(ranked.reduce((total, result) => total + result.sensitivity * Math.max(1, result.score), 0) / weight)
}

export function useBinarySensSearch() {
  const [stage, setStage] = useState<FinderStage>('ready')
  const [baseSensitivity, setBaseSensitivity] = useState<number | null>(null)
  const [trials, setTrials] = useState<FinderTrial[]>([])
  const [results, setResults] = useState<FinderResult[]>([])
  const [confidence, setConfidence] = useState<number | null>(null)
  const [extensionCenter, setExtensionCenter] = useState<number | null>(null)

  const currentTrial = trials[results.length] ?? null
  const finalSensitivity = useMemo(() => bestResult(results)?.sensitivity ?? baseSensitivity, [baseSensitivity, results])
  const totalRounds = stage === 'extending' || trials.length > BASE_ROUNDS ? MAX_ROUNDS : BASE_ROUNDS

  const start = useCallback((initialSensitivity: number) => {
    const base = roundSensitivity(initialSensitivity)
    setBaseSensitivity(base)
    setTrials([{ id: 'round-1-baseline', phase: 'baseline', sensitivity: base, duration: ROUND_DURATION_SECONDS }])
    setResults([])
    setConfidence(null)
    setExtensionCenter(null)
    setStage('running')
  }, [])

  const completeTrial = useCallback((telemetry: FinderTelemetry) => {
    if (!currentTrial || baseSensitivity === null) return
    const nextResult: FinderResult = { ...currentTrial, ...telemetry, score: calculateRoundScore(toRoundTelemetry(telemetry)) }
    const nextResults = [...results, nextResult]
    setResults(nextResults)
    const completedRounds = nextResults.length

    if (completedRounds === 1) {
      setTrials((current) => [...current, { id: 'round-2-macro-plus', phase: 'macro', sensitivity: roundSensitivity(baseSensitivity * 1.1), duration: ROUND_DURATION_SECONDS }])
      return
    }
    if (completedRounds === 2) {
      setTrials((current) => [...current, { id: 'round-3-macro-minus', phase: 'macro', sensitivity: roundSensitivity(baseSensitivity * .9), duration: ROUND_DURATION_SECONDS }])
      return
    }
    if (completedRounds === 3) {
      const macroPlus = nextResults[1]
      const macroMinus = nextResults[2]
      const positiveWon = macroPlus.score >= macroMinus.score
      const factors = positiveWon ? [1.05, 1.08] : [.95, .92]
      setTrials((current) => [...current, { id: 'round-4-refine-a', phase: 'refinement', sensitivity: roundSensitivity(baseSensitivity * factors[0]), duration: ROUND_DURATION_SECONDS }])
      return
    }
    if (completedRounds === 4) {
      const positiveWon = nextResults[1].score >= nextResults[2].score
      const factor = positiveWon ? 1.08 : .92
      setTrials((current) => [...current, { id: 'round-5-refine-b', phase: 'refinement', sensitivity: roundSensitivity(baseSensitivity * factor), duration: ROUND_DURATION_SECONDS }])
      return
    }
    if (completedRounds === 5) {
      const candidate = provisionalSensitivity(nextResults) ?? baseSensitivity
      setTrials((current) => [...current, { id: 'round-6-validation', phase: 'validation', sensitivity: candidate, duration: ROUND_DURATION_SECONDS }])
      return
    }
    if (completedRounds === 6) {
      const nextConfidence = sampleConfidence(nextResults)
      setConfidence(nextConfidence)
      const roundFour = nextResults[3]
      const roundFive = nextResults[4]
      const scoresTooClose = Math.abs(roundFour.score - roundFive.score) < 2.5
      if (nextConfidence < 85 || scoresTooClose) {
        const optimum = provisionalSensitivity(nextResults) ?? baseSensitivity
        setExtensionCenter(optimum)
        setTrials((current) => [...current, { id: 'round-7-extension-plus', phase: 'extension', sensitivity: roundSensitivity(optimum * 1.02), duration: ROUND_DURATION_SECONDS }])
        setStage('extending')
      } else setStage('complete')
      return
    }
    if (completedRounds === 7) {
      const optimum = extensionCenter ?? provisionalSensitivity(nextResults) ?? baseSensitivity
      setTrials((current) => [...current, { id: 'round-8-extension-minus', phase: 'extension', sensitivity: roundSensitivity(optimum * .98), duration: ROUND_DURATION_SECONDS }])
      return
    }
    setConfidence(sampleConfidence(nextResults))
    setStage('complete')
  }, [baseSensitivity, currentTrial, extensionCenter, results])

  const reset = useCallback(() => {
    setStage('ready'); setBaseSensitivity(null); setTrials([]); setResults([]); setConfidence(null); setExtensionCenter(null)
  }, [])

  return { stage, baseSensitivity, trials, results, currentTrial, finalSensitivity, confidence, totalRounds, start, completeTrial, reset }
}
