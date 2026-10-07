import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getPlatformAcademies } from '../../entities/platform-academy/api/platformAcademyApi'
import type { AcademyStatus, PlatformAcademyPage } from '../../entities/platform-academy/model/types'
import { useAuth } from '../../features/auth/model/useAuth'
import { errorMessage } from '../../shared/api/apiClient'
import { useI18n } from '../../shared/i18n/useI18n'

const PAGE_SIZE = 12
const filterValues: Array<AcademyStatus | 'ALL'> = ['ALL', 'ACTIVE', 'SUSPENDED', 'ARCHIVED']

export function PlatformAcademiesPage() {
  const { token } = useAuth()
  const { t } = useI18n()
  const filters = [
    { value: 'ALL' as const, label: t('platform.all') }, { value: 'ACTIVE' as const, label: t('platform.activePlural') },
    { value: 'SUSPENDED' as const, label: t('platform.suspendedPlural') }, { value: 'ARCHIVED' as const, label: t('platform.archived') },
  ]
  const statusLabels: Record<AcademyStatus, string> = {
    ACTIVE: t('platform.active'), SUSPENDED: t('platform.suspended'), ARCHIVED: t('platform.archived'),
  }
  const [searchParams, setSearchParams] = useSearchParams()
  const rawStatus = searchParams.get('status')
  const status = filterValues.includes(rawStatus as AcademyStatus | 'ALL') ? rawStatus as AcademyStatus | 'ALL' : 'ALL'
  const search = searchParams.get('search') || ''
  const page = Math.max(0, Number(searchParams.get('page')) || 0)
  const [result, setResult] = useState<PlatformAcademyPage | null>(null)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    let cancelled = false
    getPlatformAcademies(token, { status: status === 'ALL' ? undefined : status, search, page, size: PAGE_SIZE })
      .then((data) => { if (!cancelled) setResult(data) })
      .catch((requestError: unknown) => { if (!cancelled) setError(errorMessage(requestError)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [page, search, status, token])

  useEffect(() => {
    if (!token) return
    let cancelled = false
    Promise.all(filterValues.map(async (value) => [value, (await getPlatformAcademies(token, {
      status: value === 'ALL' ? undefined : value, size: 1,
    })).totalElements] as const)).then((items) => {
      if (!cancelled) setCounts(Object.fromEntries(items))
    }).catch(() => undefined)
    return () => { cancelled = true }
  }, [token])

  const applySearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = String(new FormData(event.currentTarget).get('search') || '').trim()
    const next = new URLSearchParams(searchParams)
    if (value) next.set('search', value)
    else next.delete('search')
    next.delete('page'); setLoading(true); setError(''); setSearchParams(next)
  }
  const selectStatus = (nextStatus: AcademyStatus | 'ALL') => {
    const next = new URLSearchParams(searchParams)
    if (nextStatus === 'ALL') next.delete('status')
    else next.set('status', nextStatus)
    next.delete('page'); setLoading(true); setError(''); setSearchParams(next)
  }
  const totalPages = result ? Math.ceil(result.totalElements / result.size) : 0

  return <section className="admin-page">
    <div className="admin-heading"><div><p className="eyebrow">{t('platform.ownerPanel')}</p><h1>{t('common.academies')}</h1><p>{t('platform.academiesIntro')}</p></div><div className="admin-heading__count"><strong>{counts.ALL ?? '—'}</strong><span>{t('platform.totalAcademies')}</span></div></div>
    <div className="platform-toolbar">
      <div className="status-filters" role="tablist" aria-label={t('platform.academyStatus')}>{filters.map((filter) => <button key={filter.value} type="button" role="tab" aria-selected={status === filter.value} className={status === filter.value ? 'status-filter status-filter--active' : 'status-filter'} onClick={() => selectStatus(filter.value)}><span>{filter.label}</span><strong className="status-filter__count">{counts[filter.value] ?? '—'}</strong></button>)}</div>
      <form className="platform-search" onSubmit={applySearch}><input name="search" defaultValue={search} maxLength={200} placeholder={t('platform.academyName')} aria-label={t('platform.searchAcademy')}/><button className="button button--small" type="submit">{t('platform.search')}</button></form>
    </div>
    {error && <div className="alert alert--error" role="alert">{error}</div>}
    {loading ? <div className="list-state">{t('platform.loadingAcademies')}</div> : result?.items.length ? <div className="academy-admin-grid">{result.items.map((academy) => <Link className="academy-admin-card" to={`/platform/academies/${academy.id}`} key={academy.id}><div className="academy-admin-card__head"><span className={`status-pill status-pill--${academy.status.toLowerCase()}`}>{statusLabels[academy.status]}</span><span>→</span></div><h2>{academy.name}</h2><div className="academy-admin-card__metrics"><span><strong>{academy.playerCount}</strong> {t('platform.players')}</span><span><strong>{academy.groupCount}</strong> {t('platform.groups')}</span><span><strong>{academy.activeCoachCount}</strong> {t('platform.coaches')}</span></div><small>{academy.administrators[0]?.email || t('platform.noAdmin')}</small></Link>)}</div> : <div className="list-state"><strong>{t('platform.notFound')}</strong><span>{t('platform.changeSearch')}</span></div>}
    {totalPages > 1 && <nav className="pagination" aria-label={t('platform.pages')}><button className="button button--secondary button--small" disabled={page === 0} onClick={() => { const next = new URLSearchParams(searchParams); next.set('page', String(page - 1)); setLoading(true); setSearchParams(next) }}>{t('common.back')}</button><span>{t('common.pageOf', { page: page + 1, total: totalPages })}</span><button className="button button--secondary button--small" disabled={page + 1 >= totalPages} onClick={() => { const next = new URLSearchParams(searchParams); next.set('page', String(page + 1)); setLoading(true); setSearchParams(next) }}>{t('common.next')}</button></nav>}
  </section>
}
