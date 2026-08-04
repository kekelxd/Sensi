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

export const GAMES: GameConfig[] = [
  { id: 'cs2', label: 'Counter-Strike 2', shortLabel: 'CS2', yaw: 0.022, sensitivityMin: 0.01, sensitivityMax: 20, sensitivityStep: 0.001 },
  { id: 'valorant', label: 'Valorant', shortLabel: 'Valorant', yaw: 0.07, sensitivityMin: 0.001, sensitivityMax: 10, sensitivityStep: 0.001 },
  { id: 'overwatch2', label: 'Overwatch 2', shortLabel: 'Overwatch', iconFile: 'overwatch2.svg', yaw: 0.0066, sensitivityMin: 0.01, sensitivityMax: 100, sensitivityStep: 0.01 },
  { id: 'fortnite', label: 'Fortnite', shortLabel: 'Fortnite', yaw: 0.005555, sensitivityMin: 0.1, sensitivityMax: 100, sensitivityStep: 0.1 },
  { id: 'pubg', label: 'PUBG: Battlegrounds', shortLabel: 'PUBG', iconFile: 'pubg.jpg', sensitivityMin: 1, sensitivityMax: 100, sensitivityStep: 1 },
  { id: 'battlefield6', label: 'Battlefield 6', shortLabel: 'Battlefield 6', iconFile: 'battlefield6.jpg', sensitivityMin: 1, sensitivityMax: 100, sensitivityStep: 1 },
  { id: 'blackops7', label: 'Call of Duty: Black Ops 7', shortLabel: 'Black Ops 7', yaw: 0.0066, sensitivityMin: 0.1, sensitivityMax: 20, sensitivityStep: 0.01 },
  { id: 'warzone', label: 'Call of Duty: Warzone', shortLabel: 'Warzone', yaw: 0.0066, sensitivityMin: 0.1, sensitivityMax: 20, sensitivityStep: 0.01 },
  { id: 'arcraiders', label: 'ARC Raiders', shortLabel: 'ARC Raiders', iconFile: 'arcraiders.jpg', yaw: 0.00132, conversionEstimate: true, sensitivityMin: 5, sensitivityMax: 100, sensitivityStep: 1 },
  { id: 'rust', label: 'Rust', shortLabel: 'Rust', iconFile: 'rust.jpg', yaw: 0.11247, sensitivityMin: 0.01, sensitivityMax: 10, sensitivityStep: 0.01 },
]

export const GAME_BY_ID = Object.fromEntries(GAMES.map((game) => [game.id, game])) as Record<GameId, GameConfig>
