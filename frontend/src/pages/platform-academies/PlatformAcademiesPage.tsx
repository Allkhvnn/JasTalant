import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getPlatformAcademies } from '../../entities/platform-academy/api/platformAcademyApi'
import type { AcademyStatus, PlatformAcademyPage } from '../../entities/platform-academy/model/types'
import { useAuth } from '../../features/auth/model/useAuth'
import { errorMessage } from '../../shared/api/apiClient'

const PAGE_SIZE = 12
const filters: Array<{ value: AcademyStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'Все' }, { value: 'ACTIVE', label: 'Активные' },
  { value: 'SUSPENDED', label: 'Приостановлены' }, { value: 'ARCHIVED', label: 'В архиве' },
]
const statusLabels: Record<AcademyStatus, string> = {
  ACTIVE: 'Активна', SUSPENDED: 'Приостановлена', ARCHIVED: 'В архиве',
}

export function PlatformAcademiesPage() {
  const { token } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const rawStatus = searchParams.get('status')
  const status = filters.some((item) => item.value === rawStatus) ? rawStatus as AcademyStatus | 'ALL' : 'ALL'
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
    Promise.all(filters.map(async ({ value }) => [value, (await getPlatformAcademies(token, {
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
    <div className="admin-heading"><div><p className="eyebrow">Панель владельца</p><h1>Академии</h1><p>Контролируйте состояние организаций и просматривайте основные данные каждой академии.</p></div><div className="admin-heading__count"><strong>{counts.ALL ?? '—'}</strong><span>всего академий</span></div></div>
    <div className="platform-toolbar">
      <div className="status-filters" role="tablist" aria-label="Статус академии">{filters.map((filter) => <button key={filter.value} type="button" role="tab" aria-selected={status === filter.value} className={status === filter.value ? 'status-filter status-filter--active' : 'status-filter'} onClick={() => selectStatus(filter.value)}><span>{filter.label}</span><strong className="status-filter__count">{counts[filter.value] ?? '—'}</strong></button>)}</div>
      <form className="platform-search" onSubmit={applySearch}><input name="search" defaultValue={search} maxLength={200} placeholder="Название академии" aria-label="Поиск академии"/><button className="button button--small" type="submit">Найти</button></form>
    </div>
    {error && <div className="alert alert--error" role="alert">{error}</div>}
    {loading ? <div className="list-state">Загружаем академии…</div> : result?.items.length ? <div className="academy-admin-grid">{result.items.map((academy) => <Link className="academy-admin-card" to={`/platform/academies/${academy.id}`} key={academy.id}><div className="academy-admin-card__head"><span className={`status-pill status-pill--${academy.status.toLowerCase()}`}>{statusLabels[academy.status]}</span><span>→</span></div><h2>{academy.name}</h2><div className="academy-admin-card__metrics"><span><strong>{academy.playerCount}</strong> игроков</span><span><strong>{academy.groupCount}</strong> групп</span><span><strong>{academy.activeCoachCount}</strong> тренеров</span></div><small>{academy.administrators[0]?.email || 'Администратор не назначен'}</small></Link>)}</div> : <div className="list-state"><strong>Академии не найдены</strong><span>Измените фильтр или поисковый запрос.</span></div>}
    {totalPages > 1 && <nav className="pagination" aria-label="Страницы"><button className="button button--secondary button--small" disabled={page === 0} onClick={() => { const next = new URLSearchParams(searchParams); next.set('page', String(page - 1)); setLoading(true); setSearchParams(next) }}>Назад</button><span>{page + 1} из {totalPages}</span><button className="button button--secondary button--small" disabled={page + 1 >= totalPages} onClick={() => { const next = new URLSearchParams(searchParams); next.set('page', String(page + 1)); setLoading(true); setSearchParams(next) }}>Дальше</button></nav>}
  </section>
}
