import { Check, Gauge } from 'lucide-react'
import { GameBadge } from './GameBadge'
import { GAME_IDENTITY_BY_ID } from './gameIdentity'
import { useI18n } from './i18n'
import { calculatePresetCm360, type SensitivityPreset } from './playerProfileStore'
import { presetCopy } from './presetCopy'
import type { SensitivityDraft } from './useSensitivityPreset'
import type { ReactNode } from 'react'

type Props = {
  draft: SensitivityDraft
  presets: SensitivityPreset[]
  onSelectPreset: (id: string) => void
  onSensitivityChange: (value: string) => void
  onDpiChange: (value: string) => void
  sensitivityInvalid?: boolean
  dpiInvalid?: boolean
  children?: ReactNode
}

export function SensitivityConfigFields({ draft, presets, onSelectPreset, onSensitivityChange, onDpiChange, sensitivityInvalid, dpiInvalid, children }: Props) {
  const { locale, t } = useI18n()
  const text = presetCopy[locale]
  const matches = presets.filter(item => item.gameId === draft.gameId)
  const selected = matches.find(item => item.id === draft.presetId)
  const sensitivity = Number(draft.sensitivity.replace(',', '.'))
  const dpi = Number(draft.dpi.replace(',', '.'))
  const changed = !selected || sensitivity !== selected.sensitivity || dpi !== selected.dpi
  const cm = calculatePresetCm360({ gameId: draft.gameId, sensitivity, dpi })
  const status = draft.dirty && changed ? text.temporary : selected ? selected.isPrimary ? text.primaryLoaded : text.savedLoaded : text.sessionConfig

  return <div className="xensi-config-fields">
    <header>
      <GameBadge gameId={draft.gameId} />
      <div><span>{text.adjustTitle}</span><strong>{GAME_IDENTITY_BY_ID[draft.gameId].name}</strong></div>
      <small className={draft.dirty && changed ? 'is-temporary' : ''} aria-live="polite">{selected && !changed && <Check size={13} />}{status}</small>
    </header>
    {matches.length > 1 && <label className="xensi-preset-select"><span>{text.choose}</span><select value={draft.presetId ?? ''} onChange={event => onSelectPreset(event.target.value)}>
      {matches.map(preset => <option key={preset.id} value={preset.id}>{preset.name || (preset.isPrimary ? text.primary : text.saved)}</option>)}
    </select></label>}
    <div className="xensi-config-inputs">
      <label><span>{text.sensitivity}</span><input type="text" inputMode="decimal" value={draft.sensitivity} onChange={event => onSensitivityChange(event.target.value)} aria-label={text.sensitivity} aria-invalid={sensitivityInvalid} /></label>
      <label><span>{t('common.mouseDpi')}</span><input type="text" inputMode="numeric" value={draft.dpi} onChange={event => onDpiChange(event.target.value)} aria-label={t('common.mouseDpi')} aria-invalid={dpiInvalid} /></label>
      <div className="xensi-physical-reference"><Gauge size={17} /><span>{text.physicalReference}<strong>{cm !== null && Number.isFinite(cm) && cm > 0 ? `${cm.toFixed(2)} cm/360` : '—'}</strong></span></div>
    </div>
    {children}
  </div>
}
