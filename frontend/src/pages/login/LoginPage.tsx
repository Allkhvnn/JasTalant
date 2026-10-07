import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../features/auth/model/useAuth'
import { errorMessage } from '../../shared/api/apiClient'
import { useI18n } from '../../shared/i18n/useI18n'

export function LoginPage() {
  const { signIn } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setSubmitting(true)
    setError('')

    try {
      await signIn({
        email: String(data.get('email')).trim(),
        password: String(data.get('password')),
      })
      const requestedPath = searchParams.get('returnTo')
      const destination = requestedPath?.startsWith('/') && !requestedPath.startsWith('//')
        ? requestedPath
        : '/dashboard'
      navigate(destination)
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-copy">
        <p className="eyebrow">{t('auth.account')}</p>
        <h1>{t('auth.welcomeBack')}</h1>
        <p>{t('auth.loginIntro')}</p>
      </div>

      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="form-heading">
          <span className="form-heading__step">01</span>
          <div>
            <h2>{t('common.login')}</h2>
            <p>{t('auth.credentials')}</p>
          </div>
        </div>

        {error && <div className="alert alert--error" role="alert">{error}</div>}

        <label className="field">
          <span>Email</span>
          <input name="email" type="email" autoComplete="email" maxLength={254} required />
        </label>
        <label className="field">
          <span>{t('auth.password')}</span>
          <input name="password" type="password" autoComplete="current-password" maxLength={128} required />
        </label>
        <p className="field-hint"><Link to="/forgot-password">{t('auth.forgotPassword')}</Link></p>

        <button className="button button--full" type="submit" disabled={submitting}>
          {submitting ? t('auth.signingIn') : t('common.login')}
        </button>

        <p className="form-footnote">
          {t('auth.noAccount')} <Link to="/register">{t('common.connect')}</Link>
        </p>
      </form>
    </section>
  )
}
