import { useState } from 'react'
import { Check, Crosshair, Edit3, Gauge, Plus, RefreshCw, Star, Trash2, UserRound, X } from 'lucide-react'
import { AvatarArtwork } from './AvatarArtwork'
import { XENSI_AVATARS, type AvatarId } from './avatars'
import { GAME_SENSITIVITY_PROFILES, GAME_SENSITIVITY_PROFILE_BY_ID, type GameSensitivityProfileId } from './gameSensitivityProfiles'
import { useI18n, type Locale } from './i18n'
import { calculatePresetCm360, ensureSinglePrimary, writePlayerProfile, type PlayerProfileData, type SensitivityPreset } from './playerProfileStore'
import { GameBadge } from './GameBadge'
import { usePlayerProfile } from './useSensitivityPreset'
import { normalizeSensitivityForGame } from './sensitivityConversionEngine'

export type ProfilePresetLaunch = Pick<SensitivityPreset, 'id' | 'gameId' | 'sensitivity' | 'dpi'>

type PlayerProfileProps = {
  onConvert: (preset: ProfilePresetLaunch) => void
  onCalibrate: (preset: ProfilePresetLaunch) => void
}

type PresetDraft = {
  id?: string
  gameId: GameSensitivityProfileId
  name: string
  sensitivity: string
  dpi: string
  isPrimary: boolean
  createdAt?: string
}

const copy = {
  pt: {
    kicker: 'Configuração pessoal', title: 'Perfil', subtitle: 'Sua identidade e sensibilidades salvas.', identity: 'Identidade', editProfile: 'Editar perfil', nickname: 'Nickname', avatar: 'Avatar XENSI', saved: 'Alterações salvas', sensitivities: 'Sensibilidades salvas', add: 'Adicionar', emptyTitle: 'Nenhuma sensibilidade salva.', emptyText: 'Salve a configuração dos jogos que você usa para acessar rapidamente o conversor e a calibração.', addSensitivity: 'Adicionar sensibilidade', primary: 'Principal', setPrimary: 'Definir como principal', sensitivity: 'Sensibilidade', dpi: 'DPI', unavailable: 'cm/360 indisponível', unavailableHint: 'Este perfil de jogo ainda não possui cálculo físico compatível.', edit: 'Editar', calibrate: 'Calibrar', convert: 'Converter', remove: 'Remover', editIdentity: 'Editar identidade', editPreset: 'Editar sensibilidade', addPreset: 'Adicionar sensibilidade', game: 'Jogo', presetName: 'Nome do preset (opcional)', save: 'Salvar', cancel: 'Cancelar', confirmRemove: 'Remover esta sensibilidade salva?', calibratorUnavailable: 'Calibração indisponível para este jogo', invalid: 'Informe sensibilidade e DPI válidos.',
  },
  en: {
    kicker: 'Personal settings', title: 'Profile', subtitle: 'Your identity and saved sensitivities.', identity: 'Identity', editProfile: 'Edit profile', nickname: 'Nickname', avatar: 'XENSI avatar', saved: 'Changes saved', sensitivities: 'Saved sensitivities', add: 'Add', emptyTitle: 'No saved sensitivities.', emptyText: 'Save the settings for the games you use to quickly access conversion and calibration.', addSensitivity: 'Add sensitivity', primary: 'Primary', setPrimary: 'Set as primary', sensitivity: 'Sensitivity', dpi: 'DPI', unavailable: 'cm/360 unavailable', unavailableHint: 'This game profile does not support a compatible physical calculation yet.', edit: 'Edit', calibrate: 'Calibrate', convert: 'Convert', remove: 'Remove', editIdentity: 'Edit identity', editPreset: 'Edit sensitivity', addPreset: 'Add sensitivity', game: 'Game', presetName: 'Preset name (optional)', save: 'Save', cancel: 'Cancel', confirmRemove: 'Remove this saved sensitivity?', calibratorUnavailable: 'Calibration is unavailable for this game', invalid: 'Enter a valid sensitivity and DPI.',
  },
  es: {
    kicker: 'Configuración personal', title: 'Perfil', subtitle: 'Tu identidad y sensibilidades guardadas.', identity: 'Identidad', editProfile: 'Editar perfil', nickname: 'Nickname', avatar: 'Avatar XENSI', saved: 'Cambios guardados', sensitivities: 'Sensibilidades guardadas', add: 'Añadir', emptyTitle: 'No hay sensibilidades guardadas.', emptyText: 'Guarda la configuración de tus juegos para acceder rápidamente al conversor y a la calibración.', addSensitivity: 'Añadir sensibilidad', primary: 'Principal', setPrimary: 'Marcar como principal', sensitivity: 'Sensibilidad', dpi: 'DPI', unavailable: 'cm/360 no disponible', unavailableHint: 'Este perfil de juego aún no admite un cálculo físico compatible.', edit: 'Editar', calibrate: 'Calibrar', convert: 'Convertir', remove: 'Eliminar', editIdentity: 'Editar identidad', editPreset: 'Editar sensibilidad', addPreset: 'Añadir sensibilidad', game: 'Juego', presetName: 'Nombre del preset (opcional)', save: 'Guardar', cancel: 'Cancelar', confirmRemove: '¿Eliminar esta sensibilidad guardada?', calibratorUnavailable: 'La calibración no está disponible para este juego', invalid: 'Introduce una sensibilidad y un DPI válidos.',
  },
} satisfies Record<Locale, Record<string, string>>

