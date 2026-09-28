import { FormEvent, ReactNode, useEffect, useState } from 'react'
import { ArrowRight, BarChart3, Crosshair, Eye, EyeOff, Flame, Lock, Mail, RotateCcw, UserRound } from 'lucide-react'
import { XensiLogo } from './AppNavigation'
import { AuthMode, AuthStatus, registerWithEmail, requestPasswordReset, signInWithEmail, updatePassword } from './authService'
import { useI18n, type Locale } from './i18n'

type AuthScreenProps = {
  mode: AuthMode
  onNavigate: (mode: AuthMode) => void
  onAuthenticated: () => void
}

const authCopy: Record<Locale, {
  brandTitle: string
  brandHighlight: string
  brandDescription: string
  pillarsLabel: string
  pillars: Array<{ title: string; text: string }>
  emailLabel: string
  emailPlaceholder: string
  nicknameLabel: string
  nicknamePlaceholder: string
  passwordLabel: string
  newPasswordLabel: string
  passwordPlaceholder: string
  newPasswordPlaceholder: string
  showPassword: string
  hidePassword: string
  remember: string
  forgot: string
  loginSwitch: string
  registerSwitch: string
  createAccount: string
  signIn: string
  modes: Record<AuthMode, {
    title: string
    subtitle: string
    action: string
    loading: string
    complete: string
  }>
}> = {
  pt: {
    brandTitle: 'TREINE. CALIBRE.',
    brandHighlight: 'EVOLUA.',
    brandDescription: 'Treine sua mira, calibre sua sensibilidade e acompanhe sua evolução.',
    pillarsLabel: 'Pilares do XENSI',
    pillars: [
      { title: 'TREINE', text: 'Sessões focadas' },
      { title: 'CALIBRE', text: 'Ajustes controlados' },
      { title: 'ANALISE', text: 'Acompanhe sua evolução' },
    ],
    emailLabel: 'E-mail',
    emailPlaceholder: 'seu@email.com',
    nicknameLabel: 'Nickname',
    nicknamePlaceholder: 'seu nick no XENSI',
    passwordLabel: 'Senha',
    newPasswordLabel: 'Nova senha',
    passwordPlaceholder: 'sua senha',
    newPasswordPlaceholder: 'nova senha',
    showPassword: 'Mostrar senha',
    hidePassword: 'Ocultar senha',
    remember: 'Lembrar de mim',
    forgot: 'Esqueceu a senha?',
    loginSwitch: 'Ainda não tem uma conta?',
    registerSwitch: 'Já tem uma conta?',
    createAccount: 'Criar conta',
    signIn: 'Entrar',
    modes: {
      login: {
        title: 'Bem-vindo de volta',
        subtitle: 'Entre na sua conta para continuar sua evolução.',
        action: 'Entrar',
        loading: 'Entrando...',
        complete: 'Entrada confirmada.',
      },
      register: {
        title: 'Criar conta',
        subtitle: 'Crie seu acesso para salvar treinos, calibrações e evolução.',
        action: 'Criar conta',
        loading: 'Criando...',
        complete: 'Conta criada.',
      },
      'forgot-password': {
        title: 'Recuperar senha',
        subtitle: 'Informe seu e-mail para receber as instruções de recuperação.',
        action: 'Enviar instruções',
        loading: 'Enviando...',
        complete: 'Instruções enviadas.',
      },
      'reset-password': {
        title: 'Definir nova senha',
        subtitle: 'Escolha uma nova senha para recuperar o acesso.',
        action: 'Salvar senha',
        loading: 'Salvando...',
        complete: 'Senha atualizada.',
      },
      'auth-callback': {
        title: 'Confirmando acesso',
        subtitle: 'Estamos finalizando sua sessão com segurança.',
        action: 'Continuar',
        loading: 'Confirmando...',
        complete: 'Acesso confirmado.',
      },
    },
  },
  en: {
    brandTitle: 'TRAIN. CALIBRATE.',
    brandHighlight: 'EVOLVE.',
    brandDescription: 'Train your aim, calibrate your sensitivity, and track your progress.',
    pillarsLabel: 'XENSI pillars',
    pillars: [
      { title: 'TRAIN', text: 'Focused sessions' },
      { title: 'CALIBRATE', text: 'Controlled adjustments' },
      { title: 'ANALYZE', text: 'Track your progress' },
    ],
    emailLabel: 'E-mail',
    emailPlaceholder: 'you@email.com',
    nicknameLabel: 'Nickname',
    nicknamePlaceholder: 'your XENSI nick',
    passwordLabel: 'Password',
    newPasswordLabel: 'New password',
    passwordPlaceholder: 'your password',
    newPasswordPlaceholder: 'new password',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    remember: 'Remember me',
    forgot: 'Forgot password?',
    loginSwitch: 'Do not have an account yet?',
    registerSwitch: 'Already have an account?',
    createAccount: 'Create account',
    signIn: 'Sign in',
    modes: {
      login: {
        title: 'Welcome back',
        subtitle: 'Sign in to continue your progress.',
        action: 'Sign in',
        loading: 'Signing in...',
        complete: 'Signed in.',
      },
      register: {
        title: 'Create account',
        subtitle: 'Create access to save training, calibration, and progress.',
        action: 'Create account',
        loading: 'Creating...',
        complete: 'Account created.',
      },
      'forgot-password': {
        title: 'Recover password',
        subtitle: 'Enter your email to receive recovery instructions.',
        action: 'Send instructions',
        loading: 'Sending...',
        complete: 'Instructions sent.',
      },
      'reset-password': {
        title: 'Set new password',
        subtitle: 'Choose a new password to recover access.',
        action: 'Save password',
        loading: 'Saving...',
        complete: 'Password updated.',
      },
      'auth-callback': {
        title: 'Confirming access',
        subtitle: 'We are securely finishing your session.',
        action: 'Continue',
        loading: 'Confirming...',
        complete: 'Access confirmed.',
      },
    },
  },
  es: {
    brandTitle: 'ENTRENA. CALIBRA.',
    brandHighlight: 'EVOLUCIONA.',
    brandDescription: 'Entrena tu mira, calibra tu sensibilidad y sigue tu evolución.',
    pillarsLabel: 'Pilares de XENSI',
    pillars: [
      { title: 'ENTRENA', text: 'Sesiones enfocadas' },
      { title: 'CALIBRA', text: 'Ajustes controlados' },
      { title: 'ANALIZA', text: 'Sigue tu evolución' },
    ],
    emailLabel: 'E-mail',
    emailPlaceholder: 'tu@email.com',
    nicknameLabel: 'Nickname',
    nicknamePlaceholder: 'tu nick en XENSI',
    passwordLabel: 'Contraseña',
    newPasswordLabel: 'Nueva contraseña',
    passwordPlaceholder: 'tu contraseña',
    newPasswordPlaceholder: 'nueva contraseña',
    showPassword: 'Mostrar contraseña',
    hidePassword: 'Ocultar contraseña',
    remember: 'Recordarme',
    forgot: '¿Olvidaste tu contraseña?',
    loginSwitch: '¿Aún no tienes una cuenta?',
    registerSwitch: '¿Ya tienes una cuenta?',
    createAccount: 'Crear cuenta',
    signIn: 'Entrar',
    modes: {
      login: {
        title: 'Bienvenido de vuelta',
        subtitle: 'Entra en tu cuenta para continuar tu evolución.',
        action: 'Entrar',
        loading: 'Entrando...',
        complete: 'Entrada confirmada.',
      },
      register: {
        title: 'Crear cuenta',
        subtitle: 'Crea tu acceso para guardar entrenamientos, calibraciones y evolución.',
        action: 'Crear cuenta',
        loading: 'Creando...',
        complete: 'Cuenta creada.',
      },
      'forgot-password': {
        title: 'Recuperar contraseña',
        subtitle: 'Informa tu e-mail para recibir las instrucciones de recuperación.',
        action: 'Enviar instrucciones',
        loading: 'Enviando...',
        complete: 'Instrucciones enviadas.',
      },
      'reset-password': {
        title: 'Definir nueva contraseña',
        subtitle: 'Elige una nueva contraseña para recuperar el acceso.',
        action: 'Guardar contraseña',
        loading: 'Guardando...',
        complete: 'Contraseña actualizada.',
      },
      'auth-callback': {
        title: 'Confirmando acceso',
        subtitle: 'Estamos finalizando tu sesión de forma segura.',
        action: 'Continuar',
        loading: 'Confirmando...',
        complete: 'Acceso confirmado.',
      },
    },
  },
}

