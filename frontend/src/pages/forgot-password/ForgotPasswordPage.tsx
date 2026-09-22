import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from '../../features/auth/api/authApi'
import { errorMessage } from '../../shared/api/apiClient'

export function ForgotPasswordPage() {
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
        <p className="eyebrow">Восстановление доступа</p>
        <h1>Вернитесь в игру.</h1>
        <p>Мы отправим ссылку для создания нового пароля, если аккаунт с таким email существует.</p>
      </div>
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="form-heading">
          <span className="form-heading__step">01</span>
          <div><h2>Забыли пароль?</h2><p>Введите email вашей учётной записи.</p></div>
        </div>
        {error && <div className="alert alert--error" role="alert">{error}</div>}
        {sent && <div className="alert alert--success" role="status">Если аккаунт найден, письмо уже отправлено. Ссылка действует один час.</div>}
        {!sent && <>
          <label className="field"><span>Email</span><input name="email" type="email" autoComplete="email" maxLength={254} required /></label>
          <button className="button button--full" type="submit" disabled={submitting}>{submitting ? 'Отправляем…' : 'Получить ссылку'}</button>
        </>}
        <p className="form-footnote"><Link to="/login">Вернуться ко входу</Link></p>
      </form>
    </section>
  )
}
