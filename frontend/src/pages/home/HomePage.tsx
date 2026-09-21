import { Link } from 'react-router-dom'

const roles = [
  {
    code: '01',
    title: 'Академия',
    description: 'Группы, игроки, тренеры и единое рабочее пространство.',
  },
  {
    code: '02',
    title: 'Тренеры',
    description: 'Составы команд, расписание и посещаемость игроков.',
  },
  {
    code: '03',
    title: 'Родители',
    description: 'Данные и показатели только своего ребёнка.',
  },
]

export function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="hero__copy">
          <p className="eyebrow">
            <span className="eyebrow__dot" />
            CRM для футбольных академий
          </p>
          <h1>
            Управление академией.
            <span> В одном месте.</span>
          </h1>
          <p className="hero__lead">
            JasTalant объединяет администрацию, тренеров и родителей, сохраняя данные каждой
            академии изолированными.
          </p>
          <div className="hero__actions">
            <Link className="button" to="/register">
              Подключить академию
            </Link>
            <Link className="button button--secondary" to="/login">
              Войти в систему
            </Link>
          </div>
        </div>

        <div className="pitch" aria-hidden="true">
          <span className="pitch__line pitch__line--center" />
          <span className="pitch__circle" />
          <span className="pitch__box pitch__box--left" />
          <span className="pitch__box pitch__box--right" />
          <span className="pitch__ball">+</span>
        </div>
      </section>

      <section className="role-grid" aria-label="Возможности платформы">
        {roles.map((role) => (
          <article className="role-card" key={role.code}>
            <span className="role-card__code">{role.code}</span>
            <h2>{role.title}</h2>
            <p>{role.description}</p>
          </article>
        ))}
      </section>
    </>
  )
}

