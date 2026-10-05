import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAcademy } from '../../entities/academy/model/useAcademy'
import { getGroups } from '../../entities/group/api/groupApi'
import type { AcademyGroup } from '../../entities/group/model/types'
import {
  createPlayer,
  deletePlayer,
  downloadPlayerTemplate,
  downloadPlayers,
  getPlayers,
  importPlayers,
  updatePlayer,
  validatePlayerImport,
} from '../../entities/player/api/playerApi'
import type { Player, PlayerImportResult, PlayerPayload } from '../../entities/player/model/types'
import { errorMessage } from '../../shared/api/apiClient'
import type { PageResponse } from '../../shared/api/types'
import { useI18n } from '../../shared/i18n/useI18n'
import { ProtectedAvatar } from '../../shared/ui/ProtectedAvatar'

const PAGE_SIZE = 20

function optionalValue(data: FormData, key: string) {
  const value = String(data.get(key) || '').trim()
  return value || null
}

function latestBirthDate() {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const year = yesterday.getFullYear()
  const month = String(yesterday.getMonth() + 1).padStart(2, '0')
  const day = String(yesterday.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const importMessages: Record<string, string> = {
  'Group is required': 'players.import.groupRequired',
  'Group does not belong to this academy': 'players.import.groupAcademy',
  'Group was not found in this academy': 'players.import.groupMissing',
  'Group name is ambiguous; use its UUID': 'players.import.groupAmbiguous',
  'Use date format YYYY-MM-DD': 'players.import.dateFormat',
  'Full name is required and must not exceed 200 characters': 'players.import.nameInvalid',
  'Date of birth must be in the past': 'players.import.birthInvalid',
  'Parent name must not exceed 200 characters': 'players.import.parentNameInvalid',
  'Parent phone format is invalid': 'players.import.phoneInvalid',
  'Parent email format is invalid': 'players.import.emailInvalid',
}

const importFields: Record<string, string> = {
  group: 'players.group', full_name: 'players.fullName', date_of_birth: 'players.birthDate',
  parent_name: 'players.parentName', parent_phone: 'players.phone', parent_email: 'players.email',
}

export function PlayersPage() {
  const { academy, token, academyPath } = useAcademy()
  const { t, intlLocale } = useI18n()
  const canManage = academy.roles.includes('ADMIN')
  const [groups, setGroups] = useState<AcademyGroup[]>([])
  const [result, setResult] = useState<PageResponse<Player> | null>(null)
  const [groupFilter, setGroupFilter] = useState('')
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)
  const [editor, setEditor] = useState<Player | 'new' | null>(null)
  const [actionId, setActionId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [importOpen, setImportOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<PlayerImportResult | null>(null)
  const [fileBusy, setFileBusy] = useState(false)
  const [importError, setImportError] = useState('')

  useEffect(() => {
    let cancelled = false
    getGroups(token, academy.id, 0, 100)
      .then((groupPage) => {
        if (!cancelled) setGroups(groupPage.items)
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(errorMessage(requestError))
      })
    return () => {
      cancelled = true
    }
  }, [academy.id, reloadKey, token])

  useEffect(() => {
    let cancelled = false
    getPlayers(token, academy.id, page, PAGE_SIZE, groupFilter || undefined)
      .then((nextResult) => {
        if (!cancelled) setResult(nextResult)
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
  }, [academy.id, groupFilter, page, reloadKey, token])

  useEffect(() => {
    if (!editor) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !actionId) setEditor(null)
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [actionId, editor])

  const groupNames = useMemo(
    () => new Map(groups.map((group) => [group.id, group.name])),
    [groups],
  )

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

  const selectGroup = (nextGroupId: string) => {
    setGroupFilter(nextGroupId)
    setPage(0)
    setError('')
    reload()
  }

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editor) return
    const data = new FormData(event.currentTarget)
    const payload: PlayerPayload = {
      groupId: String(data.get('groupId')),
      fullName: String(data.get('fullName')).trim(),
      dateOfBirth: String(data.get('dateOfBirth')),
      parentName: optionalValue(data, 'parentName'),
      parentPhone: optionalValue(data, 'parentPhone'),
      parentEmail: optionalValue(data, 'parentEmail'),
    }
    const currentEditor = editor
    setActionId(currentEditor === 'new' ? 'new' : currentEditor.id)
    setError('')
    setNotice('')

    try {
      if (currentEditor === 'new') {
        await createPlayer(token, academy.id, payload)
        setNotice(t('players.created', { name: payload.fullName }))
      } else {
        await updatePlayer(token, academy.id, currentEditor, payload)
        setNotice(t('players.updated', { name: payload.fullName }))
      }
      setEditor(null)
      reload()
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setActionId(null)
    }
  }

  const handleDelete = async (player: Player) => {
    if (!window.confirm(t('players.deleteConfirm', { name: player.fullName }))) return
    setActionId(player.id)
    setError('')
    setNotice('')
    try {
      await deletePlayer(token, academy.id, player.id)
      setNotice(t('players.deleted', { name: player.fullName }))
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

  const saveBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleDownload = async (kind: 'template' | 'export', format: 'csv' | 'xlsx') => {
    setFileBusy(true)
    if (kind === 'template') setImportError('')
    else setError('')
    try {
      const blob = kind === 'template'
        ? await downloadPlayerTemplate(token, academy.id, format)
        : await downloadPlayers(token, academy.id, format)
      saveBlob(blob, `${kind === 'template' ? 'players-template' : 'players'}.${format}`)
    } catch (requestError) {
      if (kind === 'template') setImportError(errorMessage(requestError))
      else setError(errorMessage(requestError))
    } finally {
      setFileBusy(false)
    }
  }

  const handleImportFile = async (file: File | null) => {
    setImportFile(file)
    setImportPreview(null)
    setImportError('')
    if (!file) return
    setFileBusy(true)
    try {
      setImportPreview(await validatePlayerImport(token, academy.id, file))
    } catch (requestError) {
      setImportError(errorMessage(requestError))
    } finally {
      setFileBusy(false)
    }
  }

  const handleImport = async () => {
    if (!importFile || !importPreview || importPreview.errors.length) return
    setFileBusy(true)
    setImportError('')
    try {
      const imported = await importPlayers(token, academy.id, importFile)
      setNotice(t('players.imported', { count: imported.importedRows }))
      setImportOpen(false)
      setImportFile(null)
      setImportPreview(null)
      setPage(0)
      reload()
    } catch (requestError) {
      setImportError(errorMessage(requestError))
    } finally {
      setFileBusy(false)
    }
  }

  const totalPages = result ? Math.ceil(result.totalElements / result.size) : 0

  return (
    <div className="workspace-page">
      <div className="workspace-heading workspace-heading--actions">
        <div>
          <p className="eyebrow">{t('players.roster')}</p>
          <h1>{t('dashboard.players')}</h1>
          <p>{t('players.intro')}</p>
        </div>
        {canManage && (
          <div className="workspace-actions">
            <details className="file-menu">
              <summary className="button button--secondary">{t('players.export')}</summary>
              <div className="file-menu__popover">
                <button type="button" disabled={fileBusy} onClick={() => void handleDownload('export', 'xlsx')}>
                  <strong>Excel XLSX</strong><span>{t('players.xlsxHint')}</span>
                </button>
                <button type="button" disabled={fileBusy} onClick={() => void handleDownload('export', 'csv')}>
                  <strong>CSV</strong><span>{t('players.csvHint')}</span>
                </button>
              </div>
            </details>
            <button className="button button--secondary" type="button" disabled={fileBusy || !groups.length} onClick={() => {
              setImportError(''); setImportFile(null); setImportPreview(null); setImportOpen(true)
            }}>
              {t('players.import')}
            </button>
            <button className="button" type="button" disabled={!groups.length} onClick={() => setEditor('new')}>
              {t('players.add')}
            </button>
          </div>
        )}
      </div>

      {error && <div className="alert alert--error" role="alert">{error}</div>}
      {notice && <div className="alert alert--success" role="status">{notice}</div>}

      <div className="list-toolbar">
        <label>
          <span>{t('players.groupFilter')}</span>
          <select value={groupFilter} onChange={(event) => selectGroup(event.target.value)}>
            <option value="">{t('players.allGroups')}</option>
            {groups.map((group) => <option key={group.id} value={group.id}>{group.name} · {group.ageCategory}</option>)}
          </select>
        </label>
        <span>{result ? t('players.count', { count: result.totalElements }) : t('common.loading')}</span>
      </div>

      {!groups.length && !loading ? (
        <div className="list-state">
          <strong>{canManage ? t('players.createGroupFirst') : t('players.noAssignedGroups')}</strong>
          <span>{canManage
            ? t('players.groupRequiredText')
            : t('players.assignedGroupText')}</span>
          {canManage && <Link className="button" to={academyPath('groups')}>{t('players.openGroups')}</Link>}
        </div>
      ) : loading ? (
        <div className="list-state">{t('players.loading')}</div>
      ) : result?.items.length ? (
        <div className="player-grid">
          {result.items.map((player) => (
            <article className="player-card" key={player.id}>
              <div className="player-card__header">
                <ProtectedAvatar className="player-card__avatar" name={player.fullName} token={token}
                  hasAvatar={player.hasAvatar} version={player.version}
                  path={`/api/academies/${academy.id}/players/${player.id}/avatar`} />
                <div>
                  <h2>{player.fullName}</h2>
                  <p>{groupNames.get(player.groupId) || t('players.group')}</p>
                </div>
              </div>
              <dl>
                <div>
                  <dt>{t('players.birthDate')}</dt>
                  <dd>{new Intl.DateTimeFormat(intlLocale).format(new Date(`${player.dateOfBirth}T00:00:00`))}</dd>
                </div>
                <div>
                  <dt>{t('players.parent')}</dt>
                  <dd>{player.parentName || t('players.notSpecified')}</dd>
                </div>
                <div>
                  <dt>{t('players.phone')}</dt>
                  <dd>{player.parentPhone || t('players.notSpecified')}</dd>
                </div>
              </dl>
              <div className="player-card__actions">
                <Link className="button button--small" to={academyPath(`players/${player.id}`)}>{t('players.openProfile')}</Link>
                {canManage && (
                  <>
                  <button className="button button--secondary button--small" type="button" disabled={Boolean(actionId)} onClick={() => setEditor(player)}>
                    {t('common.edit')}
                  </button>
                  <button className="text-button text-button--danger" type="button" disabled={Boolean(actionId)} onClick={() => void handleDelete(player)}>
                    {t('common.delete')}
                  </button>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="list-state">
          <strong>{t('players.notFound')}</strong>
          <span>{groupFilter ? t('players.emptyGroup') : canManage ? t('players.addFirst') : t('players.noAssignedPlayers')}</span>
          {canManage && <button className="button" type="button" onClick={() => setEditor('new')}>{t('players.add')}</button>}
        </div>
      )}

      {totalPages > 1 && (
        <nav className="pagination" aria-label={t('players.pages')}>
          <button className="button button--secondary" type="button" disabled={page === 0 || loading} onClick={() => selectPage(page - 1)}>{t('common.back')}</button>
          <span>{t('common.pageOf', { page: page + 1, total: totalPages })}</span>
          <button className="button button--secondary" type="button" disabled={page + 1 >= totalPages || loading} onClick={() => selectPage(page + 1)}>{t('common.next')}</button>
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
          <div className="dialog dialog--wide" role="dialog" aria-modal="true" aria-labelledby="player-dialog-title">
            <div className="dialog__heading">
              <div>
                <p className="eyebrow">{editor === 'new' ? t('players.new') : t('players.editing')}</p>
                <h2 id="player-dialog-title">{editor === 'new' ? t('players.add') : editor.fullName}</h2>
              </div>
              <button className="dialog__close" type="button" aria-label={t('common.close')} onClick={() => setEditor(null)}>×</button>
            </div>
            <form key={editor === 'new' ? 'new' : editor.id} onSubmit={handleSave}>
              <div className="field-row">
                <label className="field">
                  <span>{t('players.fullName')}</span>
                  <input name="fullName" defaultValue={editor === 'new' ? '' : editor.fullName} maxLength={200} required autoFocus />
                </label>
                <label className="field">
                  <span>{t('players.birthDate')}</span>
                  <input name="dateOfBirth" type="date" defaultValue={editor === 'new' ? '' : editor.dateOfBirth} max={latestBirthDate()} required />
                </label>
              </div>
              <label className="field">
                <span>{t('players.group')}</span>
                <select name="groupId" defaultValue={editor === 'new' ? groupFilter || groups[0]?.id : editor.groupId} required>
                  {groups.map((group) => <option key={group.id} value={group.id}>{group.name} · {group.ageCategory}</option>)}
                </select>
              </label>
              <div className="form-divider"><span>{t('players.parentContacts')}</span></div>
              <label className="field">
                <span>{t('players.parentName')}</span>
                <input name="parentName" defaultValue={editor === 'new' ? '' : editor.parentName || ''} maxLength={200} />
              </label>
              <div className="field-row">
                <label className="field">
                  <span>{t('players.phone')}</span>
                  <input name="parentPhone" type="tel" defaultValue={editor === 'new' ? '' : editor.parentPhone || ''} minLength={7} maxLength={30} pattern="[+0-9() .-]{7,30}" placeholder="+7 700 123 45 67" />
                </label>
                <label className="field">
                  <span>{t('players.email')}</span>
                  <input name="parentEmail" type="email" defaultValue={editor === 'new' ? '' : editor.parentEmail || ''} maxLength={254} />
                </label>
              </div>
              <div className="dialog__actions">
                <button className="button button--secondary" type="button" onClick={() => setEditor(null)}>{t('common.cancel')}</button>
                <button className="button" type="submit" disabled={Boolean(actionId)}>{actionId ? t('common.saving') : t('common.save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {canManage && importOpen && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !fileBusy) setImportOpen(false)
        }}>
          <div className="dialog dialog--wide" role="dialog" aria-modal="true" aria-labelledby="player-import-title">
            <div className="dialog__heading">
              <div>
                <p className="eyebrow">{t('players.bulkAdd')}</p>
                <h2 id="player-import-title">{t('players.importTitle')}</h2>
              </div>
              <button className="dialog__close" type="button" aria-label={t('common.close')} disabled={fileBusy} onClick={() => setImportOpen(false)}>×</button>
            </div>

            {importError && <div className="alert alert--error" role="alert">{importError}</div>}

            <div className="import-guide">
              <strong>{t('players.importStep1')}</strong>
              <p>{t('players.importGuide')}</p>
              <div className="inline-actions">
                <button className="text-button" type="button" disabled={fileBusy} onClick={() => void handleDownload('template', 'xlsx')}>{t('players.xlsxTemplate')}</button>
                <button className="text-button" type="button" disabled={fileBusy} onClick={() => void handleDownload('template', 'csv')}>{t('players.csvTemplate')}</button>
              </div>
            </div>

            <label className="import-dropzone">
              <strong>{t('players.importStep2')}</strong>
              <span>{importFile ? importFile.name : t('players.importLimits')}</span>
              <input type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                disabled={fileBusy} onChange={(event) => void handleImportFile(event.target.files?.[0] || null)} />
            </label>

            {fileBusy && <div className="import-status">{t('players.processing')}</div>}
            {importPreview && !fileBusy && (
              <div className={`import-result ${importPreview.errors.length ? 'import-result--error' : 'import-result--success'}`}>
                <strong>{importPreview.errors.length
                  ? t('players.importErrors', { count: importPreview.errors.length })
                  : t('players.importReady', { count: importPreview.validRows })}</strong>
                {importPreview.errors.length > 0 && (
                  <div className="import-errors">
                    {importPreview.errors.map((item, index) => (
                      <p key={`${item.row}-${item.field}-${index}`}>
                        <b>{t('players.importRow', { row: item.row, field: importFields[item.field] ? t(importFields[item.field]) : item.field })}:</b> {importMessages[item.message] ? t(importMessages[item.message]) : item.message}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="dialog__actions">
              <button className="button button--secondary" type="button" disabled={fileBusy} onClick={() => setImportOpen(false)}>{t('common.cancel')}</button>
              <button className="button" type="button" disabled={fileBusy || !importPreview || importPreview.errors.length > 0 || importPreview.validRows === 0}
                onClick={() => void handleImport()}>
                {t('players.importCount', { count: importPreview?.validRows || '' })}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
