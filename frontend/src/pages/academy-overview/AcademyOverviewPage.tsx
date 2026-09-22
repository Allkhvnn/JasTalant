import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAcademy } from '../../entities/academy/model/useAcademy'
import { getGroups } from '../../entities/group/api/groupApi'
import { getAcademyMembers } from '../../entities/membership/api/membershipApi'
import { getPlayers } from '../../entities/player/api/playerApi'
import { getTrainings } from '../../entities/training/api/trainingApi'
import type { ScheduledTraining } from '../../entities/training/model/types'
import { errorMessage } from '../../shared/api/apiClient'

type AcademyStats = {
  groups: number
  players: number
  coaches: number | null
  trainings: number
  birthYears: Map<number, number>
}

function dateValue(offset = 0) {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function formatTrainingDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' })
    .format(new Date(`${value}T00:00:00`))
}

export function AcademyOverviewPage() {
  const { academy, token } = useAcademy()
  const canManage = academy.roles.includes('ADMIN')
  const [stats, setStats] = useState<AcademyStats | null>(null)
  const [trainings, setTrainings] = useState<ScheduledTraining[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([
      getGroups(token, academy.id, 0, 100),
      getPlayers(token, academy.id, 0, 100),
      getTrainings(token, academy.id, dateValue(), dateValue(7)),
      canManage ? getAcademyMembers(token, academy.id, 'COACH') : Promise.resolve(null),
    ])
      .then(([groups, players, upcoming, coaches]) => {
        if (cancelled) return
        const birthYears = new Map<number, number>()
        players.items.forEach((player) => {
          const year = Number(player.dateOfBirth.slice(0, 4))
          birthYears.set(year, (birthYears.get(year) || 0) + 1)
        })
        setStats({
          groups: groups.totalElements,
          players: players.totalElements,
          coaches: coaches?.filter((member) => member.active).length ?? null,
          trainings: upcoming.filter((training) => training.status === 'SCHEDULED').length,
          birthYears,
        })
        setTrainings(upcoming.filter((training) => training.status === 'SCHEDULED').slice(0, 4))
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(errorMessage(requestError))
      })
    return () => { cancelled = true }
  }, [academy.id, canManage, token])

  const ageBars = useMemo(() => {
    if (!stats) return []
    const currentYear = new Date().getFullYear()
    return [...stats.birthYears.entries()]
      .map(([year, count]) => ({ label: `U${currentYear - year}`, count }))
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
        <Link to="/academy/players"><span className="overview-metric__icon">♙</span><small>Игроки</small><strong>{stats?.players ?? '—'}</strong><em>Открыть состав</em></Link>
        <Link to="/academy/groups"><span className="overview-metric__icon overview-metric__icon--green">◉</span><small>Группы</small><strong>{stats?.groups ?? '—'}</strong><em>Все возрастные группы</em></Link>
        <Link to={canManage ? '/academy/members' : '/academy/groups'}><span className="overview-metric__icon overview-metric__icon--orange">♧</span><small>Тренеры</small><strong>{stats?.coaches ?? '—'}</strong><em>{canManage ? 'Активные специалисты' : 'Доступно администратору'}</em></Link>
        <Link to="/academy/schedule"><span className="overview-metric__icon overview-metric__icon--violet">□</span><small>Тренировки</small><strong>{stats?.trainings ?? '—'}</strong><em>В ближайшие 7 дней</em></Link>
      </div>

      <div className="overview-grid">
        <section className="overview-panel overview-panel--chart">
          <div className="overview-panel__heading"><div><span>Состав академии</span><h2>Возрастное распределение</h2></div><Link to="/academy/players">Все игроки</Link></div>
          {ageBars.length ? (
            <div className="age-chart" aria-label="Распределение игроков по возрасту">
              {ageBars.map((item) => <div key={item.label}><strong>{item.count}</strong><span style={{ height: `${Math.max(18, item.count / maxAgeCount * 100)}%` }} /><small>{item.label}</small></div>)}
            </div>
          ) : <div className="overview-empty">Добавьте игроков, чтобы увидеть распределение.</div>}
        </section>

        <section className="overview-panel">
          <div className="overview-panel__heading"><div><span>Календарь</span><h2>Ближайшие тренировки</h2></div><Link to="/academy/schedule">Расписание</Link></div>
          <div className="upcoming-list">
            {trainings.length ? trainings.map((training) => (
              <article key={training.id}>
                <time><strong>{formatTrainingDate(training.trainingDate)}</strong><span>{training.startTime.slice(0, 5)}</span></time>
                <div><strong>{training.groupName}</strong><span>{training.location || 'Место не указано'} · {training.coachName}</span></div>
              </article>
            )) : <div className="overview-empty">На ближайшую неделю тренировок нет.</div>}
          </div>
        </section>
      </div>

      <section className="overview-quick-actions">
        <div><span>Быстрые действия</span><h2>{canManage ? 'Продолжайте настройку академии' : 'Начните рабочий день'}</h2></div>
        <div>
          <Link className="button" to={canManage ? '/academy/players' : '/academy/attendance'}>{canManage ? 'Добавить игрока' : 'Отметить посещаемость'}</Link>
          <Link className="button button--secondary" to="/academy/schedule">Открыть расписание</Link>
        </div>
      </section>
    </div>
  )
}
