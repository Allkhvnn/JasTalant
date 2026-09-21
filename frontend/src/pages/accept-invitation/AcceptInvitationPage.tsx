import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import {
  acceptInvitation,
  acceptNewInvitation,
  previewInvitation,
} from '../../entities/invitation/api/invitationApi'
import type { AcceptedMembership, InvitationPreview, InvitableRole } from '../../entities/invitation/model/types'
import { useAuth } from '../../features/auth/model/useAuth'
import { errorMessage } from '../../shared/api/apiClient'

const roleLabels: Record<InvitableRole, string> = {
  COACH: 'тренер',
  PARENT: 'родитель',
}

export function AcceptInvitationPage() {
  const { account, isAuthenticated, token, refreshProfile } = useAuth()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const invitationToken = searchParams.get('token') || ''
  const [preview, setPreview] = useState<InvitationPreview | null>(null)
  const [accepted, setAccepted] = useState<AcceptedMembership | null>(null)
  const [loading, setLoading] = useState(Boolean(invitationToken))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    if (!invitationToken) return
    previewInvitation(invitationToken)
      .then((result) => {
        if (!cancelled) setPreview(result)
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(errorMessage(requestError))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [invitationToken])

  const handleExistingAccount = async () => {
    if (!token) return
    setSubmitting(true)
    setError('')
    try {
      const result = await acceptInvitation(token, invitationToken)
      setAccepted(result)
      await refreshProfile()
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setSubmitting(false)
    }
  }

  const handleNewAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setSubmitting(true)
    setError('')
    try {
      const result = await acceptNewInvitation(
        invitationToken,
        String(data.get('fullName')).trim(),
        String(data.get('password')),
      )
      setAccepted(result)
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setSubmitting(false)
    }
  }

  const returnTo = `${location.pathname}${location.search}`

  if (loading) return <div className="page-loader">Проверяем приглашение…</div>

  if (accepted) {
    return (
      <section className="centered-page invitation-result-page">
        <div className="empty-state">
          <span className="success-mark" aria-hidden="true">✓</span>
          <p className="eyebrow">Доступ открыт</p>
          <h1>Приглашение принято.</h1>
          <p>Вы присоединились к академии. Роли: {accepted.roles.map((role) => roleLabels[role as InvitableRole] || role).join(', ')}.</p>
          <Link className="button" to={isAuthenticated ? '/dashboard' : '/login'}>
            {isAuthenticated ? 'Перейти в кабинет' : 'Войти в аккаунт'}
          </Link>
        </div>
      </section>
    )
  }

  if (!preview) {
    return (
      <section className="centered-page invitation-result-page">
        <div className="empty-state">
          <p className="eyebrow">Приглашение</p>
          <h1>Ссылка недоступна.</h1>
          <p>{error || (invitationToken
            ? 'Попросите администратора академии отправить новое приглашение.'
            : 'В ссылке отсутствует токен приглашения.')}</p>
          <Link className="button button--secondary" to="/">На главную</Link>
        </div>
      </section>
    )
  }

  return (
    <section className="auth-page auth-page--wide invitation-accept-page">
      <div className="auth-copy">
        <p className="eyebrow">Приглашение в академию</p>
        <h1>{preview.academyName}</h1>
        <p>
          Для адреса {preview.maskedEmail} подготовлен доступ с ролью{' '}
          {preview.roles.map((role) => roleLabels[role]).join(' и ')}.
        </p>
        <div className="invitation-expiry">Ссылка действует до {new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(preview.expiresAt))}</div>
      </div>

      {isAuthenticated ? (
        <div className="auth-card">
          <div className="form-heading">
            <span className="form-heading__step">✓</span>
            <div>
              <h2>Принять приглашение</h2>
              <p>Вы вошли как {account?.email || 'пользователь'}.</p>
            </div>
          </div>
          {error && <div className="alert alert--error" role="alert">{error}</div>}
          <button className="button button--full" type="button" disabled={submitting} onClick={() => void handleExistingAccount()}>
            {submitting ? 'Подключаем…' : 'Присоединиться к академии'}
          </button>
        </div>
      ) : (
        <form className="auth-card" onSubmit={handleNewAccount}>
          <div className="form-heading">
            <span className="form-heading__step">01</span>
            <div>
              <h2>Создать аккаунт</h2>
              <p>Email уже подтверждён приглашением.</p>
            </div>
          </div>
          {error && <div className="alert alert--error" role="alert">{error}</div>}
          <label className="field">
            <span>Ваше имя</span>
            <input name="fullName" autoComplete="name" maxLength={200} required />
          </label>
          <label className="field">
            <span>Пароль</span>
            <input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required />
            <small>Минимум 12 символов.</small>
          </label>
          <button className="button button--full" type="submit" disabled={submitting}>
            {submitting ? 'Создаём аккаунт…' : 'Создать аккаунт и принять'}
          </button>
          <p className="form-footnote">
            Уже есть аккаунт?{' '}
            <Link to={`/login?returnTo=${encodeURIComponent(returnTo)}`}>Войти и принять</Link>
          </p>
        </form>
      )}
    </section>
  )
}
