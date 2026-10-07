import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { resetPassword } from '../../features/auth/api/authApi'
import { errorMessage } from '../../shared/api/apiClient'
import { useI18n } from '../../shared/i18n/useI18n'

export function ResetPasswordPage() {
  const { t } = useI18n()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [submitting, setSubmitting] = useState(false)
  const [complete, setComplete] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const password = String(data.get('password'))
    if (password !== String(data.get('passwordConfirmation'))) {
      setError(t('auth.passwordMismatch'))
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await resetPassword(token, password)
      setComplete(true)
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-copy">
        <p className="eyebrow">{t('recovery.newPassword')}</p>
        <h1>{t('recovery.protect')}</h1>
        <p>{t('recovery.resetIntro')}</p>
      </div>
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="form-heading">
          <span className="form-heading__step">02</span>
          <div><h2>{t('recovery.createPassword')}</h2><p>{t('auth.passwordHint')}</p></div>
        </div>
        {!token && <div className="alert alert--error" role="alert">{t('recovery.missingToken')}</div>}
        {error && <div className="alert alert--error" role="alert">{error}</div>}
        {complete ? <div className="alert alert--success" role="status">{t('recovery.complete')}</div> : token ? <>
          <label className="field"><span>{t('recovery.newPassword')}</span><input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required /></label>
          <label className="field"><span>{t('auth.repeatPassword')}</span><input name="passwordConfirmation" type="password" autoComplete="new-password" minLength={12} maxLength={128} required /></label>
          <button className="button button--full" type="submit" disabled={submitting}>{submitting ? t('common.saving') : t('recovery.savePassword')}</button>
        </> : null}
        <p className="form-footnote"><Link to="/login">{t('recovery.goLogin')}</Link></p>
      </form>
    </section>
  )
}
