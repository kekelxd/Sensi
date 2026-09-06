import { useMemo, useState, useSyncExternalStore } from 'react'
import { PLAYER_PROFILE_STORAGE_KEY, parsePlayerProfile, selectGamePreset, type SensitivityPreset } from './playerProfileStore'
import type { GameSensitivityProfileId } from './gameSensitivityProfiles'

function subscribe(notify: () => void) {
  window.addEventListener('storage', notify)
  window.addEventListener('xensi-profile-updated', notify)
  return () => { window.removeEventListener('storage', notify); window.removeEventListener('xensi-profile-updated', notify) }
}
function getSnapshot() {
  try { return window.localStorage.getItem(PLAYER_PROFILE_STORAGE_KEY) } catch { return null }
}
export function usePlayerProfile() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, () => null)
  return useMemo(() => parsePlayerProfile(raw), [raw])
}

export type PresetLaunch = { id?: string; gameId: GameSensitivityProfileId; sensitivity: number; dpi: number }
export type SensitivityDraft = { gameId: GameSensitivityProfileId; sensitivity: string; dpi: string; presetId?: string; dirty: boolean }
export function draftFromPreset(gameId: GameSensitivityProfileId, preset: SensitivityPreset | PresetLaunch | null): SensitivityDraft {
  return { gameId, sensitivity: String(preset?.sensitivity ?? 1), dpi: String(preset?.dpi ?? 800), presetId: preset?.id, dirty: false }
}
export function editSensitivityDraft(draft: SensitivityDraft, patch: Partial<Pick<SensitivityDraft, 'sensitivity' | 'dpi'>>) {
  return { ...draft, ...patch, dirty: true }
}

// Saved presets supply defaults. Only explicit user actions replace a session draft.
export function useSensitivityPreset(defaultGame: GameSensitivityProfileId, initial?: PresetLaunch | null, preferPrimary = false) {
  const profile = usePlayerProfile()
  const [draft, setDraft] = useState(() => {
    const launchPreset = initial ?? (preferPrimary ? profile.presets.find(item => item.isPrimary) : null) ?? selectGamePreset(profile.presets, defaultGame)
    return draftFromPreset(launchPreset?.gameId ?? defaultGame, launchPreset)
  })
  const preset = profile.presets.find(item => item.id === draft.presetId && item.gameId === draft.gameId) ?? null
  const selectGame = (gameId: GameSensitivityProfileId) => {
    if (gameId !== draft.gameId) setDraft(draftFromPreset(gameId, selectGamePreset(profile.presets, gameId)))
  }
  const selectPreset = (id: string) => {
    const chosen = profile.presets.find(item => item.id === id && item.gameId === draft.gameId)
    if (chosen) setDraft(draftFromPreset(draft.gameId, chosen))
  }
  return { draft, preset, presets: profile.presets, selectGame, selectPreset,
    setSensitivity: (sensitivity: string) => setDraft(current => editSensitivityDraft(current, { sensitivity })),
    setDpi: (dpi: string) => setDraft(current => editSensitivityDraft(current, { dpi })),
    replace: (gameId: GameSensitivityProfileId, sensitivity: string, dpi: string) => setDraft({ gameId, sensitivity, dpi, dirty: true }),
  }
}
