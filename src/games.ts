import { GAME_SENSITIVITY_PROFILE_BY_ID, LEGACY_GAME_PROFILE_IDS } from './gameSensitivityProfiles'

export type GameId = 'cs2' | 'valorant' | 'overwatch2' | 'fortnite' | 'pubg' | 'battlefield6' | 'blackops7' | 'warzone' | 'arcraiders' | 'rust'

export type GameConfig = {
  id: GameId
  label: string
  shortLabel: string
  iconFile?: string
  yaw?: number
  conversionEstimate?: boolean
  sensitivityMin: number
  sensitivityMax: number
  sensitivityStep: number
}

export const GAMES: GameConfig[] = LEGACY_GAME_PROFILE_IDS.map((profileId) => {
  const profile = GAME_SENSITIVITY_PROFILE_BY_ID[profileId]
  const input = profile.inputModel
  if (input.type === 'unavailable') throw new Error(`Legacy game ${profileId} requires an input model`)
  const sensitivityStep = input.type === 'integer' ? 1 : input.type === 'decimal' ? 10 ** -input.decimals : input.step
  return {
    id: profile.id as GameId,
    label: profile.name,
    shortLabel: profile.shortName,
    iconFile: profile.iconFile,
    yaw: profile.angularModel.type === 'linear' ? profile.angularModel.coefficient : undefined,
    conversionEstimate: profile.id === 'arcraiders',
    sensitivityMin: input.min,
    sensitivityMax: input.max,
    sensitivityStep,
  }
})

export const GAME_BY_ID = Object.fromEntries(GAMES.map((game) => [game.id, game])) as Record<GameId, GameConfig>
