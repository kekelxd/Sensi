import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2, Eye, EyeOff, Lock, Mail, RotateCcw, UserRound } from 'lucide-react'
import { XensiLogo } from './AppNavigation'
import {
  AuthMode,
  AuthStatus,
  checkNicknameAvailability,
  registerWithEmail,
  requestPasswordReset,
  resendSignupConfirmation,
  signInWithEmail,
  updatePassword,
  type AuthErrorCode,
  type AuthLocale,
} from './authService'
import { useI18n, type Locale, type TranslationKey } from './i18n'

type AuthScreenProps = {
  mode: AuthMode
  onNavigate: (mode: AuthMode) => void
  onAuthenticated: () => void
}

type NicknameState = 'idle' | 'invalid' | 'checking' | 'available' | 'unavailable' | 'error'
type CallbackState = 'checking' | 'success' | 'error'

const modeKeys: Record<AuthMode, {
  title: TranslationKey
  subtitle: TranslationKey
  action: TranslationKey
  loading: TranslationKey
  complete: TranslationKey
}> = {
  login: {
    title: 'auth.login.title',
    subtitle: 'auth.login.subtitle',
    action: 'auth.login.action',
    loading: 'auth.login.loading',
    complete: 'auth.login.complete',
  },
  register: {
    title: 'auth.register.title',
    subtitle: 'auth.register.subtitle',
    action: 'auth.register.action',
    loading: 'auth.register.loading',
    complete: 'auth.register.complete',
  },
  'forgot-password': {
    title: 'auth.forgot.title',
    subtitle: 'auth.forgot.subtitle',
    action: 'auth.forgot.action',
    loading: 'auth.forgot.loading',
    complete: 'auth.forgot.complete',
  },
  'reset-password': {
    title: 'auth.reset.title',
    subtitle: 'auth.reset.subtitle',
    action: 'auth.reset.action',
    loading: 'auth.reset.loading',
    complete: 'auth.reset.complete',
  },
  'auth-callback': {
    title: 'auth.callback.checkingTitle',
    subtitle: 'auth.callback.checkingSubtitle',
    action: 'auth.callback.continue',
    loading: 'auth.callback.loading',
    complete: 'auth.callback.successTitle',
  },
}

const errorKeys: Record<AuthErrorCode, TranslationKey> = {
  auth_unconfigured: 'auth.error.unconfigured',
  missing_login_fields: 'auth.error.missingLogin',
  missing_email: 'auth.error.missingEmail',
  missing_signup_fields: 'auth.error.missingSignup',
  missing_password: 'auth.error.missingPassword',
  invalid_credentials: 'auth.error.invalidCredentials',
  email_not_confirmed: 'auth.error.emailNotConfirmed',
  email_already_registered: 'auth.error.emailAlreadyRegistered',
  nickname_unavailable: 'auth.error.nicknameUnavailable',
  nickname_check_failed: 'auth.error.nicknameCheckFailed',
  generic: 'auth.error.generic',
}

function normalizeAuthLocale(locale: Locale): AuthLocale {
  return locale === 'pt' ? 'pt-BR' : 'en-US'
}

function readCallbackError() {
  const values = new URLSearchParams(window.location.search)
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  return values.get('error') ?? values.get('error_code') ?? hash.get('error') ?? hash.get('error_code')
}

function AuthField({ children, icon, id, label }: { children: ReactNode; icon: ReactNode; id: string; label: string }) {
  return <div className="xensi-auth-field">
    <label htmlFor={id}>{icon}{label}</label>
    {children}
  </div>
}

function AuthLayout({ children }: { children: ReactNode }) {
  return <main className="xensi-auth-page">
    <div className="xensi-auth-shell">
      {children}
    </div>
  </main>
}

