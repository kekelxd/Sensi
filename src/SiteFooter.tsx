import { APP_RELEASE_LABEL } from './appRelease'
import { useI18n, type TranslationKey } from './i18n'
import { viewRoutePath, type AppView } from './routes'

type Props = {
  onFeedback: () => void
  onNavigate: (view: AppView) => void
}

const footerLinks: Array<{ label: TranslationKey; view: AppView }> = [
  { label: 'footer.about', view: 'about' },
  { label: 'footer.privacy', view: 'privacy' },
  { label: 'footer.terms', view: 'terms' },
  { label: 'footer.contact', view: 'contact' },
]

export function SiteFooter({ onFeedback, onNavigate }: Props) {
  const { t } = useI18n()

  return <footer className="xensi-home-v3-footer" id="home-footer">
    <strong><span>X</span>ENSI</strong>
    <p>{t('footer.line')}</p>
    <nav aria-label="XENSI footer">
      {footerLinks.map(({ label, view }) => <a
        key={view}
        href={viewRoutePath(view)}
        onClick={(event) => {
          event.preventDefault()
          onNavigate(view)
        }}
      >
        {t(label)}
      </a>)}
    </nav>
    <div className="xensi-home-v3-footer-release">
      <span>{APP_RELEASE_LABEL}</span>
      <button type="button" onClick={onFeedback}>{t('footer.feedback')}</button>
    </div>
  </footer>
}
