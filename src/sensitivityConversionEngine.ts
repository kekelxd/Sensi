import type { GameSensitivityProfile, SensitivityInputModel, VerificationStatus } from './gameSensitivityProfiles'

export type ResidualErrorClassification = 'negligible' | 'very_low' | 'low' | 'noticeable'

export interface ConversionResult {
  exactSensitivity: number
  configurableSensitivity: number
  sourceCm360: number
  resultingCm360: number
  absoluteErrorCm: number
  relativeErrorPercent: number
  errorClassification: ResidualErrorClassification
}

export const RESIDUAL_ERROR_THRESHOLDS = {
  negligible: 0.01,
  veryLow: 0.1,
  low: 0.5,
} as const

function decimalPlaces(value: number) {
  const [, exponent = '0'] = value.toString().toLowerCase().split('e')
  const fraction = (value.toString().split('.')[1] ?? '').length
  return Math.max(0, fraction - Number(exponent))
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function effectiveCoefficient(profile: GameSensitivityProfile, multiplier?: number) {
  if (profile.angularModel.type !== 'linear') return null
  if (profile.inputModel.type !== 'slider_with_multiplier') return profile.angularModel.coefficient
  const selectedMultiplier = multiplier ?? profile.inputModel.defaultMultiplier
  return Number.isFinite(selectedMultiplier) && selectedMultiplier > 0
    ? profile.angularModel.coefficient * selectedMultiplier
    : null
}

export function calculateCm360(profile: GameSensitivityProfile, sensitivity: number, dpi: number, multiplier?: number) {
  const coefficient = effectiveCoefficient(profile, multiplier)
  if (coefficient === null || !Number.isFinite(sensitivity) || sensitivity <= 0 || !Number.isFinite(dpi) || dpi <= 0) return null
  return 360 * 2.54 / (dpi * sensitivity * coefficient)
}

export function normalizeSensitivityForInputModel(value: number, model: SensitivityInputModel) {
  if (!Number.isFinite(value) || model.type === 'unavailable') return null
  const clamped = clamp(value, model.min, model.max)
  if (model.type === 'integer') return Math.round(clamped)
  if (model.type === 'decimal') return Number(clamped.toFixed(model.decimals))

  const steps = Math.round((clamped - model.min) / model.step)
  const stepped = clamp(model.min + steps * model.step, model.min, model.max)
  const precision = model.type === 'step' ? model.decimals : decimalPlaces(model.step)
  return Number(stepped.toFixed(precision))
}

export function normalizeSensitivityForGame(value: number, profile: GameSensitivityProfile) {
  return normalizeSensitivityForInputModel(value, profile.inputModel)
}

export function calculateResidualError(sourceCm360: number, resultingCm360: number) {
  if (!Number.isFinite(sourceCm360) || sourceCm360 <= 0 || !Number.isFinite(resultingCm360) || resultingCm360 <= 0) return null
  const absoluteErrorCm = Math.abs(resultingCm360 - sourceCm360)
  const relativeErrorPercent = absoluteErrorCm / sourceCm360 * 100
  return {
    absoluteErrorCm,
    relativeErrorPercent,
    errorClassification: classifyResidualError(relativeErrorPercent),
  }
}

export function classifyResidualError(relativeErrorPercent: number): ResidualErrorClassification {
  if (relativeErrorPercent < RESIDUAL_ERROR_THRESHOLDS.negligible) return 'negligible'
  if (relativeErrorPercent < RESIDUAL_ERROR_THRESHOLDS.veryLow) return 'very_low'
  if (relativeErrorPercent < RESIDUAL_ERROR_THRESHOLDS.low) return 'low'
  return 'noticeable'
}

export function validateGameProfile(profile: GameSensitivityProfile) {
  const errors: string[] = []
  const model = profile.inputModel
  if (profile.angularModel.type === 'linear' && (!Number.isFinite(profile.angularModel.coefficient) || profile.angularModel.coefficient <= 0)) errors.push('angular coefficient must be greater than zero')
  if (model.type !== 'unavailable') {
    if (!Number.isFinite(model.min) || !Number.isFinite(model.max) || model.min >= model.max) errors.push('input min must be lower than max')
    if ('step' in model && (!Number.isFinite(model.step) || model.step <= 0)) errors.push('input step must be greater than zero')
    if ('decimals' in model && (!Number.isInteger(model.decimals) || model.decimals < 0 || model.decimals > 12)) errors.push('input decimals must be an integer between 0 and 12')
    if (model.type === 'slider_with_multiplier' && (!Number.isFinite(model.defaultMultiplier) || model.defaultMultiplier <= 0)) errors.push('default multiplier must be greater than zero')
  }
  if (profile.supportedMethods.hipfire360 && (profile.angularModel.type !== 'linear' || model.type === 'unavailable')) errors.push('hipfire360 requires linear angular and available input models')
  const { evidence, sources, status } = profile.verification
  if (status === 'verified') {
    if (!evidence.formulaKnown) errors.push('verified profile requires a known formula')
    if (!evidence.physicalValidation) errors.push('verified profile requires physical validation')
    if (!evidence.inputPrecisionValidated) errors.push('verified profile requires validated input precision')
    if (evidence.independentSources < 2) errors.push('verified profile requires at least two independent sources')
    if (sources.length < 2) errors.push('verified profile requires at least two sources')
  }
  if (status === 'cross_verified') {
    if (!evidence.formulaKnown) errors.push('cross-verified profile requires a known formula')
    if (evidence.independentSources < 2) errors.push('cross-verified profile requires at least two independent sources')
    if (sources.length < 2) errors.push('cross-verified profile requires at least two sources')
  }
  if (status === 'measured') {
    if (!evidence.formulaKnown) errors.push('measured profile requires a known formula')
    if (!evidence.physicalValidation) errors.push('measured profile requires physical validation')
    if (!sources.some((source) => source.type === 'measurement')) errors.push('measured profile requires a measurement source')
  }
  return errors
}

export function convertSensitivity(
  sourceSensitivity: number,
  sourceProfile: GameSensitivityProfile,
  targetProfile: GameSensitivityProfile,
  sourceDpi = 800,
  targetDpi = sourceDpi,
  options: { sourceMultiplier?: number; targetMultiplier?: number } = {},
): ConversionResult | null {
  if (validateGameProfile(sourceProfile).length || validateGameProfile(targetProfile).length) return null
  const sourceCoefficient = effectiveCoefficient(sourceProfile, options.sourceMultiplier)
  const targetCoefficient = effectiveCoefficient(targetProfile, options.targetMultiplier)
  if (!sourceProfile.supportedMethods.hipfire360 || !targetProfile.supportedMethods.hipfire360 || sourceCoefficient === null || targetCoefficient === null) return null
  if (!Number.isFinite(sourceSensitivity) || sourceSensitivity <= 0 || !Number.isFinite(sourceDpi) || sourceDpi <= 0 || !Number.isFinite(targetDpi) || targetDpi <= 0) return null

  const exactSensitivity = sourceSensitivity * sourceCoefficient * sourceDpi / (targetCoefficient * targetDpi)
  const configurableSensitivity = normalizeSensitivityForGame(exactSensitivity, targetProfile)
  const sourceCm360 = calculateCm360(sourceProfile, sourceSensitivity, sourceDpi, options.sourceMultiplier)
  const resultingCm360 = configurableSensitivity === null ? null : calculateCm360(targetProfile, configurableSensitivity, targetDpi, options.targetMultiplier)
  if (configurableSensitivity === null || sourceCm360 === null || resultingCm360 === null) return null
  const residual = calculateResidualError(sourceCm360, resultingCm360)
  if (residual === null) return null
  return { exactSensitivity, configurableSensitivity, sourceCm360, resultingCm360, ...residual }
}

export function isFullyVerified(status: VerificationStatus) {
  return status === 'verified'
}
