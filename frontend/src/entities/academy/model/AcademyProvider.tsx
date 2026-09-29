import { useMemo, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../../features/auth/model/useAuth'
import { AcademyContext, type AcademyContextValue } from './AcademyContext'

export function AcademyProvider({ children }: { children: ReactNode }) {
  const { academies, loading, token } = useAuth()
  const { academyId = '' } = useParams()

  const value = useMemo<AcademyContextValue | null>(
    () => {
      const membership = academies.find((item) => item.academyId === academyId
        && (item.roles.includes('ADMIN') || item.roles.includes('COACH')))
      return membership && token
        ? {
            academy: {
              id: membership.academyId,
              name: membership.academyName,
              roles: membership.roles,
            },
            token,
            basePath: `/academy/${membership.academyId}`,
            academyPath: (path = '') => `/academy/${membership.academyId}${path ? `/${path.replace(/^\//, '')}` : ''}`,
          }
        : null
    },
    [academies, academyId, token],
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
