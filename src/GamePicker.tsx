import { Check } from 'lucide-react'
import { GameBadge } from './GameBadge'
import { GAME_IDENTITY_BY_ID } from './gameIdentity'
import type { GameSensitivityProfileId } from './gameSensitivityProfiles'
import { useI18n } from './i18n'
import { selectGamePreset, type SensitivityPreset } from './playerProfileStore'
import { presetCopy } from './presetCopy'

export function GamePicker({ gameIds, value, onChange, presets = [] }: { gameIds: GameSensitivityProfileId[]; value: GameSensitivityProfileId; onChange: (id: GameSensitivityProfileId) => void; presets?: SensitivityPreset[] }) {
  const { t, locale } = useI18n()
  const text = presetCopy[locale]
  const savedGames = gameIds
    .filter(id => presets.some(preset => preset.gameId === id))
    .sort((left, right) => Number(Boolean(selectGamePreset(presets, right)?.isPrimary)) - Number(Boolean(selectGamePreset(presets, left)?.isPrimary)))
  const otherGames = gameIds.filter(id => !presets.some(preset => preset.gameId === id))

  const renderGames = (ids: GameSensitivityProfileId[], compact = false) => <div className={`xensi-game-picker${compact ? ' is-compact' : ''}`}>
    {ids.map(id => {
      const game = GAME_IDENTITY_BY_ID[id]
      const preset = selectGamePreset(presets, id)
      return <button type="button" key={id} aria-pressed={value === id} onClick={() => onChange(id)}>
        <GameBadge gameId={id} size={compact ? 'sm' : 'md'} selected={value === id} />
        <span className="xensi-game-picker-copy"><strong>{game.name}</strong>{preset && <small>{preset.sensitivity} · {preset.dpi} DPI</small>}</span>
        {preset?.isPrimary && <span className="xensi-game-primary">{text.primary}</span>}
        <Check className="xensi-game-check" size={14} aria-hidden="true" />
      </button>
    })}
  </div>

  return <div className="xensi-game-selector" role="group" aria-label={t('common.gameReference')}>
    {savedGames.length > 0 && <section><h4>{text.yourGames}</h4>{renderGames(savedGames)}</section>}
    {otherGames.length > 0 && <section><h4>{text.otherGames}</h4>{renderGames(otherGames, true)}</section>}
  </div>
}