function AuthField({ children, icon, id, label }: { children: ReactNode; icon: ReactNode; id: string; label: string }) {
  return <div className="xensi-auth-field">
    <label htmlFor={id}>{icon}{label}</label>
    {children}
  </div>
}

function BrandPillar({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <article>
    <i>{icon}</i>
    <b>{title}</b>
    <span>{text}</span>
  </article>
}

export function AuthScreen({ mode, onNavigate, onAuthenticated }: AuthScreenProps) {
  const { locale } = useI18n()
  const current = authCopy[locale]
  const copy = current.modes[mode]
  const [email, setEmail] = useState('')
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState<AuthStatus>('idle')
  const [message, setMessage] = useState('')
  const needsEmail = mode !== 'reset-password' && mode !== 'auth-callback'
  const needsPassword = mode !== 'forgot-password' && mode !== 'auth-callback'

  useEffect(() => {
    if (mode !== 'auth-callback') return
    const timer = window.setTimeout(onAuthenticated, 600)
    return () => window.clearTimeout(timer)
  }, [mode, onAuthenticated])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (status === 'loading') return
    setStatus('loading')
    setMessage('')
    const result = mode === 'login'
      ? await signInWithEmail(email, password)
      : mode === 'register'
        ? await registerWithEmail(email, password, nickname)
        : mode === 'reset-password'
          ? await updatePassword(password)
          : await requestPasswordReset(email)
    if (!result.ok) {
      setStatus('error')
      setMessage(result.message)
      return
    }
    setStatus('success')
    setMessage(result.message ?? copy.complete)
    if (mode === 'login' || mode === 'reset-password') {
      onAuthenticated()
    }
  }

  return <main className="xensi-auth-shell">
    <section className="xensi-auth-brand-panel" aria-labelledby="auth-brand-title">
      <div>
        <h1 id="auth-brand-title">{current.brandTitle} <span>{current.brandHighlight}</span></h1>
        <p>{current.brandDescription}</p>
      </div>
      <div className="xensi-auth-pillars" aria-label={current.pillarsLabel}>
        <BrandPillar icon={<Flame size={18} />} title={current.pillars[0].title} text={current.pillars[0].text} />
        <BrandPillar icon={<Crosshair size={18} />} title={current.pillars[1].title} text={current.pillars[1].text} />
        <BrandPillar icon={<BarChart3 size={18} />} title={current.pillars[2].title} text={current.pillars[2].text} />
      </div>
      <div className="xensi-auth-mark" aria-hidden="true"><span>X</span></div>
    </section>

    <section className="xensi-auth-card-wrap">
      <form className="xensi-auth-card" onSubmit={submit}>
        <XensiLogo className="xensi-auth-card-logo" />
        <header>
          <h2>{copy.title}</h2>
          <p>{copy.subtitle}</p>
        </header>

        {needsEmail && <AuthField icon={<Mail size={15} />} id="auth-email" label={current.emailLabel}>
          <input id="auth-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder={current.emailPlaceholder} disabled={status === 'loading'} required />
        </AuthField>}

        {mode === 'register' && <AuthField icon={<UserRound size={15} />} id="auth-nickname" label={current.nicknameLabel}>
          <input id="auth-nickname" type="text" value={nickname} onChange={(event) => setNickname(event.target.value)} autoComplete="nickname" minLength={3} maxLength={24} placeholder={current.nicknamePlaceholder} disabled={status === 'loading'} required />
        </AuthField>}

        {needsPassword && <AuthField icon={<Lock size={15} />} id="auth-password" label={mode === 'reset-password' ? current.newPasswordLabel : current.passwordLabel}>
          <div className="xensi-auth-password">
            <input id="auth-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder={mode === 'reset-password' ? current.newPasswordPlaceholder : current.passwordPlaceholder} disabled={status === 'loading'} required />
            <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? current.hidePassword : current.showPassword} disabled={status === 'loading'}>
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </AuthField>}

        {mode === 'login' && <div className="xensi-auth-options">
          <label><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /> <span>{current.remember}</span></label>
          <button type="button" onClick={() => onNavigate('forgot-password')}>{current.forgot}</button>
        </div>}

        {message && <p className={`xensi-auth-message ${status}`} role={status === 'error' ? 'alert' : 'status'} aria-live="polite">{message}</p>}

        <button className="xensi-auth-submit" type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? copy.loading : copy.action}
          {mode === 'forgot-password' ? <RotateCcw size={16} /> : <ArrowRight size={16} />}
        </button>

        {mode === 'auth-callback' ? null : mode === 'login'
          ? <p className="xensi-auth-switch">{current.loginSwitch} <button type="button" onClick={() => onNavigate('register')}>{current.createAccount}</button></p>
          : <p className="xensi-auth-switch">{current.registerSwitch} <button type="button" onClick={() => onNavigate('login')}>{current.signIn}</button></p>}
      </form>
    </section>
  </main>
}
