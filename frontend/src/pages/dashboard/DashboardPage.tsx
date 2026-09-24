import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getApplications } from '../../entities/application/api/applicationApi'
import type { ApplicationStatus } from '../../entities/application/model/types'
import { getGroups } from '../../entities/group/api/groupApi'
import { getAcademyMembers } from '../../entities/membership/api/membershipApi'
import { getPlayers } from '../../entities/player/api/playerApi'
import { getTrainings } from '../../entities/training/api/trainingApi'
import { useAuth } from '../../features/auth/model/useAuth'
import { useI18n } from '../../shared/i18n/useI18n'

const statuses: ApplicationStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'EMAIL_UNVERIFIED']

function dateValue(offset = 0) {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  return date.toISOString().slice(0, 10)
}

export function DashboardPage() {
  const { account, academies, token } = useAuth()
  const { t } = useI18n()
  const [applicationCounts, setApplicationCounts] = useState<Record<string, number>>({})
  const [staffStats, setStaffStats] = useState<{ groups: number; players: number; trainings: number; coaches: number | null } | null>(null)
  const staff = academies.filter((academy) => academy.roles.includes('ADMIN') || academy.roles.includes('COACH'))
  const primaryStaff = staff[0]

  useEffect(() => {
    if (account?.platformRole !== 'SUPER_ADMIN' || !token) return
    let cancelled = false
    Promise.all(statuses.map(async (status) => [status, (await getApplications(token, status, 0, 1)).totalElements] as const))
      .then((items) => { if (!cancelled) setApplicationCounts(Object.fromEntries(items)) }).catch(() => undefined)
    return () => { cancelled = true }
  }, [account?.platformRole, token])

  useEffect(() => {
    if (!primaryStaff || !token) return
    let cancelled = false
    const canManage = primaryStaff.roles.includes('ADMIN')
    Promise.all([
      getGroups(token, primaryStaff.academyId, 0, 1), getPlayers(token, primaryStaff.academyId, 0, 1),
      getTrainings(token, primaryStaff.academyId, dateValue(), dateValue(7)),
      canManage ? getAcademyMembers(token, primaryStaff.academyId, 'COACH') : Promise.resolve(null),
    ]).then(([groups, players, trainings, coaches]) => {
      if (!cancelled) setStaffStats({ groups: groups.totalElements, players: players.totalElements, trainings: trainings.filter((item) => item.status === 'SCHEDULED').length, coaches: coaches?.filter((item) => item.active).length ?? null })
    }).catch(() => undefined)
    return () => { cancelled = true }
  }, [primaryStaff, token])

  if (account?.platformRole === 'SUPER_ADMIN') {
    const metrics = [['PENDING', 'dashboard.pending'], ['APPROVED', 'dashboard.approved'], ['REJECTED', 'dashboard.rejected'], ['EMAIL_UNVERIFIED', 'dashboard.unverified']] as const
    return <section className="role-dashboard"><header className="role-dashboard__heading"><div><p>{t('dashboard.platform')}</p><h1>{t('dashboard.hello', { name: account.fullName })}</h1><span>{t('dashboard.subtitle')}</span></div><Link className="button" to="/platform/applications">{t('dashboard.review')}</Link></header><div className="role-dashboard__metrics">{metrics.map(([status, label]) => <Link to={`/platform/applications?status=${status}`} key={status}><span>{t(label)}</span><strong>{applicationCounts[status] ?? '—'}</strong><em>→</em></Link>)}</div><section className="role-dashboard__panel"><div><p>{t('dashboard.pending')}</p><h2>{applicationCounts.PENDING ?? '—'}</h2><span>{t('dashboard.review')}</span></div><Link className="button button--secondary" to="/platform/applications">{t('dashboard.review')}</Link></section></section>
  }

  const parents = academies.filter((academy) => academy.roles.includes('PARENT'))
  const isAdmin = staff.some((item) => item.roles.includes('ADMIN'))
  const actions = isAdmin
    ? [['/academy', 'dashboard.openAcademy'], ['/academy/players', 'dashboard.players'], ['/academy/groups', 'dashboard.groups'], ['/academy/schedule', 'dashboard.schedule'], ['/academy/members', 'dashboard.members']] as const
    : [['/academy/attendance', 'dashboard.attendance'], ['/academy/schedule', 'dashboard.schedule'], ['/academy/groups', 'dashboard.groups'], ['/academy/development', 'dashboard.development']] as const

  return <section className="role-dashboard"><header className="role-dashboard__heading"><div><p>{t('dashboard.workspace')}</p><h1>{t('dashboard.hello', { name: account?.fullName || t('common.profile') })}</h1><span>{t('dashboard.subtitle')}</span></div></header>
    {staff.length > 0 && <><div className="role-dashboard__academies">{staff.map((academy) => <article key={academy.academyId}><span className="role-dashboard__avatar">{academy.academyName.slice(0, 1).toUpperCase()}</span><div><small>{academy.roles.includes('ADMIN') ? t('dashboard.admin') : t('dashboard.coach')}</small><h2>{academy.academyName}</h2></div><Link to="/academy">→</Link></article>)}</div><div className="role-dashboard__metrics role-dashboard__metrics--staff"><Link to="/academy/groups"><span>{t('dashboard.groups')}</span><strong>{staffStats?.groups ?? '—'}</strong><em>→</em></Link><Link to="/academy/players"><span>{t('dashboard.players')}</span><strong>{staffStats?.players ?? '—'}</strong><em>→</em></Link><Link to="/academy/schedule"><span>{t('dashboard.next7')}</span><strong>{staffStats?.trainings ?? '—'}</strong><em>→</em></Link>{isAdmin && <Link to="/academy/members"><span>{t('dashboard.coaches')}</span><strong>{staffStats?.coaches ?? '—'}</strong><em>→</em></Link>}</div><nav className="role-dashboard__actions" aria-label={t('dashboard.workspace')}>{actions.map(([to, label], index) => <Link to={to} key={to}><span>{String(index + 1).padStart(2, '0')}</span><strong>{t(label)}</strong><em>→</em></Link>)}</nav></>}
    {parents.length > 0 && <section className="role-dashboard__panel"><div><p>{t('dashboard.parent')}</p><h2>{parents[0].academyName}</h2><span>{t('dashboard.childData')}</span></div><Link className="button" to="/parent">{t('dashboard.childData')}</Link></section>}
    {!staff.length && !parents.length && <section className="role-dashboard__panel role-dashboard__panel--empty"><div><p>{t('common.application')}</p><h2>{t('dashboard.noAcademy')}</h2><span>{t('dashboard.noAcademyText')}</span></div><Link className="button" to="/application">{t('dashboard.viewApplication')}</Link></section>}
  </section>
}
