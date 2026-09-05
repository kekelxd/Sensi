import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { CheckCircle2, Clipboard, Crosshair, Edit3, Gamepad2, Gauge, HardDrive, Mouse, Plus, Save, Sparkles, Target, Trash2, X } from 'lucide-react'
import { GAME_BY_ID, GAMES, type GameId } from './games'
import { useI18n, type Locale } from './i18n'
import { AvatarArtwork } from './AvatarArtwork'
import { DEFAULT_AVATAR, XENSI_AVATARS, isAvatarId, type AvatarId } from './avatars'

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
  avatarId: AvatarId
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
const RANK_OPTIONS = ['Bronze', 'Silver', 'Gold', 'Diamond Control', 'Radiant', 'Apex Predator']
const POLLING_OPTIONS = ['125Hz', '500Hz', '1000Hz', '4000Hz', '8000Hz']
const MOUSEPAD_OPTIONS = ['Tecido Control', 'Tecido Speed', 'Vidro', 'Híbrido', 'E-sports Control']
const SKATE_OPTIONS = ['Stock', 'Dot Skates 100% PTFE', 'Glass Skates']
const ASPECT_OPTIONS = ['16:9', '4:3 stretched', '16:10']

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
    avatar: 'Avatar XENSI',
    game: 'Jogo',
    addNewGame: 'Adicionar novo jogo',
    removeGame: 'Remover jogo',
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
    avatar: 'XENSI avatar',
    game: 'Game',
    addNewGame: 'Add new game',
    removeGame: 'Remove game',
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
    avatar: 'Avatar XENSI',
    game: 'Juego',
    addNewGame: 'Añadir nuevo juego',
    removeGame: 'Eliminar juego',
    save: 'Guardar',
    cancel: 'Cancelar',
  },
} satisfies Record<Locale, Record<string, string>>

