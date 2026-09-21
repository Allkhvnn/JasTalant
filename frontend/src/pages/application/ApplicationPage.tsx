import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMyApplication } from '../../entities/application/api/applicationApi'
import type { AcademyApplication, ApplicationStatus } from '../../entities/application/model/types'
import { resendVerification } from '../../features/auth/api/authApi'
import { useAuth } from '../../features/auth/model/useAuth'
import { ApiError, errorMessage } from '../../shared/api/apiClient'

const statusLabels: Record<ApplicationStatus, string> = {
  EMAIL_UNVERIFIED: 'Ожидает подтверждения email',
  PENDING: 'На рассмотрении',
  APPROVED: 'Одобрена',
  REJECTED: 'Отклонена',
}

export function ApplicationPage() {
  const { token, account } = useAuth()
  const [application, setApplication] = useState<AcademyApplication | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [resending, setResending] = useState(false)

  const loadApplication = useCallback(async () => {
    if (!token) return
    try {
      setApplication(await getMyApplication(token))
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 404) {
        setError('Для этого аккаунта заявка академии не найдена.')
      } else {
        setError(errorMessage(requestError))
      }
    } finally {
      setLoading(false)
    }
  }, [token])

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
      setNotice('Новый код отправлен. Для локальной разработки откройте Mailpit на порту 8025.')
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setResending(false)
    }
  }

  if (loading) {
    return <div className="page-loader">Загружаем заявку…</div>
  }

  if (!application) {
    return (
      <section className="centered-page">
        <div className="empty-state">
          <p className="eyebrow">Личный кабинет</p>
          <h1>Заявка не найдена.</h1>
          <p>{error}</p>
          {account?.platformRole === 'SUPER_ADMIN' && (
            <Link className="button" to="/dashboard">Перейти в панель</Link>
          )}
        </div>
      </section>
    )
  }

  return (
    <section className="application-page">
      <div className="section-heading">
        <p className="eyebrow">Подключение академии</p>
        <h1>{application.academyName}</h1>
        <p>Заявка от {new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long' }).format(new Date(application.createdAt))}</p>
      </div>

      {error && <div className="alert alert--error" role="alert">{error}</div>}
      {notice && <div className="alert alert--success" role="status">{notice}</div>}

      <div className={`status-card status-card--${application.status.toLowerCase()}`}>
        <div>
          <span className="status-card__label">Текущий статус</span>
          <h2>{statusLabels[application.status]}</h2>
        </div>
        <span className="status-card__number">{application.status === 'APPROVED' ? '✓' : '•'}</span>
      </div>

      <div className="application-details">
        <div>
          <span>Email администратора</span>
          <strong>{application.applicantEmail}</strong>
        </div>
        <div>
          <span>Имя администратора</span>
          <strong>{application.applicantName}</strong>
        </div>
      </div>

      {application.status === 'EMAIL_UNVERIFIED' && (
        <div className="application-action">
          <div>
            <h2>Подтвердите email</h2>
            <p>Введите код из письма, чтобы заявка поступила на рассмотрение.</p>
          </div>
          <div className="application-action__buttons">
            <Link className="button" to="/verify-email">Ввести код</Link>
            <button className="button button--secondary" type="button" onClick={handleResend} disabled={resending}>
              {resending ? 'Отправляем…' : 'Отправить повторно'}
            </button>
          </div>
        </div>
      )}

      {application.status === 'PENDING' && (
        <div className="application-action">
          <div>
            <h2>Заявка у владельца платформы</h2>
            <p>После проверки академия и ваш административный доступ будут созданы автоматически.</p>
          </div>
        </div>
      )}

      {application.status === 'APPROVED' && (
        <div className="application-action">
          <div>
            <h2>Академия подключена</h2>
            <p>Можно переходить к настройке групп, тренеров и игроков.</p>
          </div>
          <Link className="button" to="/academy">Открыть CRM</Link>
        </div>
      )}

      {application.status === 'REJECTED' && (
        <div className="application-action application-action--danger">
          <div>
            <h2>Причина отклонения</h2>
            <p>{application.rejectionReason || 'Причина не указана.'}</p>
          </div>
        </div>
      )}
    </section>
  )
}
