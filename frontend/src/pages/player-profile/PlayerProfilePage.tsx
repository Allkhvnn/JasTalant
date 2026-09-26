import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAcademy } from '../../entities/academy/model/useAcademy'
import { getDevelopmentAssessments } from '../../entities/development/api/developmentApi'
import type { DevelopmentAssessment } from '../../entities/development/model/types'
import { getGroups } from '../../entities/group/api/groupApi'
import type { AcademyGroup } from '../../entities/group/model/types'
import { deletePlayerAvatar, getPlayer, updatePlayer, uploadPlayerAvatar } from '../../entities/player/api/playerApi'
import type { Player, PlayerPayload } from '../../entities/player/model/types'
import { errorMessage } from '../../shared/api/apiClient'
import { ProtectedAvatar } from '../../shared/ui/ProtectedAvatar'

const metrics: Array<[keyof Pick<DevelopmentAssessment,
  'technique' | 'speed' | 'endurance' | 'physicalFitness' | 'gameIntelligence'>, string]> = [
  ['technique', 'Техника'],
  ['speed', 'Скорость'],
  ['endurance', 'Выносливость'],
  ['physicalFitness', 'Физическая форма'],
  ['gameIntelligence', 'Игровой интеллект'],
]

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    .format(new Date(`${value}T00:00:00`))
}

function ageFrom(value: string) {
  const birthDate = new Date(`${value}T00:00:00`)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const beforeBirthday = today.getMonth() < birthDate.getMonth()
    || (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())
  if (beforeBirthday) age -= 1
  return age
}

function latestBirthDate() {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return yesterday.toISOString().slice(0, 10)
}

