import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/model/useAuth'
import { BrandMark } from '../../shared/ui/BrandMark'
import { LanguageSwitcher } from '../../shared/ui/LanguageSwitcher'
import { useI18n } from '../../shared/i18n/useI18n'

export function AppLayout() {
  const { account, academies, isAuthenticated, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useI18n()
  const hasStaffAccess = academies.some((academy) =>
    academy.roles.includes('ADMIN') || academy.roles.includes('COACH'))
  const hasParentAccess = academies.some((academy) => academy.roles.includes('PARENT'))

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
        <Link className="brand-link" to="/" aria-label="JasTalant — главная">
          <BrandMark />
        </Link>
        <nav className="topbar__nav" aria-label="Основная навигация">
          {isAuthenticated ? (
            <>
              <NavLink className="topbar__mobile-dashboard" to="/dashboard">{t('common.dashboard')}</NavLink>
              {account?.platformRole === 'SUPER_ADMIN' ? (
                <><NavLink to="/platform/academies">{t('common.academies')}</NavLink><NavLink to="/platform/applications">{t('common.applications')}</NavLink></>
              ) : (
                <>
                  {hasStaffAccess && <NavLink to="/academy">{t('common.crm')}</NavLink>}
                  {hasParentAccess && <NavLink to="/parent">{t('common.children')}</NavLink>}
                  {!academies.length && <NavLink to="/application">{t('common.application')}</NavLink>}
                  <NavLink to="/dashboard">{t('common.dashboard')}</NavLink>
                </>
              )}
              <details className="account-menu">
                <summary><span>{(account?.fullName || 'J').slice(0, 1).toUpperCase()}</span>{account?.fullName || t('common.profile')}<i>⌄</i></summary>
                <div><Link to="/dashboard">{t('common.dashboard')}</Link><LanguageSwitcher /><button type="button" onClick={handleSignOut}>{t('common.logout')}</button></div>
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
      </header>

      <main>
        <Outlet />
      </main>

      <footer>
        <span>JasTalant</span>
        <span>Казахстан · 2026</span>
      </footer>
    </div>
  )
}
