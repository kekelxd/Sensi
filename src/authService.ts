export type AuthMode = 'login' | 'register' | 'forgot-password'
export type AuthStatus = 'idle' | 'loading' | 'error' | 'success'
export type AuthSessionState =
  | { status: 'loading'; userId: null }
  | { status: 'anonymous'; userId: null }
  | { status: 'authenticated'; userId: string }

export type AuthResult = {
  ok: true
} | {
  ok: false
  message: string
}

const unconfiguredMessage = 'Autenticação ainda não configurada. Conecte um provider de Auth para entrar com e-mail e senha.'
const userIdStorageKeys = ['xensi-auth-user-id', 'xensi-user-id']
const userStorageKeys = ['xensi-auth-user', 'xensi-current-user']

declare global {
  interface Window {
    __XENSI_CURRENT_USER_ID__?: string | null
  }
}

export function hasConfiguredAuthProvider() {
  return false
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

export function readAuthSessionState(): AuthSessionState {
  if (typeof window === 'undefined') return { status: 'anonymous', userId: null }
  const userId = sanitizeUserId(window.__XENSI_CURRENT_USER_ID__) ?? readStoredUserId(window.localStorage)
  return userId ? { status: 'authenticated', userId } : { status: 'anonymous', userId: null }
}

const waitForSubmitFeedback = () => new Promise((resolve) => window.setTimeout(resolve, 320))

export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  await waitForSubmitFeedback()
  if (!email.trim() || !password) return { ok: false, message: 'Informe e-mail e senha para continuar.' }
  if (!hasConfiguredAuthProvider()) return { ok: false, message: unconfiguredMessage }
  return { ok: false, message: unconfiguredMessage }
}

export async function requestPasswordReset(email: string): Promise<AuthResult> {
  await waitForSubmitFeedback()
  if (!email.trim()) return { ok: false, message: 'Informe seu e-mail para receber as instruções.' }
  if (!hasConfiguredAuthProvider()) return { ok: false, message: unconfiguredMessage }
  return { ok: false, message: unconfiguredMessage }
}

export async function registerWithEmail(email: string, password: string): Promise<AuthResult> {
  await waitForSubmitFeedback()
  if (!email.trim() || !password) return { ok: false, message: 'Informe e-mail e senha para criar a conta.' }
  if (!hasConfiguredAuthProvider()) return { ok: false, message: unconfiguredMessage }
  return { ok: false, message: unconfiguredMessage }
}
