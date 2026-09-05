import { useMemo, useState } from 'react'
import { ArrowLeftRight, Check, ChevronDown, Copy, Info, RefreshCw, ShieldCheck } from 'lucide-react'
import { GAME_SENSITIVITY_PROFILES, GAME_SENSITIVITY_PROFILE_BY_ID, type GameSensitivityProfile, type GameSensitivityProfileId, type VerificationStatus } from './gameSensitivityProfiles'
import { convertSensitivity, isFullyVerified, validateGameProfile } from './sensitivityConversionEngine'
import { formatSensitivity } from './sensitivity'
import { useI18n } from './i18n'

const STATUS_KEYS: Record<VerificationStatus, 'converter.statusVerified' | 'converter.statusCrossVerified' | 'converter.statusMeasured' | 'converter.statusExperimental'> = {
  verified: 'converter.statusVerified', cross_verified: 'converter.statusCrossVerified', measured: 'converter.statusMeasured', experimental: 'converter.statusExperimental',
}

function ProfileIcon({ profile }: { profile: GameSensitivityProfile }) {
  const file = profile.iconFile ?? (profile.id === 'rainbowsix' || profile.id === 'apex' ? null : `${profile.id}.png`)
  return file ? <img src={`./game-icons/${file}`} alt="" /> : <span className="converter-game-fallback" aria-hidden="true">{profile.shortName.slice(0, 2).toUpperCase()}</span>
}

function coefficientOf(profile: GameSensitivityProfile) {
  return profile.angularModel.type === 'linear' ? profile.angularModel.coefficient : null
}