const defaultProfile: PlayerProfileData = {
  nickname: 'PLAYER_X',
  tag: '#XENSI-01',
  rank: 'Diamond Control',
  accuracyLevel: 82,
  avatarId: DEFAULT_AVATAR,
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
    const parsed = JSON.parse(raw) as Partial<PlayerProfileData> & { avatarUrl?: string }
    return { ...defaultProfile, ...parsed, avatarId: isAvatarId(parsed.avatarId) ? parsed.avatarId : DEFAULT_AVATAR, games: parsed.games?.length ? parsed.games : defaultProfile.games }
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
    window.dispatchEvent(new Event('xensi-profile-updated'))
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
  const addDraftGame = () => {
    setDraft((current) => ({
      ...current,
      games: [...current.games, { id: 'overwatch2', dpi: 800, sensitivity: 4.5, fov: 103, aspectRatio: '16:9' }],
    }))
  }
  const removeDraftGame = (index: number) => {
    setDraft((current) => ({
      ...current,
      games: current.games.length <= 1 ? current.games : current.games.filter((_, gameIndex) => gameIndex !== index),
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
              <AvatarArtwork avatarId={profile.avatarId} />
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
        <div className="profile-editor-section">
          <strong>{text.identity}</strong>
          <div className="profile-editor-grid">
            <label className="profile-field">{text.nickname}<span className="profile-prefixed-field"><b>@</b><input value={draft.nickname} onChange={(event) => setDraft({ ...draft, nickname: event.target.value })} /></span></label>
            <label className="profile-field">{text.tag}<span className="profile-prefixed-field"><b>#</b><input value={draft.tag.replace(/^#/, '')} onChange={(event) => setDraft({ ...draft, tag: `#${event.target.value.replace(/^#/, '')}` })} /></span></label>
            <label className="profile-field">{text.rank}<select value={draft.rank} onChange={(event) => setDraft({ ...draft, rank: event.target.value })}>{RANK_OPTIONS.map((rank) => <option key={rank} value={rank}>{rank}</option>)}</select></label>
            <label className="profile-field profile-slider-field">{text.precisionLevel}<span>{draft.accuracyLevel}%</span><input type="range" min="0" max="100" value={draft.accuracyLevel} style={{ '--profile-range': `${draft.accuracyLevel}%` } as CSSProperties} onChange={(event) => setDraft({ ...draft, accuracyLevel: Number(event.target.value) })} /></label>
            <div className="profile-avatar-field profile-wide-field"><span>{text.avatar}</span><div className="profile-avatar-picker">{XENSI_AVATARS.map((avatar) => <button key={avatar.id} type="button" className={draft.avatarId === avatar.id ? 'selected' : ''} onClick={() => setDraft({ ...draft, avatarId: avatar.id })} aria-label={avatar.label} aria-pressed={draft.avatarId === avatar.id}><AvatarArtwork avatarId={avatar.id} /></button>)}</div></div>
          </div>
        </div>
        <div className="profile-editor-section">
          <strong>{text.hardware}</strong>
          <div className="profile-editor-grid">
            <label className="profile-field">{text.mouse}<input list="profile-mouse-models" value={draft.mouseModel} onChange={(event) => setDraft({ ...draft, mouseModel: event.target.value })} /></label>
            <label className="profile-field">{text.weight}<input value={draft.mouseWeight} onChange={(event) => setDraft({ ...draft, mouseWeight: event.target.value })} /></label>
            <label className="profile-field">{text.mousepad}<select value={draft.mousepad} onChange={(event) => setDraft({ ...draft, mousepad: event.target.value })}>{MOUSEPAD_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
            <label className="profile-field profile-wide-field">{text.polling}<span className="profile-chip-row">{POLLING_OPTIONS.map((option) => <button key={option} type="button" className={draft.pollingRate === option ? 'selected' : ''} onClick={() => setDraft({ ...draft, pollingRate: option })}>{option}</button>)}</span></label>
            <label className="profile-field profile-wide-field">{text.skates}<span className="profile-chip-row">{SKATE_OPTIONS.map((option) => <button key={option} type="button" className={draft.skates === option ? 'selected' : ''} onClick={() => setDraft({ ...draft, skates: option })}>{option}</button>)}</span></label>
            <label className="profile-field">{text.training}<input value={draft.preferredTraining} onChange={(event) => setDraft({ ...draft, preferredTraining: event.target.value })} /></label>
            <label className="profile-field">{text.crosshair}<input value={draft.crosshair} onChange={(event) => setDraft({ ...draft, crosshair: event.target.value })} /></label>
          </div>
          <datalist id="profile-mouse-models">
            <option value="Logitech G Pro X Superlight" />
            <option value="Razer Viper V3 Pro" />
            <option value="Zowie EC2-CW" />
            <option value="Finalmouse UltralightX" />
          </datalist>
        </div>
        <div className="profile-editor-games">
          <div className="profile-editor-games-head">
            <strong>{text.gamePresets}</strong>
            <button type="button" onClick={addDraftGame}><Plus size={14} /> {text.addNewGame}</button>
          </div>
          {draft.games.map((preset, index) => <div className="profile-game-row" key={`${preset.id}-${index}`}>
            <label>{text.game}<select value={preset.id} onChange={(event) => updateDraftGame(index, { id: event.target.value as GameId })}>
              {GAMES.map((game) => <option key={game.id} value={game.id}>{game.label}</option>)}
            </select></label>
            <label>{text.dpi}<input type="number" value={preset.dpi} aria-label={text.dpi} onChange={(event) => updateDraftGame(index, { dpi: numberOr(event.target.value, preset.dpi) })} /></label>
            <label>{text.sens}<input type="number" step="0.001" value={preset.sensitivity} aria-label={text.sens} onChange={(event) => updateDraftGame(index, { sensitivity: numberOr(event.target.value, preset.sensitivity) })} /></label>
            <label className="profile-game-fov">{text.fov}<span>{preset.fov}°</span><input type="range" min="60" max="120" value={preset.fov} style={{ '--profile-range': `${((preset.fov - 60) / 60) * 100}%` } as CSSProperties} onChange={(event) => updateDraftGame(index, { fov: Number(event.target.value) })} /></label>
            <label className="profile-game-aspect">{text.aspect}<span className="profile-chip-row">{ASPECT_OPTIONS.map((option) => <button key={option} type="button" className={preset.aspectRatio === option ? 'selected' : ''} onClick={() => updateDraftGame(index, { aspectRatio: option })}>{option}</button>)}</span></label>
            <button className="profile-remove-game" type="button" aria-label={text.removeGame} onClick={() => removeDraftGame(index)} disabled={draft.games.length <= 1}><Trash2 size={16} /></button>
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
