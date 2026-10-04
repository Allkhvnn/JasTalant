import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAcademyDashboard } from '../../entities/academy/api/academyApi'
import type { AcademyDashboard } from '../../entities/academy/model/types'
import { useAcademy } from '../../entities/academy/model/useAcademy'
import { errorMessage } from '../../shared/api/apiClient'

function formatTrainingDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' })
    .format(new Date(`${value}T00:00:00`))
}

export function AcademyOverviewPage() {
  const { academy, token, academyPath } = useAcademy()
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
          <p className="overview-kicker">Главная</p>
          <h1>Добро пожаловать в {academy.name}!</h1>
          <p>{canManage ? 'Управляйте командой и следите за работой академии.' : 'Ваши группы, тренировки и рабочие задачи на одной странице.'}</p>
        </div>
        <time>{new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}</time>
      </div>

      {error && <div className="alert alert--error" role="alert">{error}</div>}

      <div className="overview-metrics">
        <Link to={academyPath('players')}><span className="overview-metric__icon">♙</span><small>Игроки</small><strong>{stats?.playerCount ?? '—'}</strong><em>Открыть состав</em></Link>
        <Link to={academyPath('groups')}><span className="overview-metric__icon overview-metric__icon--green">◉</span><small>Группы</small><strong>{stats?.groupCount ?? '—'}</strong><em>Все возрастные группы</em></Link>
        <Link to={academyPath(canManage ? 'members' : 'attendance')}><span className="overview-metric__icon overview-metric__icon--orange">♧</span><small>{canManage ? 'Тренеры' : 'Моя роль'}</small><strong>{canManage ? (stats?.activeCoachCount ?? '—') : 'Тренер'}</strong><em>{canManage ? 'Активные специалисты' : 'Назначенные группы и игроки'}</em></Link>
        <Link to={academyPath('schedule')}><span className="overview-metric__icon overview-metric__icon--violet">□</span><small>Тренировки</small><strong>{stats?.upcomingTrainingCount ?? '—'}</strong><em>В ближайшие 7 дней</em></Link>
      </div>

      <div className="overview-grid">
        <section className="overview-panel overview-panel--chart">
          <div className="overview-panel__heading"><div><span>Состав академии</span><h2>Возрастное распределение</h2></div><Link to={academyPath('players')}>Все игроки</Link></div>
          {ageBars.length ? (
            <div className="age-chart" aria-label="Распределение игроков по возрасту">
              {ageBars.map((item) => <div key={item.label}><strong>{item.count}</strong><span style={{ height: `${Math.max(18, item.count / maxAgeCount * 100)}%` }} /><small>{item.label}</small></div>)}
            </div>
          ) : <div className="overview-empty">Добавьте игроков, чтобы увидеть распределение.</div>}
        </section>

        <section className="overview-panel">
          <div className="overview-panel__heading"><div><span>Календарь</span><h2>Ближайшие тренировки</h2></div><Link to={academyPath('schedule')}>Расписание</Link></div>
          <div className="upcoming-list">
            {stats?.upcomingTrainings.length ? stats.upcomingTrainings.map((training) => (
              <article key={training.id}>
                <time><strong>{formatTrainingDate(training.trainingDate)}</strong><span>{training.startTime.slice(0, 5)}</span></time>
                <div><strong>{training.groupName}</strong><span>{training.location || 'Место не указано'} · {training.coachName}</span></div>
              </article>
            )) : <div className="overview-empty">На ближайшую неделю тренировок нет.</div>}
          </div>
        </section>

        <section className="overview-panel overview-panel--attendance">
          <div className="overview-panel__heading">
            <div><span>Последние 30 дней</span><h2>Посещаемость</h2></div>
            <Link to={academyPath('attendance')}>Открыть ведомости</Link>
          </div>
          <div className="attendance-summary">
            <div className="attendance-summary__rate">
              <strong>{stats ? `${stats.attendance.attendanceRate}%` : '—'}</strong>
              <span>присутствовали или опоздали</span>
              <small>{stats?.attendance.recordsMarked ?? 0} отметок в {stats?.attendance.sessionsRecorded ?? 0} ведомостях</small>
            </div>
            <div className="attendance-summary__statuses">
              <div><span className="attendance-dot attendance-dot--present" />Присутствовали<strong>{stats?.attendance.presentCount ?? '—'}</strong></div>
              <div><span className="attendance-dot attendance-dot--late" />Опоздали<strong>{stats?.attendance.lateCount ?? '—'}</strong></div>
              <div><span className="attendance-dot attendance-dot--absent" />Отсутствовали<strong>{stats?.attendance.absentCount ?? '—'}</strong></div>
              <div><span className="attendance-dot attendance-dot--excused" />Уважительная причина<strong>{stats?.attendance.excusedCount ?? '—'}</strong></div>
            </div>
            <div className={`attendance-summary__pending${stats?.attendance.pendingSheets ? ' attendance-summary__pending--warning' : ''}`}>
              <span>Незаполненные ведомости</span>
              <strong>{stats?.attendance.pendingSheets ?? '—'}</strong>
              <p>{stats?.attendance.pendingSheets
                ? 'Проверьте прошедшие тренировки за последние 7 дней.'
                : 'Все прошедшие тренировки за неделю обработаны.'}</p>
              <Link to={academyPath('schedule')}>{stats?.attendance.pendingSheets ? 'Проверить расписание' : 'Открыть расписание'} →</Link>
            </div>
          </div>
        </section>
      </div>

      <section className="overview-quick-actions">
        <div><span>Быстрые действия</span><h2>{canManage ? 'Продолжайте настройку академии' : 'Начните рабочий день'}</h2></div>
        <div>
          <Link className="button" to={academyPath(canManage ? 'players' : 'attendance')}>{canManage ? 'Добавить игрока' : 'Отметить посещаемость'}</Link>
          <Link className="button button--secondary" to={academyPath('schedule')}>Открыть расписание</Link>
        </div>
      </section>
    </div>
  )
}
