import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAcademy } from '../../entities/academy/model/useAcademy'
import { deleteAcademyMemberAvatar, getAcademyMembers, updateAcademyMember, uploadAcademyMemberAvatar } from '../../entities/membership/api/membershipApi'
import type { AcademyMember } from '../../entities/membership/model/types'
import { errorMessage } from '../../shared/api/apiClient'
import type { AcademyRole } from '../../shared/api/types'
import { ProtectedAvatar } from '../../shared/ui/ProtectedAvatar'

const roles: AcademyRole[] = ['ADMIN', 'COACH', 'PARENT']
const roleLabels: Record<AcademyRole, string> = {
  ADMIN: 'Администратор',
  COACH: 'Тренер',
  PARENT: 'Родитель',
}

export function MembersPage() {
  const { academy, token } = useAcademy()
  const [members, setMembers] = useState<AcademyMember[]>([])
  const [roleFilter, setRoleFilter] = useState<AcademyRole | ''>('')
  const [accessFilter, setAccessFilter] = useState<'ALL' | 'ACTIVE' | 'DISABLED'>('ALL')
  const [editor, setEditor] = useState<AcademyMember | null>(null)
  const [selectedRoles, setSelectedRoles] = useState<AcademyRole[]>([])
  const [active, setActive] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let cancelled = false
    getAcademyMembers(token, academy.id)
      .then((items) => !cancelled && setMembers(items))
      .catch((requestError: unknown) => !cancelled && setError(errorMessage(requestError)))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [academy.id, reloadKey, token])

  const filtered = useMemo(() => members.filter((member) => {
    if (roleFilter && !member.roles.includes(roleFilter)) return false
    if (accessFilter === 'ACTIVE' && !member.active) return false
    if (accessFilter === 'DISABLED' && member.active) return false
    return true
  }), [accessFilter, members, roleFilter])

  const openEditor = (member: AcademyMember) => {
    setEditor(member)
    setSelectedRoles([...member.roles])
    setActive(member.active)
    setError('')
    setNotice('')
  }

  const toggleRole = (role: AcademyRole) => {
    setSelectedRoles((current) => current.includes(role)
      ? current.filter((item) => item !== role)
      : [...current, role])
  }

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editor) return
    if (!selectedRoles.length) {
      setError('У участника должна остаться хотя бы одна роль.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const data = new FormData(event.currentTarget)
      const updated = await updateAcademyMember(token, academy.id, editor.userId, {
        version: editor.version,
        roles: selectedRoles,
        active,
        displayName: String(data.get('displayName')).trim(),
      })
      const avatar = data.get('avatar')
      if (avatar instanceof File && avatar.size > 0) {
        await uploadAcademyMemberAvatar(token, academy.id, updated, avatar)
      }
      setEditor(null)
      setNotice(active ? 'Роли и доступ участника обновлены.' : 'Доступ участника отключён.')
      setLoading(true)
      setReloadKey((value) => value + 1)
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setSaving(false)
    }
  }

  const removeAvatar = async () => {
    if (!editor) return
    setSaving(true); setError('')
    try {
      const updated = await deleteAcademyMemberAvatar(token, academy.id, editor)
      setEditor(updated)
      setNotice('Фотография участника удалена.')
      setReloadKey((value) => value + 1)
    } catch (requestError) { setError(errorMessage(requestError)) } finally { setSaving(false) }
  }

  return (
    <div className="workspace-page members-page">
      <div className="workspace-heading workspace-heading--actions">
        <div><p className="eyebrow">Доступ к академии</p><h1>Участники</h1><p>Управляйте ролями и временно отключайте доступ без удаления истории.</p></div>
        <Link className="button" to="/academy/invitations">Пригласить участника</Link>
      </div>

      {error && <div className="alert alert--error" role="alert">{error}</div>}
      {notice && <div className="alert alert--success" role="status">{notice}</div>}

      <div className="list-toolbar members-toolbar">
        <label><span>Роль</span><select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as AcademyRole | '')}><option value="">Все роли</option>{roles.map((role) => <option value={role} key={role}>{roleLabels[role]}</option>)}</select></label>
        <label><span>Доступ</span><select value={accessFilter} onChange={(event) => setAccessFilter(event.target.value as typeof accessFilter)}><option value="ALL">Все</option><option value="ACTIVE">Активен</option><option value="DISABLED">Отключён</option></select></label>
        <span>{filtered.length} участников</span>
      </div>

      {loading ? <div className="list-state">Загружаем участников…</div>
        : filtered.length ? (
          <div className="member-list">
            {filtered.map((member) => (
              <article className={member.active ? 'member-card' : 'member-card member-card--disabled'} key={member.membershipId}>
                <ProtectedAvatar className="member-card__avatar" name={member.fullName} token={token}
                  hasAvatar={member.hasAvatar} version={member.version}
                  path={`/api/academies/${academy.id}/members/${member.userId}/avatar`} />
                <div className="member-card__identity"><h2>{member.fullName}</h2><p>{member.email}</p><div>{member.roles.map((role) => <span className="role-pill" key={role}>{roleLabels[role]}</span>)}</div></div>
                <span className={member.active ? 'access-state access-state--active' : 'access-state'}>{member.active ? 'Активен' : 'Доступ отключён'}</span>
                <button className="button button--secondary button--small" type="button" onClick={() => openEditor(member)}>Управлять</button>
              </article>
            ))}
          </div>
        ) : <div className="list-state"><strong>Участники не найдены</strong><span>Измените выбранные фильтры.</span></div>}

      {editor && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setEditor(null) }}>
          <div className="dialog dialog--wide" role="dialog" aria-modal="true" aria-labelledby="member-dialog-title">
            <div className="dialog__heading"><div><p className="eyebrow">Управление доступом</p><h2 id="member-dialog-title">{editor.fullName}</h2><span>{editor.email}</span></div><button className="dialog__close" type="button" aria-label="Закрыть" onClick={() => setEditor(null)}>×</button></div>
            <form onSubmit={handleSave}>
              {error && <div className="alert alert--error" role="alert">{error}</div>}
              <div className="profile-photo-editor"><ProtectedAvatar className="profile-photo-editor__preview" name={editor.fullName} token={token} hasAvatar={editor.hasAvatar} version={editor.version} path={`/api/academies/${academy.id}/members/${editor.userId}/avatar`} /><label className="field"><span>Имя в академии</span><input name="displayName" defaultValue={editor.fullName} maxLength={200} required/><small>Отображается только внутри этой академии.</small></label><label className="field"><span>Фотография</span><input name="avatar" type="file" accept="image/jpeg,image/png,image/webp"/><small>JPEG, PNG или WebP, до 2 МБ.</small></label>{editor.hasAvatar && <button className="text-button text-button--danger" type="button" disabled={saving} onClick={() => void removeAvatar()}>Удалить фото</button>}</div>
              <div className="form-divider"><span>Роли</span></div>
              <div className="choice-grid choice-grid--three">
                {roles.map((role) => <label className={selectedRoles.includes(role) ? 'choice-card choice-card--selected' : 'choice-card'} key={role}><input type="checkbox" checked={selectedRoles.includes(role)} onChange={() => toggleRole(role)} /><span><strong>{roleLabels[role]}</strong><small>{role === 'ADMIN' ? 'Управляет всей академией' : role === 'COACH' ? 'Работает с назначенными группами' : 'Видит данные связанных детей'}</small></span></label>)}
              </div>
              <div className="form-divider"><span>Состояние доступа</span></div>
              <label className={active ? 'access-toggle access-toggle--active' : 'access-toggle'}><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} /><span><strong>{active ? 'Доступ включён' : 'Доступ отключён'}</strong><small>{active ? 'Пользователь может работать в академии согласно ролям.' : 'История сохранится, но академия станет недоступна.'}</small></span></label>
              <div className="dialog__actions"><button className="button button--secondary" type="button" onClick={() => setEditor(null)}>Отмена</button><button className="button" type="submit" disabled={saving}>{saving ? 'Сохраняем…' : 'Сохранить'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
