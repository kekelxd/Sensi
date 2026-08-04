import type { WarmupExercise } from './warmupConfig'

export type RoutinePresetId = 'fundamentals' | 'tactical' | 'reactive'

export type RoutinePreset = {
  id: RoutinePresetId
  name: string
  descriptionKey: 'routine.fundamentalsDescription' | 'routine.tacticalDescription' | 'routine.reactiveDescription'
  exercises: WarmupExercise[]
}

export const ROUTINE_PRESETS: RoutinePreset[] = [
  {
    id: 'fundamentals',
    name: 'FPS Fundamentals',
    descriptionKey: 'routine.fundamentalsDescription',
    exercises: ['tracking', 'switch', 'flick', 'strafetrack', 'reflex'],
  },
  {
    id: 'tactical',
    name: 'Tactical Precision',
    descriptionKey: 'routine.tacticalDescription',
    exercises: ['reflex', 'flick', 'gridshot', 'switch', 'strafetrack'],
  },
  {
    id: 'reactive',
    name: 'Reactive Control',
    descriptionKey: 'routine.reactiveDescription',
    exercises: ['tracking', 'strafetrack', 'switch', 'reflex', 'tracking'],
  },
]
