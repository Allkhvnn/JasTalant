import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  getAttendance,
  getTrainingAttendance,
  saveAttendance,
  saveTrainingAttendance,
} from '../../entities/attendance/api/attendanceApi'
import type {
  AttendanceSheet,
  AttendanceStatus,
} from '../../entities/attendance/model/types'
import { useAcademy } from '../../entities/academy/model/useAcademy'
import { getGroups } from '../../entities/group/api/groupApi'
import type { AcademyGroup } from '../../entities/group/model/types'
import { errorMessage } from '../../shared/api/apiClient'

const statusOptions: Array<{ value: AttendanceStatus; label: string }> = [
  { value: 'PRESENT', label: 'Присутствовал' },
  { value: 'ABSENT', label: 'Отсутствовал' },
  { value: 'LATE', label: 'Опоздал' },
  { value: 'EXCUSED', label: 'Уважительная' },
]

type DraftMark = {
  status: AttendanceStatus
  comment: string
}

function localDate() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

async function getAllGroups(token: string, academyId: string) {
  const firstPage = await getGroups(token, academyId, 0, 100)
  const pageCount = Math.ceil(firstPage.totalElements / firstPage.size)
  if (pageCount <= 1) return firstPage.items
  const rest = await Promise.all(
    Array.from({ length: pageCount - 1 }, (_, index) => getGroups(token, academyId, index + 1, 100)),
  )
  return [firstPage, ...rest].flatMap((page) => page.items)
}

function marksFromSheet(sheet: AttendanceSheet) {
  return Object.fromEntries(sheet.players.map((player) => [
    player.playerId,
    {
      status: player.status || 'PRESENT',
      comment: player.comment || '',
    } satisfies DraftMark,
  ]))
}

