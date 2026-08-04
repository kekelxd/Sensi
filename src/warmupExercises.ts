import { Focus, Gauge, Grid3X3, MoveHorizontal, Target, Zap, type LucideIcon } from 'lucide-react'
import type { TranslationKey } from './i18n'
import type { WarmupExercise } from './warmupConfig'

export type WarmupExerciseDefinition = {
  id: WarmupExercise
  name: string
  description: TranslationKey
  instruction: TranslationKey
  icon: LucideIcon
}

export const EXERCISES: WarmupExerciseDefinition[] = [
  { id: 'switch', name: 'Target Switch', description: 'warmup.switch.description', instruction: 'warmup.switch.instruction', icon: Focus },
  { id: 'tracking', name: 'Tracking', description: 'warmup.tracking.description', instruction: 'warmup.tracking.instruction', icon: Gauge },
  { id: 'flick', name: 'Target Shooting', description: 'warmup.flick.description', instruction: 'warmup.flick.instruction', icon: Target },
  { id: 'reflex', name: 'Reflex', description: 'warmup.reflex.description', instruction: 'warmup.reflex.instruction', icon: Zap },
  { id: 'gridshot', name: 'Gridshot', description: 'warmup.gridshot.description', instruction: 'warmup.gridshot.instruction', icon: Grid3X3 },
  { id: 'strafetrack', name: 'Strafetrack', description: 'warmup.strafetrack.description', instruction: 'warmup.strafetrack.instruction', icon: MoveHorizontal },
]
