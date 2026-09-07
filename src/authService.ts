export type AuthMode = 'login' | 'register' | 'forgot-password'
export type AuthStatus = 'idle' | 'loading' | 'error' | 'success'

export type AuthResult = {
  ok: true
} | {
  ok: false
  message: string
}

const unconfiguredMessage = 'Autenticação ainda não configurada. Conecte um provider de Auth para entrar com e-mail e senha.'

export function hasConfiguredAuthProvider() {
  return false
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
