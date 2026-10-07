import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { AttendanceStatus } from '../../entities/attendance/model/types'
import {
  getChildAttendance,
  getChildDevelopment,
  getMyChildren,
} from '../../entities/parent/api/parentApi'
import type { ChildAttendance } from '../../entities/parent/model/types'
import type { DevelopmentAssessment } from '../../entities/development/model/types'
import type { Player } from '../../entities/player/model/types'
import { useAuth } from '../../features/auth/model/useAuth'
import { errorMessage } from '../../shared/api/apiClient'
import type { PageResponse } from '../../shared/api/types'
import { useI18n } from '../../shared/i18n/useI18n'

const PAGE_SIZE = 20

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(`${value}T00:00:00`))
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
  const { t, intlLocale } = useI18n()
  const membership = academies.find((academy) => academy.roles.includes('PARENT'))
  const statusLabels: Record<AttendanceStatus, string> = {
    PRESENT: t('attendance.present'),
    ABSENT: t('attendance.absent'),
    LATE: t('attendance.late'),
    EXCUSED: t('attendance.excused'),
  }
  const developmentLabels: Array<[keyof Pick<DevelopmentAssessment,
    'technique' | 'speed' | 'endurance' | 'physicalFitness' | 'gameIntelligence'>, string]> = [
    ['technique', t('development.technique')],
    ['speed', t('development.speed')],
    ['endurance', t('development.endurance')],
    ['physicalFitness', t('development.physicalFitness')],
    ['gameIntelligence', t('development.gameIntelligence')],
  ]
  const [searchParams, setSearchParams] = useSearchParams()
  const [requestedChildId] = useState(() => searchParams.get('childId') || '')
  const [children, setChildren] = useState<Player[]>([])
  const [childId, setChildId] = useState('')
  const [attendance, setAttendance] = useState<PageResponse<ChildAttendance> | null>(null)
  const [development, setDevelopment] = useState<DevelopmentAssessment[]>([])
  const [page, setPage] = useState(0)
  const [childrenLoading, setChildrenLoading] = useState(Boolean(membership))
  const [attendanceLoading, setAttendanceLoading] = useState(false)
  const [developmentLoading, setDevelopmentLoading] = useState(false)
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
        setDevelopmentLoading(Boolean(selected))
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

  useEffect(() => {
    if (!membership || !token || !childId) return
    let cancelled = false
    getChildDevelopment(token, membership.academyId, childId, 0, 100)
      .then((result) => {
        if (!cancelled) setDevelopment(result.items)
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(errorMessage(requestError))
      })
      .finally(() => {
        if (!cancelled) setDevelopmentLoading(false)
      })
    return () => { cancelled = true }
  }, [childId, membership, token])

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
    setDevelopment([])
    setAttendanceLoading(true)
    setDevelopmentLoading(true)
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
          <p className="eyebrow">{t('parent.portal')}</p>
          <h1>{t('parent.noAccess')}</h1>
          <p>{t('parent.noAccessText')}</p>
          <Link className="button button--secondary" to="/dashboard">{t('parent.backDashboard')}</Link>
        </div>
      </section>
    )
  }

  const totalPages = attendance ? Math.ceil(attendance.totalElements / attendance.size) : 0

  return (
    <section className="parent-page">
      <div className="parent-hero">
        <div>
          <p className="eyebrow">{t('parent.portal')}</p>
          <h1>{t('parent.hello', { name: account?.fullName || t('dashboard.parent').toLowerCase() })}</h1>
          <p>{t('parent.academyIntro', { academy: membership.academyName })}</p>
        </div>
        {children.length > 1 && (
          <label className="parent-child-select">
            <span>{t('parent.child')}</span>
            <select value={childId} onChange={(event) => selectChild(event.target.value)}>
              {children.map((child) => <option value={child.id} key={child.id}>{child.fullName}</option>)}
            </select>
          </label>
        )}
      </div>

      {error && <div className="alert alert--error" role="alert">{error}</div>}

      {childrenLoading ? (
        <div className="list-state">{t('parent.loadingChildren')}</div>
      ) : !selectedChild ? (
        <div className="list-state">
          <strong>{t('parent.noChildren')}</strong>
          <span>{t('parent.noChildrenText')}</span>
        </div>
      ) : (
        <>
          <div className="child-profile">
            <div className="child-profile__avatar" aria-hidden="true">{selectedChild.fullName.slice(0, 1).toUpperCase()}</div>
            <div className="child-profile__identity">
              <span>{t('parent.academyPlayer')}</span>
              <h2>{selectedChild.fullName}</h2>
              <p>{t('parent.ageBirth', { age: age(selectedChild.dateOfBirth), date: formatDate(selectedChild.dateOfBirth, intlLocale) })}</p>
            </div>
            <div className="child-profile__metric">
              <span>{t('workspace.attendance')}</span>
              <strong>{attendance?.items.length ? `${summary.percentage}%` : '—'}</strong>
              <small>{t('parent.lastMarks', { count: attendance?.items.length || 0 })}</small>
            </div>
          </div>

          <div className="parent-metrics">
            <div><span>{t('parent.attended')}</span><strong>{summary.attended}</strong></div>
            <div><span>{t('parent.missed')}</span><strong>{summary.missed}</strong></div>
            <div><span>{t('attendance.excused')}</span><strong>{summary.excused}</strong></div>
            <div><span>{t('parent.totalRecords')}</span><strong>{attendance?.totalElements ?? '—'}</strong></div>
          </div>

          <div className="parent-section-heading">
            <div>
              <p className="eyebrow">{t('profile.development')}</p>
              <h2>{t('parent.metrics')}</h2>
            </div>
            {development[0] && <span>{t('parent.latestAssessment', { date: formatDate(development[0].assessmentDate, intlLocale) })}</span>}
          </div>

          {developmentLoading ? (
            <div className="list-state">{t('parent.loadingMetrics')}</div>
          ) : development.length ? (
            <>
              <div className="development-summary development-summary--parent">
                {developmentLabels.map(([key, label]) => (
                  <div key={key}>
                    <span>{label}</span>
                    <strong>{development[0][key].toFixed(1)}</strong>
                    <small>{t('parent.outOfTen')}</small>
                    <span className="parent-development-bar" aria-hidden="true">
                      <i style={{ width: `${development[0][key] * 10}%` }} />
                    </span>
                  </div>
                ))}
              </div>
              <div className="development-history">
                {development.map((assessment) => (
                  <article className="development-record" key={assessment.id}>
                    <div className="development-record__heading">
                      <div><time>{formatDate(assessment.assessmentDate, intlLocale)}</time><span>{t('parent.coach', { name: assessment.createdByName })}</span></div>
                    </div>
                    <div className="development-record__metrics">
                      {developmentLabels.map(([key, label]) => <span key={key}>{label} <strong>{assessment[key].toFixed(1)}</strong></span>)}
                    </div>
                    {assessment.comment && <p>{assessment.comment}</p>}
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="list-state"><strong>{t('parent.noAssessments')}</strong><span>{t('parent.noAssessmentsText')}</span></div>
          )}

          <div className="parent-section-heading">
            <div>
              <p className="eyebrow">{t('parent.trainingHistory')}</p>
              <h2>{t('workspace.attendance')}</h2>
            </div>
          </div>

          {attendanceLoading ? (
            <div className="list-state">{t('parent.loadingAttendance')}</div>
          ) : attendance?.items.length ? (
            <div className="parent-attendance-list">
              {attendance.items.map((item) => (
                <article className="parent-attendance-row" key={item.sessionId}>
                  <time dateTime={item.trainingDate}>{formatDate(item.trainingDate, intlLocale)}</time>
                  <div>
                    <strong>{item.groupName}</strong>
                    <span>{item.comment || t('parent.noComment')}</span>
                  </div>
                  <span className={`parent-attendance-status parent-attendance-status--${item.status.toLowerCase()}`}>
                    {statusLabels[item.status]}
                  </span>
                </article>
              ))}
            </div>
          ) : (
            <div className="list-state">
              <strong>{t('parent.noMarks')}</strong>
              <span>{t('parent.noMarksText')}</span>
            </div>
          )}

          {totalPages > 1 && (
            <nav className="pagination" aria-label={t('parent.attendancePages')}>
              <button className="button button--secondary" type="button" disabled={page === 0 || attendanceLoading} onClick={() => selectPage(page - 1)}>{t('common.back')}</button>
              <span>{t('common.pageOf', { page: page + 1, total: totalPages })}</span>
              <button className="button button--secondary" type="button" disabled={page + 1 >= totalPages || attendanceLoading} onClick={() => selectPage(page + 1)}>{t('common.next')}</button>
            </nav>
          )}
        </>
      )}
    </section>
  )
}
