import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/model/useAuth'
import { BrandMark } from '../../shared/ui/BrandMark'

export function AppLayout() {
  const { account, isAuthenticated, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = () => {
    signOut()
    navigate('/')
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
                  <NavLink to="/academy">CRM</NavLink>
                  <NavLink to="/application">Заявка</NavLink>
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
