import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  approveApplication,
  getApplications,
  rejectApplication,
} from '../../entities/application/api/applicationApi'
import type {
  AcademyApplication,
  AcademyApplicationPage,
  ApplicationStatus,
} from '../../entities/application/model/types'
import { useAuth } from '../../features/auth/model/useAuth'
import { errorMessage } from '../../shared/api/apiClient'
import { useI18n } from '../../shared/i18n/useI18n'

const PAGE_SIZE = 10

const filterValues: ApplicationStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'EMAIL_UNVERIFIED']

export function PlatformApplicationsPage() {
  const { token } = useAuth()
  const { t, intlLocale } = useI18n()
  const filters: Array<{ value: ApplicationStatus; label: string }> = [
    { value: 'PENDING', label: t('applications.new') }, { value: 'APPROVED', label: t('applications.approvedPlural') },
    { value: 'REJECTED', label: t('applications.rejectedPlural') }, { value: 'EMAIL_UNVERIFIED', label: t('applications.unverifiedPlural') },
  ]
  const statusLabels: Record<ApplicationStatus, string> = {
    EMAIL_UNVERIFIED: t('applications.unverified'), PENDING: t('applications.pending'),
    APPROVED: t('applications.approved'), REJECTED: t('applications.rejected'),
  }
  const dateFormatter = new Intl.DateTimeFormat(intlLocale, { dateStyle: 'medium', timeStyle: 'short' })
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedStatus = searchParams.get('status') as ApplicationStatus | null
  const initialStatus = filterValues.includes(requestedStatus as ApplicationStatus) ? requestedStatus! : 'PENDING'
  const [status, setStatus] = useState<ApplicationStatus>(initialStatus)
  const [page, setPage] = useState(0)
  const [result, setResult] = useState<AcademyApplicationPage | null>(null)
  const [counts, setCounts] = useState<Partial<Record<ApplicationStatus, number>>>({})
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)
  const [approvalTarget, setApprovalTarget] = useState<AcademyApplication | null>(null)
  const [rejectionTarget, setRejectionTarget] = useState<AcademyApplication | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!token) return

    let cancelled = false
    getApplications(token, status, page, PAGE_SIZE)
      .then((nextResult) => {
        if (!cancelled) setResult(nextResult)
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
  }, [page, reloadKey, status, token])

  useEffect(() => {
    if (!token) return
    let cancelled = false
    Promise.all(filterValues.map(async (filterStatus) => ({
      status: filterStatus,
      total: (await getApplications(token, filterStatus, 0, 1)).totalElements,
    })))
      .then((items) => {
        if (!cancelled) setCounts(Object.fromEntries(items.map((item) => [item.status, item.total])))
      })
      .catch(() => undefined)
    return () => { cancelled = true }
  }, [reloadKey, token])

  useEffect(() => {
    if (!rejectionTarget) return

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !actionId) setRejectionTarget(null)
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [actionId, rejectionTarget])

  useEffect(() => {
    if (!approvalTarget) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !actionId) setApprovalTarget(null)
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [actionId, approvalTarget])

  const selectStatus = (nextStatus: ApplicationStatus) => {
    if (nextStatus === status) return
    setStatus(nextStatus)
    setSearchParams({ status: nextStatus }, { replace: true })
    setPage(0)
    setResult(null)
    setError('')
    setNotice('')
    setLoading(true)
  }

  const selectPage = (nextPage: number) => {
    setPage(nextPage)
    setResult(null)
    setError('')
    setLoading(true)
  }

  const refreshAfterAction = () => {
    if (result?.items.length === 1 && page > 0) {
      selectPage(page - 1)
    } else {
      setLoading(true)
      setReloadKey((current) => current + 1)
    }
  }

  const handleApprove = async (application: AcademyApplication) => {
    if (!token) return
    setActionId(application.id)
    setError('')
    setNotice('')
    try {
      await approveApplication(token, application.id)
      setNotice(t('applications.approvedNotice', { academy: application.academyName }))
      setApprovalTarget(null)
      refreshAfterAction()
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setActionId(null)
    }
  }

  const handleReject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!token || !rejectionTarget) return
    const data = new FormData(event.currentTarget)
    const reason = String(data.get('reason')).trim()
    if (!reason) return

    setActionId(rejectionTarget.id)
    setError('')
    setNotice('')
    try {
      await rejectApplication(token, rejectionTarget.id, reason)
      setNotice(t('applications.rejectedNotice', { academy: rejectionTarget.academyName }))
      setRejectionTarget(null)
      refreshAfterAction()
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setActionId(null)
    }
  }

  const totalPages = result ? Math.ceil(result.totalElements / result.size) : 0

  return (
    <section className="admin-page">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">{t('platform.ownerPanel')}</p>
          <h1>{t('applications.title')}</h1>
          <p>{t('applications.intro')}</p>
        </div>
        <div className="admin-heading__count">
          <strong>{result?.totalElements ?? '—'}</strong>
          <span>{t('applications.selectedStatus')}</span>
        </div>
      </div>

      <div className="status-filters" role="tablist" aria-label={t('applications.status')}>
        {filters.map((filter) => (
          <button
            key={filter.value}
            className={status === filter.value ? 'status-filter status-filter--active' : 'status-filter'}
            type="button"
            role="tab"
            aria-selected={status === filter.value}
            onClick={() => selectStatus(filter.value)}
          >
            <span>{filter.label}</span>
            <strong className="status-filter__count">{counts[filter.value] ?? '—'}</strong>
          </button>
        ))}
      </div>

      {error && <div className="alert alert--error" role="alert">{error}</div>}
      {notice && <div className="alert alert--success" role="status">{notice}</div>}

      {loading ? (
        <div className="list-state">{t('applications.loading')}</div>
      ) : result?.items.length ? (
        <div className="application-list">
          {result.items.map((application) => (
            <article className="review-card" key={application.id}>
              <div className="review-card__main">
                <div className="review-card__title-row">
                  <div>
                    <span className={`status-pill status-pill--${application.status.toLowerCase()}`}>
                      {statusLabels[application.status]}
                    </span>
                    <h2>{application.academyName}</h2>
                  </div>
                  <time dateTime={application.submittedAt}>{dateFormatter.format(new Date(application.submittedAt))}</time>
                </div>

                <dl className="review-card__details">
                  <div>
                    <dt>{t('applications.applicant')}</dt>
                    <dd>{application.applicantName}</dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd>{application.applicantEmail}</dd>
                  </div>
                  {application.reviewedAt && (
                    <div>
                      <dt>{t('applications.reviewed')}</dt>
                      <dd>{dateFormatter.format(new Date(application.reviewedAt))}</dd>
                    </div>
                  )}
                </dl>

                {application.rejectionReason && (
                  <div className="review-card__reason">
                    <span>{t('applications.rejectionReason')}</span>
                    <p>{application.rejectionReason}</p>
                  </div>
                )}
              </div>

              {application.status === 'PENDING' && (
                <div className="review-card__actions">
                  <button
                    className="button"
                    type="button"
                    disabled={Boolean(actionId)}
                    onClick={() => setApprovalTarget(application)}
                  >
                    {actionId === application.id ? t('applications.processing') : t('applications.approve')}
                  </button>
                  <button
                    className="button button--danger"
                    type="button"
                    disabled={Boolean(actionId)}
                    onClick={() => setRejectionTarget(application)}
                  >
                    {t('applications.reject')}
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="list-state">
          <strong>{t('applications.empty')}</strong>
          <span>{t('applications.emptyText')}</span>
        </div>
      )}

      {totalPages > 1 && (
        <nav className="pagination" aria-label={t('applications.pages')}>
          <button
            className="button button--secondary"
            type="button"
            disabled={page === 0 || loading}
            onClick={() => selectPage(page - 1)}
          >
            {t('common.back')}
          </button>
          <span>{t('common.pageOf', { page: page + 1, total: totalPages })}</span>
          <button
            className="button button--secondary"
            type="button"
            disabled={page + 1 >= totalPages || loading}
            onClick={() => selectPage(page + 1)}
          >
            {t('common.next')}
          </button>
        </nav>
      )}

      {approvalTarget && (
        <div
          className="dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !actionId) setApprovalTarget(null)
          }}
        >
          <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="approve-title">
            <div className="dialog__heading">
              <div>
                <p className="eyebrow">{t('applications.confirmDecision')}</p>
                <h2 id="approve-title">{t('applications.approveTitle', { academy: approvalTarget.academyName })}</h2>
              </div>
              <button className="dialog__close" type="button" aria-label={t('common.close')} onClick={() => setApprovalTarget(null)}>×</button>
            </div>
            <p className="dialog__description">
              {t('applications.approveText', { name: approvalTarget.applicantName })}
            </p>
            <div className="dialog__actions">
              <button className="button button--secondary" type="button" onClick={() => setApprovalTarget(null)}>{t('common.cancel')}</button>
              <button className="button" type="button" disabled={actionId === approvalTarget.id} onClick={() => void handleApprove(approvalTarget)}>
                {actionId === approvalTarget.id ? t('applications.creating') : t('applications.approveCreate')}
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectionTarget && (
        <div
          className="dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !actionId) setRejectionTarget(null)
          }}
        >
          <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="reject-title">
            <div className="dialog__heading">
              <div>
                <p className="eyebrow">{t('applications.decision')}</p>
                <h2 id="reject-title">{t('applications.rejectTitle', { academy: rejectionTarget.academyName })}</h2>
              </div>
              <button
                className="dialog__close"
                type="button"
                aria-label={t('common.close')}
                onClick={() => setRejectionTarget(null)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleReject}>
              <label className="field">
                <span>{t('applications.rejectionReason')}</span>
                <textarea name="reason" maxLength={1000} rows={5} required autoFocus />
              </label>
              <p className="field-hint">{t('applications.reasonHint')}</p>
              <div className="dialog__actions">
                <button className="button button--secondary" type="button" onClick={() => setRejectionTarget(null)}>
                  {t('common.cancel')}
                </button>
                <button className="button button--danger" type="submit" disabled={actionId === rejectionTarget.id}>
                  {actionId === rejectionTarget.id ? t('common.saving') : t('applications.rejectApplication')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