const CALIBRATOR_GAMES = new Set<GameSensitivityProfileId>(['cs2', 'valorant', 'overwatch2', 'warzone'])

function createPresetId() {
  return globalThis.crypto?.randomUUID?.() ?? `preset-${Date.now()}`
}

export function PlayerProfile({ onConvert, onCalibrate }: PlayerProfileProps) {
  const { locale } = useI18n()
  const text = copy[locale]
  const profile = usePlayerProfile()
  const [identityOpen, setIdentityOpen] = useState(false)
  const [identityDraft, setIdentityDraft] = useState({ nickname: profile.nickname, avatarId: profile.avatarId })
  const [presetDraft, setPresetDraft] = useState<PresetDraft | null>(null)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  const persist = (next: PlayerProfileData) => {
    writePlayerProfile(window.localStorage, next)
    setStatus(text.saved)
    window.setTimeout(() => setStatus(''), 1600)
  }

  const openIdentity = () => {
    setIdentityDraft({ nickname: profile.nickname, avatarId: profile.avatarId })
    setIdentityOpen(true)
  }

  const saveIdentity = () => {
    persist({ ...profile, nickname: identityDraft.nickname.trim() || 'xensi_dev', avatarId: identityDraft.avatarId })
    setIdentityOpen(false)
  }

  const openNewPreset = () => {
    setError('')
    setPresetDraft({ gameId: 'cs2', name: '', sensitivity: '1', dpi: '800', isPrimary: profile.presets.length === 0 })
  }

  const openPreset = (preset: SensitivityPreset) => {
    setError('')
    setPresetDraft({ id: preset.id, gameId: preset.gameId, name: preset.name ?? '', sensitivity: String(preset.sensitivity), dpi: String(preset.dpi), isPrimary: preset.isPrimary, createdAt: preset.createdAt })
  }

  const savePreset = () => {
    if (!presetDraft) return
    const sensitivity = Number(presetDraft.sensitivity.replace(',', '.'))
    const dpi = Number(presetDraft.dpi.replace(',', '.'))
    const gameProfile = GAME_SENSITIVITY_PROFILE_BY_ID[presetDraft.gameId]
    const normalized = normalizeSensitivityForGame(sensitivity, gameProfile)
    const storedSensitivity = gameProfile.inputModel.type === 'unavailable' ? sensitivity : normalized
    if (storedSensitivity === null || !Number.isFinite(sensitivity) || sensitivity <= 0 || !Number.isFinite(dpi) || dpi <= 0) {
      setError(text.invalid)
      return
    }
    const now = new Date().toISOString()
    const saved: SensitivityPreset = {
      id: presetDraft.id ?? createPresetId(), gameId: presetDraft.gameId,
      name: presetDraft.name.trim() || undefined, sensitivity: storedSensitivity, dpi: Math.round(dpi),
      isPrimary: presetDraft.isPrimary, createdAt: presetDraft.createdAt ?? now, updatedAt: now,
    }
    const exists = profile.presets.some((preset) => preset.id === saved.id)
    const nextPresets = exists ? profile.presets.map((preset) => preset.id === saved.id ? saved : preset) : [...profile.presets, saved]
    const withPrimary = saved.isPrimary
      ? ensureSinglePrimary(nextPresets.map((preset) => preset.gameId === saved.gameId ? { ...preset, isPrimary: preset.id === saved.id } : preset))
      : ensureSinglePrimary(nextPresets)
    persist({ ...profile, presets: withPrimary })
    setPresetDraft(null)
  }

  const setPrimary = (id: string) => {
    const gameId = profile.presets.find(preset => preset.id === id)?.gameId
    persist({ ...profile, presets: profile.presets.map(preset => preset.gameId === gameId ? { ...preset, isPrimary: preset.id === id } : preset) })
  }

  const removePreset = (id: string) => {
    if (!window.confirm(text.confirmRemove)) return
    persist({ ...profile, presets: ensureSinglePrimary(profile.presets.filter((preset) => preset.id !== id)) })
  }

  return <section className="profile-v1-workspace">
    <div className="profile-v1-shell">
      <header className="profile-v1-heading">
        <span><UserRound size={15} /> {text.kicker}</span>
        <h1>{text.title}</h1>
        <p>{text.subtitle}</p>
        {status && <small className="profile-v1-status"><Check size={14} /> {status}</small>}
      </header>

      <article className="profile-v1-identity">
        <span className="profile-v1-label">{text.identity}</span>
        <div className="profile-v1-person">
          <AvatarArtwork avatarId={profile.avatarId} size="lg" />
          <div><h2>{profile.nickname}</h2><button type="button" onClick={openIdentity}><Edit3 size={15} /> {text.editProfile}</button></div>
        </div>
      </article>

      <section className="profile-v1-presets">
        <header><div><span className="profile-v1-label">{text.sensitivities}</span><small>{profile.presets.length}</small></div><button className="profile-v1-add" type="button" onClick={openNewPreset}><Plus size={16} /> {text.add}</button></header>
        {profile.presets.length === 0 ? <div className="profile-v1-empty"><Crosshair size={24} /><h2>{text.emptyTitle}</h2><p>{text.emptyText}</p><button type="button" onClick={openNewPreset}><Plus size={16} /> {text.addSensitivity}</button></div>
          : <div className="profile-v1-grid">{profile.presets.map((preset) => {
            const game = GAME_SENSITIVITY_PROFILE_BY_ID[preset.gameId]
            const cm360 = calculatePresetCm360(preset)
            const canCalibrate = CALIBRATOR_GAMES.has(preset.gameId)
            return <article className={`profile-preset-card${preset.isPrimary ? ' primary' : ''}`} key={preset.id}>
              <header><div className="profile-preset-game"><GameBadge gameId={preset.gameId} selected={preset.isPrimary} /><div><small>{preset.name || game.name}</small><strong>{game.shortName}</strong></div></div>{preset.isPrimary ? <b><Star size={12} /> {text.primary}</b> : <button type="button" onClick={() => setPrimary(preset.id)}><Star size={13} /> {text.setPrimary}</button>}</header>
              <dl><div><dt>{text.sensitivity}</dt><dd>{preset.sensitivity}</dd></div><div><dt>{text.dpi}</dt><dd>{preset.dpi}</dd></div><div className="profile-preset-distance"><dt>CM / 360</dt><dd title={cm360 === null ? text.unavailableHint : undefined}>{cm360 === null ? text.unavailable : `${cm360.toFixed(2)} cm/360`}</dd></div></dl>
              <footer><button type="button" onClick={() => openPreset(preset)}><Edit3 size={14} /> {text.edit}</button><button type="button" onClick={() => onCalibrate(preset)} disabled={!canCalibrate} title={!canCalibrate ? text.calibratorUnavailable : undefined}><Gauge size={14} /> {text.calibrate}</button><button className="profile-preset-convert" type="button" onClick={() => onConvert(preset)}><RefreshCw size={14} /> {text.convert} →</button><button className="profile-preset-remove" type="button" onClick={() => removePreset(preset.id)} aria-label={text.remove}><Trash2 size={14} /></button></footer>
            </article>
          })}</div>}
      </section>
    </div>

    {identityOpen && <div className="modal-backdrop"><section className="profile-v1-modal" role="dialog" aria-modal="true" aria-labelledby="identity-modal-title"><button className="modal-close" type="button" onClick={() => setIdentityOpen(false)} aria-label={text.cancel}><X size={18} /></button><span className="profile-v1-label">{text.identity}</span><h2 id="identity-modal-title">{text.editIdentity}</h2><label>{text.nickname}<input value={identityDraft.nickname} maxLength={24} onChange={(event) => setIdentityDraft({ ...identityDraft, nickname: event.target.value })} /></label><div className="profile-v1-avatar-field"><span>{text.avatar}</span><div className="profile-avatar-picker">{XENSI_AVATARS.map((avatar) => <button key={avatar.id} type="button" className={identityDraft.avatarId === avatar.id ? 'selected' : ''} onClick={() => setIdentityDraft({ ...identityDraft, avatarId: avatar.id as AvatarId })} aria-label={avatar.label} aria-pressed={identityDraft.avatarId === avatar.id}><AvatarArtwork avatarId={avatar.id} size="picker" selected={identityDraft.avatarId === avatar.id} /></button>)}</div></div><footer><button className="secondary-button" type="button" onClick={() => setIdentityOpen(false)}>{text.cancel}</button><button className="primary-button" type="button" onClick={saveIdentity}><Check size={15} /> {text.save}</button></footer></section></div>}

    {presetDraft && <div className="modal-backdrop"><section className="profile-v1-modal profile-v1-preset-modal" role="dialog" aria-modal="true" aria-labelledby="preset-modal-title"><button className="modal-close" type="button" onClick={() => setPresetDraft(null)} aria-label={text.cancel}><X size={18} /></button><span className="profile-v1-label">{text.sensitivities}</span><h2 id="preset-modal-title">{presetDraft.id ? text.editPreset : text.addPreset}</h2><div className="profile-v1-form-grid"><label>{text.game}<select aria-label={text.game} value={presetDraft.gameId} onChange={(event) => setPresetDraft({ ...presetDraft, gameId: event.target.value as GameSensitivityProfileId })}>{GAME_SENSITIVITY_PROFILES.map((game) => <option value={game.id} key={game.id}>{game.name}</option>)}</select></label><label>{text.presetName}<input value={presetDraft.name} maxLength={32} onChange={(event) => setPresetDraft({ ...presetDraft, name: event.target.value })} /></label><label>{text.sensitivity}<input inputMode="decimal" value={presetDraft.sensitivity} onChange={(event) => setPresetDraft({ ...presetDraft, sensitivity: event.target.value })} /></label><label>{text.dpi}<input inputMode="numeric" value={presetDraft.dpi} onChange={(event) => setPresetDraft({ ...presetDraft, dpi: event.target.value })} /></label></div><label className="profile-v1-primary-toggle"><input type="checkbox" checked={presetDraft.isPrimary} onChange={(event) => setPresetDraft({ ...presetDraft, isPrimary: event.target.checked })} /><Star size={15} /> {text.setPrimary}</label>{error && <p className="profile-v1-error">{error}</p>}<footer><button className="secondary-button" type="button" onClick={() => setPresetDraft(null)}>{text.cancel}</button><button className="primary-button" type="button" onClick={savePreset}><Check size={15} /> {text.save}</button></footer></section></div>}
  </section>
}
