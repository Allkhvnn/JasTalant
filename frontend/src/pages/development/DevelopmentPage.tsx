import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  createDevelopmentAssessment,
  deleteDevelopmentAssessment,
  getDevelopmentAssessments,
  updateDevelopmentAssessment,
} from '../../entities/development/api/developmentApi'
import type {
  DevelopmentAssessment,
  DevelopmentAssessmentPayload,
} from '../../entities/development/model/types'
import { useAcademy } from '../../entities/academy/model/useAcademy'
import { getPlayers } from '../../entities/player/api/playerApi'
import type { Player } from '../../entities/player/model/types'
import { errorMessage } from '../../shared/api/apiClient'

type MetricKey = 'technique' | 'speed' | 'endurance' | 'physicalFitness' | 'gameIntelligence'

const metricLabels: Array<[MetricKey, string]> = [
  ['technique', 'Техника'],
  ['speed', 'Скорость'],
  ['endurance', 'Выносливость'],
  ['physicalFitness', 'Физическая подготовка'],
  ['gameIntelligence', 'Игровой интеллект'],
]

function today() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
const formatDate = (value: string) => new Intl.DateTimeFormat('ru-RU').format(new Date(`${value}T00:00:00`))

export function DevelopmentPage() {
  const { academy, token } = useAcademy()
  const [searchParams, setSearchParams] = useSearchParams()
  const [requestedPlayerId] = useState(() => searchParams.get('playerId') || '')
  const [players, setPlayers] = useState<Player[]>([])
  const [playerId, setPlayerId] = useState('')
  const [assessments, setAssessments] = useState<DevelopmentAssessment[]>([])
  const [editor, setEditor] = useState<DevelopmentAssessment | 'new' | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let cancelled = false
    getPlayers(token, academy.id, 0, 100)
      .then((result) => {
        if (cancelled) return
        setPlayers(result.items)
        const selected = result.items.some((player) => player.id === requestedPlayerId)
          ? requestedPlayerId : result.items[0]?.id || ''
        setPlayerId(selected)
        if (selected) setSearchParams({ playerId: selected }, { replace: true })
      })
      .catch((requestError: unknown) => !cancelled && setError(errorMessage(requestError)))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [academy.id, requestedPlayerId, setSearchParams, token])

  useEffect(() => {
    if (!playerId) {
      return
    }
    let cancelled = false
    getDevelopmentAssessments(token, academy.id, playerId, 0, 100)
      .then((result) => !cancelled && setAssessments(result.items))
      .catch((requestError: unknown) => !cancelled && setError(errorMessage(requestError)))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [academy.id, playerId, reloadKey, token])

  const selectedPlayer = players.find((player) => player.id === playerId)
  const latest = assessments[0]
  const average = useMemo(() => latest
    ? (latest.technique + latest.speed + latest.endurance + latest.physicalFitness + latest.gameIntelligence) / 5
    : null, [latest])

  const selectPlayer = (nextId: string) => {
    setPlayerId(nextId)
    setAssessments([])
    setError('')
    setNotice('')
    setSearchParams({ playerId: nextId }, { replace: true })
  }

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editor || !playerId) return
    const data = new FormData(event.currentTarget)
    const payload: DevelopmentAssessmentPayload = {
      assessmentDate: String(data.get('assessmentDate')),
      technique: Number(data.get('technique')),
      speed: Number(data.get('speed')),
      endurance: Number(data.get('endurance')),
      physicalFitness: Number(data.get('physicalFitness')),
      gameIntelligence: Number(data.get('gameIntelligence')),
      comment: String(data.get('comment') || '').trim() || null,
    }
    setSaving(true)
    setError('')
    setNotice('')
    try {
      if (editor === 'new') {
        await createDevelopmentAssessment(token, academy.id, playerId, payload)
        setNotice('Оценка развития добавлена.')
      } else {
        await updateDevelopmentAssessment(token, academy.id, playerId, editor, payload)
        setNotice('Оценка развития обновлена.')
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

  const handleDelete = async (assessment: DevelopmentAssessment) => {
    if (!window.confirm(`Удалить оценку за ${formatDate(assessment.assessmentDate)}?`)) return
    setSaving(true)
    setError('')
    try {
      await deleteDevelopmentAssessment(token, academy.id, playerId, assessment.id)
      setNotice('Оценка удалена.')
      setLoading(true)
      setReloadKey((value) => value + 1)
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="workspace-page">
      <div className="workspace-heading workspace-heading--actions">
        <div>
          <p className="eyebrow">Развитие игроков</p>
          <h1>Показатели</h1>
          <p>Фиксируйте оценки по пяти направлениям и отслеживайте прогресс.</p>
        </div>
        <button className="button" type="button" disabled={!playerId || saving} onClick={() => setEditor('new')}>
          Добавить оценку
        </button>
      </div>

      {error && <div className="alert alert--error" role="alert">{error}</div>}
      {notice && <div className="alert alert--success" role="status">{notice}</div>}

      <div className="list-toolbar">
        <label>
          <span>Игрок</span>
          <select value={playerId} onChange={(event) => selectPlayer(event.target.value)}>
            {!players.length && <option value="">Нет доступных игроков</option>}
            {players.map((player) => <option key={player.id} value={player.id}>{player.fullName}</option>)}
          </select>
        </label>
        <span>{assessments.length} оценок</span>
      </div>

      {latest && (
        <>
          <div className="development-summary">
            {metricLabels.map(([key, label]) => (
              <div key={key}><span>{label}</span><strong>{Number(latest[key]).toFixed(1)}</strong><small>из 10</small></div>
            ))}
            <div className="development-summary__average"><span>Средняя оценка</span><strong>{average?.toFixed(1)}</strong><small>из 10</small></div>
          </div>
          <p className="development-caption">Последняя оценка: {formatDate(latest.assessmentDate)}</p>
        </>
      )}

      {loading ? (
        <div className="list-state">Загружаем показатели…</div>
      ) : !selectedPlayer ? (
        <div className="list-state"><strong>Нет доступных игроков</strong><span>Добавьте игрока или назначьте тренеру группу.</span></div>
      ) : assessments.length ? (
        <div className="development-history">
          {assessments.map((assessment) => (
            <article className="development-record" key={assessment.id}>
              <div className="development-record__heading">
                <div><time>{formatDate(assessment.assessmentDate)}</time><span>Оценил: {assessment.createdByName}</span></div>
                <div>
                  <button className="button button--secondary button--small" type="button" disabled={saving} onClick={() => setEditor(assessment)}>Изменить</button>
                  <button className="text-button text-button--danger" type="button" disabled={saving} onClick={() => void handleDelete(assessment)}>Удалить</button>
                </div>
              </div>
              <div className="development-record__metrics">
                {metricLabels.map(([key, label]) => <span key={key}>{label} <strong>{Number(assessment[key]).toFixed(1)}</strong></span>)}
              </div>
              {assessment.comment && <p>{assessment.comment}</p>}
            </article>
          ))}
        </div>
      ) : (
        <div className="list-state"><strong>Оценок пока нет</strong><span>Добавьте первую оценку развития для {selectedPlayer.fullName}.</span></div>
      )}

      {editor && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !saving) setEditor(null)
        }}>
          <div className="dialog dialog--wide" role="dialog" aria-modal="true" aria-labelledby="development-dialog-title">
            <div className="dialog__heading">
              <div><p className="eyebrow">{selectedPlayer?.fullName}</p><h2 id="development-dialog-title">{editor === 'new' ? 'Новая оценка' : 'Изменить оценку'}</h2></div>
              <button className="dialog__close" type="button" aria-label="Закрыть" onClick={() => setEditor(null)}>×</button>
            </div>
            <form key={editor === 'new' ? 'new' : editor.id} onSubmit={handleSave}>
              <label className="field"><span>Дата оценки</span><input name="assessmentDate" type="date" max={today()} defaultValue={editor === 'new' ? today() : editor.assessmentDate} required /></label>
              <div className="development-fields">
                {metricLabels.map(([key, label]) => (
                  <label className="field" key={key}><span>{label}</span><input name={key} type="number" min="0" max="10" step="0.1" defaultValue={editor === 'new' ? 5 : editor[key]} required /></label>
                ))}
              </div>
              <label className="field"><span>Комментарий тренера</span><textarea name="comment" maxLength={500} rows={4} defaultValue={editor === 'new' ? '' : editor.comment || ''} /></label>
              <div className="dialog__actions"><button className="button button--secondary" type="button" onClick={() => setEditor(null)}>Отмена</button><button className="button" type="submit" disabled={saving}>{saving ? 'Сохраняем…' : 'Сохранить'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
