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

const PAGE_SIZE = 10

const filters: Array<{ value: ApplicationStatus; label: string }> = [
  { value: 'PENDING', label: 'Новые' },
  { value: 'APPROVED', label: 'Одобренные' },
  { value: 'REJECTED', label: 'Отклонённые' },
  { value: 'EMAIL_UNVERIFIED', label: 'Без подтверждения' },
]

const statusLabels: Record<ApplicationStatus, string> = {
  EMAIL_UNVERIFIED: 'Email не подтверждён',
  PENDING: 'Ожидает решения',
  APPROVED: 'Одобрена',
  REJECTED: 'Отклонена',
}

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function PlatformApplicationsPage() {
  const { token } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedStatus = searchParams.get('status') as ApplicationStatus | null
  const initialStatus = filters.some((filter) => filter.value === requestedStatus) ? requestedStatus! : 'PENDING'
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
    Promise.all(filters.map(async (filter) => ({
      status: filter.value,
      total: (await getApplications(token, filter.value, 0, 1)).totalElements,
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
      setNotice(`Академия «${application.academyName}» одобрена.`)
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
      setNotice(`Заявка академии «${rejectionTarget.academyName}» отклонена.`)
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
          <p className="eyebrow">Панель владельца</p>
          <h1>Заявки академий</h1>
          <p>Проверяйте данные заявителей перед созданием новой академии.</p>
        </div>
        <div className="admin-heading__count">
          <strong>{result?.totalElements ?? '—'}</strong>
          <span>в выбранном статусе</span>
        </div>
      </div>

      <div className="status-filters" role="tablist" aria-label="Статус заявки">
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
        <div className="list-state">Загружаем заявки…</div>
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
                  <time dateTime={application.createdAt}>{dateFormatter.format(new Date(application.createdAt))}</time>
                </div>

                <dl className="review-card__details">
                  <div>
                    <dt>Заявитель</dt>
                    <dd>{application.applicantName}</dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd>{application.applicantEmail}</dd>
                  </div>
                  {application.reviewedAt && (
                    <div>
                      <dt>Рассмотрена</dt>
                      <dd>{dateFormatter.format(new Date(application.reviewedAt))}</dd>
                    </div>
                  )}
                </dl>

                {application.rejectionReason && (
                  <div className="review-card__reason">
                    <span>Причина отклонения</span>
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
                    {actionId === application.id ? 'Обрабатываем…' : 'Одобрить'}
                  </button>
                  <button
                    className="button button--danger"
                    type="button"
                    disabled={Boolean(actionId)}
                    onClick={() => setRejectionTarget(application)}
                  >
                    Отклонить
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="list-state">
          <strong>Заявок нет</strong>
          <span>В выбранном статусе пока ничего не найдено.</span>
        </div>
      )}

      {totalPages > 1 && (
        <nav className="pagination" aria-label="Страницы заявок">
          <button
            className="button button--secondary"
            type="button"
            disabled={page === 0 || loading}
            onClick={() => selectPage(page - 1)}
          >
            Назад
          </button>
          <span>Страница {page + 1} из {totalPages}</span>
          <button
            className="button button--secondary"
            type="button"
            disabled={page + 1 >= totalPages || loading}
            onClick={() => selectPage(page + 1)}
          >
            Далее
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
                <p className="eyebrow">Подтверждение решения</p>
                <h2 id="approve-title">Одобрить «{approvalTarget.academyName}»?</h2>
              </div>
              <button className="dialog__close" type="button" aria-label="Закрыть" onClick={() => setApprovalTarget(null)}>×</button>
            </div>
            <p className="dialog__description">
              Будет создана новая академия, а заявитель {approvalTarget.applicantName} получит роль администратора.
            </p>
            <div className="dialog__actions">
              <button className="button button--secondary" type="button" onClick={() => setApprovalTarget(null)}>Отмена</button>
              <button className="button" type="button" disabled={actionId === approvalTarget.id} onClick={() => void handleApprove(approvalTarget)}>
                {actionId === approvalTarget.id ? 'Создаём академию…' : 'Одобрить и создать'}
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
                <p className="eyebrow">Решение по заявке</p>
                <h2 id="reject-title">Отклонить «{rejectionTarget.academyName}»</h2>
              </div>
              <button
                className="dialog__close"
                type="button"
                aria-label="Закрыть"
                onClick={() => setRejectionTarget(null)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleReject}>
              <label className="field">
                <span>Причина отклонения</span>
                <textarea name="reason" maxLength={1000} rows={5} required autoFocus />
              </label>
              <p className="field-hint">Заявитель увидит этот текст в личном кабинете.</p>
              <div className="dialog__actions">
                <button className="button button--secondary" type="button" onClick={() => setRejectionTarget(null)}>
                  Отмена
                </button>
                <button className="button button--danger" type="submit" disabled={actionId === rejectionTarget.id}>
                  {actionId === rejectionTarget.id ? 'Сохраняем…' : 'Отклонить заявку'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
