import { useEffect, useRef, useState } from 'react'
import { BarChart3, ChevronDown, Crosshair, Gauge, Languages, Mouse, Settings2, SlidersHorizontal, UserRound } from 'lucide-react'
import type { Locale } from './i18n'
import type { WarmupExercise } from './warmupConfig'
import { AvatarArtwork } from './AvatarArtwork'
import { DEFAULT_AVATAR, isAvatarId } from './avatars'
import { isDiagnosticView } from './navigationState'

export type NavigationView = 'home' | 'analysis' | 'profile' | 'routine' | 'warmup' | 'calibration' | 'converter' | 'polling' | 'buttons'
export type AnalysisSection = 'overview' | 'calibration-history' | 'methodology'

type Props = {
  view: NavigationView
  locale: Locale
  disabled: boolean
  onLocaleChange: (locale: Locale) => void
  onNavigate: (view: NavigationView) => void
  onExercise: (exercise: WarmupExercise) => void
  onAnalysisSection: (section: AnalysisSection) => void
}

const labels = {
  pt: { home: 'INÍCIO', train: 'TREINAR', calibrate: 'CALIBRAR', convert: 'CONVERTER', diagnostic: 'DIAGNÓSTICO', analysis: 'ANÁLISE', warmup: 'Aquecimento', routines: 'Rotinas', calibration: 'Calibrar sensibilidade', history: 'Histórico', method: 'Metodologia', polling: 'Teste de Polling Rate', pollingDescription: 'Meça a frequência real de atualização do mouse.', input: 'Diagnóstico de Entrada', inputDescription: 'Analise estabilidade e comportamento do input.', profile: 'Meu perfil', preferences: 'Preferências', settings: 'Configurações', logout: 'Sair', unavailable: 'Disponível quando o login for ativado' },
  en: { home: 'HOME', train: 'TRAIN', calibrate: 'CALIBRATE', convert: 'CONVERT', diagnostic: 'DIAGNOSTICS', analysis: 'ANALYSIS', warmup: 'Warm-up', routines: 'Routines', calibration: 'Calibrate sensitivity', history: 'History', method: 'Methodology', polling: 'Polling Rate Test', pollingDescription: 'Measure the mouse update frequency received by the browser.', input: 'Input Diagnostics', inputDescription: 'Analyze input stability and behavior.', profile: 'My profile', preferences: 'Preferences', settings: 'Settings', logout: 'Sign out', unavailable: 'Available when sign-in is enabled' },
  es: { home: 'INICIO', train: 'ENTRENAR', calibrate: 'CALIBRAR', convert: 'CONVERTIR', diagnostic: 'DIAGNÓSTICO', analysis: 'ANÁLISIS', warmup: 'Calentamiento', routines: 'Rutinas', calibration: 'Calibrar sensibilidad', history: 'Historial', method: 'Metodología', polling: 'Prueba de Polling Rate', pollingDescription: 'Mide la frecuencia de actualización del ratón recibida por el navegador.', input: 'Diagnóstico de Entrada', inputDescription: 'Analiza la estabilidad y el comportamiento de la entrada.', profile: 'Mi perfil', preferences: 'Preferencias', settings: 'Configuración', logout: 'Salir', unavailable: 'Disponible cuando se active el acceso' },
} as const

type OpenMenu = 'train' | 'calibrate' | 'diagnostic' | 'profile' | null
type MenuName = Exclude<OpenMenu, null>

function readNavProfile() {
  try {
    const profile = JSON.parse(window.localStorage.getItem('xensi-player-profile') ?? '{}') as { nickname?: string; avatarId?: string }
    return { nickname: profile.nickname?.trim() || 'xensi_dev', avatarId: isAvatarId(profile.avatarId) ? profile.avatarId : DEFAULT_AVATAR }
  } catch {
    return { nickname: 'xensi_dev', avatarId: DEFAULT_AVATAR }
  }
}

