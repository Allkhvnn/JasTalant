import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../features/auth/model/useAuth'
import { AcademyContext, type AcademyContextValue } from './AcademyContext'

export function AcademyProvider({ children }: { children: ReactNode }) {
  const { academies, loading, token } = useAuth()

  const value = useMemo<AcademyContextValue | null>(
    () => {
      const membership = academies.find((item) => item.roles.includes('ADMIN'))
        ?? academies.find((item) => item.roles.includes('COACH'))
      return membership && token
        ? {
            academy: {
              id: membership.academyId,
              name: membership.academyName,
              roles: membership.roles,
            },
            token,
          }
        : null
    },
    [academies, token],
  )

  if (loading) {
    return <div className="page-loader">Открываем академию…</div>
  }

  if (!value) {
    return (
      <section className="centered-page">
        <div className="empty-state">
          <p className="eyebrow">Доступ к CRM</p>
          <h1>Академия недоступна.</h1>
          <p>Для этого аккаунта пока нет роли администратора или тренера.</p>
          <Link className="button button--secondary" to="/dashboard">Вернуться в кабинет</Link>
        </div>
      </section>
    )
  }

  return <AcademyContext.Provider value={value}>{children}</AcademyContext.Provider>
}
