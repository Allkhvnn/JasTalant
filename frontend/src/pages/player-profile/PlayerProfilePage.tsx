import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAcademy } from '../../entities/academy/model/useAcademy'
import { getDevelopmentAssessments } from '../../entities/development/api/developmentApi'
import type { DevelopmentAssessment } from '../../entities/development/model/types'
import { getGroups } from '../../entities/group/api/groupApi'
import { getPlayer } from '../../entities/player/api/playerApi'
import type { Player } from '../../entities/player/model/types'
import { errorMessage } from '../../shared/api/apiClient'

const metrics: Array<[keyof Pick<DevelopmentAssessment,
  'technique' | 'speed' | 'endurance' | 'physicalFitness' | 'gameIntelligence'>, string]> = [
  ['technique', 'Техника'],
  ['speed', 'Скорость'],
  ['endurance', 'Выносливость'],
  ['physicalFitness', 'Физическая форма'],
  ['gameIntelligence', 'Игровой интеллект'],
]

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    .format(new Date(`${value}T00:00:00`))
}

function ageFrom(value: string) {
  const birthDate = new Date(`${value}T00:00:00`)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const beforeBirthday = today.getMonth() < birthDate.getMonth()
    || (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())
  if (beforeBirthday) age -= 1
  return age
}

export function PlayerProfilePage() {
  const { playerId = '' } = useParams()
  const { academy, token } = useAcademy()
  const [player, setPlayer] = useState<Player | null>(null)
  const [groupName, setGroupName] = useState('Группа не указана')
  const [latestAssessment, setLatestAssessment] = useState<DevelopmentAssessment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([
      getPlayer(token, academy.id, playerId),
      getGroups(token, academy.id, 0, 100),
      getDevelopmentAssessments(token, academy.id, playerId, 0, 1),
    ])
      .then(([nextPlayer, groups, assessments]) => {
        if (cancelled) return
        setPlayer(nextPlayer)
        setGroupName(groups.items.find((group) => group.id === nextPlayer.groupId)?.name || 'Группа не указана')
        setLatestAssessment(assessments.items[0] || null)
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(errorMessage(requestError))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [academy.id, playerId, token])

  const average = useMemo(() => latestAssessment
    ? metrics.reduce((sum, [key]) => sum + latestAssessment[key], 0) / metrics.length
    : null, [latestAssessment])

  if (loading) return <div className="workspace-page"><div className="list-state">Загружаем профиль игрока…</div></div>

  if (error || !player) {
    return (
      <div className="workspace-page">
        <div className="alert alert--error" role="alert">{error || 'Игрок не найден.'}</div>
        <Link className="button button--secondary" to="/academy/players">Вернуться к игрокам</Link>
      </div>
    )
  }

  return (
    <div className="workspace-page player-profile-page">
      <Link className="profile-back" to="/academy/players">← Все игроки</Link>

      <section className="player-profile-hero">
        <span className="player-profile-hero__avatar" aria-hidden="true">{player.fullName.slice(0, 1).toUpperCase()}</span>
        <div className="player-profile-hero__identity">
          <p className="eyebrow">Профиль игрока</p>
          <h1>{player.fullName}</h1>
          <div><span>{academy.name}</span><span>{groupName}</span><span>{ageFrom(player.dateOfBirth)} лет</span></div>
        </div>
        <Link className="button" to={`/academy/development?playerId=${player.id}`}>Открыть показатели</Link>
      </section>

      <div className="player-profile-grid">
        <section className="profile-panel">
          <div className="profile-panel__heading"><div><span>Карточка игрока</span><h2>Основные данные</h2></div></div>
          <dl className="profile-details">
            <div><dt>Дата рождения</dt><dd>{formatDate(player.dateOfBirth)}</dd></div>
            <div><dt>Группа</dt><dd>{groupName}</dd></div>
            <div><dt>Родитель</dt><dd>{player.parentName || 'Не указан'}</dd></div>
            <div><dt>Телефон</dt><dd>{player.parentPhone || 'Не указан'}</dd></div>
            <div><dt>Email родителя</dt><dd>{player.parentEmail || 'Не указан'}</dd></div>
          </dl>
        </section>

        <section className="profile-panel">
          <div className="profile-panel__heading">
            <div><span>Последняя оценка</span><h2>Развитие игрока</h2></div>
            {latestAssessment && <strong>{average?.toFixed(1)} / 10</strong>}
          </div>
          {latestAssessment ? (
            <>
              <div className="profile-metrics">
                {metrics.map(([key, label]) => (
                  <div key={key}>
                    <div><span>{label}</span><strong>{latestAssessment[key]}</strong></div>
                    <span><i style={{ width: `${latestAssessment[key] * 10}%` }} /></span>
                  </div>
                ))}
              </div>
              <p className="profile-assessment-note">
                Оценка от {formatDate(latestAssessment.assessmentDate)} · {latestAssessment.createdByName}
              </p>
            </>
          ) : (
            <div className="profile-empty">
              <p>Для игрока ещё нет оценок развития.</p>
              <Link to={`/academy/development?playerId=${player.id}`}>Добавить первую оценку</Link>
            </div>
          )}
        </section>
      </div>

      {latestAssessment?.comment && (
        <section className="profile-panel profile-comment">
          <span>Комментарий тренера</span>
          <blockquote>{latestAssessment.comment}</blockquote>
        </section>
      )}
    </div>
  )
}