export function AppNavigation({ view, locale, disabled, onLocaleChange, onNavigate, onExercise, onAnalysisSection }: Props) {
  const text = labels[locale]
  const shellRef = useRef<HTMLDivElement>(null)
  const menuTriggerRefs = useRef<Partial<Record<MenuName, HTMLButtonElement | null>>>({})
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null)
  const [navProfile, setNavProfile] = useState(readNavProfile)

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!shellRef.current?.contains(event.target as Node)) setOpenMenu(null)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [])

  useEffect(() => {
    if (!openMenu) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      const trigger = menuTriggerRefs.current[openMenu]
      setOpenMenu(null)
      window.requestAnimationFrame(() => trigger?.focus())
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [openMenu])

  useEffect(() => {
    const update = () => setNavProfile(readNavProfile())
    window.addEventListener('xensi-profile-updated', update)
    window.addEventListener('storage', update)
    return () => {
      window.removeEventListener('xensi-profile-updated', update)
      window.removeEventListener('storage', update)
    }
  }, [])

  const navigate = (next: NavigationView) => {
    setOpenMenu(null)
    onNavigate(next)
  }
  const selectAnalysis = (section: AnalysisSection) => {
    setOpenMenu(null)
    onAnalysisSection(section)
  }
  const selectExercise = (exercise: WarmupExercise) => {
    setOpenMenu(null)
    onExercise(exercise)
  }
  const revealMenuTrigger = (menu: MenuName) => {
    if (menu !== 'diagnostic') return
    window.requestAnimationFrame(() => {
      const trigger = menuTriggerRefs.current[menu]
      const navigation = trigger?.closest<HTMLElement>('.xensi-primary-nav')
      if (!trigger || !navigation || navigation.scrollWidth <= navigation.clientWidth) return
      const left = trigger.offsetLeft - (navigation.clientWidth - trigger.offsetWidth) / 2
      navigation.scrollTo({ left: Math.max(0, left), behavior: 'smooth' })
    })
  }
  const toggle = (menu: MenuName) => {
    setOpenMenu((current) => current === menu ? null : menu)
    revealMenuTrigger(menu)
  }
  const openFromKeyboard = (menu: MenuName, event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowDown') return
    event.preventDefault()
    setOpenMenu(menu)
    revealMenuTrigger(menu)
    window.requestAnimationFrame(() => shellRef.current?.querySelector<HTMLElement>(`[data-menu="${menu}"] [role="menuitem"]`)?.focus())
  }
  const navigateMenuWithKeyboard = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)'))
    if (!items.length) return
    event.preventDefault()
    const current = items.indexOf(document.activeElement as HTMLButtonElement)
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : event.key === 'ArrowDown' ? (current + 1) % items.length : (current - 1 + items.length) % items.length
    items[next]?.focus()
  }
  const diagnosticActive = isDiagnosticView(view)

  return <div className="xensi-navigation" ref={shellRef}>
    <button type="button" className="xensi-nav-brand" onClick={() => navigate('home')} disabled={disabled} aria-label="XENSI home"><span>X</span>ENSI</button>

    <nav className="xensi-primary-nav" aria-label="XENSI">
      <button type="button" className={view === 'home' ? 'active' : ''} onClick={() => navigate('home')} disabled={disabled}>{text.home}</button>
      <div className="xensi-nav-menu-group">
        <button ref={(node) => { menuTriggerRefs.current.train = node }} type="button" className={view === 'warmup' || view === 'routine' ? 'active' : ''} onClick={() => toggle('train')} disabled={disabled} aria-haspopup="menu" aria-expanded={openMenu === 'train'}>{text.train}<ChevronDown size={13} /></button>
        {openMenu === 'train' && <div className="xensi-nav-dropdown xensi-nav-dropdown-wide" data-menu="train">
          <span className="xensi-nav-dropdown-label">{text.train}</span>
          <button type="button" onClick={() => navigate('warmup')}><Crosshair size={15} /><span><b>{text.warmup}</b><small>1 min</small></span></button>
          <button type="button" onClick={() => navigate('routine')}><SlidersHorizontal size={15} /><span><b>{text.routines}</b><small>5 × 1 min</small></span></button>
          <i />
          <button type="button" onClick={() => selectExercise('flick')}><span><b>Flick</b></span></button>
          <button type="button" onClick={() => selectExercise('tracking')}><span><b>Tracking</b></span></button>
          <button type="button" onClick={() => selectExercise('reflex')}><span><b>Reaction</b></span></button>
        </div>}
      </div>
      <div className="xensi-nav-menu-group">
        <button ref={(node) => { menuTriggerRefs.current.calibrate = node }} type="button" className={view === 'calibration' ? 'active' : ''} onClick={() => toggle('calibrate')} disabled={disabled} aria-haspopup="menu" aria-expanded={openMenu === 'calibrate'}>{text.calibrate}<ChevronDown size={13} /></button>
        {openMenu === 'calibrate' && <div className="xensi-nav-dropdown" data-menu="calibrate">
          <span className="xensi-nav-dropdown-label">{text.calibrate}</span>
          <button type="button" onClick={() => navigate('calibration')}><Crosshair size={15} /><span><b>{text.calibration}</b></span></button>
          <button type="button" onClick={() => selectAnalysis('calibration-history')}><BarChart3 size={15} /><span><b>{text.history}</b></span></button>
          <button type="button" onClick={() => selectAnalysis('methodology')}><SlidersHorizontal size={15} /><span><b>{text.method}</b></span></button>
        </div>}
      </div>
      <button type="button" className={view === 'converter' ? 'active' : ''} onClick={() => navigate('converter')} disabled={disabled}>{text.convert}</button>
      <div className="xensi-nav-menu-group">
        <button ref={(node) => { menuTriggerRefs.current.diagnostic = node }} type="button" className={diagnosticActive ? 'active' : ''} onClick={() => toggle('diagnostic')} onKeyDown={(event) => openFromKeyboard('diagnostic', event)} disabled={disabled} aria-haspopup="menu" aria-expanded={openMenu === 'diagnostic'} aria-current={diagnosticActive ? 'page' : undefined}>{text.diagnostic}<ChevronDown size={13} /></button>
        {openMenu === 'diagnostic' && <div className="xensi-nav-dropdown xensi-diagnostic-dropdown" data-menu="diagnostic" role="menu" aria-label={text.diagnostic} onKeyDown={navigateMenuWithKeyboard}>
          <span className="xensi-nav-dropdown-label">{text.diagnostic}</span>
          <button type="button" role="menuitem" className={view === 'polling' ? 'active' : ''} aria-current={view === 'polling' ? 'page' : undefined} onClick={() => navigate('polling')}><Gauge size={16} /><span><b>{text.polling}</b><small>{text.pollingDescription}</small></span></button>
          <button type="button" role="menuitem" className={view === 'buttons' ? 'active' : ''} aria-current={view === 'buttons' ? 'page' : undefined} onClick={() => navigate('buttons')}><Mouse size={16} /><span><b>{text.input}</b><small>{text.inputDescription}</small></span></button>
        </div>}
      </div>
      <button type="button" className={view === 'analysis' ? 'active' : ''} onClick={() => selectAnalysis('overview')} disabled={disabled}>{text.analysis}</button>
    </nav>

    <div className="xensi-nav-actions">
      <div className="xensi-nav-menu-group">
        <button ref={(node) => { menuTriggerRefs.current.profile = node }} type="button" className={`xensi-user-trigger ${view === 'profile' ? 'active' : ''}`} onClick={() => toggle('profile')} disabled={disabled} aria-haspopup="menu" aria-expanded={openMenu === 'profile'}><AvatarArtwork avatarId={navProfile.avatarId} /><b>{navProfile.nickname}</b><ChevronDown size={13} /></button>
        {openMenu === 'profile' && <div className="xensi-nav-dropdown xensi-nav-dropdown-right xensi-profile-dropdown">
          <button type="button" onClick={() => navigate('profile')}><UserRound size={15} /><span><b>{text.profile}</b></span></button>
          <button type="button" onClick={() => navigate('profile')}><SlidersHorizontal size={15} /><span><b>{text.preferences}</b></span></button>
          <button type="button" onClick={() => navigate('profile')}><Settings2 size={15} /><span><b>{text.settings}</b></span></button>
          <label><Languages size={15} /><select value={locale} onChange={(event) => onLocaleChange(event.target.value as Locale)} aria-label={text.settings}><option value="pt">Português</option><option value="en">English</option><option value="es">Español</option></select></label>
          <i />
          <button type="button" disabled title={text.unavailable}><span><b>{text.logout}</b><small>{text.unavailable}</small></span></button>
        </div>}
      </div>
    </div>
  </div>
}
