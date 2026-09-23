import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAcademy } from '../../entities/academy/model/useAcademy'
import { useAuth } from '../../features/auth/model/useAuth'
import { BrandMark } from '../../shared/ui/BrandMark'

const navigation = [
  { to: '/academy', end: true, icon: '⌂', label: 'Главная' },
  { to: '/academy/players', icon: '♙', label: 'Игроки' },
  { to: '/academy/groups', icon: '◉', label: 'Группы' },
  { to: '/academy/schedule', icon: '□', label: 'Расписание' },
  { to: '/academy/attendance', icon: '✓', label: 'Посещаемость' },
  { to: '/academy/development', icon: '↗', label: 'Развитие' },
] as const

export function AcademyLayout() {
  const { academy } = useAcademy()
  const { account, signOut } = useAuth()
  const navigate = useNavigate()
  const canManage = academy.roles.includes('ADMIN')

  const handleSignOut = () => {
    signOut()
    navigate('/')
  }

  return (
    <section className="academy-workspace">
      <aside className="academy-sidebar">
        <NavLink className="academy-sidebar__brand" to="/dashboard" aria-label="JasTalant — кабинет">
          <BrandMark />
        </NavLink>
        <div className="academy-sidebar__identity">
          <span className="academy-sidebar__mark">{academy.name.slice(0, 1).toUpperCase()}</span>
          <div>
            <span>Академия</span>
            <strong>{academy.name}</strong>
          </div>
        </div>
        <nav aria-label="Разделы академии">
          {navigation.map((item) => (
            <NavLink key={item.to} end={'end' in item && item.end} to={item.to}>
              <span aria-hidden="true">{item.icon}</span>{item.label}
            </NavLink>
          ))}
          {canManage && <NavLink to="/academy/members"><span aria-hidden="true">♧</span>Участники</NavLink>}
          {canManage && <NavLink to="/academy/invitations"><span aria-hidden="true">＋</span>Приглашения</NavLink>}
        </nav>
        <div className="academy-sidebar__footer">
          <NavLink to="/dashboard"><span aria-hidden="true">←</span>Кабинет</NavLink>
          <button type="button" onClick={handleSignOut}><span aria-hidden="true">↪</span>Выйти</button>
        </div>
      </aside>
      <div className="academy-content">
        <header className="crm-topbar">
          <div>
            <span>Рабочее пространство</span>
            <strong>{academy.name}</strong>
          </div>
          <div className="crm-topbar__right">
            <div className="crm-account">
              <span className="crm-account__avatar">{account?.fullName?.slice(0, 1).toUpperCase() || 'J'}</span>
              <div><strong>{account?.fullName || 'Пользователь'}</strong><span>{canManage ? 'Администратор' : 'Тренер'}</span></div>
            </div>
            <div className="crm-mobile-actions" aria-label="Действия аккаунта">
              <NavLink to="/dashboard">Кабинет</NavLink>
              <button type="button" onClick={handleSignOut}>Выйти</button>
            </div>
          </div>
        </header>
        <Outlet />
      </div>
    </section>
  )
}
