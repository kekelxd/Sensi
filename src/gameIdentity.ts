import { GAME_SENSITIVITY_PROFILES, type GameSensitivityProfileId } from './gameSensitivityProfiles'

const SHORT_CODES: Record<GameSensitivityProfileId, string> = {
  cs2: 'CS', valorant: 'VA', overwatch2: 'OW', rainbowsix: 'RA', apex: 'AP', fortnite: 'FN',
  pubg: 'PB', battlefield6: 'BF', blackops7: 'BO', warzone: 'WZ', arcraiders: 'AR', rust: 'RU',
}

// Presentation registry; deliberately separate from audited mathematical profiles.
export const GAME_IDENTITIES = GAME_SENSITIVITY_PROFILES.map(game => ({
  id: game.id, name: game.name, shortName: game.shortName, shortCode: SHORT_CODES[game.id],
}))
export const GAME_IDENTITY_BY_ID = Object.fromEntries(GAME_IDENTITIES.map(game => [game.id, game])) as Record<GameSensitivityProfileId, typeof GAME_IDENTITIES[number]>
