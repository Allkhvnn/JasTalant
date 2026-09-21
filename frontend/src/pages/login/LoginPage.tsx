import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../features/auth/model/useAuth'
import { errorMessage } from '../../shared/api/apiClient'

export function LoginPage() {
  const { signIn } = useAuth()
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
        <p className="eyebrow">Личный кабинет</p>
        <h1>С возвращением.</h1>
        <p>Войдите, чтобы продолжить работу со своей академией.</p>
      </div>

      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="form-heading">
          <span className="form-heading__step">01</span>
          <div>
            <h2>Вход</h2>
            <p>Введите данные вашей учётной записи.</p>
          </div>
        </div>

        {error && <div className="alert alert--error" role="alert">{error}</div>}

        <label className="field">
          <span>Email</span>
          <input name="email" type="email" autoComplete="email" maxLength={254} required />
        </label>
        <label className="field">
          <span>Пароль</span>
          <input name="password" type="password" autoComplete="current-password" maxLength={128} required />
        </label>

        <button className="button button--full" type="submit" disabled={submitting}>
          {submitting ? 'Входим…' : 'Войти'}
        </button>

        <p className="form-footnote">
          Ещё нет аккаунта? <Link to="/register">Подключить академию</Link>
        </p>
      </form>
    </section>
  )
}
