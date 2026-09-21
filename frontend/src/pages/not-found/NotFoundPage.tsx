import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <section className="centered-page">
      <div className="empty-state">
        <p className="eyebrow">Ошибка 404</p>
        <h1>Страница не найдена.</h1>
        <Link className="button" to="/">Вернуться на главную</Link>
      </div>
    </section>
  )
}
