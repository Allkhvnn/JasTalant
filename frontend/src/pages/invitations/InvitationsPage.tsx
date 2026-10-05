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
import { useI18n } from '../../shared/i18n/useI18n'

const PAGE_SIZE = 20

async function getAllPlayers(token: string, academyId: string) {
  const firstPage = await getPlayers(token, academyId, 0, 100)
  const pageCount = Math.ceil(firstPage.totalElements / firstPage.size)
  if (pageCount <= 1) return firstPage.items
  const rest = await Promise.all(
    Array.from({ length: pageCount - 1 }, (_, index) => getPlayers(token, academyId, index + 1, 100)),
  )
  return [firstPage, ...rest].flatMap((page) => page.items)
}

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function invitationState(invitation: Invitation) {
  if (invitation.status === 'PENDING' && invitation.expired) {
    return { label: 'invitations.expired', className: 'expired' }
  }
  const states = {
    PENDING: { label: 'invitations.pending', className: 'pending' },
    ACCEPTED: { label: 'invitations.accepted', className: 'accepted' },
    REVOKED: { label: 'invitations.revoked', className: 'revoked' },
  }
  return states[invitation.status]
}

export function InvitationsPage() {
  const { academy, token } = useAcademy()
  const { t, intlLocale } = useI18n()
  const roleLabels: Record<InvitableRole, string> = { COACH: t('dashboard.coach'), PARENT: t('dashboard.parent') }
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
      setError(t('invitations.roleRequired'))
      return
    }
    if (roles.includes('PARENT') && !playerIds.length) {
      setError(t('invitations.childRequired'))
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
      setNotice(t('invitations.sent'))
      reload()
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setActionId(null)
    }
  }

  const handleRevoke = async (invitation: Invitation) => {
    if (!window.confirm(t('invitations.revokeConfirm', { email: invitation.email }))) return
    setActionId(invitation.id)
    setError('')
    setNotice('')
    try {
      await revokeInvitation(token, academy.id, invitation.id)
      setNotice(t('invitations.revokedNotice', { email: invitation.email }))
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
          <p className="eyebrow">{t('members.access')}</p>
          <h1>{t('academy.nav.invitations')}</h1>
          <p>{t('invitations.intro')}</p>
        </div>
        <button className="button" type="button" onClick={openDialog}>{t('invitations.new')}</button>
      </div>

      {error && <div className="alert alert--error" role="alert">{error}</div>}
      {notice && <div className="alert alert--success" role="status">{notice}</div>}

      {loading ? (
        <div className="list-state">{t('invitations.loading')}</div>
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
                    <span className={`status-pill status-pill--${state.className}`}>{t(state.label)}</span>
                    <span>{invitation.roles.map((role) => roleLabels[role]).join(' · ')}</span>
                  </div>
                  <h2>{invitation.email}</h2>
                  <p>
                    {invitedPlayers.length ? t('invitations.players', { names: invitedPlayers.join(', ') }) : ''}
                    {t('invitations.validUntil', { date: formatDate(invitation.expiresAt, intlLocale) })}
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
                      {t('invitations.revoke')}
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="list-state">
          <strong>{t('invitations.empty')}</strong>
          <span>{t('invitations.emptyText')}</span>
          <button className="button" type="button" onClick={openDialog}>{t('invitations.invite')}</button>
        </div>
      )}

      {totalPages > 1 && (
        <nav className="pagination" aria-label={t('invitations.pages')}>
          <button className="button button--secondary" type="button" disabled={page === 0 || loading} onClick={() => setPage(page - 1)}>{t('common.back')}</button>
          <span>{t('common.pageOf', { page: page + 1, total: totalPages })}</span>
          <button className="button button--secondary" type="button" disabled={page + 1 >= totalPages || loading} onClick={() => setPage(page + 1)}>{t('common.next')}</button>
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
                <p className="eyebrow">{t('invitations.newMember')}</p>
                <h2 id="invitation-dialog-title">{t('invitations.sendTitle')}</h2>
              </div>
              <button className="dialog__close" type="button" aria-label={t('common.close')} onClick={() => setDialogOpen(false)}>×</button>
            </div>
            <form onSubmit={handleCreate}>
              {error && <div className="alert alert--error" role="alert">{error}</div>}
              <label className="field">
                <span>{t('invitations.email')}</span>
                <input name="email" type="email" autoComplete="email" maxLength={254} required autoFocus />
              </label>

              <div className="form-divider"><span>{t('members.roles')}</span></div>
              <div className="choice-grid">
                {(['COACH', 'PARENT'] as const).map((role) => (
                  <label className={roles.includes(role) ? 'choice-card choice-card--selected' : 'choice-card'} key={role}>
                    <input type="checkbox" checked={roles.includes(role)} onChange={() => toggleRole(role)} />
                    <span>
                      <strong>{roleLabels[role]}</strong>
                      <small>{t(role === 'COACH' ? 'invitations.coachScope' : 'invitations.parentScope')}</small>
                    </span>
                  </label>
                ))}
              </div>

              {roles.includes('PARENT') && (
                <>
                  <div className="form-divider"><span>{t('invitations.children')}</span></div>
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
                    <div className="inline-note">{t('invitations.addPlayerFirst')}</div>
                  )}
                </>
              )}

              <div className="dialog__actions">
                <button className="button button--secondary" type="button" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</button>
                <button className="button" type="submit" disabled={Boolean(actionId)}>
                  {t(actionId ? 'invitations.sending' : 'invitations.send')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
