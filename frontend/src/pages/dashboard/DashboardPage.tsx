import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getApplications } from '../../entities/application/api/applicationApi'
import { getPlatformAcademies } from '../../entities/platform-academy/api/platformAcademyApi'
import type { ApplicationStatus } from '../../entities/application/model/types'
import { getAcademyDashboard } from '../../entities/academy/api/academyApi'
import type { AcademyDashboard } from '../../entities/academy/model/types'
import { useAuth } from '../../features/auth/model/useAuth'
import { useI18n } from '../../shared/i18n/useI18n'

const statuses: ApplicationStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'EMAIL_UNVERIFIED']

export function DashboardPage() {
  const { account, academies, token } = useAuth()
  const { t } = useI18n()
  const [applicationCounts, setApplicationCounts] = useState<Record<string, number>>({})
  const [academyCounts, setAcademyCounts] = useState<Record<string, number>>({})
  const [staffStats, setStaffStats] = useState<AcademyDashboard | null>(null)
  const staff = academies.filter((academy) => academy.roles.includes('ADMIN') || academy.roles.includes('COACH'))
  const primaryStaff = staff[0]

  useEffect(() => {
    if (account?.platformRole !== 'SUPER_ADMIN' || !token) return
    let cancelled = false
    Promise.all([
      Promise.all(statuses.map(async (status) => [status, (await getApplications(token, status, 0, 1)).totalElements] as const)),
      Promise.all((['ACTIVE', 'SUSPENDED', 'ARCHIVED'] as const).map(async (status) => [status, (await getPlatformAcademies(token, { status, size: 1 })).totalElements] as const)),
    ]).then(([applications, academies]) => { if (!cancelled) { setApplicationCounts(Object.fromEntries(applications)); setAcademyCounts(Object.fromEntries(academies)) } }).catch(() => undefined)
    return () => { cancelled = true }
  }, [account?.platformRole, token])

  useEffect(() => {
    if (!primaryStaff || !token) return
    let cancelled = false
    getAcademyDashboard(token, primaryStaff.academyId)
      .then((stats) => { if (!cancelled) setStaffStats(stats) })
      .catch(() => undefined)
    return () => { cancelled = true }
  }, [primaryStaff, token])

  if (account?.platformRole === 'SUPER_ADMIN') {
    const metrics = [['PENDING', 'dashboard.pending'], ['APPROVED', 'dashboard.approved'], ['REJECTED', 'dashboard.rejected'], ['EMAIL_UNVERIFIED', 'dashboard.unverified']] as const
    return <section className="role-dashboard"><header className="role-dashboard__heading"><div><p>{t('dashboard.platform')}</p><h1>{t('dashboard.hello', { name: account.fullName })}</h1><span>{t('dashboard.subtitle')}</span></div><Link className="button" to="/platform/academies">{t('dashboard.manageAcademies')}</Link></header><div className="role-dashboard__metrics">{metrics.map(([status, label]) => <Link to={`/platform/applications?status=${status}`} key={status}><span>{t(label)}</span><strong>{applicationCounts[status] ?? '—'}</strong><em>→</em></Link>)}</div><section className="role-dashboard__panel role-dashboard__panel--platform"><div><p>{t('common.academies')}</p><h2>{(academyCounts.ACTIVE ?? 0) + (academyCounts.SUSPENDED ?? 0) + (academyCounts.ARCHIVED ?? 0)}</h2><span>{t('dashboard.academyBreakdown', { active: academyCounts.ACTIVE ?? '—', suspended: academyCounts.SUSPENDED ?? '—', archived: academyCounts.ARCHIVED ?? '—' })}</span></div><div className="role-dashboard__platform-actions"><Link className="button" to="/platform/academies">{t('dashboard.manageAcademies')}</Link><Link className="button button--secondary" to="/platform/applications">{t('dashboard.review')}</Link></div></section></section>
  }

  const parents = academies.filter((academy) => academy.roles.includes('PARENT'))
  const basePath = primaryStaff ? `/academy/${primaryStaff.academyId}` : ''
  const isAdmin = primaryStaff?.roles.includes('ADMIN') ?? false
  const actions = isAdmin
    ? [[basePath, 'dashboard.openAcademy'], [`${basePath}/players`, 'dashboard.players'], [`${basePath}/groups`, 'dashboard.groups'], [`${basePath}/schedule`, 'dashboard.schedule'], [`${basePath}/members`, 'dashboard.members']] as const
    : [[`${basePath}/attendance`, 'dashboard.attendance'], [`${basePath}/schedule`, 'dashboard.schedule'], [`${basePath}/groups`, 'dashboard.groups'], [`${basePath}/development`, 'dashboard.development']] as const

  return <section className="role-dashboard"><header className="role-dashboard__heading"><div><p>{t('dashboard.workspace')}</p><h1>{t('dashboard.hello', { name: account?.fullName || t('common.profile') })}</h1><span>{t('dashboard.subtitle')}</span></div></header>
    {staff.length > 0 && <><div className="role-dashboard__academies">{staff.map((academy) => <article key={academy.academyId}><span className="role-dashboard__avatar">{academy.academyName.slice(0, 1).toUpperCase()}</span><div><small>{academy.roles.includes('ADMIN') ? t('dashboard.admin') : t('dashboard.coach')}</small><h2>{academy.academyName}</h2></div><Link to={`/academy/${academy.academyId}`}>→</Link></article>)}</div><div className="role-dashboard__metrics role-dashboard__metrics--staff"><Link to={`${basePath}/groups`}><span>{t('dashboard.groups')}</span><strong>{staffStats?.groupCount ?? '—'}</strong><em>→</em></Link><Link to={`${basePath}/players`}><span>{t('dashboard.players')}</span><strong>{staffStats?.playerCount ?? '—'}</strong><em>→</em></Link><Link to={`${basePath}/schedule`}><span>{t('dashboard.next7')}</span><strong>{staffStats?.upcomingTrainingCount ?? '—'}</strong><em>→</em></Link>{isAdmin && <Link to={`${basePath}/members`}><span>{t('dashboard.coaches')}</span><strong>{staffStats?.activeCoachCount ?? '—'}</strong><em>→</em></Link>}</div><nav className="role-dashboard__actions" aria-label={t('dashboard.workspace')}>{actions.map(([to, label], index) => <Link to={to} key={to}><span>{String(index + 1).padStart(2, '0')}</span><strong>{t(label)}</strong><em>→</em></Link>)}</nav></>}
    {parents.length > 0 && <section className="role-dashboard__panel"><div><p>{t('dashboard.parent')}</p><h2>{parents[0].academyName}</h2><span>{t('dashboard.childData')}</span></div><Link className="button" to="/parent">{t('dashboard.childData')}</Link></section>}
    {!staff.length && !parents.length && <section className="role-dashboard__panel role-dashboard__panel--empty"><div><p>{t('common.application')}</p><h2>{t('dashboard.noAcademy')}</h2><span>{t('dashboard.noAcademyText')}</span></div><Link className="button" to="/application">{t('dashboard.viewApplication')}</Link></section>}
  </section>
}
