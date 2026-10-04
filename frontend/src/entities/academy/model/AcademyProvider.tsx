import { useMemo, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../../features/auth/model/useAuth'
import { AcademyContext, type AcademyContextValue } from './AcademyContext'
import { useI18n } from '../../../shared/i18n/useI18n'

export function AcademyProvider({ children }: { children: ReactNode }) {
  const { academies, loading, token } = useAuth()
  const { t } = useI18n()
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
    return <div className="page-loader">{t('academy.access.loading')}</div>
  }

  if (!value) {
    return (
      <section className="centered-page">
        <div className="empty-state">
          <p className="eyebrow">{t('academy.access.eyebrow')}</p>
          <h1>{t('academy.access.title')}</h1>
          <p>{t('academy.access.text')}</p>
          <Link className="button button--secondary" to="/dashboard">{t('academy.access.back')}</Link>
        </div>
      </section>
    )
  }

  return <AcademyContext.Provider value={value}>{children}</AcademyContext.Provider>
}
