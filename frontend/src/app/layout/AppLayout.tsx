import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/model/useAuth'
import { BrandMark } from '../../shared/ui/BrandMark'
import { LanguageSwitcher } from '../../shared/ui/LanguageSwitcher'
import { useI18n } from '../../shared/i18n/useI18n'
import { MobileMenu } from '../../shared/ui/MobileMenu'

export function AppLayout() {
  const { account, academies, isAuthenticated, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useI18n()
  const hasStaffAccess = academies.some((academy) =>
    academy.roles.includes('ADMIN') || academy.roles.includes('COACH'))
  const hasParentAccess = academies.some((academy) => academy.roles.includes('PARENT'))
  const firstStaffAcademy = academies.find((academy) =>
    academy.roles.includes('ADMIN') || academy.roles.includes('COACH'))

  const handleSignOut = () => {
    signOut()
    navigate('/')
  }

  if (location.pathname === '/') {
    return <div className="landing-shell"><Outlet /></div>
  }

  if (location.pathname.startsWith('/academy')) {
    return <div className="crm-shell"><Outlet /></div>
  }

  return (
    <div className="page-shell">
      <header className="topbar">
        <Link className="brand-link" to="/" aria-label={t('layout.home')}>
          <BrandMark />
        </Link>
        <nav className="topbar__nav" aria-label={t('layout.navigation')}>
          {isAuthenticated ? (
            <>
              <NavLink className="topbar__mobile-dashboard" to="/dashboard">{t('common.dashboard')}</NavLink>
              {account?.platformRole === 'SUPER_ADMIN' ? (
                <><NavLink to="/platform/academies">{t('common.academies')}</NavLink><NavLink to="/platform/applications">{t('common.applications')}</NavLink><NavLink to="/platform/audit">{t('audit.title')}</NavLink></>
              ) : (
                <>
                  {hasStaffAccess && firstStaffAcademy && <NavLink to={`/academy/${firstStaffAcademy.academyId}`}>{t('common.crm')}</NavLink>}
                  {hasParentAccess && <NavLink to="/parent">{t('common.children')}</NavLink>}
                  {!academies.length && <NavLink to="/application">{t('common.application')}</NavLink>}
                  <NavLink to="/dashboard">{t('common.dashboard')}</NavLink>
                </>
              )}
              <details className="account-menu">
                <summary><span>{(account?.fullName || 'J').slice(0, 1).toUpperCase()}</span>{account?.fullName || t('common.profile')}<i>⌄</i></summary>
                <div><Link to="/dashboard">{t('common.dashboard')}</Link>{account?.platformRole === 'SUPER_ADMIN' && <Link to="/platform/audit">{t('audit.title')}</Link>}<LanguageSwitcher /><button type="button" onClick={handleSignOut}>{t('common.logout')}</button></div>
              </details>
            </>
          ) : (
            <>
              <LanguageSwitcher compact />
              <NavLink to="/login">{t('common.login')}</NavLink>
              <Link className="button button--small" to="/register">
                {t('common.connect')}
              </Link>
            </>
          )}
        </nav>
        <MobileMenu>{(close) => <>
          <nav className="mobile-menu__links" aria-label={t('layout.navigation')}>
            {isAuthenticated ? <>
              <NavLink to="/dashboard">{t('common.dashboard')}</NavLink>
              {account?.platformRole === 'SUPER_ADMIN' ? <>
                <NavLink to="/platform/academies">{t('common.academies')}</NavLink>
                <NavLink to="/platform/applications">{t('common.applications')}</NavLink>
                <NavLink to="/platform/audit">{t('audit.title')}</NavLink>
              </> : <>
                {hasStaffAccess && firstStaffAcademy && <NavLink to={`/academy/${firstStaffAcademy.academyId}`}>{t('common.crm')}</NavLink>}
                {hasParentAccess && <NavLink to="/parent">{t('common.children')}</NavLink>}
                {!academies.length && <NavLink to="/application">{t('common.application')}</NavLink>}
              </>}
            </> : <><NavLink to="/login">{t('common.login')}</NavLink><NavLink to="/register">{t('common.connect')}</NavLink></>}
          </nav>
          <LanguageSwitcher />
          {isAuthenticated && <>
            <p className="mobile-menu__account">{account?.fullName}</p>
            <button className="button button--secondary" type="button" onClick={() => { close(); handleSignOut() }}>{t('common.logout')}</button>
          </>}
        </>}</MobileMenu>
      </header>

      <main>
        <Outlet />
      </main>

      <footer>
        <span>JasTalant</span>
        <span>{t('layout.country')} · 2026</span>
      </footer>
    </div>
  )
}