export function AuthScreen({ mode, onNavigate, onAuthenticated }: AuthScreenProps) {
  const { locale, t } = useI18n()
  const copy = modeKeys[mode]
  const [email, setEmail] = useState('')
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [status, setStatus] = useState<AuthStatus>('idle')
  const [message, setMessage] = useState('')
  const [nicknameState, setNicknameState] = useState<NicknameState>('idle')
  const [confirmationEmail, setConfirmationEmail] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const [callbackState, setCallbackState] = useState<CallbackState>('checking')
  const trimmedNickname = nickname.trim()
  const needsEmail = mode !== 'reset-password' && mode !== 'auth-callback'
  const needsPassword = mode !== 'forgot-password' && mode !== 'auth-callback'
  const needsConfirmPassword = mode === 'register' || mode === 'reset-password'
  const passwordsMismatch = needsConfirmPassword && confirmPassword.length > 0 && password !== confirmPassword
  const authLocale = normalizeAuthLocale(locale)

  const nicknameMessage = useMemo(() => {
    if (mode !== 'register' || !trimmedNickname) return ''
    if (nicknameState === 'invalid') return t('auth.nickname.invalid')
    if (nicknameState === 'checking') return t('auth.nickname.checking')
    if (nicknameState === 'available') return t('auth.nickname.available')
    if (nicknameState === 'unavailable') return t('auth.nickname.unavailable')
    if (nicknameState === 'error') return t('auth.nickname.error')
    return ''
  }, [mode, nicknameState, t, trimmedNickname])

  useEffect(() => {
    setStatus('idle')
    setMessage('')
    setPassword('')
    setConfirmPassword('')
    setConfirmationEmail('')
    setCallbackState('checking')
  }, [mode])

  useEffect(() => {
    if (mode !== 'register') return
    if (!trimmedNickname) {
      setNicknameState('idle')
      return
    }
    if (trimmedNickname.length < 3 || trimmedNickname.length > 24) {
      setNicknameState('invalid')
      return
    }
    setNicknameState('checking')
    const timer = window.setTimeout(async () => {
      const result = await checkNicknameAvailability(trimmedNickname)
      if (!result.ok) {
        setNicknameState(result.code === 'auth_unconfigured' ? 'idle' : 'error')
        return
      }
      setNicknameState(result.available ? 'available' : 'unavailable')
    }, 350)
    return () => window.clearTimeout(timer)
  }, [mode, trimmedNickname])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = window.setTimeout(() => setResendCooldown((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [resendCooldown])

  useEffect(() => {
    if (mode !== 'auth-callback') return
    if (readCallbackError()) {
      setCallbackState('error')
      setStatus('error')
      setMessage(t('auth.callback.errorText'))
      return
    }
    setCallbackState('success')
    setStatus('success')
    const timer = window.setTimeout(onAuthenticated, 2200)
    return () => window.clearTimeout(timer)
  }, [mode, onAuthenticated, t])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (status === 'loading') return
    if (passwordsMismatch) {
      setStatus('error')
      setMessage(t('auth.error.passwordMismatch'))
      return
    }
    if (mode === 'register') {
      if (trimmedNickname.length < 3 || trimmedNickname.length > 24) {
        setStatus('error')
        setMessage(t('auth.nickname.invalid'))
        return
      }
      if (nicknameState === 'checking') {
        setStatus('error')
        setMessage(t('auth.nickname.wait'))
        return
      }
      if (nicknameState === 'unavailable') {
        setStatus('error')
        setMessage(t('auth.error.nicknameUnavailable'))
        return
      }
    }

    setStatus('loading')
    setMessage('')
    const result = mode === 'login'
      ? await signInWithEmail(email, password)
      : mode === 'register'
        ? await registerWithEmail(email, password, trimmedNickname, authLocale)
        : mode === 'reset-password'
          ? await updatePassword(password)
          : await requestPasswordReset(email)
    if (!result.ok) {
      setStatus('error')
      setMessage(t(errorKeys[result.code]))
      return
    }
    setStatus('success')
    setMessage(t(copy.complete))
    if (mode === 'register') {
      setConfirmationEmail(email.trim())
      setResendCooldown(60)
      return
    }
    if (mode === 'login') onAuthenticated()
    if (mode === 'reset-password') window.setTimeout(onAuthenticated, 1800)
  }

  const resendConfirmation = async () => {
    if (!confirmationEmail || resendCooldown > 0 || status === 'loading') return
    setStatus('loading')
    setMessage('')
    const result = await resendSignupConfirmation(confirmationEmail)
    if (!result.ok) {
      setStatus('error')
      setMessage(t(errorKeys[result.code]))
      return
    }
    setStatus('success')
    setMessage(t('auth.confirm.resendSent'))
    setResendCooldown(60)
  }

  if (mode === 'auth-callback') {
    const success = callbackState === 'success'
    return <AuthLayout>
      <div className="xensi-auth-card xensi-auth-state-card">
          <XensiLogo className="xensi-auth-card-logo" />
          <CheckCircle2 size={30} aria-hidden="true" />
          <header>
            <h2>{success ? t('auth.callback.successTitle') : t('auth.callback.errorTitle')}</h2>
            <p>{success ? t('auth.callback.successText') : t('auth.callback.errorText')}</p>
          </header>
          <button className="xensi-auth-submit" type="button" onClick={success ? onAuthenticated : () => onNavigate('login')}>
            {success ? t('auth.callback.continue') : t('auth.signIn')}
            <ArrowRight size={16} />
          </button>
      </div>
    </AuthLayout>
  }

  if (mode === 'register' && confirmationEmail) {
    return <AuthLayout>
      <div className="xensi-auth-card xensi-auth-state-card">
          <XensiLogo className="xensi-auth-card-logo" />
          <CheckCircle2 size={30} aria-hidden="true" />
          <header>
            <h2>{t('auth.confirm.title')}</h2>
            <p>{t('auth.confirm.subtitle', { email: confirmationEmail })}</p>
          </header>
          <p className="xensi-auth-confirm-copy">{t('auth.confirm.instructions')}</p>
          {message && <p className={`xensi-auth-message ${status}`} role={status === 'error' ? 'alert' : 'status'} aria-live="polite">{message}</p>}
          <button className="xensi-auth-submit" type="button" onClick={resendConfirmation} disabled={status === 'loading' || resendCooldown > 0}>
            {resendCooldown > 0 ? t('auth.confirm.resendCooldown', { seconds: resendCooldown }) : t('auth.confirm.resend')}
            <RotateCcw size={16} />
          </button>
          <p className="xensi-auth-switch">
            <button type="button" onClick={() => onNavigate('login')}>{t('auth.confirm.backToSignIn')}</button>
          </p>
      </div>
    </AuthLayout>
  }

  return <AuthLayout>
    <form className="xensi-auth-card" onSubmit={submit}>
        <XensiLogo className="xensi-auth-card-logo" />
        <header>
          <h2>{t(copy.title)}</h2>
          <p>{t(copy.subtitle)}</p>
        </header>

        {needsEmail && <AuthField icon={<Mail size={15} />} id="auth-email" label={t('auth.emailLabel')}>
          <input id="auth-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder={t('auth.emailPlaceholder')} disabled={status === 'loading'} required />
        </AuthField>}

        {mode === 'register' && <AuthField icon={<UserRound size={15} />} id="auth-nickname" label={t('auth.nicknameLabel')}>
          <input id="auth-nickname" type="text" value={nickname} onChange={(event) => setNickname(event.target.value)} autoComplete="nickname" minLength={3} maxLength={24} placeholder={t('auth.nicknamePlaceholder')} disabled={status === 'loading'} required />
          {nicknameMessage && <p className={`xensi-auth-inline ${nicknameState}`} role={nicknameState === 'unavailable' || nicknameState === 'error' ? 'alert' : 'status'} aria-live="polite">{nicknameMessage}</p>}
        </AuthField>}

        {needsPassword && <AuthField icon={<Lock size={15} />} id="auth-password" label={mode === 'reset-password' ? t('auth.newPasswordLabel') : t('auth.passwordLabel')}>
          <div className="xensi-auth-password">
            <input id="auth-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder={mode === 'reset-password' ? t('auth.newPasswordPlaceholder') : t('auth.passwordPlaceholder')} disabled={status === 'loading'} required />
            <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')} disabled={status === 'loading'}>
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </AuthField>}

        {needsConfirmPassword && <AuthField icon={<Lock size={15} />} id="auth-confirm-password" label={t('auth.confirmPasswordLabel')}>
          <div className="xensi-auth-password">
            <input id="auth-confirm-password" type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" placeholder={t('auth.confirmPasswordPlaceholder')} disabled={status === 'loading'} required />
            <button type="button" onClick={() => setShowConfirmPassword((value) => !value)} aria-label={showConfirmPassword ? t('auth.hidePassword') : t('auth.showPassword')} disabled={status === 'loading'}>
              {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          {passwordsMismatch && <p className="xensi-auth-inline unavailable" role="alert">{t('auth.error.passwordMismatch')}</p>}
        </AuthField>}

        {mode === 'login' && <div className="xensi-auth-options">
          <button type="button" onClick={() => onNavigate('forgot-password')}>{t('auth.forgot')}</button>
        </div>}

        {message && <p className={`xensi-auth-message ${status}`} role={status === 'error' ? 'alert' : 'status'} aria-live="polite">{message}</p>}

        <button className="xensi-auth-submit" type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? t(copy.loading) : t(copy.action)}
          {mode === 'forgot-password' ? <RotateCcw size={16} /> : <ArrowRight size={16} />}
        </button>

        <button className="xensi-auth-guest" type="button" onClick={onAuthenticated}>{t('auth.continueGuest')}</button>

        {mode === 'login'
          ? <p className="xensi-auth-switch">{t('auth.loginSwitch')} <button type="button" onClick={() => onNavigate('register')}>{t('auth.createAccount')}</button></p>
          : <p className="xensi-auth-switch">{t('auth.registerSwitch')} <button type="button" onClick={() => onNavigate('login')}>{t('auth.signIn')}</button></p>}
    </form>
  </AuthLayout>
}
