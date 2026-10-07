import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from '../../features/auth/api/authApi'
import { errorMessage } from '../../shared/api/apiClient'
import { useI18n } from '../../shared/i18n/useI18n'

export function ForgotPasswordPage() {
  const { t } = useI18n()
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setSubmitting(true)
    setError('')
    try {
      await forgotPassword(String(data.get('email')).trim())
      setSent(true)
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-copy">
        <p className="eyebrow">{t('recovery.access')}</p>
        <h1>{t('recovery.return')}</h1>
        <p>{t('recovery.intro')}</p>
      </div>
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="form-heading">
          <span className="form-heading__step">01</span>
          <div><h2>{t('auth.forgotPassword')}</h2><p>{t('recovery.enterEmail')}</p></div>
        </div>
        {error && <div className="alert alert--error" role="alert">{error}</div>}
        {sent && <div className="alert alert--success" role="status">{t('recovery.sent')}</div>}
        {!sent && <>
          <label className="field"><span>Email</span><input name="email" type="email" autoComplete="email" maxLength={254} required /></label>
          <button className="button button--full" type="submit" disabled={submitting}>{submitting ? t('auth.sending') : t('recovery.getLink')}</button>
        </>}
        <p className="form-footnote"><Link to="/login">{t('recovery.backLogin')}</Link></p>
      </form>
    </section>
  )
}
