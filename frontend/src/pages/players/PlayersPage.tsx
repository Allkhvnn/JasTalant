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
  'Group is required': 'Укажите группу.',
  'Group does not belong to this academy': 'Группа не принадлежит этой академии.',
  'Group was not found in this academy': 'Группа с таким названием не найдена.',
  'Group name is ambiguous; use its UUID': 'Найдено несколько групп с таким названием — укажите UUID.',
  'Use date format YYYY-MM-DD': 'Используйте формат даты ГГГГ-ММ-ДД.',
  'Full name is required and must not exceed 200 characters': 'Укажите ФИО длиной до 200 символов.',
  'Date of birth must be in the past': 'Дата рождения должна быть в прошлом.',
  'Parent name must not exceed 200 characters': 'Имя родителя не должно превышать 200 символов.',
  'Parent phone format is invalid': 'Неверный формат телефона родителя.',
  'Parent email format is invalid': 'Неверный email родителя.',
}

const importFields: Record<string, string> = {
  group: 'группа', full_name: 'ФИО', date_of_birth: 'дата рождения',
  parent_name: 'имя родителя', parent_phone: 'телефон', parent_email: 'email',
}

export function PlayersPage() {
  const { academy, token, academyPath } = useAcademy()
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
        setNotice(`Игрок «${payload.fullName}» добавлен.`)
      } else {
        await updatePlayer(token, academy.id, currentEditor, payload)
        setNotice(`Данные игрока «${payload.fullName}» обновлены.`)
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
    if (!window.confirm(`Удалить игрока «${player.fullName}»?`)) return
    setActionId(player.id)
    setError('')
    setNotice('')
    try {
      await deletePlayer(token, academy.id, player.id)
      setNotice(`Игрок «${player.fullName}» удалён.`)
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
      setNotice(`Импортировано игроков: ${imported.importedRows}.`)
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
          <p className="eyebrow">Состав академии</p>
          <h1>Игроки</h1>
          <p>Храните основные данные игрока и контакты родителя в его карточке.</p>
        </div>
        {canManage && (
          <div className="workspace-actions">
            <details className="file-menu">
              <summary className="button button--secondary">Экспорт</summary>
              <div className="file-menu__popover">
                <button type="button" disabled={fileBusy} onClick={() => void handleDownload('export', 'xlsx')}>
                  <strong>Excel XLSX</strong><span>Для работы в Excel и Google Sheets</span>
                </button>
                <button type="button" disabled={fileBusy} onClick={() => void handleDownload('export', 'csv')}>
                  <strong>CSV</strong><span>Универсальный табличный формат</span>
                </button>
              </div>
            </details>
            <button className="button button--secondary" type="button" disabled={fileBusy || !groups.length} onClick={() => {
              setImportError(''); setImportFile(null); setImportPreview(null); setImportOpen(true)
            }}>
              Импорт
            </button>
            <button className="button" type="button" disabled={!groups.length} onClick={() => setEditor('new')}>
              Добавить игрока
            </button>
          </div>
        )}
      </div>

      {error && <div className="alert alert--error" role="alert">{error}</div>}
      {notice && <div className="alert alert--success" role="status">{notice}</div>}

      <div className="list-toolbar">
        <label>
          <span>Фильтр по группе</span>
          <select value={groupFilter} onChange={(event) => selectGroup(event.target.value)}>
            <option value="">Все группы</option>
            {groups.map((group) => <option key={group.id} value={group.id}>{group.name} · {group.ageCategory}</option>)}
          </select>
        </label>
        <span>{result ? `${result.totalElements} игроков` : 'Загрузка…'}</span>
      </div>

      {!groups.length && !loading ? (
        <div className="list-state">
          <strong>{canManage ? 'Сначала создайте группу' : 'Нет назначенных групп'}</strong>
          <span>{canManage
            ? 'Каждый игрок должен состоять в одной из групп академии.'
            : 'После назначения группы здесь появится её состав.'}</span>
          {canManage && <Link className="button" to={academyPath('groups')}>Перейти к группам</Link>}
        </div>
      ) : loading ? (
        <div className="list-state">Загружаем игроков…</div>
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
                  <p>{groupNames.get(player.groupId) || 'Группа'}</p>
                </div>
              </div>
              <dl>
                <div>
                  <dt>Дата рождения</dt>
                  <dd>{new Intl.DateTimeFormat('ru-RU').format(new Date(`${player.dateOfBirth}T00:00:00`))}</dd>
                </div>
                <div>
                  <dt>Родитель</dt>
                  <dd>{player.parentName || 'Не указан'}</dd>
                </div>
                <div>
                  <dt>Телефон</dt>
                  <dd>{player.parentPhone || 'Не указан'}</dd>
                </div>
              </dl>
              <div className="player-card__actions">
                <Link className="button button--small" to={academyPath(`players/${player.id}`)}>Открыть профиль</Link>
                {canManage && (
                  <>
                  <button className="button button--secondary button--small" type="button" disabled={Boolean(actionId)} onClick={() => setEditor(player)}>
                    Изменить
                  </button>
                  <button className="text-button text-button--danger" type="button" disabled={Boolean(actionId)} onClick={() => void handleDelete(player)}>
                    Удалить
                  </button>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="list-state">
          <strong>Игроков не найдено</strong>
          <span>{groupFilter ? 'В выбранной группе пока нет игроков.' : canManage ? 'Добавьте первого игрока академии.' : 'В назначенных группах пока нет игроков.'}</span>
          {canManage && <button className="button" type="button" onClick={() => setEditor('new')}>Добавить игрока</button>}
        </div>
      )}

      {totalPages > 1 && (
        <nav className="pagination" aria-label="Страницы игроков">
          <button className="button button--secondary" type="button" disabled={page === 0 || loading} onClick={() => selectPage(page - 1)}>Назад</button>
          <span>Страница {page + 1} из {totalPages}</span>
          <button className="button button--secondary" type="button" disabled={page + 1 >= totalPages || loading} onClick={() => selectPage(page + 1)}>Далее</button>
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
                <p className="eyebrow">{editor === 'new' ? 'Новый игрок' : 'Редактирование'}</p>
                <h2 id="player-dialog-title">{editor === 'new' ? 'Добавить игрока' : editor.fullName}</h2>
              </div>
              <button className="dialog__close" type="button" aria-label="Закрыть" onClick={() => setEditor(null)}>×</button>
            </div>
            <form key={editor === 'new' ? 'new' : editor.id} onSubmit={handleSave}>
              <div className="field-row">
                <label className="field">
                  <span>ФИО игрока</span>
                  <input name="fullName" defaultValue={editor === 'new' ? '' : editor.fullName} maxLength={200} required autoFocus />
                </label>
                <label className="field">
                  <span>Дата рождения</span>
                  <input name="dateOfBirth" type="date" defaultValue={editor === 'new' ? '' : editor.dateOfBirth} max={latestBirthDate()} required />
                </label>
              </div>
              <label className="field">
                <span>Группа</span>
                <select name="groupId" defaultValue={editor === 'new' ? groupFilter || groups[0]?.id : editor.groupId} required>
                  {groups.map((group) => <option key={group.id} value={group.id}>{group.name} · {group.ageCategory}</option>)}
                </select>
              </label>
              <div className="form-divider"><span>Контакты родителя</span></div>
              <label className="field">
                <span>Имя родителя</span>
                <input name="parentName" defaultValue={editor === 'new' ? '' : editor.parentName || ''} maxLength={200} />
              </label>
              <div className="field-row">
                <label className="field">
                  <span>Телефон</span>
                  <input name="parentPhone" type="tel" defaultValue={editor === 'new' ? '' : editor.parentPhone || ''} minLength={7} maxLength={30} pattern="[+0-9() .-]{7,30}" placeholder="+7 700 123 45 67" />
                </label>
                <label className="field">
                  <span>Email</span>
                  <input name="parentEmail" type="email" defaultValue={editor === 'new' ? '' : editor.parentEmail || ''} maxLength={254} />
                </label>
              </div>
              <div className="dialog__actions">
                <button className="button button--secondary" type="button" onClick={() => setEditor(null)}>Отмена</button>
                <button className="button" type="submit" disabled={Boolean(actionId)}>{actionId ? 'Сохраняем…' : 'Сохранить'}</button>
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
                <p className="eyebrow">Массовое добавление</p>
                <h2 id="player-import-title">Импорт игроков</h2>
              </div>
              <button className="dialog__close" type="button" aria-label="Закрыть" disabled={fileBusy} onClick={() => setImportOpen(false)}>×</button>
            </div>

            {importError && <div className="alert alert--error" role="alert">{importError}</div>}

            <div className="import-guide">
              <strong>1. Скачайте и заполните шаблон</strong>
              <p>Не меняйте названия колонок. Группу укажите её точным названием или UUID, дату рождения — в формате ГГГГ-ММ-ДД.</p>
              <div className="inline-actions">
                <button className="text-button" type="button" disabled={fileBusy} onClick={() => void handleDownload('template', 'xlsx')}>Шаблон XLSX</button>
                <button className="text-button" type="button" disabled={fileBusy} onClick={() => void handleDownload('template', 'csv')}>Шаблон CSV</button>
              </div>
            </div>

            <label className="import-dropzone">
              <strong>2. Выберите заполненный файл</strong>
              <span>{importFile ? importFile.name : 'CSV или XLSX, не более 5 МБ и 5000 строк'}</span>
              <input type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                disabled={fileBusy} onChange={(event) => void handleImportFile(event.target.files?.[0] || null)} />
            </label>

            {fileBusy && <div className="import-status">Обрабатываем файл…</div>}
            {importPreview && !fileBusy && (
              <div className={`import-result ${importPreview.errors.length ? 'import-result--error' : 'import-result--success'}`}>
                <strong>{importPreview.errors.length
                  ? `Найдены ошибки: ${importPreview.errors.length}`
                  : `Файл готов: ${importPreview.validRows} игроков`}</strong>
                {importPreview.errors.length > 0 && (
                  <div className="import-errors">
                    {importPreview.errors.map((item, index) => (
                      <p key={`${item.row}-${item.field}-${index}`}>
                        <b>Строка {item.row}, {importFields[item.field] || item.field}:</b> {importMessages[item.message] || item.message}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="dialog__actions">
              <button className="button button--secondary" type="button" disabled={fileBusy} onClick={() => setImportOpen(false)}>Отмена</button>
              <button className="button" type="button" disabled={fileBusy || !importPreview || importPreview.errors.length > 0 || importPreview.validRows === 0}
                onClick={() => void handleImport()}>
                Импортировать {importPreview?.validRows || ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
