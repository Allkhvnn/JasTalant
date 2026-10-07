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
import { useI18n } from '../../shared/i18n/useI18n'

export function AcceptInvitationPage() {
  const { account, isAuthenticated, token, refreshProfile } = useAuth()
  const { t, intlLocale } = useI18n()
  const roleLabels: Record<InvitableRole, string> = { COACH: t('dashboard.coach'), PARENT: t('dashboard.parent') }
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

  if (loading) return <div className="page-loader">{t('accept.loading')}</div>

  if (accepted) {
    return (
      <section className="centered-page invitation-result-page">
        <div className="empty-state">
          <span className="success-mark" aria-hidden="true">✓</span>
          <p className="eyebrow">{t('accept.accessOpen')}</p>
          <h1>{t('accept.accepted')}</h1>
          <p>{t('accept.joined', { roles: accepted.roles.map((role) => roleLabels[role as InvitableRole] || role).join(', ') })}</p>
          <Link className="button" to={isAuthenticated ? '/dashboard' : '/login'}>
            {isAuthenticated ? t('accept.openDashboard') : t('accept.signIn')}
          </Link>
        </div>
      </section>
    )
  }

  if (!preview) {
    return (
      <section className="centered-page invitation-result-page">
        <div className="empty-state">
          <p className="eyebrow">{t('invitations.invite')}</p>
          <h1>{t('accept.unavailable')}</h1>
          <p>{error || (invitationToken
            ? t('accept.requestNew')
            : t('accept.missingToken'))}</p>
          <Link className="button button--secondary" to="/">{t('notFound.home')}</Link>
        </div>
      </section>
    )
  }

  return (
    <section className="auth-page auth-page--wide invitation-accept-page">
      <div className="auth-copy">
        <p className="eyebrow">{t('accept.academyInvitation')}</p>
        <h1>{preview.academyName}</h1>
        <p>
          {t('accept.prepared', { email: preview.maskedEmail, roles: preview.roles.map((role) => roleLabels[role]).join(` ${t('accept.and')} `) })}
        </p>
        <div className="invitation-expiry">{t('accept.expires', { date: new Intl.DateTimeFormat(intlLocale, { dateStyle: 'long', timeStyle: 'short' }).format(new Date(preview.expiresAt)) })}</div>
      </div>

      {isAuthenticated ? (
        <div className="auth-card">
          <div className="form-heading">
            <span className="form-heading__step">✓</span>
            <div>
              <h2>{t('accept.title')}</h2>
              <p>{t('accept.signedAs', { email: account?.email || t('accept.user') })}</p>
            </div>
          </div>
          {error && <div className="alert alert--error" role="alert">{error}</div>}
          <button className="button button--full" type="button" disabled={submitting} onClick={() => void handleExistingAccount()}>
            {submitting ? t('accept.joining') : t('accept.join')}
          </button>
        </div>
      ) : (
        <form className="auth-card" onSubmit={handleNewAccount}>
          <div className="form-heading">
            <span className="form-heading__step">01</span>
            <div>
              <h2>{t('accept.createAccount')}</h2>
              <p>{t('accept.emailVerified')}</p>
            </div>
          </div>
          {error && <div className="alert alert--error" role="alert">{error}</div>}
          <label className="field">
            <span>{t('auth.yourName')}</span>
            <input name="fullName" autoComplete="name" maxLength={200} required />
          </label>
          <label className="field">
            <span>{t('auth.password')}</span>
            <input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required />
            <small>{t('auth.passwordHint')}</small>
          </label>
          <button className="button button--full" type="submit" disabled={submitting}>
            {submitting ? t('accept.creating') : t('accept.createAndAccept')}
          </button>
          <p className="form-footnote">
            {t('accept.hasAccount')}{' '}
            <Link to={`/login?returnTo=${encodeURIComponent(returnTo)}`}>{t('accept.signInAccept')}</Link>
          </p>
        </form>
      )}
    </section>
  )
}
