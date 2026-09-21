import { useEffect, useState, type FormEvent } from 'react'
import { useAcademy } from '../../entities/academy/model/useAcademy'
import {
  createGroup,
  deleteGroup,
  getGroups,
  updateGroup,
} from '../../entities/group/api/groupApi'
import type { AcademyGroup, GroupPayload } from '../../entities/group/model/types'
import { errorMessage } from '../../shared/api/apiClient'
import type { PageResponse } from '../../shared/api/types'

const PAGE_SIZE = 20

export function GroupsPage() {
  const { academy, token } = useAcademy()
  const [result, setResult] = useState<PageResponse<AcademyGroup> | null>(null)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)
  const [editor, setEditor] = useState<AcademyGroup | 'new' | null>(null)
  const [actionId, setActionId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let cancelled = false
    getGroups(token, academy.id, page, PAGE_SIZE)
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
  }, [academy.id, page, reloadKey, token])

  useEffect(() => {
    if (!editor) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !actionId) setEditor(null)
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [actionId, editor])

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
        setNotice(`Группа «${payload.name}» создана.`)
      } else {
        await updateGroup(token, academy.id, currentEditor, payload)
        setNotice(`Группа «${payload.name}» обновлена.`)
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
      `Удалить группу «${group.name}»? Группу с игроками удалить нельзя.`,
    )
    if (!confirmed) return

    setActionId(group.id)
    setError('')
    setNotice('')
    try {
      await deleteGroup(token, academy.id, group.id)
      setNotice(`Группа «${group.name}» удалена.`)
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

  const totalPages = result ? Math.ceil(result.totalElements / result.size) : 0

  return (
    <div className="workspace-page">
      <div className="workspace-heading workspace-heading--actions">
        <div>
          <p className="eyebrow">Структура академии</p>
          <h1>Группы</h1>
          <p>Создавайте возрастные группы и готовьте их к назначению тренеров.</p>
        </div>
        <button className="button" type="button" onClick={() => setEditor('new')}>
          Добавить группу
        </button>
      </div>

      {error && <div className="alert alert--error" role="alert">{error}</div>}
      {notice && <div className="alert alert--success" role="status">{notice}</div>}

      {loading ? (
        <div className="list-state">Загружаем группы…</div>
      ) : result?.items.length ? (
        <div className="management-list">
          {result.items.map((group) => (
            <article className="management-card" key={group.id}>
              <div className="management-card__mark">{group.ageCategory}</div>
              <div className="management-card__body">
                <span>Футбольная группа</span>
                <h2>{group.name}</h2>
                <p>Категория: {group.ageCategory}</p>
              </div>
              <div className="management-card__actions">
                <button
                  className="button button--secondary button--small"
                  type="button"
                  disabled={Boolean(actionId)}
                  onClick={() => setEditor(group)}
                >
                  Изменить
                </button>
                <button
                  className="icon-button icon-button--danger"
                  type="button"
                  aria-label={`Удалить группу ${group.name}`}
                  disabled={Boolean(actionId)}
                  onClick={() => void handleDelete(group)}
                >
                  ×
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="list-state">
          <strong>Групп пока нет</strong>
          <span>Создайте первую группу, чтобы затем добавить в неё игроков.</span>
          <button className="button" type="button" onClick={() => setEditor('new')}>Создать группу</button>
        </div>
      )}

      {totalPages > 1 && (
        <nav className="pagination" aria-label="Страницы групп">
          <button className="button button--secondary" type="button" disabled={page === 0 || loading} onClick={() => selectPage(page - 1)}>
            Назад
          </button>
          <span>Страница {page + 1} из {totalPages}</span>
          <button className="button button--secondary" type="button" disabled={page + 1 >= totalPages || loading} onClick={() => selectPage(page + 1)}>
            Далее
          </button>
        </nav>
      )}

      {editor && (
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
                <p className="eyebrow">{editor === 'new' ? 'Новая группа' : 'Редактирование'}</p>
                <h2 id="group-dialog-title">{editor === 'new' ? 'Добавить группу' : editor.name}</h2>
              </div>
              <button className="dialog__close" type="button" aria-label="Закрыть" onClick={() => setEditor(null)}>×</button>
            </div>
            <form key={editor === 'new' ? 'new' : editor.id} onSubmit={handleSave}>
              <label className="field">
                <span>Название группы</span>
                <input name="name" defaultValue={editor === 'new' ? '' : editor.name} maxLength={200} required autoFocus />
              </label>
              <label className="field">
                <span>Возрастная категория</span>
                <input name="ageCategory" defaultValue={editor === 'new' ? '' : editor.ageCategory} maxLength={30} placeholder="Например, U10" required />
              </label>
              <div className="dialog__actions">
                <button className="button button--secondary" type="button" onClick={() => setEditor(null)}>Отмена</button>
                <button className="button" type="submit" disabled={Boolean(actionId)}>
                  {actionId ? 'Сохраняем…' : 'Сохранить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

