export type GameId = 'cs2' | 'valorant' | 'overwatch2' | 'fortnite' | 'pubg' | 'battlefield6' | 'blackops7' | 'warzone'

export type GameConfig = {
  id: GameId
  label: string
  shortLabel: string
  logoText: string
  logoAccent?: string
  sensitivityMin: number
  sensitivityMax: number
  sensitivityStep: number
}

export const GAMES: GameConfig[] = [
  { id: 'cs2', label: 'Counter-Strike 2', shortLabel: 'CS2', logoText: 'CS', logoAccent: '2', sensitivityMin: 0.01, sensitivityMax: 20, sensitivityStep: 0.001 },
  { id: 'valorant', label: 'Valorant', shortLabel: 'Valorant', logoText: 'VΛLORΛNT', sensitivityMin: 0.001, sensitivityMax: 10, sensitivityStep: 0.001 },
  { id: 'overwatch2', label: 'Overwatch 2', shortLabel: 'Overwatch', logoText: 'OVERWATCH', logoAccent: '2', sensitivityMin: 0.01, sensitivityMax: 100, sensitivityStep: 0.01 },
  { id: 'fortnite', label: 'Fortnite', shortLabel: 'Fortnite', logoText: 'FORTNITE', sensitivityMin: 0.1, sensitivityMax: 100, sensitivityStep: 0.1 },
  { id: 'pubg', label: 'PUBG: Battlegrounds', shortLabel: 'PUBG', logoText: 'PUBG', sensitivityMin: 1, sensitivityMax: 100, sensitivityStep: 1 },
  { id: 'battlefield6', label: 'Battlefield 6', shortLabel: 'Battlefield 6', logoText: 'BATTLEFIELD', logoAccent: '6', sensitivityMin: 1, sensitivityMax: 100, sensitivityStep: 1 },
  { id: 'blackops7', label: 'Call of Duty: Black Ops 7', shortLabel: 'Black Ops 7', logoText: 'BLACK OPS', logoAccent: '7', sensitivityMin: 0.1, sensitivityMax: 20, sensitivityStep: 0.01 },
  { id: 'warzone', label: 'Call of Duty: Warzone', shortLabel: 'Warzone', logoText: 'WARZONE', sensitivityMin: 0.1, sensitivityMax: 20, sensitivityStep: 0.01 },
]

export const GAME_BY_ID = Object.fromEntries(GAMES.map((game) => [game.id, game])) as Record<GameId, GameConfig>
