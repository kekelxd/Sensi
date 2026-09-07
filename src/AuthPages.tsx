import { FormEvent, ReactNode, useState } from 'react'
import { ArrowRight, BarChart3, Crosshair, Eye, EyeOff, Flame, Lock, Mail, RotateCcw, ShieldCheck } from 'lucide-react'
import { XensiLogo } from './AppNavigation'
import { AuthMode, AuthStatus, registerWithEmail, requestPasswordReset, signInWithEmail } from './authService'

type AuthScreenProps = {
  mode: AuthMode
  onNavigate: (mode: AuthMode) => void
  onAuthenticated: () => void
}

const modeCopy = {
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
} as const

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
  const copy = modeCopy[mode]
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState<AuthStatus>('idle')
  const [message, setMessage] = useState('')
  const needsPassword = mode !== 'forgot-password'

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (status === 'loading') return
    setStatus('loading')
    setMessage('')
    const result = mode === 'login'
      ? await signInWithEmail(email, password)
      : mode === 'register'
        ? await registerWithEmail(email, password)
        : await requestPasswordReset(email)
    if (!result.ok) {
      setStatus('error')
      setMessage(result.message)
      return
    }
    setStatus('success')
    setMessage(copy.complete)
    if (mode === 'login') onAuthenticated()
  }

  return <main className="xensi-auth-shell">
    <section className="xensi-auth-brand-panel" aria-labelledby="auth-brand-title">
      <XensiLogo className="xensi-auth-logo" />
      <div>
        <h1 id="auth-brand-title">TREINE. CALIBRE. <span>EVOLUA.</span></h1>
        <p>Treine sua mira, calibre sua sensibilidade e acompanhe sua evolução.</p>
      </div>
      <div className="xensi-auth-pillars" aria-label="Pilares do XENSI">
        <BrandPillar icon={<Flame size={18} />} title="TREINE" text="Sessões focadas" />
        <BrandPillar icon={<Crosshair size={18} />} title="CALIBRE" text="Ajustes controlados" />
        <BrandPillar icon={<BarChart3 size={18} />} title="ANALISE" text="Acompanhe sua evolução" />
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

        <AuthField icon={<Mail size={15} />} id="auth-email" label="E-mail">
          <input id="auth-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="seu@email.com" disabled={status === 'loading'} required />
        </AuthField>

        {needsPassword && <AuthField icon={<Lock size={15} />} id="auth-password" label="Senha">
          <div className="xensi-auth-password">
            <input id="auth-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="sua senha" disabled={status === 'loading'} required />
            <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} disabled={status === 'loading'}>
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </AuthField>}

        {mode === 'login' && <div className="xensi-auth-options">
          <label><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /> <span>Lembrar de mim</span></label>
          <button type="button" onClick={() => onNavigate('forgot-password')}>Esqueceu a senha?</button>
        </div>}

        {message && <p className={`xensi-auth-message ${status}`} role={status === 'error' ? 'alert' : 'status'} aria-live="polite">{message}</p>}

        <button className="xensi-auth-submit" type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? copy.loading : copy.action}
          {mode === 'forgot-password' ? <RotateCcw size={16} /> : <ArrowRight size={16} />}
        </button>

        {mode === 'login' ? <p className="xensi-auth-switch">Ainda não tem uma conta? <button type="button" onClick={() => onNavigate('register')}>Criar conta</button></p> : <p className="xensi-auth-switch">Já tem uma conta? <button type="button" onClick={() => onNavigate('login')}>Entrar</button></p>}
        <small className="xensi-auth-note"><ShieldCheck size={13} /> Seus dados de treino continuam no ambiente do XENSI.</small>
      </form>
    </section>
  </main>
}
