import { Check } from 'lucide-react'
import { GameBadge } from './GameBadge'
import { GAME_IDENTITY_BY_ID } from './gameIdentity'
import type { GameSensitivityProfileId } from './gameSensitivityProfiles'
import { useI18n } from './i18n'
import { selectGamePreset, type SensitivityPreset } from './playerProfileStore'
import { presetCopy } from './presetCopy'

export function GamePicker({ gameIds, value, onChange, presets = [] }: { gameIds: GameSensitivityProfileId[]; value: GameSensitivityProfileId; onChange: (id: GameSensitivityProfileId) => void; presets?: SensitivityPreset[] }) {
  const { t, locale } = useI18n()
  return <div className="xensi-game-picker" role="group" aria-label={t('common.gameReference')}>
    {gameIds.map(id => {
      const game = GAME_IDENTITY_BY_ID[id]
      const preset = selectGamePreset(presets, id)
      return <button type="button" key={id} aria-pressed={value === id} onClick={() => onChange(id)}>
        <GameBadge gameId={id} selected={value === id} />
        <span className="xensi-game-picker-copy"><strong>{game.name}</strong><small>{preset ? `${preset.sensitivity} · ${preset.dpi} DPI` : presetCopy[locale].none}</small></span>
        {value === id && <Check className="xensi-game-check" size={14} aria-hidden="true" />}
      </button>
    })}
  </div>
}
