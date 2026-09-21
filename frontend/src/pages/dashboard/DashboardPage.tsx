import { Link } from 'react-router-dom'
import { useAuth } from '../../features/auth/model/useAuth'

export function DashboardPage() {
  const { account } = useAuth()

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

  return (
    <section className="centered-page">
      <div className="empty-state">
        <p className="eyebrow">Рабочее пространство</p>
        <h1>Добро пожаловать, {account?.fullName || 'пользователь'}.</h1>
        <p>
          Авторизация работает. На следующем этапе здесь появится панель, соответствующая вашей
          роли в академии.
        </p>
        <div className="hero__actions">
          <Link className="button" to="/academy">Открыть CRM</Link>
          <Link className="button button--secondary" to="/application">Посмотреть заявку</Link>
        </div>
      </div>
    </section>
  )
}
