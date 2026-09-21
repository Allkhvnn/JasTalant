import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAcademy } from '../../entities/academy/model/useAcademy'
import { getGroupCoaches, getGroups } from '../../entities/group/api/groupApi'
import type { AcademyGroup, GroupCoach } from '../../entities/group/model/types'
import {
  createTraining,
  deleteTraining,
  getTrainings,
  updateTraining,
} from '../../entities/training/api/trainingApi'
import type { ScheduledTraining, ScheduledTrainingPayload } from '../../entities/training/model/types'
import { errorMessage } from '../../shared/api/apiClient'

function dateValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function shiftedDate(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return dateValue(date)
}

const formatDate = (value: string) => new Intl.DateTimeFormat('ru-RU', {
  weekday: 'long', day: 'numeric', month: 'long',
}).format(new Date(`${value}T00:00:00`))

const shortTime = (value: string) => value.slice(0, 5)

async function allGroups(token: string, academyId: string) {
  const first = await getGroups(token, academyId, 0, 100)
  const pages = Math.ceil(first.totalElements / first.size)
  if (pages <= 1) return first.items
  const rest = await Promise.all(Array.from(
    { length: pages - 1 }, (_, index) => getGroups(token, academyId, index + 1, 100),
  ))
  return [first, ...rest].flatMap((page) => page.items)
}

