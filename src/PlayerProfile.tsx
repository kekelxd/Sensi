import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Clipboard, Crosshair, Edit3, Gamepad2, Gauge, HardDrive, Mouse, Plus, Save, Sparkles, Target, X } from 'lucide-react'
import { GAME_BY_ID, GAMES, type GameId } from './games'
import { useI18n, type Locale } from './i18n'

type GamePreset = {
  id: GameId
  dpi: number
  sensitivity: number
  fov: number
  aspectRatio: string
}

type PlayerProfileData = {
  nickname: string
  tag: string
  rank: string
  accuracyLevel: number
  avatarUrl: string
  mouseModel: string
  mouseWeight: string
  mousepad: string
  pollingRate: string
  skates: string
  preferredTraining: string
  crosshair: string
  games: GamePreset[]
}

const STORAGE_KEY = 'xensi-player-profile'

const copy = {
  pt: {
    navTitle: 'Passe de identidade tática',
    title: 'Perfil do jogador',
    subtitle: 'Centralize seu setup, jogos e preferências para consultar antes de treinar ou calibrar.',
    edit: 'Editar perfil',
    addGame: 'Adicionar jogo',
    export: 'Exportar card',
    saved: 'Perfil salvo',
    copied: 'Card copiado',
    identity: 'Identidade',
    trainingRank: 'Rank de treino',
    precisionLevel: 'Nível de precisão',
    hardware: 'Setup de periféricos',
    gamePresets: 'Game presets',
    tactical: 'Preferências táticas',
    mouse: 'Mouse',
    weight: 'Peso',
    mousepad: 'Mousepad',
    polling: 'Polling rate',
    skates: 'PTFE / glides',
    dpi: 'DPI',
    sens: 'Sensi',
    edpi: 'eDPI',
    fov: 'FOV',
    aspect: 'Tela',
    training: 'Treino preferido',
    crosshair: 'Mira favorita',
    editTitle: 'Editar passe do jogador',
    nickname: 'Nickname',
    tag: 'Tag',
    rank: 'Rank',
    avatar: 'URL do avatar',
    game: 'Jogo',
    save: 'Salvar',
    cancel: 'Cancelar',
  },
  en: {
    navTitle: 'Tactical identity pass',
    title: 'Player profile',
    subtitle: 'Keep your setup, games, and preferences in one place before training or calibrating.',
    edit: 'Edit profile',
    addGame: 'Add game',
    export: 'Export card',
    saved: 'Profile saved',
    copied: 'Card copied',
    identity: 'Identity',
    trainingRank: 'Training rank',
    precisionLevel: 'Precision level',
    hardware: 'Peripheral setup',
    gamePresets: 'Game presets',
    tactical: 'Tactical preferences',
    mouse: 'Mouse',
    weight: 'Weight',
    mousepad: 'Mousepad',
    polling: 'Polling rate',
    skates: 'PTFE / glides',
    dpi: 'DPI',
    sens: 'Sens',
    edpi: 'eDPI',
    fov: 'FOV',
    aspect: 'Screen',
    training: 'Preferred training',
    crosshair: 'Favorite crosshair',
    editTitle: 'Edit player pass',
    nickname: 'Nickname',
    tag: 'Tag',
    rank: 'Rank',
    avatar: 'Avatar URL',
    game: 'Game',
    save: 'Save',
    cancel: 'Cancel',
  },
  es: {
    navTitle: 'Pase táctico de identidad',
    title: 'Perfil del jugador',
    subtitle: 'Centraliza tu setup, juegos y preferencias antes de entrenar o calibrar.',
    edit: 'Editar perfil',
    addGame: 'Añadir juego',
    export: 'Exportar card',
    saved: 'Perfil guardado',
    copied: 'Card copiado',
    identity: 'Identidad',
    trainingRank: 'Rango de entrenamiento',
    precisionLevel: 'Nivel de precisión',
    hardware: 'Setup de periféricos',
    gamePresets: 'Game presets',
    tactical: 'Preferencias tácticas',
    mouse: 'Ratón',
    weight: 'Peso',
    mousepad: 'Mousepad',
    polling: 'Polling rate',
    skates: 'PTFE / glides',
    dpi: 'DPI',
    sens: 'Sensi',
    edpi: 'eDPI',
    fov: 'FOV',
    aspect: 'Pantalla',
    training: 'Entrenamiento preferido',
    crosshair: 'Mira favorita',
    editTitle: 'Editar pase del jugador',
    nickname: 'Nickname',
    tag: 'Tag',
    rank: 'Rango',
    avatar: 'URL del avatar',
    game: 'Juego',
    save: 'Guardar',
    cancel: 'Cancelar',
  },
} satisfies Record<Locale, Record<string, string>>

