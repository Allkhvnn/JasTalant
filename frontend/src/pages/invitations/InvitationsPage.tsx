import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useAcademy } from '../../entities/academy/model/useAcademy'
import {
  createInvitation,
  getInvitations,
  revokeInvitation,
} from '../../entities/invitation/api/invitationApi'
import type { Invitation, InvitableRole } from '../../entities/invitation/model/types'
import { getPlayers } from '../../entities/player/api/playerApi'
import type { Player } from '../../entities/player/model/types'
import { errorMessage } from '../../shared/api/apiClient'
import type { PageResponse } from '../../shared/api/types'

const PAGE_SIZE = 20
const roleLabels: Record<InvitableRole, string> = {
  COACH: 'Тренер',
  PARENT: 'Родитель',
}

async function getAllPlayers(token: string, academyId: string) {
  const firstPage = await getPlayers(token, academyId, 0, 100)
  const pageCount = Math.ceil(firstPage.totalElements / firstPage.size)
  if (pageCount <= 1) return firstPage.items
  const rest = await Promise.all(
    Array.from({ length: pageCount - 1 }, (_, index) => getPlayers(token, academyId, index + 1, 100)),
  )
  return [firstPage, ...rest].flatMap((page) => page.items)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function invitationState(invitation: Invitation) {
  if (invitation.status === 'PENDING' && invitation.expired) {
    return { label: 'Истекло', className: 'expired' }
  }
  const states = {
    PENDING: { label: 'Ожидает', className: 'pending' },
    ACCEPTED: { label: 'Принято', className: 'accepted' },
    REVOKED: { label: 'Отозвано', className: 'revoked' },
  }
  return states[invitation.status]
}

export function InvitationsPage() {
  const { academy, token } = useAcademy()
  const [result, setResult] = useState<PageResponse<Invitation> | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [roles, setRoles] = useState<InvitableRole[]>(['COACH'])
  const [playerIds, setPlayerIds] = useState<string[]>([])
  const [actionId, setActionId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([
      getInvitations(token, academy.id, page, PAGE_SIZE),
      getAllPlayers(token, academy.id),
    ])
      .then(([nextResult, nextPlayers]) => {
        if (!cancelled) {
          setResult(nextResult)
          setPlayers(nextPlayers)
        }
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
  }, [academy.id, page, reloadKey, token])

  useEffect(() => {
    if (!dialogOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !actionId) setDialogOpen(false)
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [actionId, dialogOpen])

  const playerNames = useMemo(
    () => new Map(players.map((player) => [player.id, player.fullName])),
    [players],
  )

  const reload = () => {
    setLoading(true)
    setResult(null)
    setReloadKey((current) => current + 1)
  }

  const openDialog = () => {
    setRoles(['COACH'])
    setPlayerIds([])
    setError('')
    setDialogOpen(true)
  }

  const toggleRole = (role: InvitableRole) => {
    setRoles((current) => current.includes(role)
      ? current.filter((item) => item !== role)
      : [...current, role])
    if (role === 'PARENT' && roles.includes('PARENT')) setPlayerIds([])
  }

  const togglePlayer = (playerId: string) => {
    setPlayerIds((current) => current.includes(playerId)
      ? current.filter((id) => id !== playerId)
      : [...current, playerId])
  }

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    if (!roles.length) {
      setError('Выберите хотя бы одну роль.')
      return
    }
    if (roles.includes('PARENT') && !playerIds.length) {
      setError('Выберите ребёнка для родителя.')
      return
    }
    setActionId('new')
    setError('')
    setNotice('')
    try {
      await createInvitation(token, academy.id, {
        email: String(data.get('email')).trim(),
        roles,
        playerIds: roles.includes('PARENT') ? playerIds : [],
      })
      setDialogOpen(false)
      setNotice('Приглашение отправлено. Локально письмо можно открыть в Mailpit.')
      reload()
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setActionId(null)
    }
  }

  const handleRevoke = async (invitation: Invitation) => {
    if (!window.confirm(`Отозвать приглашение для ${invitation.email}?`)) return
    setActionId(invitation.id)
    setError('')
    setNotice('')
    try {
      await revokeInvitation(token, academy.id, invitation.id)
      setNotice(`Приглашение для ${invitation.email} отозвано.`)
      reload()
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setActionId(null)
    }
  }

  const totalPages = result ? Math.ceil(result.totalElements / result.size) : 0

  return (
    <div className="workspace-page">
      <div className="workspace-heading workspace-heading--actions">
        <div>
          <p className="eyebrow">Доступ к академии</p>
          <h1>Приглашения</h1>
          <p>Приглашайте тренеров и родителей. Родителя можно сразу связать с одним или несколькими игроками.</p>
        </div>
        <button className="button" type="button" onClick={openDialog}>Новое приглашение</button>
      </div>

      {error && <div className="alert alert--error" role="alert">{error}</div>}
      {notice && <div className="alert alert--success" role="status">{notice}</div>}

      {loading ? (
        <div className="list-state">Загружаем приглашения…</div>
      ) : result?.items.length ? (
        <div className="management-list">
          {result.items.map((invitation) => {
            const state = invitationState(invitation)
            const invitedPlayers = invitation.playerIds
              .map((id) => playerNames.get(id))
              .filter(Boolean)
            return (
              <article className="management-card invitation-card" key={invitation.id}>
                <div className="management-card__mark" aria-hidden="true">@</div>
                <div className="management-card__body">
                  <div className="invitation-card__heading">
                    <span className={`status-pill status-pill--${state.className}`}>{state.label}</span>
                    <span>{invitation.roles.map((role) => roleLabels[role]).join(' · ')}</span>
                  </div>
                  <h2>{invitation.email}</h2>
                  <p>
                    {invitedPlayers.length ? `Игроки: ${invitedPlayers.join(', ')} · ` : ''}
                    Действует до {formatDate(invitation.expiresAt)}
                  </p>
                </div>
                <div className="management-card__actions">
                  {invitation.status === 'PENDING' && (
                    <button
                      className="button button--danger button--small"
                      type="button"
                      disabled={Boolean(actionId)}
                      onClick={() => void handleRevoke(invitation)}
                    >
                      Отозвать
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="list-state">
          <strong>Приглашений пока нет</strong>
          <span>Отправьте первое приглашение тренеру или родителю.</span>
          <button className="button" type="button" onClick={openDialog}>Пригласить</button>
        </div>
      )}

      {totalPages > 1 && (
        <nav className="pagination" aria-label="Страницы приглашений">
          <button className="button button--secondary" type="button" disabled={page === 0 || loading} onClick={() => setPage(page - 1)}>Назад</button>
          <span>Страница {page + 1} из {totalPages}</span>
          <button className="button button--secondary" type="button" disabled={page + 1 >= totalPages || loading} onClick={() => setPage(page + 1)}>Далее</button>
        </nav>
      )}

      {dialogOpen && (
        <div
          className="dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !actionId) setDialogOpen(false)
          }}
        >
          <div className="dialog dialog--wide" role="dialog" aria-modal="true" aria-labelledby="invitation-dialog-title">
            <div className="dialog__heading">
              <div>
                <p className="eyebrow">Новый участник</p>
                <h2 id="invitation-dialog-title">Отправить приглашение</h2>
              </div>
              <button className="dialog__close" type="button" aria-label="Закрыть" onClick={() => setDialogOpen(false)}>×</button>
            </div>
            <form onSubmit={handleCreate}>
              {error && <div className="alert alert--error" role="alert">{error}</div>}
              <label className="field">
                <span>Email получателя</span>
                <input name="email" type="email" autoComplete="email" maxLength={254} required autoFocus />
              </label>

              <div className="form-divider"><span>Роли</span></div>
              <div className="choice-grid">
                {(['COACH', 'PARENT'] as const).map((role) => (
                  <label className={roles.includes(role) ? 'choice-card choice-card--selected' : 'choice-card'} key={role}>
                    <input type="checkbox" checked={roles.includes(role)} onChange={() => toggleRole(role)} />
                    <span>
                      <strong>{roleLabels[role]}</strong>
                      <small>{role === 'COACH' ? 'Отмечает посещаемость своих групп' : 'Просматривает данные своего ребёнка'}</small>
                    </span>
                  </label>
                ))}
              </div>

              {roles.includes('PARENT') && (
                <>
                  <div className="form-divider"><span>Дети родителя</span></div>
                  {players.length ? (
                    <div className="player-choice-list">
                      {players.map((player) => (
                        <label className={playerIds.includes(player.id) ? 'player-choice player-choice--selected' : 'player-choice'} key={player.id}>
                          <input type="checkbox" checked={playerIds.includes(player.id)} onChange={() => togglePlayer(player.id)} />
                          <span>{player.fullName}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="inline-note">Сначала добавьте игрока, чтобы пригласить родителя.</div>
                  )}
                </>
              )}

              <div className="dialog__actions">
                <button className="button button--secondary" type="button" onClick={() => setDialogOpen(false)}>Отмена</button>
                <button className="button" type="submit" disabled={Boolean(actionId)}>
                  {actionId ? 'Отправляем…' : 'Отправить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
