import { Link } from 'react-router-dom'
import { useAuth } from '../../features/auth/model/useAuth'

export function DashboardPage() {
  const { account, academies } = useAuth()

  if (account?.platformRole === 'SUPER_ADMIN') {
    return (
      <section className="centered-page">
        <div className="empty-state">
          <p className="eyebrow">Управление платформой</p>
          <h1>Панель владельца.</h1>
          <p>Проверяйте новые академии и принимайте решение по их заявкам.</p>
          <Link className="button" to="/platform/applications">Открыть заявки</Link>
        </div>
      </section>
    )
  }

  const staffMembership = academies.find((academy) =>
    academy.roles.includes('ADMIN') || academy.roles.includes('COACH'))
  const parentMembership = academies.find((academy) => academy.roles.includes('PARENT'))
  const isCoach = staffMembership?.roles.includes('COACH') && !staffMembership.roles.includes('ADMIN')

  if (staffMembership) {
    return (
      <section className="centered-page">
        <div className="empty-state">
          <p className="eyebrow">{isCoach ? 'Кабинет тренера' : 'Рабочее пространство'}</p>
          <h1>Добро пожаловать, {account?.fullName || 'пользователь'}.</h1>
          <p>{isCoach
            ? `Откройте назначенные группы академии «${staffMembership.academyName}» и отметьте посещаемость.`
            : `Управляйте академией «${staffMembership.academyName}».`}</p>
          <Link className="button" to={isCoach ? '/academy/attendance' : '/academy'}>
            {isCoach ? 'Открыть посещаемость' : 'Открыть CRM'}
          </Link>
          {parentMembership && <Link className="button button--secondary" to="/parent">Данные детей</Link>}
        </div>
      </section>
    )
  }

  return (
    <section className="centered-page">
      <div className="empty-state">
        <p className="eyebrow">Рабочее пространство</p>
        <h1>Добро пожаловать, {account?.fullName || 'пользователь'}.</h1>
        <p>{parentMembership
          ? `Просматривайте данные детей в академии «${parentMembership.academyName}».`
          : 'Заявка на подключение академии ожидает рассмотрения или ещё не создана.'}</p>
        <div className="hero__actions">
          {parentMembership
            ? <Link className="button" to="/parent">Открыть данные детей</Link>
            : <Link className="button button--secondary" to="/application">Посмотреть заявку</Link>}
        </div>
      </div>
    </section>
  )
}
