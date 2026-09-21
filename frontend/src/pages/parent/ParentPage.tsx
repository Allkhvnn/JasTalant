import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { AttendanceStatus } from '../../entities/attendance/model/types'
import {
  getChildAttendance,
  getMyChildren,
} from '../../entities/parent/api/parentApi'
import type { ChildAttendance } from '../../entities/parent/model/types'
import type { Player } from '../../entities/player/model/types'
import { useAuth } from '../../features/auth/model/useAuth'
import { errorMessage } from '../../shared/api/apiClient'
import type { PageResponse } from '../../shared/api/types'

const PAGE_SIZE = 20
const statusLabels: Record<AttendanceStatus, string> = {
  PRESENT: 'Присутствовал',
  ABSENT: 'Отсутствовал',
  LATE: 'Опоздал',
  EXCUSED: 'Уважительная причина',
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long' }).format(new Date(`${value}T00:00:00`))
}

function age(dateOfBirth: string) {
  const birth = new Date(`${dateOfBirth}T00:00:00`)
  const now = new Date()
  let years = now.getFullYear() - birth.getFullYear()
  if (now.getMonth() < birth.getMonth()
    || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) years -= 1
  return years
}

export function ParentPage() {
  const { account, academies, token } = useAuth()
  const membership = academies.find((academy) => academy.roles.includes('PARENT'))
  const [searchParams, setSearchParams] = useSearchParams()
  const [requestedChildId] = useState(() => searchParams.get('childId') || '')
  const [children, setChildren] = useState<Player[]>([])
  const [childId, setChildId] = useState('')
  const [attendance, setAttendance] = useState<PageResponse<ChildAttendance> | null>(null)
  const [page, setPage] = useState(0)
  const [childrenLoading, setChildrenLoading] = useState(Boolean(membership))
  const [attendanceLoading, setAttendanceLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!membership || !token) return
    let cancelled = false
    getMyChildren(token, membership.academyId, 0, 100)
      .then((result) => {
        if (cancelled) return
        setChildren(result.items)
        const selected = result.items.some((child) => child.id === requestedChildId)
          ? requestedChildId
          : result.items[0]?.id || ''
        setChildId(selected)
        setAttendanceLoading(Boolean(selected))
        if (selected) setSearchParams({ childId: selected }, { replace: true })
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(errorMessage(requestError))
      })
      .finally(() => {
        if (!cancelled) setChildrenLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [membership, requestedChildId, setSearchParams, token])

  useEffect(() => {
    if (!membership || !token || !childId) return
    let cancelled = false
    getChildAttendance(token, membership.academyId, childId, page, PAGE_SIZE)
      .then((result) => {
        if (!cancelled) setAttendance(result)
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(errorMessage(requestError))
      })
      .finally(() => {
        if (!cancelled) setAttendanceLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [childId, membership, page, token])

  const selectedChild = children.find((child) => child.id === childId) || null
  const summary = useMemo(() => {
    const items = attendance?.items || []
    const attended = items.filter((item) => item.status === 'PRESENT' || item.status === 'LATE').length
    return {
      attended,
      missed: items.filter((item) => item.status === 'ABSENT').length,
      excused: items.filter((item) => item.status === 'EXCUSED').length,
      percentage: items.length ? Math.round((attended / items.length) * 100) : 0,
    }
  }, [attendance])

  const selectChild = (nextChildId: string) => {
    setChildId(nextChildId)
    setPage(0)
    setAttendance(null)
    setAttendanceLoading(true)
    setError('')
    setSearchParams({ childId: nextChildId }, { replace: true })
  }

  const selectPage = (nextPage: number) => {
    setPage(nextPage)
    setAttendance(null)
    setAttendanceLoading(true)
    setError('')
  }

  if (!membership || !token) {
    return (
      <section className="centered-page">
        <div className="empty-state">
          <p className="eyebrow">Кабинет родителя</p>
          <h1>Доступ не найден.</h1>
          <p>Администратор академии должен пригласить вас как родителя.</p>
          <Link className="button button--secondary" to="/dashboard">Вернуться в кабинет</Link>
        </div>
      </section>
    )
  }

  const totalPages = attendance ? Math.ceil(attendance.totalElements / attendance.size) : 0

  return (
    <section className="parent-page">
      <div className="parent-hero">
        <div>
          <p className="eyebrow">Кабинет родителя</p>
          <h1>Здравствуйте, {account?.fullName || 'родитель'}.</h1>
          <p>Академия «{membership.academyName}». Здесь доступны данные только ваших детей.</p>
        </div>
        {children.length > 1 && (
          <label className="parent-child-select">
            <span>Ребёнок</span>
            <select value={childId} onChange={(event) => selectChild(event.target.value)}>
              {children.map((child) => <option value={child.id} key={child.id}>{child.fullName}</option>)}
            </select>
          </label>
        )}
      </div>

      {error && <div className="alert alert--error" role="alert">{error}</div>}

      {childrenLoading ? (
        <div className="list-state">Загружаем данные детей…</div>
      ) : !selectedChild ? (
        <div className="list-state">
          <strong>Дети ещё не добавлены</strong>
          <span>Попросите администратора академии связать ребёнка с вашим аккаунтом.</span>
        </div>
      ) : (
        <>
          <div className="child-profile">
            <div className="child-profile__avatar" aria-hidden="true">{selectedChild.fullName.slice(0, 1).toUpperCase()}</div>
            <div className="child-profile__identity">
              <span>Игрок академии</span>
              <h2>{selectedChild.fullName}</h2>
              <p>{age(selectedChild.dateOfBirth)} лет · дата рождения {formatDate(selectedChild.dateOfBirth)}</p>
            </div>
            <div className="child-profile__metric">
              <span>Посещаемость</span>
              <strong>{attendance?.items.length ? `${summary.percentage}%` : '—'}</strong>
              <small>по последним {attendance?.items.length || 0} отметкам</small>
            </div>
          </div>

          <div className="parent-metrics">
            <div><span>Посещено</span><strong>{summary.attended}</strong></div>
            <div><span>Пропущено</span><strong>{summary.missed}</strong></div>
            <div><span>Уважительная</span><strong>{summary.excused}</strong></div>
            <div><span>Всего записей</span><strong>{attendance?.totalElements ?? '—'}</strong></div>
          </div>

          <div className="parent-section-heading">
            <div>
              <p className="eyebrow">История тренировок</p>
              <h2>Посещаемость</h2>
            </div>
          </div>

          {attendanceLoading ? (
            <div className="list-state">Загружаем посещаемость…</div>
          ) : attendance?.items.length ? (
            <div className="parent-attendance-list">
              {attendance.items.map((item) => (
                <article className="parent-attendance-row" key={item.sessionId}>
                  <time dateTime={item.trainingDate}>{formatDate(item.trainingDate)}</time>
                  <div>
                    <strong>{item.groupName}</strong>
                    <span>{item.comment || 'Комментарий не указан'}</span>
                  </div>
                  <span className={`parent-attendance-status parent-attendance-status--${item.status.toLowerCase()}`}>
                    {statusLabels[item.status]}
                  </span>
                </article>
              ))}
            </div>
          ) : (
            <div className="list-state">
              <strong>Отметок пока нет</strong>
              <span>После первой отмеченной тренировки история появится здесь.</span>
            </div>
          )}

          {totalPages > 1 && (
            <nav className="pagination" aria-label="Страницы посещаемости">
              <button className="button button--secondary" type="button" disabled={page === 0 || attendanceLoading} onClick={() => selectPage(page - 1)}>Назад</button>
              <span>Страница {page + 1} из {totalPages}</span>
              <button className="button button--secondary" type="button" disabled={page + 1 >= totalPages || attendanceLoading} onClick={() => selectPage(page + 1)}>Далее</button>
            </nav>
          )}
        </>
      )}
    </section>
  )
}
