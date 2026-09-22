import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/model/useAuth'
import { BrandMark } from '../../shared/ui/BrandMark'

export function AppLayout() {
  const { account, academies, isAuthenticated, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const hasStaffAccess = academies.some((academy) =>
    academy.roles.includes('ADMIN') || academy.roles.includes('COACH'))
  const hasParentAccess = academies.some((academy) => academy.roles.includes('PARENT'))

  const handleSignOut = () => {
    signOut()
    navigate('/')
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
              {account?.platformRole === 'SUPER_ADMIN' ? (
                <NavLink to="/platform/applications">Заявки</NavLink>
              ) : (
                <>
                  {hasStaffAccess && <NavLink to="/academy">CRM</NavLink>}
                  {hasParentAccess && <NavLink to="/parent">Дети</NavLink>}
                  {!academies.length && <NavLink to="/application">Заявка</NavLink>}
                  <NavLink to="/dashboard">Кабинет</NavLink>
                </>
              )}
              <span className="topbar__account">{account?.fullName || 'Профиль'}</span>
              <button className="text-button" type="button" onClick={handleSignOut}>
                Выйти
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login">Войти</NavLink>
              <Link className="button button--small" to="/register">
                Подключить академию
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
