export type VerificationStatus = 'verified' | 'cross_verified' | 'measured' | 'experimental'

export type SensitivityInputModel =
  | { type: 'decimal'; min: number; max: number; decimals: number }
  | { type: 'step'; min: number; max: number; step: number; decimals: number }
  | { type: 'integer'; min: number; max: number }
  | { type: 'slider_with_multiplier'; min: number; max: number; step: number; defaultMultiplier: number; userConfigurableMultiplier: boolean }
  | { type: 'unavailable' }

export type GameSensitivityProfileId =
  | 'cs2'
  | 'valorant'
  | 'overwatch2'
  | 'rainbowsix'
  | 'apex'
  | 'fortnite'
  | 'pubg'
  | 'battlefield6'
  | 'blackops7'
  | 'warzone'
  | 'arcraiders'
  | 'rust'

export interface GameSensitivityProfile {
  id: GameSensitivityProfileId
  name: string
  shortName: string
  iconFile?: string
  inputModel: SensitivityInputModel
  angularModel: { type: 'linear'; coefficient: number } | { type: 'unavailable' }
  supportedMethods: { hipfire360: boolean; ads: boolean }
  verification: {
    status: VerificationStatus
    profileVersion: number
    verifiedAt?: string
    gameVersion?: string
    notes?: string
    evidence: {
      formulaKnown: boolean
      physicalValidation: boolean
      inputPrecisionValidated: boolean
      independentSources: number
    }
    sources: Array<{
      label: string
      url?: string
      accessedAt?: string
      type?: 'official' | 'source_code' | 'measurement' | 'community'
    }>
  }
}

const legacyNote = 'Coeficiente e regras de entrada migrados do perfil legado do XENSI. Nenhuma fonte externa ou validação física está registrada no repositório.'
const unavailableNote = 'Perfil reservado para futura validação. O repositório não contém coeficiente nem regras de entrada suficientes para conversão.'

function experimentalProfile(
  profile: Omit<GameSensitivityProfile, 'verification'>,
  notes = legacyNote,
): GameSensitivityProfile {
  return {
    ...profile,
    verification: {
      status: 'experimental',
      profileVersion: 1,
      notes,
      evidence: {
        formulaKnown: profile.angularModel.type === 'linear',
        physicalValidation: false,
        inputPrecisionValidated: false,
        independentSources: 0,
      },
      sources: [],
    },
  }
}

export const GAME_SENSITIVITY_PROFILES: GameSensitivityProfile[] = [
  experimentalProfile({ id: 'cs2', name: 'Counter-Strike 2', shortName: 'CS2', inputModel: { type: 'step', min: 0.01, max: 20, step: 0.001, decimals: 3 }, angularModel: { type: 'linear', coefficient: 0.022 }, supportedMethods: { hipfire360: true, ads: false } }),
  experimentalProfile({ id: 'valorant', name: 'Valorant', shortName: 'Valorant', inputModel: { type: 'step', min: 0.001, max: 10, step: 0.001, decimals: 3 }, angularModel: { type: 'linear', coefficient: 0.07 }, supportedMethods: { hipfire360: true, ads: false } }),
  experimentalProfile({ id: 'overwatch2', name: 'Overwatch 2', shortName: 'Overwatch', iconFile: 'overwatch2.svg', inputModel: { type: 'step', min: 0.01, max: 100, step: 0.01, decimals: 2 }, angularModel: { type: 'linear', coefficient: 0.0066 }, supportedMethods: { hipfire360: true, ads: false } }),
  experimentalProfile({ id: 'rainbowsix', name: 'Rainbow Six Siege', shortName: 'Rainbow Six', inputModel: { type: 'unavailable' }, angularModel: { type: 'unavailable' }, supportedMethods: { hipfire360: false, ads: false } }, unavailableNote),
  experimentalProfile({ id: 'apex', name: 'Apex Legends', shortName: 'Apex', inputModel: { type: 'step', min: 0.01, max: 100, step: 0.01, decimals: 2 }, angularModel: { type: 'linear', coefficient: 0.0066 }, supportedMethods: { hipfire360: true, ads: false } }),
  experimentalProfile({ id: 'fortnite', name: 'Fortnite', shortName: 'Fortnite', inputModel: { type: 'step', min: 0.1, max: 100, step: 0.1, decimals: 1 }, angularModel: { type: 'linear', coefficient: 0.005555 }, supportedMethods: { hipfire360: true, ads: false } }),
  experimentalProfile({ id: 'pubg', name: 'PUBG: Battlegrounds', shortName: 'PUBG', iconFile: 'pubg.jpg', inputModel: { type: 'integer', min: 1, max: 100 }, angularModel: { type: 'unavailable' }, supportedMethods: { hipfire360: false, ads: false } }, unavailableNote),
  experimentalProfile({ id: 'battlefield6', name: 'Battlefield 6', shortName: 'Battlefield 6', iconFile: 'battlefield6.jpg', inputModel: { type: 'integer', min: 1, max: 100 }, angularModel: { type: 'unavailable' }, supportedMethods: { hipfire360: false, ads: false } }, unavailableNote),
  experimentalProfile({ id: 'blackops7', name: 'Call of Duty: Black Ops 7', shortName: 'Black Ops 7', inputModel: { type: 'step', min: 0.1, max: 20, step: 0.01, decimals: 2 }, angularModel: { type: 'linear', coefficient: 0.0066 }, supportedMethods: { hipfire360: true, ads: false } }),
  experimentalProfile({ id: 'warzone', name: 'Call of Duty: Warzone', shortName: 'Warzone', inputModel: { type: 'step', min: 0.1, max: 20, step: 0.01, decimals: 2 }, angularModel: { type: 'linear', coefficient: 0.0066 }, supportedMethods: { hipfire360: true, ads: false } }),
  experimentalProfile({ id: 'arcraiders', name: 'ARC Raiders', shortName: 'ARC Raiders', iconFile: 'arcraiders.jpg', inputModel: { type: 'integer', min: 5, max: 100 }, angularModel: { type: 'linear', coefficient: 0.00132 }, supportedMethods: { hipfire360: true, ads: false } }),
  experimentalProfile({ id: 'rust', name: 'Rust', shortName: 'Rust', iconFile: 'rust.jpg', inputModel: { type: 'step', min: 0.01, max: 10, step: 0.01, decimals: 2 }, angularModel: { type: 'linear', coefficient: 0.11247 }, supportedMethods: { hipfire360: true, ads: false } }),
]

export const GAME_SENSITIVITY_PROFILE_BY_ID = Object.fromEntries(
  GAME_SENSITIVITY_PROFILES.map((profile) => [profile.id, profile]),
) as Record<GameSensitivityProfileId, GameSensitivityProfile>

export const LEGACY_GAME_PROFILE_IDS = GAME_SENSITIVITY_PROFILES
  .filter((profile) => profile.id !== 'rainbowsix' && profile.id !== 'apex')
  .map((profile) => profile.id)