export function AttendancePage() {
  const { academy, token } = useAcademy()
  const [searchParams, setSearchParams] = useSearchParams()
  const [requestedGroupId] = useState(() => searchParams.get('groupId') || '')
  const [requestedTrainingId] = useState(() => searchParams.get('trainingId') || '')
  const [requestedDate] = useState(() => searchParams.get('date') || localDate())
  const [groups, setGroups] = useState<AcademyGroup[]>([])
  const [groupId, setGroupId] = useState('')
  const [trainingId, setTrainingId] = useState(requestedTrainingId)
  const [trainingDate, setTrainingDate] = useState(requestedDate)
  const [sheet, setSheet] = useState<AttendanceSheet | null>(null)
  const [marks, setMarks] = useState<Record<string, DraftMark>>({})
  const [groupsLoading, setGroupsLoading] = useState(true)
  const [sheetLoading, setSheetLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let cancelled = false
    getAllGroups(token, academy.id)
      .then((items) => {
        if (cancelled) return
        setGroups(items)
        const selected = items.some((group) => group.id === requestedGroupId)
          ? requestedGroupId
          : items[0]?.id || ''
        setSheetLoading(Boolean(selected))
        setGroupId(selected)
        if (selected) setSearchParams({ groupId: selected }, { replace: true })
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(errorMessage(requestError))
      })
      .finally(() => {
        if (!cancelled) setGroupsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [academy.id, requestedGroupId, setSearchParams, token])

  useEffect(() => {
    if (!groupId) return
    let cancelled = false
    const request = trainingId
      ? getTrainingAttendance(token, academy.id, trainingId)
      : getAttendance(token, academy.id, groupId, trainingDate)
    request
      .then((result) => {
        if (!cancelled) {
          setSheet(result)
          setMarks(marksFromSheet(result))
        }
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(errorMessage(requestError))
      })
      .finally(() => {
        if (!cancelled) setSheetLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [academy.id, groupId, token, trainingDate, trainingId])

  const summary = useMemo(() => {
    const values = Object.values(marks)
    return statusOptions.map((option) => ({
      ...option,
      count: values.filter((mark) => mark.status === option.value).length,
    }))
  }, [marks])

  const selectGroup = (nextGroupId: string) => {
    setSheetLoading(true)
    setSheet(null)
    setError('')
    setNotice('')
    setTrainingId('')
    setGroupId(nextGroupId)
    setSearchParams({ groupId: nextGroupId }, { replace: true })
  }

  const selectDate = (nextDate: string) => {
    if (!nextDate) return
    setSheetLoading(true)
    setSheet(null)
    setError('')
    setNotice('')
    setTrainingId('')
    setTrainingDate(nextDate)
    setSearchParams({ groupId }, { replace: true })
  }

  const updateStatus = (playerId: string, status: AttendanceStatus) => {
    setMarks((current) => ({
      ...current,
      [playerId]: { ...current[playerId], status },
    }))
    setNotice('')
  }

  const updateComment = (playerId: string, comment: string) => {
    setMarks((current) => ({
      ...current,
      [playerId]: { ...current[playerId], comment },
    }))
    setNotice('')
  }

  const handleSave = async () => {
    if (!sheet?.players.length) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const payload = {
        version: sheet.version,
        records: sheet.players.map((player) => ({
          playerId: player.playerId,
          status: marks[player.playerId].status,
          comment: marks[player.playerId].comment.trim() || null,
        })),
      }
      const result = trainingId
        ? await saveTrainingAttendance(token, academy.id, trainingId, payload)
        : await saveAttendance(token, academy.id, groupId, trainingDate, payload)
      setSheet(result)
      setMarks(marksFromSheet(result))
      setNotice('Посещаемость сохранена.')
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="workspace-page attendance-page">
      <div className="workspace-heading workspace-heading--actions">
        <div>
          <p className="eyebrow">Тренировочный процесс</p>
          <h1>Посещаемость</h1>
          <p>{trainingId ? 'Ведомость открыта из расписания конкретной тренировки.' : 'Выберите группу и дату, затем отметьте каждого игрока.'}</p>
        </div>
        {sheet?.players.length ? (
          <button className="button" type="button" disabled={saving || sheetLoading} onClick={() => void handleSave()}>
            {saving ? 'Сохраняем…' : 'Сохранить ведомость'}
          </button>
        ) : null}
      </div>

      {error && <div className="alert alert--error" role="alert">{error}</div>}
      {notice && <div className="alert alert--success" role="status">{notice}</div>}

      <div className="attendance-toolbar">
        <label>
          <span>Группа</span>
          <select value={groupId} disabled={Boolean(trainingId) || groupsLoading || !groups.length} onChange={(event) => selectGroup(event.target.value)}>
            {groups.map((group) => <option key={group.id} value={group.id}>{group.name} · {group.ageCategory}</option>)}
          </select>
        </label>
        <label>
          <span>Дата тренировки</span>
          <input type="date" value={trainingDate} max={localDate()} disabled={Boolean(trainingId)} onChange={(event) => selectDate(event.target.value)} />
        </label>
        <div className={sheet?.saved ? 'sheet-state sheet-state--saved' : 'sheet-state'}>
          {sheet?.saved ? `Сохранено · версия ${sheet.version}` : 'Новая ведомость'}
        </div>
        {trainingId && <Link className="text-button" to="/academy/schedule">Вернуться в расписание</Link>}
      </div>

      {groupsLoading ? (
        <div className="list-state">Загружаем группы…</div>
      ) : !groups.length ? (
        <div className="list-state">
          <strong>{academy.roles.includes('ADMIN') ? 'Сначала создайте группу' : 'Нет назначенных групп'}</strong>
          <span>{academy.roles.includes('ADMIN')
            ? 'Для посещаемости нужна группа с игроками.'
            : 'Попросите администратора назначить вас тренером группы.'}</span>
          {academy.roles.includes('ADMIN') && <Link className="button" to="/academy/groups">Перейти к группам</Link>}
        </div>
      ) : sheetLoading ? (
        <div className="list-state">Открываем ведомость…</div>
      ) : sheet && !sheet.players.length ? (
        <div className="list-state">
          <strong>В группе нет игроков</strong>
          <span>Добавьте игроков, прежде чем отмечать посещаемость.</span>
          {academy.roles.includes('ADMIN') && <Link className="button" to="/academy/players">Добавить игроков</Link>}
        </div>
      ) : sheet ? (
        <>
          <div className="attendance-summary">
            {summary.map((item) => (
              <div key={item.value}>
                <span>{item.label}</span>
                <strong>{item.count}</strong>
              </div>
            ))}
          </div>

          <div className="attendance-list">
            {sheet.players.map((player, index) => (
              <article className="attendance-row" key={player.playerId}>
                <div className="attendance-player">
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <strong>{player.fullName}</strong>
                </div>
                <div className="attendance-statuses" role="group" aria-label={`Статус: ${player.fullName}`}>
                  {statusOptions.map((option) => (
                    <button
                      className={marks[player.playerId]?.status === option.value
                        ? `attendance-status attendance-status--${option.value.toLowerCase()} attendance-status--active`
                        : `attendance-status attendance-status--${option.value.toLowerCase()}`}
                      type="button"
                      key={option.value}
                      onClick={() => updateStatus(player.playerId, option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <input
                  className="attendance-comment"
                  value={marks[player.playerId]?.comment || ''}
                  onChange={(event) => updateComment(player.playerId, event.target.value)}
                  maxLength={300}
                  placeholder="Комментарий"
                  aria-label={`Комментарий: ${player.fullName}`}
                />
              </article>
            ))}
          </div>

          <div className="attendance-savebar">
            <span>{sheet.players.length} игроков в ведомости</span>
            <button className="button" type="button" disabled={saving} onClick={() => void handleSave()}>
              {saving ? 'Сохраняем…' : 'Сохранить посещаемость'}
            </button>
          </div>
        </>
      ) : null}
    </div>
  )
}