export function SensitivityConverter() {
  const { t } = useI18n()
  const [sourceId, setSourceId] = useState<GameSensitivityProfileId>('cs2')
  const [targetId, setTargetId] = useState<GameSensitivityProfileId>('fortnite')
  const [sourceValue, setSourceValue] = useState('1')
  const [sourceDpi, setSourceDpi] = useState('800')
  const [targetDpi, setTargetDpi] = useState('800')
  const [copied, setCopied] = useState(false)
  const source = GAME_SENSITIVITY_PROFILE_BY_ID[sourceId]
  const target = GAME_SENSITIVITY_PROFILE_BY_ID[targetId]
  const numericValue = Number(sourceValue.replace(',', '.'))
  const numericSourceDpi = Number(sourceDpi.replace(',', '.'))
  const numericTargetDpi = Number(targetDpi.replace(',', '.'))
  const sourceProfileErrors = validateGameProfile(source)
  const targetProfileErrors = validateGameProfile(target)
  const result = useMemo(() => convertSensitivity(numericValue, source, target, numericSourceDpi, numericTargetDpi), [numericSourceDpi, numericTargetDpi, numericValue, source, target])
  const invalidInput = !Number.isFinite(numericValue) || numericValue <= 0
  const invalidDpi = !Number.isFinite(numericSourceDpi) || numericSourceDpi <= 0 || !Number.isFinite(numericTargetDpi) || numericTargetDpi <= 0
  const unsupported = !source.supportedMethods.hipfire360 || !target.supportedMethods.hipfire360
  const unverified = !isFullyVerified(source.verification.status) || !isFullyVerified(target.verification.status)
  const exactLabel = result === null ? '--' : formatSensitivity(result.exactSensitivity, 6)
  const configurableLabel = result === null ? '--' : formatSensitivity(result.configurableSensitivity, 6)
  const duplicateValues = result !== null && Math.abs(result.exactSensitivity - result.configurableSensitivity) < 1e-12
  const statusLabel = (status: VerificationStatus) => t(STATUS_KEYS[status])
  const errorLabel = result === null ? '—' : result.relativeErrorPercent < 0.01 ? t('converter.residualUnder') : `${result.relativeErrorPercent.toFixed(3)}%`

  const swapGames = () => {
    setSourceId(targetId); setTargetId(sourceId)
    if (result !== null) setSourceValue(formatSensitivity(result.configurableSensitivity))
    setSourceDpi(targetDpi); setTargetDpi(sourceDpi); setCopied(false)
  }
  const copyResult = async () => {
    if (result === null) return
    await navigator.clipboard.writeText(configurableLabel)
    setCopied(true); window.setTimeout(() => setCopied(false), 1400)
  }

  return <section className="converter-workspace">
    <div className="converter-heading"><div className="panel-label"><ArrowLeftRight size={15} /> {t('converter.kicker')}</div><h1>{t('converter.title')}</h1><p>{t('converter.subtitle')}</p></div>
    <div className="converter-card">
      <div className="converter-side">
        <span className="converter-label">{t('converter.from')}</span>
        <label className="converter-select"><ProfileIcon profile={source} /><select value={sourceId} onChange={(event) => { setSourceId(event.target.value as GameSensitivityProfileId); setCopied(false) }}>{GAME_SENSITIVITY_PROFILES.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select></label>
        <div className="converter-values">
          <label className="converter-field"><span>{t('converter.currentSensitivity')}</span><input type="text" inputMode="decimal" value={sourceValue} onChange={(event) => setSourceValue(event.target.value)} aria-label={t('converter.currentSensitivity')} /></label>
          <label className="converter-field"><span>{t('converter.sourceDpi')}</span><input type="text" inputMode="numeric" value={sourceDpi} onChange={(event) => setSourceDpi(event.target.value)} aria-label={t('converter.sourceDpi')} /></label>
          <div className="converter-field converter-physical"><span>{t('converter.cmPer360')}</span><strong>{result === null ? '—' : `${result.sourceCm360.toFixed(2)} cm`}</strong></div>
        </div>
      </div>
      <button className="converter-swap" onClick={swapGames} aria-label={t('converter.swap')}><RefreshCw size={18} /></button>
      <div className="converter-side">
        <span className="converter-label">{t('converter.to')}</span>
        <label className="converter-select"><ProfileIcon profile={target} /><select value={targetId} onChange={(event) => { setTargetId(event.target.value as GameSensitivityProfileId); setCopied(false) }}>{GAME_SENSITIVITY_PROFILES.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select></label>
        <div className="converter-values">
          <div className="converter-field converter-result"><span>{t('converter.equivalent360')}</span><strong>{configurableLabel}</strong><button onClick={copyResult} disabled={result === null} aria-label={t('converter.copy')}>{copied ? <Check size={18} /> : <Copy size={18} />}</button></div>
          <label className="converter-field"><span>{t('converter.targetDpi')}</span><input type="text" inputMode="numeric" value={targetDpi} onChange={(event) => setTargetDpi(event.target.value)} aria-label={t('converter.targetDpi')} /></label>
          <div className="converter-field converter-physical"><span>{t('converter.cmPer360')}</span><strong>{result === null ? '—' : `${result.resultingCm360.toFixed(2)} cm`}</strong></div>
        </div>
      </div>
    </div>

    {result !== null && <div className="converter-summary" aria-live="polite">
      <div className="converter-method"><span>{t('converter.method')}</span><strong>{t('converter.hipfireMethod')}</strong></div>
      <div><span>{t('converter.physicalEquivalence')}</span><strong>{result.sourceCm360.toFixed(2)} → {result.resultingCm360.toFixed(2)} cm/360</strong></div>
      {!duplicateValues && <div><span>{t('converter.mathematicalValue')}</span><strong>{exactLabel}</strong></div>}
      <div><span>{t('converter.valueToUse')}</span><strong>{configurableLabel}</strong></div>
      <div><span>{t('converter.residualError')}</span><strong className={`error-${result.errorClassification}`}>{errorLabel}</strong></div>
    </div>}

    {unsupported ? <div className="converter-notice warning"><Info size={16} /><span>{t('converter.unsupportedProfile')}</span></div>
      : sourceProfileErrors.length || targetProfileErrors.length ? <div className="converter-notice warning"><Info size={16} /><span>{t('converter.invalidProfile')}</span></div>
      : invalidInput ? <div className="converter-notice warning"><Info size={16} /><span>{t('converter.invalidSensitivity')}</span></div>
      : invalidDpi ? <div className="converter-notice warning"><Info size={16} /><span>{t('converter.invalidDpi')}</span></div>
      : unverified ? <div className="converter-notice warning"><Info size={16} /><span>{t('converter.unverifiedNotice')}</span></div>
      : <div className="converter-notice"><ShieldCheck size={16} /><span>{t('converter.verifiedNotice')}</span></div>}

    <details className="converter-audit">
      <summary>{t('converter.viewCalculation')}<ChevronDown size={15} /></summary>
      <div className="converter-audit-grid">
        <article><header><span>{t('converter.sourceGame')}</span><i className={`profile-status status-${source.verification.status}`}>{statusLabel(source.verification.status)}</i></header><dl>
          <div><dt>{t('converter.currentSensitivity')}</dt><dd>{Number.isFinite(numericValue) ? formatSensitivity(numericValue) : '—'}</dd></div><div><dt>{t('converter.sourceDpi')}</dt><dd>{Number.isFinite(numericSourceDpi) ? numericSourceDpi : '—'}</dd></div><div><dt>{t('converter.coefficient')}</dt><dd>{coefficientOf(source) ?? '—'}</dd></div><div><dt>{t('converter.cmPer360')}</dt><dd>{result ? `${result.sourceCm360.toFixed(4)} cm` : '—'}</dd></div>
        </dl></article>
        <article><header><span>{t('converter.targetGame')}</span><i className={`profile-status status-${target.verification.status}`}>{statusLabel(target.verification.status)}</i></header><dl>
          <div><dt>{t('converter.mathematicalValue')}</dt><dd>{exactLabel}</dd></div><div><dt>{t('converter.valueToUse')}</dt><dd>{configurableLabel}</dd></div><div><dt>{t('converter.targetDpi')}</dt><dd>{Number.isFinite(numericTargetDpi) ? numericTargetDpi : '—'}</dd></div><div><dt>{t('converter.coefficient')}</dt><dd>{coefficientOf(target) ?? '—'}</dd></div><div><dt>{t('converter.resultingCm')}</dt><dd>{result ? `${result.resultingCm360.toFixed(4)} cm` : '—'}</dd></div><div><dt>{t('converter.residualError')}</dt><dd>{errorLabel}</dd></div>
        </dl></article>
        <article className="converter-profile-meta"><header><span>{t('converter.profileDetails')}</span></header><dl>
          <div><dt>{t('converter.method')}</dt><dd>{t('converter.hipfireMethod')}</dd></div><div><dt>{t('converter.profileVersion')}</dt><dd>{source.verification.profileVersion} / {target.verification.profileVersion}</dd></div>
          {(source.verification.verifiedAt || target.verification.verifiedAt) && <div><dt>{t('converter.lastValidation')}</dt><dd>{source.verification.verifiedAt ?? '—'} / {target.verification.verifiedAt ?? '—'}</dd></div>}
        </dl>{(source.verification.notes || target.verification.notes) && <p>{t('converter.unverifiedNotice')}</p>}
          {(source.verification.sources.length > 0 || target.verification.sources.length > 0) && <div className="converter-sources"><strong>{t('converter.sources')}</strong>{[...source.verification.sources, ...target.verification.sources].map((item, index) => item.url ? <a key={`${item.label}-${index}`} href={item.url} target="_blank" rel="noreferrer">{item.label}</a> : <span key={`${item.label}-${index}`}>{item.label}</span>)}</div>}
        </article>
      </div>
    </details>
    <p className="converter-disclaimer">{t('converter.disclaimer')}</p>
  </section>
}
