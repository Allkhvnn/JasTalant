import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAcademy } from '../../entities/academy/model/useAcademy'
import { getGroups } from '../../entities/group/api/groupApi'
import { getPlayers } from '../../entities/player/api/playerApi'
import { errorMessage } from '../../shared/api/apiClient'

type AcademyStats = {
  groups: number
  players: number
}

export function AcademyOverviewPage() {
  const { academy, token } = useAcademy()
  const [stats, setStats] = useState<AcademyStats | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([
      getGroups(token, academy.id, 0, 1),
      getPlayers(token, academy.id, 0, 1),
    ])
      .then(([groups, players]) => {
        if (!cancelled) setStats({ groups: groups.totalElements, players: players.totalElements })
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(errorMessage(requestError))
      })

    return () => {
      cancelled = true
    }
  }, [academy.id, token])

  return (
    <div className="workspace-page">
      <div className="workspace-heading">
        <div>
          <p className="eyebrow">Рабочее пространство</p>
          <h1>{academy.name}</h1>
          <p>Настройте структуру академии перед приглашением тренеров и родителей.</p>
        </div>
      </div>

      {error && <div className="alert alert--error" role="alert">{error}</div>}

      <div className="metric-grid">
        <Link className="metric-card" to="/academy/groups">
          <span>Группы</span>
          <strong>{stats?.groups ?? '—'}</strong>
          <small>Настроить группы →</small>
        </Link>
        <Link className="metric-card" to="/academy/players">
          <span>Игроки</span>
          <strong>{stats?.players ?? '—'}</strong>
          <small>Открыть состав →</small>
        </Link>
        <div className="metric-card metric-card--muted">
          <span>Роль</span>
          <strong>ADMIN</strong>
          <small>Управление академией</small>
        </div>
      </div>

      <div className="setup-card">
        <div>
          <p className="eyebrow">Быстрый старт</p>
          <h2>Сначала создайте группы, затем добавьте игроков.</h2>
          <p>После формирования состава можно будет приглашать тренеров и назначать их на группы.</p>
        </div>
        <Link className="button" to="/academy/groups">Создать первую группу</Link>
      </div>
    </div>
  )
}
