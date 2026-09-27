import { APP_VERSION, RELEASE_CHANNEL } from './appRelease'
import type { Locale } from './i18n'

export const ALPHA_FEEDBACK_TABLE = 'alpha_feedback'

export type AlphaFeedbackType = 'bug' | 'suggestion'
export type AlphaFeedbackReproducibility = 'always' | 'sometimes' | 'once'
export type AlphaFeedbackStatus = 'new'

export type AlphaFeedbackFormInput = {
  type: AlphaFeedbackType
  title: string
  message: string
  language: Locale
  reproducibility?: AlphaFeedbackReproducibility | null
}

export type AlphaFeedbackPayload = {
  user_id: string | null
  type: AlphaFeedbackType
  title: string
  message: string
  page: string
  app_version: string
  release_channel: typeof RELEASE_CHANNEL
  user_agent: string
  viewport: string
  language: Locale
  reproducibility: AlphaFeedbackReproducibility | null
  status: AlphaFeedbackStatus
  created_at: string
}

export type AlphaFeedbackSubmitResult =
  | { ok: true; id?: string }
  | { ok: false; message: string }

export type AlphaFeedbackSubmitter = (payload: AlphaFeedbackPayload) => Promise<AlphaFeedbackSubmitResult> | AlphaFeedbackSubmitResult

type FeedbackPayloadOverrides = Partial<Pick<AlphaFeedbackPayload, 'page' | 'user_agent' | 'viewport' | 'user_id' | 'created_at'>>
type ImportMetaWithEnv = ImportMeta & { readonly env?: Record<string, string | undefined> }
type SupabaseConfig = { url: string; anonKey: string }

declare global {
  interface Window {
    __XENSI_CURRENT_USER_ID__?: string | null
    __XENSI_FEEDBACK_SUBMIT__?: AlphaFeedbackSubmitter
  }
}

const notConfiguredMessage = 'Envio de feedback ainda não está conectado. Configure o Supabase para registrar feedbacks da Alpha.'
const submitErrorMessage = 'Não foi possível registrar agora. Tente novamente em instantes.'
const userIdStorageKeys = ['xensi-auth-user-id', 'xensi-user-id']
const userStorageKeys = ['xensi-auth-user', 'xensi-current-user']

function readSupabaseConfig(): SupabaseConfig | null {
  const env = (import.meta as ImportMetaWithEnv).env
  const url = env?.VITE_SUPABASE_URL?.trim()
  const anonKey = env?.VITE_SUPABASE_ANON_KEY?.trim()
  return url && anonKey ? { url: url.replace(/\/+$/, ''), anonKey } : null
}

function sanitizeUserId(value: unknown) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > 160 || trimmed.includes('@')) return null
  return trimmed
}

function readStoredUserId(storage: Storage | undefined) {
  if (!storage) return null
  for (const key of userIdStorageKeys) {
    const userId = sanitizeUserId(storage.getItem(key))
    if (userId) return userId
  }
  for (const key of userStorageKeys) {
    const raw = storage.getItem(key)
    if (!raw) continue
    try {
      const parsed = JSON.parse(raw) as { id?: unknown; userId?: unknown; sub?: unknown }
      const userId = sanitizeUserId(parsed.id) ?? sanitizeUserId(parsed.userId) ?? sanitizeUserId(parsed.sub)
      if (userId) return userId
    } catch {
      const userId = sanitizeUserId(raw)
      if (userId) return userId
    }
  }
  return null
}

function readCurrentUserId() {
  if (typeof window === 'undefined') return null
  return sanitizeUserId(window.__XENSI_CURRENT_USER_ID__) ?? readStoredUserId(window.localStorage)
}

function readCurrentPage() {
  if (typeof window === 'undefined') return '/'
  const { pathname, search, hash } = window.location
  return `${pathname}${search}${hash}`
}

function readViewport() {
  if (typeof window === 'undefined') return 'unknown'
  const ratio = Number.isFinite(window.devicePixelRatio) ? Math.round(window.devicePixelRatio * 100) / 100 : 1
  return `${window.innerWidth}x${window.innerHeight} @${ratio}x`
}

export function createAlphaFeedbackPayload(input: AlphaFeedbackFormInput, overrides: FeedbackPayloadOverrides = {}): AlphaFeedbackPayload {
  return {
    user_id: overrides.user_id ?? readCurrentUserId(),
    type: input.type,
    title: input.title.trim(),
    message: input.message.trim(),
    page: overrides.page ?? readCurrentPage(),
    app_version: APP_VERSION,
    release_channel: RELEASE_CHANNEL,
    user_agent: overrides.user_agent ?? (typeof navigator === 'undefined' ? 'unknown' : navigator.userAgent),
    viewport: overrides.viewport ?? readViewport(),
    language: input.language,
    reproducibility: input.type === 'bug' ? input.reproducibility ?? null : null,
    status: 'new',
    created_at: overrides.created_at ?? new Date().toISOString(),
  }
}

async function submitWithSupabase(payload: AlphaFeedbackPayload, config: SupabaseConfig): Promise<AlphaFeedbackSubmitResult> {
  try {
    const response = await fetch(`${config.url}/rest/v1/${ALPHA_FEEDBACK_TABLE}`, {
      method: 'POST',
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(payload),
    })
    return response.ok ? { ok: true } : { ok: false, message: submitErrorMessage }
  } catch {
    return { ok: false, message: submitErrorMessage }
  }
}

export async function submitAlphaFeedback(payload: AlphaFeedbackPayload): Promise<AlphaFeedbackSubmitResult> {
  const customSubmitter = typeof window === 'undefined' ? undefined : window.__XENSI_FEEDBACK_SUBMIT__
  if (customSubmitter) {
    try {
      return await customSubmitter(payload)
    } catch {
      return { ok: false, message: submitErrorMessage }
    }
  }

  const config = readSupabaseConfig()
  if (!config) return { ok: false, message: notConfiguredMessage }
  return submitWithSupabase(payload, config)
}
