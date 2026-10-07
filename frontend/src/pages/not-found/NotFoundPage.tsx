import { Link } from 'react-router-dom'
import { useI18n } from '../../shared/i18n/useI18n'

export function NotFoundPage() {
  const { t } = useI18n()
  return (
    <section className="centered-page">
      <div className="empty-state">
        <p className="eyebrow">{t('notFound.error')}</p>
        <h1>{t('notFound.title')}</h1>
        <Link className="button" to="/">{t('notFound.home')}</Link>
      </div>
    </section>
  )
}
