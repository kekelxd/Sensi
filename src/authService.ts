import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'
import { DEFAULT_AVATAR, isAvatarId, type AvatarId } from './avatars'
import { readPlayerProfile, writePlayerProfile } from './playerProfileStore'
import { getSupabaseClient, hasSupabaseClient } from './supabaseClient'

export type AuthMode = 'login' | 'register' | 'forgot-password' | 'reset-password' | 'auth-callback'
export type AuthStatus = 'idle' | 'loading' | 'error' | 'success'
export type AuthProfile = {
  nickname: string
  avatarId: AvatarId
}
export type AuthSessionState =
  | { status: 'loading'; userId: null; profile: null }
  | { status: 'anonymous'; userId: null; profile: null }
  | { status: 'authenticated'; userId: string; profile: AuthProfile }

export type AuthResult = {
  ok: true
  message?: string
} | {
  ok: false
  message: string
}

const unconfiguredMessage = 'Autenticação ainda não configurada. Conecte o Supabase Auth para entrar com e-mail e senha.'
const genericAuthErrorMessage = 'Não foi possível concluir a autenticação agora. Tente novamente em instantes.'
const profileFallback: AuthProfile = { nickname: 'xensi_dev', avatarId: DEFAULT_AVATAR }
const authStorageKeys = ['xensi-auth-user-id', 'xensi-user-id', 'xensi-auth-user', 'xensi-current-user']

let cachedState: AuthSessionState = { status: 'loading', userId: null, profile: null }
let initialized = false
let initPromise: Promise<AuthSessionState> | null = null

declare global {
  interface Window {
    __XENSI_CURRENT_USER_ID__?: string | null
  }
}

export function hasConfiguredAuthProvider() {
  return hasSupabaseClient()
}

function emitAuthUpdate() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event('xensi-auth-updated'))
}

function clearRuntimeUser() {
  if (typeof window === 'undefined') return
  window.__XENSI_CURRENT_USER_ID__ = null
  for (const key of authStorageKeys) window.localStorage.removeItem(key)
}

function setRuntimeUser(user: User) {
  if (typeof window === 'undefined') return
  window.__XENSI_CURRENT_USER_ID__ = user.id
  window.localStorage.setItem('xensi-auth-user-id', user.id)
  window.localStorage.setItem('xensi-auth-user', JSON.stringify({ id: user.id, email: user.email ?? null }))
}

function toProfile(row: { nickname?: unknown; avatar_id?: unknown } | null): AuthProfile {
  const nickname = typeof row?.nickname === 'string' && row.nickname.trim() ? row.nickname.trim() : profileFallback.nickname
  const avatarId = isAvatarId(row?.avatar_id) ? row.avatar_id : profileFallback.avatarId
  return { nickname, avatarId }
}

function syncProfileToGuestStore(profile: AuthProfile) {
  if (typeof window === 'undefined') return
  const current = readPlayerProfile(window.localStorage)
  writePlayerProfile(window.localStorage, { ...current, nickname: profile.nickname, avatarId: profile.avatarId })
}

async function loadProfile(userId: string): Promise<AuthProfile> {
  const supabase = getSupabaseClient()
  if (!supabase) return profileFallback
  const { data, error } = await supabase
    .from('profiles')
    .select('nickname, avatar_id')
    .eq('id', userId)
    .maybeSingle()
  if (error) return profileFallback
  const profile = toProfile(data)
  syncProfileToGuestStore(profile)
  return profile
}

async function stateFromSession(session: Session | null): Promise<AuthSessionState> {
  if (!session?.user) {
    clearRuntimeUser()
    return { status: 'anonymous', userId: null, profile: null }
  }
  setRuntimeUser(session.user)
  const profile = await loadProfile(session.user.id)
  return { status: 'authenticated', userId: session.user.id, profile }
}

async function refreshAuthState(session?: Session | null) {
  const supabase = getSupabaseClient()
  if (!supabase) {
    cachedState = { status: 'anonymous', userId: null, profile: null }
    clearRuntimeUser()
    emitAuthUpdate()
    return cachedState
  }

  const targetSession = session === undefined ? (await supabase.auth.getSession()).data.session : session
  cachedState = await stateFromSession(targetSession)
  emitAuthUpdate()
  return cachedState
}

