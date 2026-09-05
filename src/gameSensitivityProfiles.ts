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
    auditedAt?: string
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
      organization?: string
      url?: string
      accessedAt?: string
      type?: 'official' | 'source_code' | 'measurement' | 'community'
      supports?: string[]
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
  {
    id: 'cs2', name: 'Counter-Strike 2', shortName: 'CS2', inputModel: { type: 'step', min: 0.01, max: 20, step: 0.001, decimals: 3 }, angularModel: { type: 'linear', coefficient: 0.022 }, supportedMethods: { hipfire360: true, ads: false },
    verification: {
      status: 'cross_verified', profileVersion: 2, auditedAt: '2026-09-05',
      notes: 'O coeficiente 0.022 e o modelo linear convergem entre codigo-fonte oficial da linhagem Valve e uma ferramenta independente de medicao. A auditoria nao encontrou uma especificacao primaria do CS2 atual para limites e precisao de entrada; min, max e passo continuam provisórios. O perfil assume m_yaw padrao 0.022 e nao representa configuracoes personalizadas de m_yaw.',
      evidence: { formulaKnown: true, physicalValidation: false, inputPrecisionValidated: false, independentSources: 2 },
      sources: [
        { label: 'Valve Half-Life SDK: inputw32.cpp', organization: 'Valve Software', url: 'https://github.com/ValveSoftware/halflife/blob/master/cl_dll/inputw32.cpp', accessedAt: '2026-09-05', type: 'source_code', supports: ['default yaw 0.022 in Valve engine lineage', 'linear application of sensitivity and m_yaw to horizontal mouse delta'] },
        { label: 'Sensitivity Matcher: formula and Source yaw', organization: 'KovaaK', url: 'https://www.kovaak.com/sensitivity-matcher/', accessedAt: '2026-09-05', type: 'measurement', supports: ['count x sensitivity x yaw angular model', 'Source/Quake default yaw 0.022', 'reproducible multi-turn validation method'] },
      ],
    },
  },
  {
    id: 'valorant', name: 'Valorant', shortName: 'Valorant', inputModel: { type: 'step', min: 0.001, max: 10, step: 0.001, decimals: 3 }, angularModel: { type: 'linear', coefficient: 0.07 }, supportedMethods: { hipfire360: true, ads: false },
    verification: {
      status: 'experimental', profileVersion: 2, auditedAt: '2026-09-05',
      notes: 'O coeficiente 0.07 e a precisao de tres casas sao amplamente reproduzidos por ferramentas da comunidade, mas esta auditoria nao encontrou documentacao tecnica primaria da Riot nem um relatorio de medicao independente com erro declarado. O valor permanece utilizavel como hipotese experimental, nao como equivalencia oficialmente verificada.',
      evidence: { formulaKnown: false, physicalValidation: false, inputPrecisionValidated: false, independentSources: 0 },
      sources: [
        { label: 'Sensitivity Matcher: protocolo de medicao reproduzivel', organization: 'KovaaK', url: 'https://github.com/KovaaK/SensitivityMatcher/blob/master/README.md', accessedAt: '2026-09-05', type: 'measurement', supports: ['required protocol for a future Valorant measurement', 'multi-turn drift and sub-increment validation'] },
      ],
    },
  },
  {
    id: 'overwatch2', name: 'Overwatch 2', shortName: 'Overwatch', iconFile: 'overwatch2.svg', inputModel: { type: 'step', min: 0.01, max: 100, step: 0.01, decimals: 2 }, angularModel: { type: 'linear', coefficient: 0.0066 }, supportedMethods: { hipfire360: true, ads: false },
    verification: {
      status: 'measured', profileVersion: 2, auditedAt: '2026-09-05',
      notes: 'O coeficiente 0.0066 e sustentado pelo preset e pelo metodo reproduzivel do Sensitivity Matcher. A Blizzard documenta entrada com duas casas decimais e uso da taxa nativa do mouse, mas nao publica o coeficiente angular. O limite minimo e maximo permanece provisório e ADS por heroi nao faz parte deste perfil.',
      evidence: { formulaKnown: true, physicalValidation: true, inputPrecisionValidated: true, independentSources: 2 },
      sources: [
        { label: 'Sensitivity Matcher source: Overwatch yaw preset', organization: 'KovaaK', url: 'https://github.com/KovaaK/SensitivityMatcher/blob/master/ReleaseAssets/bin/SensitivityMatcher.au3', accessedAt: '2026-09-05', type: 'measurement', supports: ['measured Overwatch yaw 0.0066', 'linear count-to-angle model'] },
        { label: 'Overwatch patch notes: two-decimal sensitivity', organization: 'Blizzard Entertainment', url: 'https://overwatch.blizzard.com/en-us/news/patch-notes/live/2016/07/', accessedAt: '2026-09-05', type: 'official', supports: ['mouse sensitivity accepts two decimal places', 'numerical entry for slider-backed settings'] },
        { label: 'Overwatch PTR notes: High Precision Mouse Input', organization: 'Blizzard Entertainment', url: 'https://overwatch.blizzard.com/en-us/news/patch-notes/ptr/2019/10/', accessedAt: '2026-09-05', type: 'official', supports: ['native polling-rate input option', 'input behavior caveat'] },
      ],
    },
  },
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
