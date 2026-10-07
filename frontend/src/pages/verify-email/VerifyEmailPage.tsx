import { useState, type FormEvent } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { verifyEmail } from '../../features/auth/api/authApi'
import { errorMessage } from '../../shared/api/apiClient'
import { useI18n } from '../../shared/i18n/useI18n'

type VerificationLocationState = {
  email?: string
}

export function VerifyEmailPage() {
  const { t } = useI18n()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const locationState = location.state as VerificationLocationState | null
  const [token, setToken] = useState(searchParams.get('token') || '')
  const [submitting, setSubmitting] = useState(false)
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      await verifyEmail(token.trim())
      setVerified(true)
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="centered-page">
      <div className="auth-card auth-card--compact">
        <div className="status-icon" aria-hidden="true">@</div>
        {verified ? (
          <div className="result-copy">
            <p className="eyebrow">{t('verify.confirmed')}</p>
            <h1>{t('verify.applicationSent')}</h1>
            <p>{t('verify.sentText')}</p>
            <Link className="button button--full" to="/login">
              {t('recovery.goLogin')}
            </Link>
          </div>
        ) : (
          <>
            <div className="form-heading form-heading--stacked">
              <div>
                <p className="eyebrow">{t('verify.title')}</p>
                <h1>{t('verify.checkEmail')}</h1>
                <p>
                  {locationState?.email ? t('verify.codeForEmail', { email: locationState.email }) : t('verify.code')}
                </p>
              </div>
            </div>

            {error && <div className="alert alert--error" role="alert">{error}</div>}

            <form onSubmit={handleSubmit}>
              <label className="field">
                <span>{t('verify.codeLabel')}</span>
                <input
                  name="token"
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  autoComplete="one-time-code"
                  minLength={43}
                  maxLength={43}
                  pattern="[A-Za-z0-9_-]{43}"
                  required
                />
              </label>
              <button className="button button--full" type="submit" disabled={submitting}>
                {submitting ? t('verify.checking') : t('verify.confirm')}
              </button>
            </form>
            <p className="form-footnote">
              {t('verify.already')} <Link to="/login">{t('common.login')}</Link>
            </p>
          </>
        )}
      </div>
    </section>
  )
}

