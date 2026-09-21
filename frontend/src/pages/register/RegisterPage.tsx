import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../../features/auth/api/authApi'
import { errorMessage } from '../../shared/api/apiClient'

export function RegisterPage() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const password = String(data.get('password'))
    const passwordConfirmation = String(data.get('passwordConfirmation'))

    if (password !== passwordConfirmation) {
      setError('Пароли не совпадают.')
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
        <p className="eyebrow">Новая академия</p>
        <h1>Подключите свою команду.</h1>
        <p>
          После подтверждения email заявка поступит владельцу платформы. Доступ откроется после
          одобрения.
        </p>
      </div>

      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="form-heading">
          <span className="form-heading__step">01</span>
          <div>
            <h2>Заявка академии</h2>
            <p>Все поля обязательны.</p>
          </div>
        </div>

        {error && <div className="alert alert--error" role="alert">{error}</div>}

        <label className="field">
          <span>Название академии</span>
          <input name="academyName" autoComplete="organization" maxLength={200} required />
        </label>
        <label className="field">
          <span>Ваше имя</span>
          <input name="fullName" autoComplete="name" maxLength={200} required />
        </label>
        <label className="field">
          <span>Email</span>
          <input name="email" type="email" autoComplete="email" maxLength={254} required />
        </label>
        <div className="field-row">
          <label className="field">
            <span>Пароль</span>
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
            <span>Повторите пароль</span>
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
        <p className="field-hint">Используйте не менее 12 символов.</p>

        <button className="button button--full" type="submit" disabled={submitting}>
          {submitting ? 'Отправляем…' : 'Отправить заявку'}
        </button>

        <p className="form-footnote">
          Уже зарегистрированы? <Link to="/login">Войти</Link>
        </p>
      </form>
    </section>
  )
}

