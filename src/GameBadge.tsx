import { GAME_IDENTITY_BY_ID } from './gameIdentity'
import type { GameSensitivityProfileId } from './gameSensitivityProfiles'
import './gameIdentity.css'

export function GameBadge({ gameId, size = 'md', selected = false }: { gameId: GameSensitivityProfileId; size?: 'sm' | 'md' | 'lg'; selected?: boolean }) {
  return <span aria-hidden="true" className={`xensi-game-badge badge-${size}${selected ? ' is-selected' : ''}`}>{GAME_IDENTITY_BY_ID[gameId].shortCode}</span>
}
