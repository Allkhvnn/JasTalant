import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../../features/auth/api/authApi'
import { errorMessage } from '../../shared/api/apiClient'
import { useI18n } from '../../shared/i18n/useI18n'

export function RegisterPage() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const password = String(data.get('password'))
    const passwordConfirmation = String(data.get('passwordConfirmation'))

    if (password !== passwordConfirmation) {
      setError(t('auth.passwordMismatch'))
      return
    }

    setSubmitting(true)
    setError('')
    const email = String(data.get('email')).trim()

    try {
      await register({
        academyName: String(data.get('academyName')).trim(),
        fullName: String(data.get('fullName')).trim(),
        email,
        password,
      })
      navigate('/verify-email', { state: { email } })
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="auth-page auth-page--wide">
      <div className="auth-copy">
        <p className="eyebrow">{t('auth.newAcademy')}</p>
        <h1>{t('auth.connectTeam')}</h1>
        <p>{t('auth.registerIntro')}</p>
      </div>

      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="form-heading">
          <span className="form-heading__step">01</span>
          <div>
            <h2>{t('auth.academyApplication')}</h2>
            <p>{t('auth.allRequired')}</p>
          </div>
        </div>

        {error && <div className="alert alert--error" role="alert">{error}</div>}

        <label className="field">
          <span>{t('platform.academyName')}</span>
          <input name="academyName" autoComplete="organization" maxLength={200} required />
        </label>
        <label className="field">
          <span>{t('auth.yourName')}</span>
          <input name="fullName" autoComplete="name" maxLength={200} required />
        </label>
        <label className="field">
          <span>Email</span>
          <input name="email" type="email" autoComplete="email" maxLength={254} required />
        </label>
        <div className="field-row">
          <label className="field">
            <span>{t('auth.password')}</span>
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
            />
          </label>
          <label className="field">
            <span>{t('auth.repeatPassword')}</span>
            <input
              name="passwordConfirmation"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
            />
          </label>
        </div>
        <p className="field-hint">{t('auth.passwordHint')}</p>

        <button className="button button--full" type="submit" disabled={submitting}>
          {submitting ? t('auth.sending') : t('auth.sendApplication')}
        </button>

        <p className="form-footnote">
          {t('auth.alreadyRegistered')} <Link to="/login">{t('common.login')}</Link>
        </p>
      </form>
    </section>
  )
}

