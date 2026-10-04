import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAcademy } from '../../entities/academy/model/useAcademy'
import {
  assignGroupCoach,
  createGroup,
  deleteGroup,
  getGroupCoaches,
  getGroups,
  unassignGroupCoach,
  updateGroup,
} from '../../entities/group/api/groupApi'
import type { AcademyGroup, GroupCoach, GroupPayload } from '../../entities/group/model/types'
import { getAcademyMembers } from '../../entities/membership/api/membershipApi'
import type { AcademyMember } from '../../entities/membership/model/types'
import { errorMessage } from '../../shared/api/apiClient'
import type { PageResponse } from '../../shared/api/types'
import { useI18n } from '../../shared/i18n/useI18n'

const PAGE_SIZE = 20

export function GroupsPage() {
  const { academy, token, academyPath } = useAcademy()
  const { t } = useI18n()
  const canManage = academy.roles.includes('ADMIN')
  const [result, setResult] = useState<PageResponse<AcademyGroup> | null>(null)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)
  const [editor, setEditor] = useState<AcademyGroup | 'new' | null>(null)
  const [coachEditor, setCoachEditor] = useState<AcademyGroup | null>(null)
  const [coaches, setCoaches] = useState<AcademyMember[]>([])
  const [assignedCoaches, setAssignedCoaches] = useState<GroupCoach[]>([])
  const [coachesLoading, setCoachesLoading] = useState(false)
  const [coachActionId, setCoachActionId] = useState<string | null>(null)
  const [actionId, setActionId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([
      getGroups(token, academy.id, page, PAGE_SIZE),
      canManage ? getAcademyMembers(token, academy.id, 'COACH') : Promise.resolve([]),
    ])
      .then(([nextResult, nextCoaches]) => {
        if (!cancelled) {
          setResult(nextResult)
          setCoaches(nextCoaches)
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
  }, [academy.id, canManage, page, reloadKey, token])

  useEffect(() => {
    if (!editor) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !actionId) setEditor(null)
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [actionId, editor])

  useEffect(() => {
    if (!coachEditor) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !coachActionId) setCoachEditor(null)
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [coachActionId, coachEditor])

  const reload = () => {
    setLoading(true)
    setResult(null)
    setReloadKey((current) => current + 1)
  }

  const selectPage = (nextPage: number) => {
    setPage(nextPage)
    setError('')
    reload()
  }

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editor) return
    const data = new FormData(event.currentTarget)
    const payload: GroupPayload = {
      name: String(data.get('name')).trim(),
      ageCategory: String(data.get('ageCategory')).trim(),
    }
    const currentEditor = editor
    setActionId(currentEditor === 'new' ? 'new' : currentEditor.id)
    setError('')
    setNotice('')

    try {
      if (currentEditor === 'new') {
        await createGroup(token, academy.id, payload)
        setNotice(t('groups.created', { name: payload.name }))
      } else {
        await updateGroup(token, academy.id, currentEditor, payload)
        setNotice(t('groups.updated', { name: payload.name }))
      }
      setEditor(null)
      reload()
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setActionId(null)
    }
  }

  const handleDelete = async (group: AcademyGroup) => {
    const confirmed = window.confirm(
      t('groups.deleteConfirm', { name: group.name }),
    )
    if (!confirmed) return

    setActionId(group.id)
    setError('')
    setNotice('')
    try {
      await deleteGroup(token, academy.id, group.id)
      setNotice(t('groups.deleted', { name: group.name }))
      if (result?.items.length === 1 && page > 0) {
        selectPage(page - 1)
      } else {
        reload()
      }
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setActionId(null)
    }
  }

  const openCoachEditor = async (group: AcademyGroup) => {
    setCoachEditor(group)
    setAssignedCoaches([])
    setCoachesLoading(true)
    setError('')
    setNotice('')
    try {
      setAssignedCoaches(await getGroupCoaches(token, academy.id, group.id))
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setCoachesLoading(false)
    }
  }

  const handleCoachToggle = async (coach: AcademyMember) => {
    if (!coachEditor) return
    const assigned = assignedCoaches.some((item) => item.userId === coach.userId)
    setCoachActionId(coach.userId)
    setError('')
    setNotice('')
    try {
      if (assigned) {
        await unassignGroupCoach(token, academy.id, coachEditor.id, coach.userId)
        setAssignedCoaches((current) => current.filter((item) => item.userId !== coach.userId))
        setNotice(t('groups.coachRemoved', { coach: coach.fullName, group: coachEditor.name }))
      } else {
        await assignGroupCoach(token, academy.id, coachEditor.id, coach.userId)
        setAssignedCoaches((current) => [...current, { userId: coach.userId, fullName: coach.fullName }])
        setNotice(t('groups.coachAssigned', { coach: coach.fullName, group: coachEditor.name }))
      }
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setCoachActionId(null)
    }
  }

  const totalPages = result ? Math.ceil(result.totalElements / result.size) : 0

  return (
    <div className="workspace-page">
      <div className="workspace-heading workspace-heading--actions">
        <div>
          <p className="eyebrow">{t('groups.eyebrow')}</p>
          <h1>{t('dashboard.groups')}</h1>
          <p>{t('groups.intro')}</p>
        </div>
        {canManage && (
          <button className="button" type="button" onClick={() => setEditor('new')}>
            {t('groups.add')}
          </button>
        )}
      </div>

      {error && <div className="alert alert--error" role="alert">{error}</div>}
      {notice && <div className="alert alert--success" role="status">{notice}</div>}

      {loading ? (
        <div className="list-state">{t('groups.loading')}</div>
      ) : result?.items.length ? (
        <div className="management-list">
          {result.items.map((group) => (
            <article className="management-card" key={group.id}>
              <div className="management-card__mark">{group.ageCategory}</div>
              <div className="management-card__body">
                <span>{t('groups.footballGroup')}</span>
                <h2>{group.name}</h2>
                <p>{t('groups.category', { category: group.ageCategory })}</p>
              </div>
              <div className="management-card__actions">
                <Link className="button button--secondary button--small" to={`${academyPath('attendance')}?groupId=${group.id}`}>
                  {t('dashboard.attendance')}
                </Link>
                {canManage && (
                  <>
                    <button
                      className="button button--secondary button--small"
                      type="button"
                      disabled={Boolean(actionId)}
                      onClick={() => void openCoachEditor(group)}
                    >
                      {t('dashboard.coaches')}
                    </button>
                    <button
                      className="button button--secondary button--small"
                      type="button"
                      disabled={Boolean(actionId)}
                      onClick={() => setEditor(group)}
                    >
                      {t('common.edit')}
                    </button>
                    <button
                      className="icon-button icon-button--danger"
                      type="button"
                      aria-label={`${t('common.delete')} ${group.name}`}
                      disabled={Boolean(actionId)}
                      onClick={() => void handleDelete(group)}
                    >
                      ×
                    </button>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="list-state">
          <strong>{t(canManage ? 'groups.emptyAdmin' : 'groups.emptyCoach')}</strong>
          <span>{canManage
            ? t('groups.emptyAdminText')
            : t('groups.emptyCoachText')}</span>
          {canManage && <button className="button" type="button" onClick={() => setEditor('new')}>{t('groups.create')}</button>}
        </div>
      )}

      {totalPages > 1 && (
        <nav className="pagination" aria-label={t('groups.pages')}>
          <button className="button button--secondary" type="button" disabled={page === 0 || loading} onClick={() => selectPage(page - 1)}>
            {t('common.back')}
          </button>
          <span>{t('common.pageOf', { page: page + 1, total: totalPages })}</span>
          <button className="button button--secondary" type="button" disabled={page + 1 >= totalPages || loading} onClick={() => selectPage(page + 1)}>
            {t('common.next')}
          </button>
        </nav>
      )}

      {canManage && editor && (
        <div
          className="dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !actionId) setEditor(null)
          }}
        >
          <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="group-dialog-title">
            <div className="dialog__heading">
              <div>
                <p className="eyebrow">{t(editor === 'new' ? 'groups.new' : 'groups.editing')}</p>
                <h2 id="group-dialog-title">{editor === 'new' ? t('groups.add') : editor.name}</h2>
              </div>
              <button className="dialog__close" type="button" aria-label={t('common.close')} onClick={() => setEditor(null)}>×</button>
            </div>
            <form key={editor === 'new' ? 'new' : editor.id} onSubmit={handleSave}>
              {error && <div className="alert alert--error" role="alert">{error}</div>}
              <label className="field">
                <span>{t('groups.name')}</span>
                <input name="name" defaultValue={editor === 'new' ? '' : editor.name} maxLength={200} required autoFocus />
              </label>
              <label className="field">
                <span>{t('groups.ageCategory')}</span>
                <input name="ageCategory" defaultValue={editor === 'new' ? '' : editor.ageCategory} maxLength={30} placeholder={t('groups.agePlaceholder')} required />
              </label>
              <div className="dialog__actions">
                <button className="button button--secondary" type="button" onClick={() => setEditor(null)}>{t('common.cancel')}</button>
                <button className="button" type="submit" disabled={Boolean(actionId)}>
                  {t(actionId ? 'common.saving' : 'common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {canManage && coachEditor && (
        <div
          className="dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !coachActionId) setCoachEditor(null)
          }}
        >
          <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="coach-dialog-title">
            <div className="dialog__heading">
              <div>
                <p className="eyebrow">{t('groups.roster')}</p>
                <h2 id="coach-dialog-title">{t('groups.coachesFor', { group: coachEditor.name })}</h2>
              </div>
              <button className="dialog__close" type="button" aria-label={t('common.close')} onClick={() => setCoachEditor(null)}>×</button>
            </div>

            {error && <div className="alert alert--error" role="alert">{error}</div>}
            {notice && <div className="alert alert--success" role="status">{notice}</div>}
            {coachesLoading ? (
              <div className="inline-note">{t('groups.loadingAssignments')}</div>
            ) : coaches.length ? (
              <div className="coach-assignment-list">
                {coaches.map((coach) => {
                  const assigned = assignedCoaches.some((item) => item.userId === coach.userId)
                  return (
                    <label className={assigned ? 'coach-assignment coach-assignment--selected' : 'coach-assignment'} key={coach.userId}>
                      <input
                        type="checkbox"
                        checked={assigned}
                        disabled={Boolean(coachActionId)}
                        onChange={() => void handleCoachToggle(coach)}
                      />
                      <span>
                        <strong>{coach.fullName}</strong>
                        <small>{coach.email}</small>
                      </span>
                      <em>{t(coachActionId === coach.userId ? 'common.saving' : assigned ? 'groups.assigned' : 'groups.notAssigned')}</em>
                    </label>
                  )
                })}
              </div>
            ) : (
              <div className="list-state list-state--compact">
                <strong>{t('groups.noCoaches')}</strong>
                <span>{t('groups.noCoachesText')}</span>
                <Link className="button" to={academyPath('invitations')} onClick={() => setCoachEditor(null)}>{t('groups.goInvitations')}</Link>
              </div>
            )}

            <div className="dialog__actions">
              <button className="button button--secondary" type="button" disabled={Boolean(coachActionId)} onClick={() => setCoachEditor(null)}>{t('common.done')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
