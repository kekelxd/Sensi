import type { WarmupExercise } from './warmupConfig'
import type { WarmupSessionSummary } from './warmupTelemetry'

export type PersonalBestMetric = 'score' | 'accuracy' | 'reactionTimeMs'
export type PersonalBestDirection = 'higher' | 'lower'
export type PersonalBestDefinition = {
  modeId: WarmupExercise
  primaryMetric: PersonalBestMetric
  unit: 'points' | 'percent' | 'milliseconds'
  direction: PersonalBestDirection
  precision: number
}

export const PERSONAL_BEST_DEFINITIONS: Record<WarmupExercise, PersonalBestDefinition> = {
  switch: { modeId: 'switch', primaryMetric: 'score', unit: 'points', direction: 'higher', precision: 0 },
  tracking: { modeId: 'tracking', primaryMetric: 'accuracy', unit: 'percent', direction: 'higher', precision: 1 },
  flick: { modeId: 'flick', primaryMetric: 'score', unit: 'points', direction: 'higher', precision: 0 },
  reflex: { modeId: 'reflex', primaryMetric: 'score', unit: 'points', direction: 'higher', precision: 0 },
  gridshot: { modeId: 'gridshot', primaryMetric: 'score', unit: 'points', direction: 'higher', precision: 0 },
  strafetrack: { modeId: 'strafetrack', primaryMetric: 'accuracy', unit: 'percent', direction: 'higher', precision: 1 },
  'sniper-reaction': { modeId: 'sniper-reaction', primaryMetric: 'reactionTimeMs', unit: 'milliseconds', direction: 'lower', precision: 0 },
}

export type PersonalBestResult = {
  status: 'first' | 'new' | 'none'
  definition: PersonalBestDefinition
  value: number
  previousValue: number | null
  delta: number | null
  current: WarmupSessionSummary
  previous: WarmupSessionSummary | null
}

function comparableKey(summary: WarmupSessionSummary) {
  const context = summary.sessionContext
  const config = context?.configuration
  return [context?.gameId ?? 'unknown', config?.difficulty ?? 'legacy', config?.durationSeconds ?? 'legacy'].join(':')
}

export function getPersonalBestValue(summary: WarmupSessionSummary, definition: PersonalBestDefinition) {
  const value = definition.primaryMetric === 'reactionTimeMs'
    ? summary.sniper?.bestReactionMs ?? summary.reactionTimeMs
    : summary[definition.primaryMetric]
  return Number.isFinite(value) && value > 0 ? Number(value) : null
}

export function normalizePersonalBestValue(value: number, definition: PersonalBestDefinition) {
  const factor = 10 ** definition.precision
  return Math.round(value * factor) / factor
}

function better(current: number, previous: number, definition: PersonalBestDefinition) {
  return definition.direction === 'higher' ? current > previous : current < previous
}

function snapshot(summary: WarmupSessionSummary): WarmupSessionSummary {
  return {
    ...summary,
    ...(summary.sessionContext ? { sessionContext: { ...summary.sessionContext, ...(summary.sessionContext.configuration ? { configuration: { ...summary.sessionContext.configuration } } : {}) } } : {}),
    ...(summary.sniper ? { sniper: { ...summary.sniper } } : {}),
  }
}

export function findComparablePersonalBest(history: WarmupSessionSummary[], current: WarmupSessionSummary, definition: PersonalBestDefinition) {
  const currentKey = comparableKey(current)
  return history
    .filter(summary => comparableKey(summary) === currentKey)
    .map(summary => ({ summary, value: getPersonalBestValue(summary, definition) }))
    .filter((item): item is { summary: WarmupSessionSummary; value: number } => item.value !== null)
    .sort((left, right) => definition.direction === 'higher' ? right.value - left.value : left.value - right.value)[0] ?? null
}

export function evaluatePersonalBest(modeId: WarmupExercise, current: WarmupSessionSummary, history: WarmupSessionSummary[]): PersonalBestResult | null {
  const definition = PERSONAL_BEST_DEFINITIONS[modeId]
  const rawValue = getPersonalBestValue(current, definition)
  if (rawValue === null) return null
  const value = normalizePersonalBestValue(rawValue, definition)
  const previous = findComparablePersonalBest(history, current, definition)
  const currentSnapshot = snapshot(current)
  if (!previous) return { status: 'first', definition, value, previousValue: null, delta: null, current: currentSnapshot, previous: null }
  const previousValue = normalizePersonalBestValue(previous.value, definition)
  if (!better(value, previousValue, definition)) return { status: 'none', definition, value, previousValue, delta: null, current: currentSnapshot, previous: snapshot(previous.summary) }
  const delta = normalizePersonalBestValue(Math.abs(previousValue - value), definition)
  return { status: 'new', definition, value, previousValue, delta, current: currentSnapshot, previous: snapshot(previous.summary) }
}

export function formatPersonalBestValue(result: Pick<PersonalBestResult, 'definition' | 'value'>) {
  const value = result.value.toFixed(result.definition.precision)
  return result.definition.unit === 'milliseconds' ? `${value} ms` : result.definition.unit === 'percent' ? `${value}%` : value
}
