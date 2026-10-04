import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAcademyDashboard } from '../../entities/academy/api/academyApi'
import type { AcademyDashboard } from '../../entities/academy/model/types'
import { useAcademy } from '../../entities/academy/model/useAcademy'
import { errorMessage } from '../../shared/api/apiClient'
import { useI18n } from '../../shared/i18n/useI18n'

function formatTrainingDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' })
    .format(new Date(`${value}T00:00:00`))
}

export function AcademyOverviewPage() {
  const { academy, token, academyPath } = useAcademy()
  const { t, intlLocale } = useI18n()
  const canManage = academy.roles.includes('ADMIN')
  const [stats, setStats] = useState<AcademyDashboard | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    getAcademyDashboard(token, academy.id)
      .then((dashboard) => { if (!cancelled) setStats(dashboard) })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(errorMessage(requestError))
      })
    return () => { cancelled = true }
  }, [academy.id, token])

  const ageBars = useMemo(() => {
    if (!stats) return []
    const currentYear = new Date().getFullYear()
    return stats.ageDistribution
      .map((item) => ({ label: `U${currentYear - item.birthYear}`, count: item.playerCount }))
      .sort((first, second) => first.label.localeCompare(second.label))
      .slice(0, 7)
  }, [stats])
  const maxAgeCount = Math.max(1, ...ageBars.map((item) => item.count))

  return (
    <div className="workspace-page overview-page">
      <div className="overview-heading">
        <div>
          <p className="overview-kicker">{t('overview.home')}</p>
          <h1>{t('overview.welcome', { academy: academy.name })}</h1>
          <p>{t(canManage ? 'overview.adminIntro' : 'overview.coachIntro')}</p>
        </div>
        <time>{new Intl.DateTimeFormat(intlLocale, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}</time>
      </div>

      {error && <div className="alert alert--error" role="alert">{error}</div>}

      <div className="overview-metrics">
        <Link to={academyPath('players')}><span className="overview-metric__icon">♙</span><small>{t('dashboard.players')}</small><strong>{stats?.playerCount ?? '—'}</strong><em>{t('overview.openRoster')}</em></Link>
        <Link to={academyPath('groups')}><span className="overview-metric__icon overview-metric__icon--green">◉</span><small>{t('dashboard.groups')}</small><strong>{stats?.groupCount ?? '—'}</strong><em>{t('overview.allGroups')}</em></Link>
        <Link to={academyPath(canManage ? 'members' : 'attendance')}><span className="overview-metric__icon overview-metric__icon--orange">♧</span><small>{t(canManage ? 'dashboard.coaches' : 'overview.myRole')}</small><strong>{canManage ? (stats?.activeCoachCount ?? '—') : t('dashboard.coach')}</strong><em>{t(canManage ? 'overview.activeSpecialists' : 'overview.assignedScope')}</em></Link>
        <Link to={academyPath('schedule')}><span className="overview-metric__icon overview-metric__icon--violet">□</span><small>{t('dashboard.schedule')}</small><strong>{stats?.upcomingTrainingCount ?? '—'}</strong><em>{t('overview.next7')}</em></Link>
      </div>

      <div className="overview-grid">
        <section className="overview-panel overview-panel--chart">
          <div className="overview-panel__heading"><div><span>{t('overview.roster')}</span><h2>{t('overview.ageDistribution')}</h2></div><Link to={academyPath('players')}>{t('overview.allPlayers')}</Link></div>
          {ageBars.length ? (
            <div className="age-chart" aria-label={t('overview.ageDistribution')}>
              {ageBars.map((item) => <div key={item.label}><strong>{item.count}</strong><span style={{ height: `${Math.max(18, item.count / maxAgeCount * 100)}%` }} /><small>{item.label}</small></div>)}
            </div>
          ) : <div className="overview-empty">{t('overview.noPlayers')}</div>}
        </section>

        <section className="overview-panel">
          <div className="overview-panel__heading"><div><span>{t('overview.calendar')}</span><h2>{t('overview.upcoming')}</h2></div><Link to={academyPath('schedule')}>{t('dashboard.schedule')}</Link></div>
          <div className="upcoming-list">
            {stats?.upcomingTrainings.length ? stats.upcomingTrainings.map((training) => (
              <article key={training.id}>
                <time><strong>{formatTrainingDate(training.trainingDate, intlLocale)}</strong><span>{training.startTime.slice(0, 5)}</span></time>
                <div><strong>{training.groupName}</strong><span>{training.location || t('overview.noLocation')} · {training.coachName}</span></div>
              </article>
            )) : <div className="overview-empty">{t('overview.noTrainings')}</div>}
          </div>
        </section>

        <section className="overview-panel overview-panel--attendance">
          <div className="overview-panel__heading">
            <div><span>{t('overview.last30')}</span><h2>{t('dashboard.attendance')}</h2></div>
            <Link to={academyPath('attendance')}>{t('overview.openSheets')}</Link>
          </div>
          <div className="attendance-summary">
            <div className="attendance-summary__rate">
              <strong>{stats ? `${stats.attendance.attendanceRate}%` : '—'}</strong>
              <span>{t('overview.rateCaption')}</span>
              <small>{t('overview.marksInSheets', { marks: stats?.attendance.recordsMarked ?? 0, sheets: stats?.attendance.sessionsRecorded ?? 0 })}</small>
            </div>
            <div className="attendance-summary__statuses">
              <div><span className="attendance-dot attendance-dot--present" />{t('overview.present')}<strong>{stats?.attendance.presentCount ?? '—'}</strong></div>
              <div><span className="attendance-dot attendance-dot--late" />{t('overview.late')}<strong>{stats?.attendance.lateCount ?? '—'}</strong></div>
              <div><span className="attendance-dot attendance-dot--absent" />{t('overview.absent')}<strong>{stats?.attendance.absentCount ?? '—'}</strong></div>
              <div><span className="attendance-dot attendance-dot--excused" />{t('overview.excused')}<strong>{stats?.attendance.excusedCount ?? '—'}</strong></div>
            </div>
            <div className={`attendance-summary__pending${stats?.attendance.pendingSheets ? ' attendance-summary__pending--warning' : ''}`}>
              <span>{t('overview.pending')}</span>
              <strong>{stats?.attendance.pendingSheets ?? '—'}</strong>
              <p>{stats?.attendance.pendingSheets
                ? t('overview.pendingText')
                : t('overview.pendingDone')}</p>
              <Link to={academyPath('schedule')}>{t(stats?.attendance.pendingSheets ? 'overview.checkSchedule' : 'overview.openSchedule')} →</Link>
            </div>
          </div>
        </section>
      </div>

      <section className="overview-quick-actions">
        <div><span>{t('overview.quickActions')}</span><h2>{t(canManage ? 'overview.adminQuickTitle' : 'overview.coachQuickTitle')}</h2></div>
        <div>
          <Link className="button" to={academyPath(canManage ? 'players' : 'attendance')}>{t(canManage ? 'overview.addPlayer' : 'overview.markAttendance')}</Link>
          <Link className="button button--secondary" to={academyPath('schedule')}>{t('overview.openSchedule')}</Link>
        </div>
      </section>
    </div>
  )
}