export function SchedulePage() {
  const { academy, token } = useAcademy()
  const canManage = academy.roles.includes('ADMIN')
  const [groups, setGroups] = useState<AcademyGroup[]>([])
  const [trainings, setTrainings] = useState<ScheduledTraining[]>([])
  const [from, setFrom] = useState(() => shiftedDate(-7))
  const [to, setTo] = useState(() => shiftedDate(30))
  const [groupFilter, setGroupFilter] = useState('')
  const [editor, setEditor] = useState<ScheduledTraining | 'new' | null>(null)
  const [editorGroupId, setEditorGroupId] = useState('')
  const [editorCoachUserId, setEditorCoachUserId] = useState('')
  const [coaches, setCoaches] = useState<GroupCoach[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let cancelled = false
    allGroups(token, academy.id)
      .then((items) => !cancelled && setGroups(items))
      .catch((requestError: unknown) => !cancelled && setError(errorMessage(requestError)))
    return () => { cancelled = true }
  }, [academy.id, token])

  useEffect(() => {
    let cancelled = false
    getTrainings(token, academy.id, from, to, groupFilter || undefined)
      .then((items) => !cancelled && setTrainings(items))
      .catch((requestError: unknown) => !cancelled && setError(errorMessage(requestError)))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [academy.id, from, groupFilter, reloadKey, to, token])

  useEffect(() => {
    if (!editor || !editorGroupId) return
    let cancelled = false
    getGroupCoaches(token, academy.id, editorGroupId)
      .then((items) => !cancelled && setCoaches(items))
      .catch((requestError: unknown) => !cancelled && setError(errorMessage(requestError)))
    return () => { cancelled = true }
  }, [academy.id, editor, editorGroupId, token])

  const grouped = useMemo(() => {
    const byDate = new Map<string, ScheduledTraining[]>()
    trainings.forEach((training) => {
      const items = byDate.get(training.trainingDate) || []
      items.push(training)
      byDate.set(training.trainingDate, items)
    })
    return Array.from(byDate.entries())
  }, [trainings])

  const openEditor = (value: ScheduledTraining | 'new') => {
    setEditor(value)
    setCoaches([])
    setEditorGroupId(value === 'new' ? groupFilter || groups[0]?.id || '' : value.groupId)
    setEditorCoachUserId(value === 'new' ? '' : value.coachUserId)
    setError('')
    setNotice('')
  }

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editor) return
    const data = new FormData(event.currentTarget)
    const payload: ScheduledTrainingPayload = {
      groupId: String(data.get('groupId')),
      coachUserId: String(data.get('coachUserId')),
      trainingDate: String(data.get('trainingDate')),
      startTime: String(data.get('startTime')),
      endTime: String(data.get('endTime')),
      location: String(data.get('location') || '').trim() || null,
      status: data.get('status') === 'CANCELLED' ? 'CANCELLED' : 'SCHEDULED',
    }
    setSaving(true)
    setError('')
    try {
      if (editor === 'new') {
        await createTraining(token, academy.id, payload)
        setNotice('Тренировка добавлена в расписание.')
      } else {
        await updateTraining(token, academy.id, editor, payload)
        setNotice('Тренировка обновлена.')
      }
      setEditor(null)
      setLoading(true)
      setReloadKey((value) => value + 1)
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (training: ScheduledTraining) => {
    if (!window.confirm(`Удалить тренировку ${formatDate(training.trainingDate)} в ${shortTime(training.startTime)}?`)) return
    setSaving(true)
    setError('')
    try {
      await deleteTraining(token, academy.id, training.id)
      setNotice('Тренировка удалена.')
      setLoading(true)
      setReloadKey((value) => value + 1)
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="workspace-page schedule-page">
      <div className="workspace-heading workspace-heading--actions">
        <div><p className="eyebrow">Тренировочный процесс</p><h1>Расписание</h1><p>Занятия групп, тренеры, время и место проведения.</p></div>
        {canManage && <button className="button" type="button" disabled={!groups.length} onClick={() => openEditor('new')}>Добавить тренировку</button>}
      </div>

      {error && <div className="alert alert--error" role="alert">{error}</div>}
      {notice && <div className="alert alert--success" role="status">{notice}</div>}

      <div className="schedule-toolbar">
        <label><span>С даты</span><input type="date" value={from} onChange={(event) => { setLoading(true); setFrom(event.target.value) }} /></label>
        <label><span>По дату</span><input type="date" value={to} min={from} onChange={(event) => { setLoading(true); setTo(event.target.value) }} /></label>
        <label><span>Группа</span><select value={groupFilter} onChange={(event) => { setLoading(true); setGroupFilter(event.target.value) }}><option value="">Все группы</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>
        <span>{trainings.length} занятий</span>
      </div>

      {loading ? <div className="list-state">Загружаем расписание…</div>
        : !groups.length ? <div className="list-state"><strong>{canManage ? 'Сначала создайте группу' : 'Нет назначенных групп'}</strong><span>Расписание появится после настройки групп и тренеров.</span></div>
          : grouped.length ? (
            <div className="schedule-calendar">
              {grouped.map(([date, items]) => (
                <section className="schedule-day" key={date}>
                  <h2>{formatDate(date)}</h2>
                  <div>
                    {items?.map((training) => (
                      <article className={training.status === 'CANCELLED' ? 'training-card training-card--cancelled' : 'training-card'} key={training.id}>
                        <div className="training-card__time"><strong>{shortTime(training.startTime)}</strong><span>{shortTime(training.endTime)}</span></div>
                        <div className="training-card__details"><h3>{training.groupName}</h3><p>{training.coachName}</p><span>{training.location || 'Место не указано'}</span></div>
                        <div className="training-card__actions">
                          {training.status === 'CANCELLED' ? <span className="training-status">Отменена</span>
                            : training.trainingDate <= dateValue(new Date()) && <Link className="button button--small" to={`/academy/attendance?trainingId=${training.id}&groupId=${training.groupId}&date=${training.trainingDate}`}>Посещаемость</Link>}
                          {canManage && <><button className="button button--secondary button--small" type="button" onClick={() => openEditor(training)}>Изменить</button><button className="text-button text-button--danger" type="button" disabled={saving} onClick={() => void handleDelete(training)}>Удалить</button></>}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : <div className="list-state"><strong>В выбранном периоде тренировок нет</strong><span>{canManage ? 'Добавьте занятие или измените период.' : 'Администратор ещё не добавил занятия.'}</span></div>}

      {canManage && editor && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setEditor(null) }}>
          <div className="dialog dialog--wide" role="dialog" aria-modal="true" aria-labelledby="training-dialog-title">
            <div className="dialog__heading"><div><p className="eyebrow">Расписание</p><h2 id="training-dialog-title">{editor === 'new' ? 'Новая тренировка' : 'Изменить тренировку'}</h2></div><button className="dialog__close" type="button" onClick={() => setEditor(null)} aria-label="Закрыть">×</button></div>
            <form key={editor === 'new' ? 'new' : editor.id} onSubmit={handleSave}>
              <div className="field-row">
                <label className="field"><span>Группа</span><select name="groupId" value={editorGroupId} onChange={(event) => { setCoaches([]); setEditorCoachUserId(''); setEditorGroupId(event.target.value) }} required>{groups.map((group) => <option key={group.id} value={group.id}>{group.name} · {group.ageCategory}</option>)}</select></label>
                <label className="field"><span>Тренер</span><select name="coachUserId" value={editorCoachUserId} onChange={(event) => setEditorCoachUserId(event.target.value)} required><option value="" disabled>{coaches.length ? 'Выберите тренера' : 'Нет назначенных тренеров'}</option>{coaches.map((coach) => <option value={coach.userId} key={coach.userId}>{coach.fullName}</option>)}</select></label>
              </div>
              <div className="field-row"><label className="field"><span>Дата</span><input name="trainingDate" type="date" defaultValue={editor === 'new' ? dateValue(new Date()) : editor.trainingDate} required /></label><label className="field"><span>Статус</span><select name="status" defaultValue={editor === 'new' ? 'SCHEDULED' : editor.status}><option value="SCHEDULED">Запланирована</option><option value="CANCELLED">Отменена</option></select></label></div>
              <div className="field-row"><label className="field"><span>Начало</span><input name="startTime" type="time" defaultValue={editor === 'new' ? '18:00' : shortTime(editor.startTime)} required /></label><label className="field"><span>Окончание</span><input name="endTime" type="time" defaultValue={editor === 'new' ? '19:30' : shortTime(editor.endTime)} required /></label></div>
              <label className="field"><span>Место</span><input name="location" maxLength={200} defaultValue={editor === 'new' ? '' : editor.location || ''} placeholder="Основное поле" /></label>
              <div className="dialog__actions"><button className="button button--secondary" type="button" onClick={() => setEditor(null)}>Отмена</button><button className="button" type="submit" disabled={saving || !editorCoachUserId}>{saving ? 'Сохраняем…' : 'Сохранить'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
