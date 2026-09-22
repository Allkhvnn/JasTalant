import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { resetPassword } from '../../features/auth/api/authApi'
import { errorMessage } from '../../shared/api/apiClient'

export function ResetPasswordPage() {
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
      setError('Пароли не совпадают.')
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
        <p className="eyebrow">Новый пароль</p>
        <h1>Защитите аккаунт.</h1>
        <p>После смены пароля все ранее открытые сессии будут завершены.</p>
      </div>
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="form-heading">
          <span className="form-heading__step">02</span>
          <div><h2>Создайте новый пароль</h2><p>Используйте не менее 12 символов.</p></div>
        </div>
        {!token && <div className="alert alert--error" role="alert">В ссылке отсутствует токен восстановления.</div>}
        {error && <div className="alert alert--error" role="alert">{error}</div>}
        {complete ? <div className="alert alert--success" role="status">Пароль изменён. Теперь можно войти с новым паролем.</div> : token ? <>
          <label className="field"><span>Новый пароль</span><input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required /></label>
          <label className="field"><span>Повторите пароль</span><input name="passwordConfirmation" type="password" autoComplete="new-password" minLength={12} maxLength={128} required /></label>
          <button className="button button--full" type="submit" disabled={submitting}>{submitting ? 'Сохраняем…' : 'Сохранить пароль'}</button>
        </> : null}
        <p className="form-footnote"><Link to="/login">Перейти ко входу</Link></p>
      </form>
    </section>
  )
}
