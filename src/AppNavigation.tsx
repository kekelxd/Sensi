import { useEffect, useRef, useState } from 'react'
import { BarChart3, ChevronDown, Crosshair, Gauge, Languages, Mouse, Settings2, SlidersHorizontal, UserRound, Wrench } from 'lucide-react'
import type { Locale } from './i18n'
import type { WarmupExercise } from './warmupConfig'

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
  pt: { home: 'INÍCIO', train: 'TREINAR', calibrate: 'CALIBRAR', convert: 'CONVERTER', analysis: 'ANÁLISE', warmup: 'Aquecimento', routines: 'Rotinas', calibration: 'Calibrar sensibilidade', history: 'Histórico', method: 'Metodologia', tools: 'Ferramentas', mouse: 'MOUSE', polling: 'Teste de polling rate', input: 'Diagnóstico de entrada', profile: 'Meu perfil', preferences: 'Preferências', settings: 'Configurações', logout: 'Sair', unavailable: 'Disponível quando o login for ativado' },
  en: { home: 'HOME', train: 'TRAIN', calibrate: 'CALIBRATE', convert: 'CONVERT', analysis: 'ANALYSIS', warmup: 'Warm-up', routines: 'Routines', calibration: 'Calibrate sensitivity', history: 'History', method: 'Methodology', tools: 'Tools', mouse: 'MOUSE', polling: 'Polling rate test', input: 'Input diagnostics', profile: 'My profile', preferences: 'Preferences', settings: 'Settings', logout: 'Sign out', unavailable: 'Available when sign-in is enabled' },
  es: { home: 'INICIO', train: 'ENTRENAR', calibrate: 'CALIBRAR', convert: 'CONVERTIR', analysis: 'ANÁLISIS', warmup: 'Calentamiento', routines: 'Rutinas', calibration: 'Calibrar sensibilidad', history: 'Historial', method: 'Metodología', tools: 'Herramientas', mouse: 'RATÓN', polling: 'Prueba de polling rate', input: 'Diagnóstico de entrada', profile: 'Mi perfil', preferences: 'Preferencias', settings: 'Configuración', logout: 'Salir', unavailable: 'Disponible cuando se active el acceso' },
} as const

type OpenMenu = 'train' | 'calibrate' | 'tools' | 'profile' | null

function readNickname() {
  try {
    const profile = JSON.parse(window.localStorage.getItem('xensi-player-profile') ?? '{}') as { nickname?: string }
    return profile.nickname?.trim() || 'xensi_dev'
  } catch {
    return 'xensi_dev'
  }
}

export function AppNavigation({ view, locale, disabled, onLocaleChange, onNavigate, onExercise, onAnalysisSection }: Props) {
  const text = labels[locale]
  const shellRef = useRef<HTMLDivElement>(null)
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null)
  const [nickname] = useState(readNickname)

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!shellRef.current?.contains(event.target as Node)) setOpenMenu(null)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
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
  const toggle = (menu: Exclude<OpenMenu, null>) => setOpenMenu((current) => current === menu ? null : menu)

  return <div className="xensi-navigation" ref={shellRef}>
    <button type="button" className="xensi-nav-brand" onClick={() => navigate('home')} disabled={disabled} aria-label="XENSI home"><span>X</span>ENSI</button>

    <nav className="xensi-primary-nav" aria-label="XENSI">
      <button type="button" className={view === 'home' ? 'active' : ''} onClick={() => navigate('home')} disabled={disabled}>{text.home}</button>
      <div className="xensi-nav-menu-group">
        <button type="button" className={view === 'warmup' || view === 'routine' ? 'active' : ''} onClick={() => toggle('train')} disabled={disabled} aria-expanded={openMenu === 'train'}>{text.train}<ChevronDown size={13} /></button>
        {openMenu === 'train' && <div className="xensi-nav-dropdown xensi-nav-dropdown-wide">
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
        <button type="button" className={view === 'calibration' ? 'active' : ''} onClick={() => toggle('calibrate')} disabled={disabled} aria-expanded={openMenu === 'calibrate'}>{text.calibrate}<ChevronDown size={13} /></button>
        {openMenu === 'calibrate' && <div className="xensi-nav-dropdown">
          <span className="xensi-nav-dropdown-label">{text.calibrate}</span>
          <button type="button" onClick={() => navigate('calibration')}><Crosshair size={15} /><span><b>{text.calibration}</b></span></button>
          <button type="button" onClick={() => selectAnalysis('calibration-history')}><BarChart3 size={15} /><span><b>{text.history}</b></span></button>
          <button type="button" onClick={() => selectAnalysis('methodology')}><SlidersHorizontal size={15} /><span><b>{text.method}</b></span></button>
        </div>}
      </div>
      <button type="button" className={view === 'converter' ? 'active' : ''} onClick={() => navigate('converter')} disabled={disabled}>{text.convert}</button>
      <button type="button" className={view === 'analysis' ? 'active' : ''} onClick={() => selectAnalysis('overview')} disabled={disabled}>{text.analysis}</button>
    </nav>

    <div className="xensi-nav-actions">
      <div className="xensi-nav-menu-group">
        <button type="button" className="xensi-nav-icon-button" onClick={() => toggle('tools')} disabled={disabled} aria-label={text.tools} aria-expanded={openMenu === 'tools'}><Wrench size={16} /></button>
        {openMenu === 'tools' && <div className="xensi-nav-dropdown xensi-nav-dropdown-right">
          <span className="xensi-nav-dropdown-label">{text.tools}</span>
          <small className="xensi-nav-dropdown-category">{text.mouse}</small>
          <button type="button" onClick={() => navigate('polling')}><Gauge size={15} /><span><b>{text.polling}</b></span></button>
          <button type="button" onClick={() => navigate('buttons')}><Mouse size={15} /><span><b>{text.input}</b></span></button>
        </div>}
      </div>
      <div className="xensi-nav-menu-group">
        <button type="button" className={`xensi-user-trigger ${view === 'profile' ? 'active' : ''}`} onClick={() => toggle('profile')} disabled={disabled} aria-expanded={openMenu === 'profile'}><span>{nickname.slice(0, 2).toUpperCase()}</span><b>{nickname}</b><ChevronDown size={13} /></button>
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
