import { useState, type FormEvent } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { verifyEmail } from '../../features/auth/api/authApi'
import { errorMessage } from '../../shared/api/apiClient'

type VerificationLocationState = {
  email?: string
}

export function VerifyEmailPage() {
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
            <p className="eyebrow">Email подтверждён</p>
            <h1>Заявка отправлена.</h1>
            <p>Теперь войдите в аккаунт и следите за статусом рассмотрения.</p>
            <Link className="button button--full" to="/login">
              Перейти ко входу
            </Link>
          </div>
        ) : (
          <>
            <div className="form-heading form-heading--stacked">
              <div>
                <p className="eyebrow">Подтверждение email</p>
                <h1>Проверьте почту.</h1>
                <p>
                  Введите 43-символьный код из письма
                  {locationState?.email ? `, отправленного на ${locationState.email}` : ''}.
                </p>
              </div>
            </div>

            {error && <div className="alert alert--error" role="alert">{error}</div>}

            <form onSubmit={handleSubmit}>
              <label className="field">
                <span>Код подтверждения</span>
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
                {submitting ? 'Проверяем…' : 'Подтвердить email'}
              </button>
            </form>
            <p className="form-footnote">
              Уже подтвердили? <Link to="/login">Войти</Link>
            </p>
          </>
        )}
      </div>
    </section>
  )
}

