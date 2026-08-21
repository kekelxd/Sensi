import { useCallback, useMemo, useState } from 'react'
import type { GameConfig } from './games'
import { HYBRID_TRIAL_DURATION_SECONDS, type GameArchetype, type HybridTelemetry } from './hybridSensEngine'
import { brakingCost, calculateAdaptiveScore } from './scoringPipeline'
import { finderSensitivity, type CmRange } from './sensMath'

export type FinderTelemetry = HybridTelemetry

export type FinderTrial = {
  id: string
  phase: 'bracket' | 'adaptive' | 'validation'
  variant: 'A' | 'B' | 'final'
  cmPer360: number
  duration: number
}

export type FinderResult = FinderTrial & FinderTelemetry & { score: number }
type FinderStage = 'ready' | 'bracket' | 'adaptive' | 'validation' | 'complete'
const MAX_ADAPTIVE_ITERATIONS = 4
const CONVERGENCE_CM = 1.2

const midpoint = (range: CmRange) => (range.min + range.max) / 2

export function useBinarySensSearch() {
  const [stage, setStage] = useState<FinderStage>('ready')
  const [range, setRange] = useState<CmRange | null>(null)
  const [trials, setTrials] = useState<FinderTrial[]>([])
  const [results, setResults] = useState<FinderResult[]>([])
  const [adaptiveStep, setAdaptiveStep] = useState(0)
  const [archetype, setArchetype] = useState<GameArchetype>('TACTICAL')

  const currentTrial = trials[results.length] ?? null
  const finalCmPer360 = useMemo(() => {
    const validation = results.find((result) => result.phase === 'validation')
    return validation?.cmPer360 ?? (range ? midpoint(range) : null)
  }, [range, results])

  const start = useCallback((initialRange: CmRange, nextArchetype: GameArchetype) => {
    const cleanRange = { min: Math.min(initialRange.min, initialRange.max), max: Math.max(initialRange.min, initialRange.max) }
    setRange(cleanRange)
    setTrials([
      { id: 'bracket-a', phase: 'bracket', variant: 'A', cmPer360: cleanRange.min, duration: HYBRID_TRIAL_DURATION_SECONDS },
      { id: 'bracket-b', phase: 'bracket', variant: 'B', cmPer360: cleanRange.max, duration: HYBRID_TRIAL_DURATION_SECONDS },
    ])
    setResults([])
    setAdaptiveStep(0)
    setArchetype(nextArchetype)
    setStage('bracket')
  }, [])

  const completeTrial = useCallback((telemetry: FinderTelemetry) => {
    if (!currentTrial || !range) return
    const nextResult: FinderResult = { ...currentTrial, ...telemetry, score: calculateAdaptiveScore(telemetry, archetype) }
    const nextResults = [...results, nextResult]
    setResults(nextResults)

    if (currentTrial.phase === 'bracket' && currentTrial.variant === 'B') {
      const [low, high] = nextResults.filter((result) => result.phase === 'bracket')
      const center = midpoint(range)
      const nextRange = low.score >= high.score
        ? { min: range.min, max: Math.min(range.max, center + 1.5) }
        : { min: Math.max(range.min, center - 1.5), max: range.max }
      const left = (nextRange.min + midpoint(nextRange)) / 2
      const right = (midpoint(nextRange) + nextRange.max) / 2
      setRange(nextRange)
      setTrials((current) => [...current,
        { id: 'adaptive-1-a', phase: 'adaptive', variant: 'A', cmPer360: left, duration: HYBRID_TRIAL_DURATION_SECONDS },
        { id: 'adaptive-1-b', phase: 'adaptive', variant: 'B', cmPer360: right, duration: HYBRID_TRIAL_DURATION_SECONDS },
      ])
      setStage('adaptive')
      return
    }

    if (currentTrial.phase === 'adaptive' && currentTrial.variant === 'B') {
      const pair = nextResults.filter((result) => result.phase === 'adaptive').slice(-2)
      const center = midpoint(range)
      const [left, right] = pair
      const higherSensitivity = left.cmPer360 <= right.cmPer360 ? left : right
      const lowerSensitivity = higherSensitivity === left ? right : left
      // A smaller cm/360 value is physically a higher in-game sensitivity.
      const highSensitivityLosesControl = brakingCost(higherSensitivity) > brakingCost(lowerSensitivity) * 1.2
      const winner = highSensitivityLosesControl ? lowerSensitivity : left.score >= right.score ? left : right
      const nextRange = winner === left ? { min: range.min, max: center } : { min: center, max: range.max }
      const nextStep = adaptiveStep + 1
      setRange(nextRange)
      setAdaptiveStep(nextStep)
      if (nextStep >= MAX_ADAPTIVE_ITERATIONS || nextRange.max - nextRange.min < CONVERGENCE_CM) {
        setTrials((current) => [...current, { id: 'validation', phase: 'validation', variant: 'final', cmPer360: midpoint(nextRange), duration: HYBRID_TRIAL_DURATION_SECONDS }])
        setStage('validation')
      } else {
        const left = (nextRange.min + midpoint(nextRange)) / 2
        const right = (midpoint(nextRange) + nextRange.max) / 2
        setTrials((current) => [...current,
          { id: `adaptive-${nextStep + 1}-a`, phase: 'adaptive', variant: 'A', cmPer360: left, duration: HYBRID_TRIAL_DURATION_SECONDS },
          { id: `adaptive-${nextStep + 1}-b`, phase: 'adaptive', variant: 'B', cmPer360: right, duration: HYBRID_TRIAL_DURATION_SECONDS },
        ])
      }
      return
    }

    if (currentTrial.phase === 'validation') setStage('complete')
  }, [adaptiveStep, archetype, currentTrial, range, results])

  const reset = useCallback(() => {
    setStage('ready'); setRange(null); setTrials([]); setResults([]); setAdaptiveStep(0); setArchetype('TACTICAL')
  }, [])

  const sensitivity = useCallback((game: GameConfig, dpi: number) => finalCmPer360 === null ? null : finderSensitivity(game, finalCmPer360, dpi), [finalCmPer360])

  return { stage, range, trials, results, currentTrial, finalCmPer360, archetype, start, completeTrial, reset, sensitivity }
}