export function PlayerProfilePage() {
  const { playerId = '' } = useParams()
  const { academy, token } = useAcademy()
  const canManage = academy.roles.includes('ADMIN')
  const [player, setPlayer] = useState<Player | null>(null)
  const [groups, setGroups] = useState<AcademyGroup[]>([])
  const [groupName, setGroupName] = useState('Группа не указана')
  const [latestAssessment, setLatestAssessment] = useState<DevelopmentAssessment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      getPlayer(token, academy.id, playerId),
      getGroups(token, academy.id, 0, 100),
      getDevelopmentAssessments(token, academy.id, playerId, 0, 1),
    ])
      .then(([nextPlayer, groups, assessments]) => {
        if (cancelled) return
        setPlayer(nextPlayer)
        setGroups(groups.items)
        setGroupName(groups.items.find((group) => group.id === nextPlayer.groupId)?.name || 'Группа не указана')
        setLatestAssessment(assessments.items[0] || null)
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(errorMessage(requestError))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [academy.id, playerId, token])

  const average = useMemo(() => latestAssessment
    ? metrics.reduce((sum, [key]) => sum + latestAssessment[key], 0) / metrics.length
    : null, [latestAssessment])

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!player) return
    const data = new FormData(event.currentTarget)
    const optional = (name: string) => String(data.get(name) || '').trim() || null
    const details: PlayerPayload = {
      fullName: String(data.get('fullName')).trim(),
      dateOfBirth: String(data.get('dateOfBirth')),
      groupId: String(data.get('groupId')),
      parentName: optional('parentName'), parentPhone: optional('parentPhone'), parentEmail: optional('parentEmail'),
    }
    const avatar = data.get('avatar')
    setSaving(true); setError(''); setNotice('')
    try {
      let updated = await updatePlayer(token, academy.id, player, details)
      if (avatar instanceof File && avatar.size > 0) updated = await uploadPlayerAvatar(token, academy.id, updated, avatar)
      setPlayer(updated)
      setGroupName(groups.find((group) => group.id === updated.groupId)?.name || 'Группа не указана')
      setEditing(false)
      setNotice('Профиль игрока обновлён.')
    } catch (requestError) { setError(errorMessage(requestError)) } finally { setSaving(false) }
  }

  const removeAvatar = async () => {
    if (!player) return
    setSaving(true); setError(''); setNotice('')
    try { setPlayer(await deletePlayerAvatar(token, academy.id, player)); setNotice('Фотография удалена.') }
    catch (requestError) { setError(errorMessage(requestError)) } finally { setSaving(false) }
  }

  if (loading) return <div className="workspace-page"><div className="list-state">Загружаем профиль игрока…</div></div>

  if (error || !player) {
    return (
      <div className="workspace-page">
        <div className="alert alert--error" role="alert">{error || 'Игрок не найден.'}</div>
        <Link className="button button--secondary" to="/academy/players">Вернуться к игрокам</Link>
      </div>
    )
  }

  return (
    <div className="workspace-page player-profile-page">
      <Link className="profile-back" to="/academy/players">← Все игроки</Link>

      {error && <div className="alert alert--error" role="alert">{error}</div>}
      {notice && <div className="alert alert--success" role="status">{notice}</div>}

      <section className="player-profile-hero">
        <ProtectedAvatar className="player-profile-hero__avatar" name={player.fullName} token={token}
          hasAvatar={player.hasAvatar} version={player.version}
          path={`/api/academies/${academy.id}/players/${player.id}/avatar`} />
        <div className="player-profile-hero__identity">
          <p className="eyebrow">Профиль игрока</p>
          <h1>{player.fullName}</h1>
          <div><span>{academy.name}</span><span>{groupName}</span><span>{ageFrom(player.dateOfBirth)} лет</span></div>
        </div>
        <div className="player-profile-hero__actions">{canManage && <button className="button button--secondary" type="button" onClick={() => setEditing(true)}>Редактировать</button>}<Link className="button" to={`/academy/development?playerId=${player.id}`}>Открыть показатели</Link></div>
      </section>

      <div className="player-profile-grid">
        <section className="profile-panel">
          <div className="profile-panel__heading"><div><span>Карточка игрока</span><h2>Основные данные</h2></div></div>
          <dl className="profile-details">
            <div><dt>Дата рождения</dt><dd>{formatDate(player.dateOfBirth)}</dd></div>
            <div><dt>Группа</dt><dd>{groupName}</dd></div>
            <div><dt>Родитель</dt><dd>{player.parentName || 'Не указан'}</dd></div>
            <div><dt>Телефон</dt><dd>{player.parentPhone || 'Не указан'}</dd></div>
            <div><dt>Email родителя</dt><dd>{player.parentEmail || 'Не указан'}</dd></div>
          </dl>
        </section>

        <section className="profile-panel">
          <div className="profile-panel__heading">
            <div><span>Последняя оценка</span><h2>Развитие игрока</h2></div>
            {latestAssessment && <strong>{average?.toFixed(1)} / 10</strong>}
          </div>
          {latestAssessment ? (
            <>
              <div className="profile-metrics">
                {metrics.map(([key, label]) => (
                  <div key={key}>
                    <div><span>{label}</span><strong>{latestAssessment[key]}</strong></div>
                    <span><i style={{ width: `${latestAssessment[key] * 10}%` }} /></span>
                  </div>
                ))}
              </div>
              <p className="profile-assessment-note">
                Оценка от {formatDate(latestAssessment.assessmentDate)} · {latestAssessment.createdByName}
              </p>
            </>
          ) : (
            <div className="profile-empty">
              <p>Для игрока ещё нет оценок развития.</p>
              <Link to={`/academy/development?playerId=${player.id}`}>Добавить первую оценку</Link>
            </div>
          )}
        </section>
      </div>

      {latestAssessment?.comment && (
        <section className="profile-panel profile-comment">
          <span>Комментарий тренера</span>
          <blockquote>{latestAssessment.comment}</blockquote>
        </section>
      )}

      {editing && <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setEditing(false) }}><div className="dialog dialog--wide" role="dialog" aria-modal="true"><div className="dialog__heading"><div><p className="eyebrow">Карточка игрока</p><h2>Редактировать профиль</h2></div><button className="dialog__close" type="button" onClick={() => setEditing(false)}>×</button></div><form onSubmit={handleSave}>
        <div className="profile-photo-editor"><ProtectedAvatar className="profile-photo-editor__preview" name={player.fullName} token={token} hasAvatar={player.hasAvatar} version={player.version} path={`/api/academies/${academy.id}/players/${player.id}/avatar`} /><label className="field"><span>Новая фотография</span><input name="avatar" type="file" accept="image/jpeg,image/png,image/webp"/><small>JPEG, PNG или WebP, не больше 2 МБ.</small></label>{player.hasAvatar && <button className="text-button text-button--danger" type="button" disabled={saving} onClick={() => void removeAvatar()}>Удалить фото</button>}</div>
        <div className="field-row"><label className="field"><span>ФИО игрока</span><input name="fullName" defaultValue={player.fullName} maxLength={200} required autoFocus/></label><label className="field"><span>Дата рождения</span><input name="dateOfBirth" type="date" defaultValue={player.dateOfBirth} max={latestBirthDate()} required/></label></div>
        <label className="field"><span>Группа</span><select name="groupId" defaultValue={player.groupId} required>{groups.map((group) => <option value={group.id} key={group.id}>{group.name} · {group.ageCategory}</option>)}</select></label>
        <div className="form-divider"><span>Контакты родителя</span></div><label className="field"><span>Имя родителя</span><input name="parentName" defaultValue={player.parentName || ''} maxLength={200}/></label><div className="field-row"><label className="field"><span>Телефон</span><input name="parentPhone" type="tel" defaultValue={player.parentPhone || ''} pattern="[+0-9() .-]{7,30}"/></label><label className="field"><span>Email</span><input name="parentEmail" type="email" defaultValue={player.parentEmail || ''} maxLength={254}/></label></div>
        <div className="dialog__actions"><button className="button button--secondary" type="button" disabled={saving} onClick={() => setEditing(false)}>Отмена</button><button className="button" type="submit" disabled={saving}>{saving ? 'Сохраняем…' : 'Сохранить'}</button></div>
      </form></div></div>}
    </div>
  )
}
