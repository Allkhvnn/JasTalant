import { Link } from 'react-router-dom'
import { useAuth } from '../../features/auth/model/useAuth'
import { BrandMark } from '../../shared/ui/BrandMark'

const features = [
  {
    icon: '◎',
    title: 'Для академий',
    description: 'Вся работа клуба в одном месте',
  },
  {
    icon: '▦',
    title: 'Для тренеров',
    description: 'Расписание, составы и посещаемость',
  },
  {
    icon: '↗',
    title: 'Развитие игроков',
    description: 'Показатели и динамика каждого таланта',
  },
  {
    icon: '◇',
    title: 'Данные под защитой',
    description: 'Каждая академия работает изолированно',
  },
] as const

export function HomePage() {
  const { isAuthenticated } = useAuth()

  return (
    <main className="landing-home">
      <section className="landing-hero" id="about">
        <header className="landing-nav">
          <Link className="landing-nav__brand" to="/" aria-label="JasTalant — главная">
            <BrandMark />
          </Link>

          <nav className="landing-nav__links" aria-label="Навигация по главной странице">
            <a href="#about">О проекте</a>
            <a href="#features">Возможности</a>
            <Link to="/register">Для академий</Link>
          </nav>

          <div className="landing-nav__actions">
            {isAuthenticated ? (
              <Link className="landing-nav__login" to="/dashboard">Открыть кабинет</Link>
            ) : (
              <>
                <Link className="landing-nav__text-link" to="/login">Войти</Link>
                <Link className="landing-nav__login" to="/register">Подключиться</Link>
              </>
            )}
          </div>
        </header>

        <div className="landing-hero__content">
          <p className="landing-kicker"><span /> CRM для футбольных академий Казахстана</p>
          <h1>Больше, чем CRM.<br />Это история вашей<br />академии.</h1>
          <p>
            Единая цифровая платформа для администрации, тренеров и родителей.
            Управляйте командами и развивайте игроков на основе реальных данных.
          </p>
          <div className="landing-hero__actions">
            <Link className="landing-button landing-button--primary" to={isAuthenticated ? '/dashboard' : '/register'}>
              {isAuthenticated ? 'Открыть кабинет' : 'Подключить академию'}
            </Link>
            <a className="landing-button landing-button--ghost" href="#features">Узнать больше</a>
          </div>
        </div>

        <div className="landing-feature-strip" id="features" aria-label="Возможности JasTalant">
          {features.map((feature) => (
            <article key={feature.title}>
              <span aria-hidden="true">{feature.icon}</span>
              <div><strong>{feature.title}</strong><p>{feature.description}</p></div>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
