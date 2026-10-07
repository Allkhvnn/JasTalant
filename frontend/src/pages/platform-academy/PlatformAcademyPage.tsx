import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getPlatformAcademy, updatePlatformAcademyStatus } from '../../entities/platform-academy/api/platformAcademyApi'
import type { AcademyStatus, PlatformAcademy } from '../../entities/platform-academy/model/types'
import { useAuth } from '../../features/auth/model/useAuth'
import { errorMessage } from '../../shared/api/apiClient'
import { useI18n } from '../../shared/i18n/useI18n'

export function PlatformAcademyPage() {
  const { academyId = '' } = useParams()
  const { token } = useAuth()
  const { t, intlLocale } = useI18n()
  const labels: Record<AcademyStatus, string> = { ACTIVE: t('platform.active'), SUSPENDED: t('platform.suspended'), ARCHIVED: t('platform.archived') }
  const date = new Intl.DateTimeFormat(intlLocale, { day: 'numeric', month: 'long', year: 'numeric' })
  const [academy, setAcademy] = useState<PlatformAcademy | null>(null)
  const [targetStatus, setTargetStatus] = useState<AcademyStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!token || !academyId) return
    let cancelled = false
    getPlatformAcademy(token, academyId).then((data) => { if (!cancelled) setAcademy(data) })
      .catch((requestError: unknown) => { if (!cancelled) setError(errorMessage(requestError)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [academyId, token])

  const submitStatus = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!token || !academy || !targetStatus) return
    const reason = String(new FormData(event.currentTarget).get('reason') || '').trim()
    setSaving(true); setError(''); setNotice('')
    try {
      const updated = await updatePlatformAcademyStatus(token, academy.id, targetStatus, reason, academy.version)
      setAcademy(updated); setTargetStatus(null); setNotice(t('platform.statusChanged', { status: labels[updated.status] }))
    } catch (requestError) { setError(errorMessage(requestError)) } finally { setSaving(false) }
  }

  if (loading) return <section className="admin-page"><div className="list-state">{t('platform.loadingAcademy')}</div></section>
  if (!academy) return <section className="admin-page"><div className="alert alert--error">{error || t('platform.academyNotFound')}</div></section>
  const actions: Array<{ status: AcademyStatus; label: string; tone?: string }> = academy.status === 'ACTIVE'
    ? [{ status: 'SUSPENDED', label: t('platform.suspend') }, { status: 'ARCHIVED', label: t('platform.archive'), tone: 'danger' }]
    : [{ status: 'ACTIVE', label: t('platform.restore') }, ...(academy.status === 'SUSPENDED' ? [{ status: 'ARCHIVED' as AcademyStatus, label: t('platform.archive'), tone: 'danger' }] : [])]

  return <section className="admin-page platform-academy-detail">
    <Link className="back-link" to="/platform/academies">← {t('platform.allAcademies')}</Link>
    <div className="admin-heading"><div><span className={`status-pill status-pill--${academy.status.toLowerCase()}`}>{labels[academy.status]}</span><h1>{academy.name}</h1><p>{t('platform.createdAt', { date: date.format(new Date(academy.createdAt)) })}</p></div><div className="platform-academy-actions">{actions.map((action) => <button key={action.status} type="button" className={action.tone === 'danger' ? 'button button--danger' : 'button button--secondary'} onClick={() => setTargetStatus(action.status)}>{action.label}</button>)}</div></div>
    {error && <div className="alert alert--error" role="alert">{error}</div>}{notice && <div className="alert alert--success" role="status">{notice}</div>}
    {academy.statusReason && <div className="academy-status-note"><strong>{t('platform.statusReason')}</strong><p>{academy.statusReason}</p>{academy.statusChangedAt && <small>{date.format(new Date(academy.statusChangedAt))}</small>}</div>}
    <div className="platform-academy-stats"><article><strong>{academy.playerCount}</strong><span>{t('platform.players')}</span></article><article><strong>{academy.groupCount}</strong><span>{t('platform.groups')}</span></article><article><strong>{academy.activeCoachCount}</strong><span>{t('platform.activeCoaches')}</span></article><article><strong>{academy.activeMemberCount}</strong><span>{t('platform.members')}</span></article></div>
    <section className="platform-academy-section"><div><p className="eyebrow">{t('platform.responsible')}</p><h2>{t('platform.admins')}</h2></div>{academy.administrators.length ? <div className="platform-admin-list">{academy.administrators.map((admin) => <article key={admin.userId}><span>{admin.fullName.slice(0, 1).toUpperCase()}</span><div><strong>{admin.fullName}</strong><a href={`mailto:${admin.email}`}>{admin.email}</a></div></article>)}</div> : <div className="list-state"><span>{t('platform.noActiveAdmins')}</span></div>}</section>
    {targetStatus && <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target && !saving) setTargetStatus(null) }}><form className="dialog-card" onSubmit={submitStatus}><p className="eyebrow">{t('platform.accessChange')}</p><h2>{labels[targetStatus]}</h2><p>{targetStatus === 'ACTIVE' ? t('platform.restoreText') : t('platform.disableText')}</p>{targetStatus !== 'ACTIVE' && <label>{t('platform.reason')}<textarea name="reason" required maxLength={500} rows={4} placeholder={t('platform.reasonHint')}/></label>}<div className="dialog-card__actions"><button type="button" className="button button--secondary" disabled={saving} onClick={() => setTargetStatus(null)}>{t('common.cancel')}</button><button type="submit" className="button" disabled={saving}>{saving ? t('common.saving') : t('platform.confirm')}</button></div></form></div>}
  </section>
}
