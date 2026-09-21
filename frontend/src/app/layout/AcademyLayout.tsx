import { NavLink, Outlet } from 'react-router-dom'
import { useAcademy } from '../../entities/academy/model/useAcademy'

export function AcademyLayout() {
  const { academy } = useAcademy()
  const canManage = academy.roles.includes('ADMIN')

  return (
    <section className="academy-workspace">
      <aside className="academy-sidebar">
        <div className="academy-sidebar__identity">
          <span className="academy-sidebar__mark">{academy.name.slice(0, 1).toUpperCase()}</span>
          <div>
            <span>Академия</span>
            <strong>{academy.name}</strong>
          </div>
        </div>
        <nav aria-label="Разделы академии">
          <NavLink end to="/academy">Обзор</NavLink>
          <NavLink to="/academy/groups">Группы</NavLink>
          <NavLink to="/academy/players">Игроки</NavLink>
          <NavLink to="/academy/attendance">Посещаемость</NavLink>
          {canManage && <NavLink to="/academy/invitations">Приглашения</NavLink>}
        </nav>
      </aside>
      <div className="academy-content">
        <Outlet />
      </div>
    </section>
  )
}
