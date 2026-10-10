import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { getMyApplication, resubmitMyApplication } from '../../entities/application/api/applicationApi'
import type { AcademyApplication, ApplicationStatus } from '../../entities/application/model/types'
import { resendVerification } from '../../features/auth/api/authApi'
import { useAuth } from '../../features/auth/model/useAuth'
import { ApiError, errorMessage } from '../../shared/api/apiClient'
import { useI18n } from '../../shared/i18n/useI18n'

export function ApplicationPage() {
  const { token, account } = useAuth()
  const { t, intlLocale } = useI18n()
  const statusLabels: Record<ApplicationStatus, string> = {
    EMAIL_UNVERIFIED: t('myApplication.unverified'), PENDING: t('myApplication.pending'),
    APPROVED: t('applications.approved'), REJECTED: t('applications.rejected'),
  }
  const [application, setApplication] = useState<AcademyApplication | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [resending, setResending] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const loadApplication = useCallback(async () => {
    if (!token) return
    try {
      setApplication(await getMyApplication(token))
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 404) {
        setError(t('myApplication.accountNotFound'))
      } else {
        setError(errorMessage(requestError))
      }
    } finally {
      setLoading(false)
    }
  }, [t, token])

  const handleResubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!token || submitting) return
    const academyName = String(new FormData(event.currentTarget).get('academyName') ?? '').trim()
    setError('')
    setNotice('')
    if (!academyName) {
      setError(t('myApplication.nameRequired'))
      return
    }
    setSubmitting(true)
    try {
      setApplication(await resubmitMyApplication(token, academyName))
      setNotice(t('myApplication.resubmitted'))
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- route data is loaded from the API on mount
    void loadApplication()
  }, [loadApplication])

  const handleResend = async () => {
    if (!token) return
    setResending(true)
    setNotice('')
    setError('')
    try {
      await resendVerification(token)
      setNotice(t('myApplication.codeSent'))
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setResending(false)
    }
  }

  if (loading) {
    return <div className="page-loader">{t('applications.loading')}</div>
  }

  if (!application) {
    return (
      <section className="centered-page">
        <div className="empty-state">
          <p className="eyebrow">{t('auth.account')}</p>
          <h1>{t('myApplication.notFound')}</h1>
          <p>{error}</p>
          {account?.platformRole === 'SUPER_ADMIN' && (
            <Link className="button" to="/dashboard">{t('myApplication.openDashboard')}</Link>
          )}
        </div>
      </section>
    )
  }

  return (
    <section className="application-page">
      <div className="section-heading">
        <p className="eyebrow">{t('myApplication.connecting')}</p>
        <h1>{application.academyName}</h1>
        <p>{t('myApplication.createdAt', { date: new Intl.DateTimeFormat(intlLocale, { dateStyle: 'long' }).format(new Date(application.createdAt)) })}</p>
        {application.submittedAt !== application.createdAt && (
          <p>{t('myApplication.lastSubmitted', { date: new Intl.DateTimeFormat(intlLocale, { dateStyle: 'long', timeStyle: 'short' }).format(new Date(application.submittedAt)) })}</p>
        )}
      </div>

      {error && <div className="alert alert--error" role="alert">{error}</div>}
      {notice && <div className="alert alert--success" role="status">{notice}</div>}

      <div className={`status-card status-card--${application.status.toLowerCase()}`}>
        <div>
          <span className="status-card__label">{t('myApplication.currentStatus')}</span>
          <h2>{statusLabels[application.status]}</h2>
        </div>
        <span className="status-card__number">{application.status === 'APPROVED' ? '✓' : '•'}</span>
      </div>

      <div className="application-details">
        <div>
          <span>{t('myApplication.adminEmail')}</span>
          <strong>{application.applicantEmail}</strong>
        </div>
        <div>
          <span>{t('myApplication.adminName')}</span>
          <strong>{application.applicantName}</strong>
        </div>
      </div>

      {application.status === 'EMAIL_UNVERIFIED' && (
        <div className="application-action">
          <div>
            <h2>{t('myApplication.verifyEmail')}</h2>
            <p>{t('myApplication.verifyText')}</p>
          </div>
          <div className="application-action__buttons">
            <Link className="button" to="/verify-email">{t('myApplication.enterCode')}</Link>
            <button className="button button--secondary" type="button" onClick={handleResend} disabled={resending}>
              {resending ? t('auth.sending') : t('myApplication.resend')}
            </button>
          </div>
        </div>
      )}

      {application.status === 'PENDING' && (
        <div className="application-action">
          <div>
            <h2>{t('myApplication.withOwner')}</h2>
            <p>{t('myApplication.pendingText')}</p>
          </div>
        </div>
      )}

      {application.status === 'APPROVED' && (
        <div className="application-action">
          <div>
            <h2>{t('myApplication.connected')}</h2>
            <p>{t('myApplication.connectedText')}</p>
          </div>
          <Link className="button" to="/academy">{t('myApplication.openCrm')}</Link>
        </div>
      )}

      {application.status === 'REJECTED' && (
        <>
          <div className="application-action application-action--danger">
            <div>
              <h2>{t('applications.rejectionReason')}</h2>
              <p>{application.rejectionReason || t('myApplication.noReason')}</p>
            </div>
          </div>
          <form className="auth-card application-resubmit" onSubmit={handleResubmit}>
            <div className="form-heading">
              <div>
                <h2>{t('myApplication.correctTitle')}</h2>
                <p>{t('myApplication.correctText')}</p>
              </div>
            </div>
            <label className="field">
              <span>{t('platform.academyName')}</span>
              <input name="academyName" autoComplete="organization" maxLength={200}
                defaultValue={application.academyName} required disabled={submitting} />
            </label>
            <button className="button" type="submit" disabled={submitting}>
              {submitting ? t('auth.sending') : t('myApplication.submitAgain')}
            </button>
          </form>
        </>
      )}
    </section>
  )
}
