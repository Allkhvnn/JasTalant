import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAcademy } from '../../entities/academy/model/useAcademy'
import { deleteAcademyMemberAvatar, getAcademyMembers, updateAcademyMember, uploadAcademyMemberAvatar } from '../../entities/membership/api/membershipApi'
import type { AcademyMember } from '../../entities/membership/model/types'
import { errorMessage } from '../../shared/api/apiClient'
import type { AcademyRole } from '../../shared/api/types'
import { ProtectedAvatar } from '../../shared/ui/ProtectedAvatar'
import { useI18n } from '../../shared/i18n/useI18n'

const roles: AcademyRole[] = ['ADMIN', 'COACH', 'PARENT']

export function MembersPage() {
  const { academy, token, academyPath } = useAcademy()
  const { t } = useI18n()
  const roleLabels: Record<AcademyRole, string> = { ADMIN: t('dashboard.admin'), COACH: t('dashboard.coach'), PARENT: t('dashboard.parent') }
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
      setError(t('members.roleRequired'))
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
      setNotice(t(active ? 'members.updated' : 'members.deactivated'))
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
      setNotice(t('members.photoRemoved'))
      setReloadKey((value) => value + 1)
    } catch (requestError) { setError(errorMessage(requestError)) } finally { setSaving(false) }
  }

  return (
    <div className="workspace-page members-page">
      <div className="workspace-heading workspace-heading--actions">
        <div><p className="eyebrow">{t('members.access')}</p><h1>{t('dashboard.members')}</h1><p>{t('members.intro')}</p></div>
        <Link className="button" to={academyPath('invitations')}>{t('members.invite')}</Link>
      </div>

      {error && <div className="alert alert--error" role="alert">{error}</div>}
      {notice && <div className="alert alert--success" role="status">{notice}</div>}

      <div className="list-toolbar members-toolbar">
        <label><span>{t('members.role')}</span><select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as AcademyRole | '')}><option value="">{t('members.allRoles')}</option>{roles.map((role) => <option value={role} key={role}>{roleLabels[role]}</option>)}</select></label>
        <label><span>{t('members.access')}</span><select value={accessFilter} onChange={(event) => setAccessFilter(event.target.value as typeof accessFilter)}><option value="ALL">{t('members.all')}</option><option value="ACTIVE">{t('members.active')}</option><option value="DISABLED">{t('members.disabled')}</option></select></label>
        <span>{t('members.count', { count: filtered.length })}</span>
      </div>

      {loading ? <div className="list-state">{t('members.loading')}</div>
        : filtered.length ? (
          <div className="member-list">
            {filtered.map((member) => (
              <article className={member.active ? 'member-card' : 'member-card member-card--disabled'} key={member.membershipId}>
                <ProtectedAvatar className="member-card__avatar" name={member.fullName} token={token}
                  hasAvatar={member.hasAvatar} version={member.version}
                  path={`/api/academies/${academy.id}/members/${member.userId}/avatar`} />
                <div className="member-card__identity"><h2>{member.fullName}</h2><p>{member.email}</p><div>{member.roles.map((role) => <span className="role-pill" key={role}>{roleLabels[role]}</span>)}</div></div>
                <span className={member.active ? 'access-state access-state--active' : 'access-state'}>{t(member.active ? 'members.active' : 'members.accessDisabled')}</span>
                <button className="button button--secondary button--small" type="button" onClick={() => openEditor(member)}>{t('members.manage')}</button>
              </article>
            ))}
          </div>
        ) : <div className="list-state"><strong>{t('members.notFound')}</strong><span>{t('members.changeFilters')}</span></div>}

      {editor && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setEditor(null) }}>
          <div className="dialog dialog--wide" role="dialog" aria-modal="true" aria-labelledby="member-dialog-title">
            <div className="dialog__heading"><div><p className="eyebrow">{t('members.manageAccess')}</p><h2 id="member-dialog-title">{editor.fullName}</h2><span>{editor.email}</span></div><button className="dialog__close" type="button" aria-label={t('common.close')} onClick={() => setEditor(null)}>×</button></div>
            <form onSubmit={handleSave}>
              {error && <div className="alert alert--error" role="alert">{error}</div>}
              <div className="profile-photo-editor"><ProtectedAvatar className="profile-photo-editor__preview" name={editor.fullName} token={token} hasAvatar={editor.hasAvatar} version={editor.version} path={`/api/academies/${academy.id}/members/${editor.userId}/avatar`} /><label className="field"><span>{t('members.academyName')}</span><input name="displayName" defaultValue={editor.fullName} maxLength={200} required/><small>{t('members.academyNameHint')}</small></label><label className="field"><span>{t('members.photo')}</span><input name="avatar" type="file" accept="image/jpeg,image/png,image/webp"/><small>{t('members.photoHint')}</small></label>{editor.hasAvatar && <button className="text-button text-button--danger" type="button" disabled={saving} onClick={() => void removeAvatar()}>{t('members.removePhoto')}</button>}</div>
              <div className="form-divider"><span>{t('members.roles')}</span></div>
              <div className="choice-grid choice-grid--three">
                {roles.map((role) => <label className={selectedRoles.includes(role) ? 'choice-card choice-card--selected' : 'choice-card'} key={role}><input type="checkbox" checked={selectedRoles.includes(role)} onChange={() => toggleRole(role)} /><span><strong>{roleLabels[role]}</strong><small>{t(role === 'ADMIN' ? 'members.adminScope' : role === 'COACH' ? 'members.coachScope' : 'members.parentScope')}</small></span></label>)}
              </div>
              <div className="form-divider"><span>{t('members.accessState')}</span></div>
              <label className={active ? 'access-toggle access-toggle--active' : 'access-toggle'}><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} /><span><strong>{t(active ? 'members.enabled' : 'members.accessDisabled')}</strong><small>{t(active ? 'members.enabledText' : 'members.disabledText')}</small></span></label>
              <div className="dialog__actions"><button className="button button--secondary" type="button" onClick={() => setEditor(null)}>{t('common.cancel')}</button><button className="button" type="submit" disabled={saving}>{t(saving ? 'common.saving' : 'common.save')}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
