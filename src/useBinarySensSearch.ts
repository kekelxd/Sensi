import { useCallback, useMemo, useState } from 'react'
import type { GameConfig } from './games'
import { finderScore, finderSensitivity, type CmRange } from './sensMath'

export type FinderTelemetry = {
  timeOnTarget: number
  smoothness: number
  jitter: number
  overshoots: number
  meanSpeed: number
  stability: number
}

export type FinderTrial = {
  id: string
  phase: 'bracket' | 'adaptive' | 'validation'
  variant: 'A' | 'B' | 'final'
  cmPer360: number
  duration: number
}

export type FinderResult = FinderTrial & FinderTelemetry & { score: number }
type FinderStage = 'ready' | 'bracket' | 'adaptive' | 'validation' | 'complete'

const midpoint = (range: CmRange) => (range.min + range.max) / 2

export function useBinarySensSearch() {
  const [stage, setStage] = useState<FinderStage>('ready')
  const [range, setRange] = useState<CmRange | null>(null)
  const [trials, setTrials] = useState<FinderTrial[]>([])
  const [results, setResults] = useState<FinderResult[]>([])
  const [adaptiveStep, setAdaptiveStep] = useState(0)

  const currentTrial = trials[results.length] ?? null
  const finalCmPer360 = useMemo(() => {
    const validation = results.find((result) => result.phase === 'validation')
    return validation?.cmPer360 ?? (range ? midpoint(range) : null)
  }, [range, results])

  const start = useCallback((initialRange: CmRange) => {
    const cleanRange = { min: Math.min(initialRange.min, initialRange.max), max: Math.max(initialRange.min, initialRange.max) }
    setRange(cleanRange)
    setTrials([
      { id: 'bracket-a', phase: 'bracket', variant: 'A', cmPer360: cleanRange.min, duration: 15 },
      { id: 'bracket-b', phase: 'bracket', variant: 'B', cmPer360: cleanRange.max, duration: 15 },
    ])
    setResults([])
    setAdaptiveStep(0)
    setStage('bracket')
  }, [])

  const completeTrial = useCallback((telemetry: FinderTelemetry) => {
    if (!currentTrial || !range) return
    const nextResult: FinderResult = { ...currentTrial, ...telemetry, score: finderScore(telemetry) }
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
        { id: 'adaptive-1-a', phase: 'adaptive', variant: 'A', cmPer360: left, duration: 12 },
        { id: 'adaptive-1-b', phase: 'adaptive', variant: 'B', cmPer360: right, duration: 12 },
      ])
      setStage('adaptive')
      return
    }

    if (currentTrial.phase === 'adaptive' && currentTrial.variant === 'B') {
      const pair = nextResults.filter((result) => result.phase === 'adaptive').slice(-2)
      const center = midpoint(range)
      const nextRange = pair[0].score >= pair[1].score ? { min: range.min, max: center } : { min: center, max: range.max }
      const nextStep = adaptiveStep + 1
      setRange(nextRange)
      setAdaptiveStep(nextStep)
      if (nextStep >= 4 || nextRange.max - nextRange.min < 1.5) {
        setTrials((current) => [...current, { id: 'validation', phase: 'validation', variant: 'final', cmPer360: midpoint(nextRange), duration: 20 }])
        setStage('validation')
      } else {
        const left = (nextRange.min + midpoint(nextRange)) / 2
        const right = (midpoint(nextRange) + nextRange.max) / 2
        setTrials((current) => [...current,
          { id: `adaptive-${nextStep + 1}-a`, phase: 'adaptive', variant: 'A', cmPer360: left, duration: 12 },
          { id: `adaptive-${nextStep + 1}-b`, phase: 'adaptive', variant: 'B', cmPer360: right, duration: 12 },
        ])
      }
      return
    }

    if (currentTrial.phase === 'validation') setStage('complete')
  }, [adaptiveStep, currentTrial, range, results])

  const reset = useCallback(() => {
    setStage('ready'); setRange(null); setTrials([]); setResults([]); setAdaptiveStep(0)
  }, [])

  const sensitivity = useCallback((game: GameConfig, dpi: number) => finalCmPer360 === null ? null : finderSensitivity(game, finalCmPer360, dpi), [finalCmPer360])

  return { stage, range, trials, results, currentTrial, finalCmPer360, start, completeTrial, reset, sensitivity }
}
