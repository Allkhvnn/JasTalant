import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAcademy } from '../../entities/academy/model/useAcademy'
import { useAuth } from '../../features/auth/model/useAuth'
import { BrandMark } from '../../shared/ui/BrandMark'
import { useI18n } from '../../shared/i18n/useI18n'
import { LanguageSwitcher } from '../../shared/ui/LanguageSwitcher'

export function AcademyLayout() {
  const { academy, academyPath } = useAcademy()
  const { account, academies, signOut } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const canManage = academy.roles.includes('ADMIN')
  const staffAcademies = academies.filter((item) =>
    item.roles.includes('ADMIN') || item.roles.includes('COACH'))
  const navigation = [
    { path: '', end: true, icon: '⌂', label: t('academy.nav.home') },
    { path: 'players', icon: '♙', label: t('academy.nav.players') },
    { path: 'groups', icon: '◉', label: t('academy.nav.groups') },
    { path: 'schedule', icon: '□', label: t('academy.nav.schedule') },
    { path: 'attendance', icon: '✓', label: t('academy.nav.attendance') },
    { path: 'development', icon: '↗', label: t('academy.nav.development') },
  ]

  const handleSignOut = () => {
    signOut()
    navigate('/')
  }

  return (
    <section className="academy-workspace">
      <aside className="academy-sidebar">
        <NavLink className="academy-sidebar__brand" to="/dashboard" aria-label={`JasTalant — ${t('common.dashboard')}`}>
          <BrandMark />
        </NavLink>
        <div className="academy-sidebar__identity">
          <span className="academy-sidebar__mark">{academy.name.slice(0, 1).toUpperCase()}</span>
          <div>
            <span>{t('academy.label')}</span>
            <strong>{academy.name}</strong>
          </div>
        </div>
        <nav aria-label={t('academy.workspace')}>
          {navigation.map((item) => (
            <NavLink key={item.path} end={'end' in item && item.end} to={academyPath(item.path)}>
              <span aria-hidden="true">{item.icon}</span>{item.label}
            </NavLink>
          ))}
          {canManage && <NavLink to={academyPath('members')}><span aria-hidden="true">♧</span>{t('academy.nav.members')}</NavLink>}
          {canManage && <NavLink to={academyPath('invitations')}><span aria-hidden="true">＋</span>{t('academy.nav.invitations')}</NavLink>}
        </nav>
        <div className="academy-sidebar__footer">
          <NavLink to="/dashboard"><span aria-hidden="true">←</span>{t('academy.nav.back')}</NavLink>
          <button type="button" onClick={handleSignOut}><span aria-hidden="true">↪</span>{t('common.logout')}</button>
        </div>
      </aside>
      <div className="academy-content">
        <header className="crm-topbar">
          <div>
            <span>{t('academy.workspace')}</span>
            <strong>{academy.name}</strong>
          </div>
          <div className="crm-topbar__right">
            {staffAcademies.length > 1 && (
              <label className="academy-switcher">
                <span>{t('academy.label')}</span>
                <select value={academy.id} onChange={(event) => navigate(`/academy/${event.target.value}`)}>
                  {staffAcademies.map((item) => (
                    <option value={item.academyId} key={item.academyId}>{item.academyName}</option>
                  ))}
                </select>
              </label>
            )}
            <LanguageSwitcher />
            <div className="crm-account">
              <span className="crm-account__avatar">{account?.fullName?.slice(0, 1).toUpperCase() || 'J'}</span>
              <div><strong>{account?.fullName || t('common.profile')}</strong><span>{canManage ? t('dashboard.admin') : t('dashboard.coach')}</span></div>
            </div>
            <div className="crm-mobile-actions" aria-label={t('academy.accountActions')}>
              <NavLink to="/dashboard">{t('common.dashboard')}</NavLink>
              <button type="button" onClick={handleSignOut}>{t('common.logout')}</button>
            </div>
          </div>
        </header>
        <Outlet />
      </div>
    </section>
  )
}