const defaultProfile: PlayerProfileData = {
  nickname: 'PLAYER_X',
  tag: '#XENSI-01',
  rank: 'Diamond Control',
  accuracyLevel: 82,
  avatarUrl: '',
  mouseModel: 'Logitech G Pro X Superlight',
  mouseWeight: '63g',
  mousepad: 'Pano control / e-sports',
  pollingRate: '1000Hz',
  skates: 'PTFE stock',
  preferredTraining: 'Tracking + Gridshot',
  crosshair: 'Dot / centro limpo',
  games: [
    { id: 'valorant', dpi: 800, sensitivity: 0.36, fov: 103, aspectRatio: '16:9' },
    { id: 'cs2', dpi: 800, sensitivity: 1.15, fov: 106, aspectRatio: '4:3 stretched' },
    { id: 'warzone', dpi: 800, sensitivity: 5.4, fov: 110, aspectRatio: '16:9' },
  ],
}

function readProfile(): PlayerProfileData {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultProfile
    const parsed = JSON.parse(raw) as Partial<PlayerProfileData>
    return { ...defaultProfile, ...parsed, games: parsed.games?.length ? parsed.games : defaultProfile.games }
  } catch {
    return defaultProfile
  }
}

function numberOr(value: string, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function GameIcon({ id }: { id: GameId }) {
  const game = GAME_BY_ID[id]
  return <span className={`profile-game-icon game-logo-${id}`}>
    <img src={`./game-icons/${game.iconFile ?? `${id}.png`}`} alt="" />
  </span>
}

export function PlayerProfile() {
  const { locale } = useI18n()
  const text = copy[locale]
  const [profile, setProfile] = useState<PlayerProfileData>(readProfile)
  const [draft, setDraft] = useState<PlayerProfileData>(profile)
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0)
  const [editing, setEditing] = useState(false)
  const [status, setStatus] = useState('')

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
  }, [profile])

  const activePreset = useMemo(() => {
    return profile.games[selectedPresetIndex] ?? profile.games[0] ?? defaultProfile.games[0]
  }, [profile.games, selectedPresetIndex])
  const activeGame = GAME_BY_ID[activePreset.id]
  const edpi = Math.round(activePreset.dpi * activePreset.sensitivity)

  const openEditor = (mode: 'edit' | 'add') => {
    const nextDraft: PlayerProfileData = mode === 'add'
      ? {
          ...profile,
          games: [...profile.games, { id: 'overwatch2', dpi: 800, sensitivity: 4.5, fov: 103, aspectRatio: '16:9' }],
        }
      : profile
    setDraft(nextDraft)
    setEditing(true)
  }

  const saveDraft = () => {
    const cleanGames = draft.games.map((game) => ({
      ...game,
      dpi: Math.round(game.dpi),
      sensitivity: Number(game.sensitivity.toFixed(4)),
      fov: Math.round(game.fov),
    }))
    const nextProfile = { ...draft, games: cleanGames }
    setProfile(nextProfile)
    setSelectedPresetIndex(Math.max(0, cleanGames.length - 1))
    setEditing(false)
    setStatus(text.saved)
    window.setTimeout(() => setStatus(''), 1800)
  }

  const exportCard = async () => {
    const lines = [
      `XENSI Player Card`,
      `${profile.nickname} ${profile.tag}`,
      `Rank: ${profile.rank} | Precision: ${profile.accuracyLevel}%`,
      `Mouse: ${profile.mouseModel} (${profile.mouseWeight})`,
      `Mousepad: ${profile.mousepad} | Polling: ${profile.pollingRate}`,
      `Game: ${activeGame.label}`,
      `DPI: ${activePreset.dpi} | Sens: ${activePreset.sensitivity} | eDPI: ${edpi}`,
      `FOV: ${activePreset.fov} | Aspect: ${activePreset.aspectRatio}`,
      `Training: ${profile.preferredTraining} | Crosshair: ${profile.crosshair}`,
    ]
    await navigator.clipboard?.writeText(lines.join('\n'))
    setStatus(text.copied)
    window.setTimeout(() => setStatus(''), 1800)
  }

  const updateDraftGame = (index: number, patch: Partial<GamePreset>) => {
    setDraft((current) => ({
      ...current,
      games: current.games.map((game, gameIndex) => gameIndex === index ? { ...game, ...patch } : game),
    }))
  }

  return <section className="profile-workspace">
    <div className="profile-shell">
      <header className="profile-hero">
        <div>
          <span className="profile-kicker"><Sparkles size={15} /> {text.navTitle}</span>
          <h1>{text.title}</h1>
          <p>{text.subtitle}</p>
        </div>
        <div className="profile-actions">
          {status && <span className="profile-status"><CheckCircle2 size={14} /> {status}</span>}
          <button onClick={() => openEditor('edit')}><Edit3 size={16} /> {text.edit}</button>
          <button onClick={() => openEditor('add')}><Plus size={16} /> {text.addGame}</button>
          <button className="profile-export" onClick={exportCard}><Clipboard size={16} /> {text.export}</button>
        </div>
      </header>

      <div className="profile-grid">
        <article className="profile-card profile-identity">
          <span>{text.identity}</span>
          <div className="profile-agent">
            <div className="profile-avatar">
              {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : <strong>{profile.nickname.slice(0, 2).toUpperCase()}</strong>}
            </div>
            <div>
              <h2>{profile.nickname}</h2>
              <small>{profile.tag}</small>
            </div>
          </div>
          <div className="profile-rank">
            <div><small>{text.trainingRank}</small><strong>{profile.rank}</strong></div>
            <div><small>{text.precisionLevel}</small><strong>{profile.accuracyLevel}%</strong></div>
          </div>
          <div className="profile-progress"><i style={{ width: `${profile.accuracyLevel}%` }} /></div>
        </article>

        <article className="profile-card profile-hardware">
          <span><Mouse size={15} /> {text.hardware}</span>
          <dl>
            <div><dt>{text.mouse}</dt><dd>{profile.mouseModel}</dd></div>
            <div><dt>{text.weight}</dt><dd>{profile.mouseWeight}</dd></div>
            <div><dt>{text.mousepad}</dt><dd>{profile.mousepad}</dd></div>
            <div><dt>{text.polling}</dt><dd>{profile.pollingRate}</dd></div>
            <div><dt>{text.skates}</dt><dd>{profile.skates}</dd></div>
          </dl>
        </article>

        <article className="profile-card profile-presets">
          <span><Gamepad2 size={15} /> {text.gamePresets}</span>
          <div className="profile-game-tabs">
            {profile.games.map((preset, index) => {
              const game = GAME_BY_ID[preset.id]
              return <button key={`${preset.id}-${index}`} className={index === selectedPresetIndex ? 'selected' : ''} onClick={() => setSelectedPresetIndex(index)}>
                <GameIcon id={preset.id} />
                <strong>{game.shortLabel}</strong>
              </button>
            })}
          </div>
          <div className="profile-game-panel" key={`${activePreset.id}-${activePreset.sensitivity}`}>
            <div className="profile-game-title"><GameIcon id={activePreset.id} /><div><small>{activeGame.label}</small><strong>{activePreset.sensitivity}</strong></div></div>
            <div className="profile-stat-grid">
              <div><Gauge size={15} /><span>{text.dpi}</span><strong>{activePreset.dpi}</strong></div>
              <div><Target size={15} /><span>{text.sens}</span><strong>{activePreset.sensitivity}</strong></div>
              <div><HardDrive size={15} /><span>{text.edpi}</span><strong>{edpi}</strong></div>
              <div><Crosshair size={15} /><span>{text.fov}</span><strong>{activePreset.fov}°</strong></div>
              <div><Gamepad2 size={15} /><span>{text.aspect}</span><strong>{activePreset.aspectRatio}</strong></div>
            </div>
          </div>
        </article>

        <article className="profile-card profile-tactical">
          <span><Crosshair size={15} /> {text.tactical}</span>
          <div className="profile-tactical-ring"><i /><b /></div>
          <div className="profile-tactical-values">
            <div><small>{text.training}</small><strong>{profile.preferredTraining}</strong></div>
            <div><small>{text.crosshair}</small><strong>{profile.crosshair}</strong></div>
          </div>
        </article>
      </div>
    </div>

    {editing && <div className="modal-backdrop">
      <div className="setup-modal profile-editor">
        <button className="modal-close" onClick={() => setEditing(false)}><X size={18} /></button>
        <span className="modal-kicker"><Edit3 size={15} /> {text.editTitle}</span>
        <div className="profile-editor-grid">
          <label>{text.nickname}<input value={draft.nickname} onChange={(event) => setDraft({ ...draft, nickname: event.target.value })} /></label>
          <label>{text.tag}<input value={draft.tag} onChange={(event) => setDraft({ ...draft, tag: event.target.value })} /></label>
          <label>{text.rank}<input value={draft.rank} onChange={(event) => setDraft({ ...draft, rank: event.target.value })} /></label>
          <label>{text.precisionLevel}<input type="number" value={draft.accuracyLevel} onChange={(event) => setDraft({ ...draft, accuracyLevel: Math.max(0, Math.min(100, numberOr(event.target.value, draft.accuracyLevel))) })} /></label>
          <label>{text.avatar}<input value={draft.avatarUrl} onChange={(event) => setDraft({ ...draft, avatarUrl: event.target.value })} /></label>
          <label>{text.mouse}<input value={draft.mouseModel} onChange={(event) => setDraft({ ...draft, mouseModel: event.target.value })} /></label>
          <label>{text.weight}<input value={draft.mouseWeight} onChange={(event) => setDraft({ ...draft, mouseWeight: event.target.value })} /></label>
          <label>{text.mousepad}<input value={draft.mousepad} onChange={(event) => setDraft({ ...draft, mousepad: event.target.value })} /></label>
          <label>{text.polling}<input value={draft.pollingRate} onChange={(event) => setDraft({ ...draft, pollingRate: event.target.value })} /></label>
          <label>{text.skates}<input value={draft.skates} onChange={(event) => setDraft({ ...draft, skates: event.target.value })} /></label>
          <label>{text.training}<input value={draft.preferredTraining} onChange={(event) => setDraft({ ...draft, preferredTraining: event.target.value })} /></label>
          <label>{text.crosshair}<input value={draft.crosshair} onChange={(event) => setDraft({ ...draft, crosshair: event.target.value })} /></label>
        </div>
        <div className="profile-editor-games">
          {draft.games.map((preset, index) => <div key={`${preset.id}-${index}`}>
            <select value={preset.id} onChange={(event) => updateDraftGame(index, { id: event.target.value as GameId })}>
              {GAMES.map((game) => <option key={game.id} value={game.id}>{game.label}</option>)}
            </select>
            <input type="number" value={preset.dpi} aria-label={text.dpi} onChange={(event) => updateDraftGame(index, { dpi: numberOr(event.target.value, preset.dpi) })} />
            <input type="number" step="0.001" value={preset.sensitivity} aria-label={text.sens} onChange={(event) => updateDraftGame(index, { sensitivity: numberOr(event.target.value, preset.sensitivity) })} />
            <input type="number" value={preset.fov} aria-label={text.fov} onChange={(event) => updateDraftGame(index, { fov: numberOr(event.target.value, preset.fov) })} />
            <input value={preset.aspectRatio} aria-label={text.aspect} onChange={(event) => updateDraftGame(index, { aspectRatio: event.target.value })} />
          </div>)}
        </div>
        <div className="modal-actions">
          <button className="secondary-button" onClick={() => setEditing(false)}>{text.cancel}</button>
          <button className="primary-button" onClick={saveDraft}><Save size={16} /> {text.save}</button>
        </div>
      </div>
    </div>}
  </section>
}