function handleAuthEvent(event: AuthChangeEvent, session: Session | null) {
  void refreshAuthState(session)
  if (event === 'PASSWORD_RECOVERY' && typeof window !== 'undefined') {
    window.history.replaceState({}, '', '/reset-password')
    window.dispatchEvent(new PopStateEvent('popstate'))
  }
}

export function initializeAuth() {
  if (initialized) return initPromise ?? Promise.resolve(cachedState)
  initialized = true
  const supabase = getSupabaseClient()
  if (!supabase) {
    cachedState = { status: 'anonymous', userId: null, profile: null }
    clearRuntimeUser()
    emitAuthUpdate()
    initPromise = Promise.resolve(cachedState)
    return initPromise
  }

  supabase.auth.onAuthStateChange(handleAuthEvent)
  initPromise = refreshAuthState()
  return initPromise
}

export function readAuthSessionState(): AuthSessionState {
  if (!initialized) void initializeAuth()
  return cachedState
}

function authUnavailable(): AuthResult {
  return { ok: false, message: unconfiguredMessage }
}

function authErrorMessage(error: { message?: string } | null) {
  if (!error?.message) return genericAuthErrorMessage
  if (/invalid login credentials/i.test(error.message)) return 'E-mail ou senha inválidos.'
  if (/email not confirmed/i.test(error.message)) return 'Confirme seu e-mail antes de entrar.'
  if (/user already registered/i.test(error.message)) return 'Este e-mail já está cadastrado.'
  return error.message
}

export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  const cleanEmail = email.trim()
  if (!cleanEmail || !password) return { ok: false, message: 'Informe e-mail e senha para continuar.' }
  const supabase = getSupabaseClient()
  if (!supabase) return authUnavailable()

  const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password })
  if (error) return { ok: false, message: authErrorMessage(error) }
  await refreshAuthState(data.session)
  return { ok: true }
}

export async function requestPasswordReset(email: string): Promise<AuthResult> {
  const cleanEmail = email.trim()
  if (!cleanEmail) return { ok: false, message: 'Informe seu e-mail para receber as instruções.' }
  const supabase = getSupabaseClient()
  if (!supabase) return authUnavailable()

  const redirectTo = `${window.location.origin}/reset-password`
  const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo })
  return error ? { ok: false, message: authErrorMessage(error) } : { ok: true }
}

export async function registerWithEmail(email: string, password: string, nickname: string): Promise<AuthResult> {
  const cleanEmail = email.trim()
  const cleanNickname = nickname.trim()
  if (!cleanEmail || !password || !cleanNickname) return { ok: false, message: 'Informe nickname, e-mail e senha para criar a conta.' }
  const supabase = getSupabaseClient()
  if (!supabase) return authUnavailable()

  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
    options: {
      data: { nickname: cleanNickname },
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  })
  if (error) return { ok: false, message: authErrorMessage(error) }
  if (data.session) await refreshAuthState(data.session)
  return { ok: true, message: 'Conta criada. Verifique seu e-mail para confirmar o acesso.' }
}

export async function updatePassword(password: string): Promise<AuthResult> {
  if (!password) return { ok: false, message: 'Informe a nova senha.' }
  const supabase = getSupabaseClient()
  if (!supabase) return authUnavailable()
  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { ok: false, message: authErrorMessage(error) }
  await refreshAuthState()
  return { ok: true }
}

export async function signOut(): Promise<AuthResult> {
  const supabase = getSupabaseClient()
  if (!supabase) return authUnavailable()
  const { error } = await supabase.auth.signOut()
  if (error) return { ok: false, message: authErrorMessage(error) }
  cachedState = { status: 'anonymous', userId: null, profile: null }
  clearRuntimeUser()
  emitAuthUpdate()
  return { ok: true }
}

export async function updateAuthenticatedProfile(profile: AuthProfile): Promise<AuthResult> {
  const state = readAuthSessionState()
  const supabase = getSupabaseClient()
  if (!supabase || state.status !== 'authenticated') return { ok: true }
  const { error } = await supabase
    .from('profiles')
    .update({ nickname: profile.nickname, avatar_id: profile.avatarId })
    .eq('id', state.userId)
  if (error) return { ok: false, message: authErrorMessage(error) }
  cachedState = { ...state, profile }
  syncProfileToGuestStore(profile)
  emitAuthUpdate()
  return { ok: true }
}

export function clearAuthProfileCacheForTests() {
  cachedState = { status: 'loading', userId: null, profile: null }
  initialized = false
  initPromise = null
}
