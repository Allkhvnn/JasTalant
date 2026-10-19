import { useEffect, useState, type FormEvent } from 'react'
import { academyActions, platformActions, getAudit, getAuditActors } from '../../entities/audit/api/auditApi'
import type { AuditActor, AuditPage as AuditResult } from '../../entities/audit/api/auditApi'
import { useAcademy } from '../../entities/academy/model/useAcademy'
import { useAuth } from '../../features/auth/model/useAuth'
import { errorMessage } from '../../shared/api/apiClient'
import { useI18n } from '../../shared/i18n/useI18n'

const PAGE_SIZE = 20

export function AcademyAuditPage() {
  const { academy, token } = useAcademy()
  return <AuditLog key={academy.id} token={token} path={`/api/academies/${academy.id}/audit`} platform={false} />
}

export function PlatformAuditPage() {
  const { token } = useAuth()
  return token ? <AuditLog token={token} path="/api/platform/audit" platform /> : null
}

function AuditLog({ token, path, platform }: { token: string; path: string; platform: boolean }) {
  const { t, intlLocale } = useI18n()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [refresh, setRefresh] = useState(0)
  const [dateError, setDateError] = useState(false)
  const [result, setResult] = useState<{ key: string; data?: AuditResult; error?: unknown }>({ key: '' })
  const [authors, setAuthors] = useState<AuditActor[]>([])
  const [authorError, setAuthorError] = useState<unknown>()
  const requestKey = `${path}|${page}|${query}|${refresh}`
  const loading = result.key !== requestKey
  const data = loading ? undefined : result.data
  const failure = loading ? undefined : result.error
  const actions = platform ? platformActions : academyActions
  const formatter = new Intl.DateTimeFormat(intlLocale, { dateStyle: 'medium', timeStyle: 'short' })

  useEffect(() => {
    let cancelled = false
    const params = new URLSearchParams(query)
    params.set('page', String(page)); params.set('size', String(PAGE_SIZE))
    getAudit(token, path, params.toString())
      .then((response) => { if (!cancelled) setResult({ key: requestKey, data: response }) })
      .catch((error: unknown) => { if (!cancelled) setResult({ key: requestKey, error }) })
    return () => { cancelled = true }
  }, [page, path, query, requestKey, token])

  useEffect(() => {
    let cancelled = false
    getAuditActors(token, path)
      .then((response) => { if (!cancelled) { setAuthors(response); setAuthorError(undefined) } })
      .catch((error: unknown) => { if (!cancelled) setAuthorError(error) })
    return () => { cancelled = true }
  }, [path, refresh, token])

  const apply = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const from = String(fields.get('from') || '')
    const to = String(fields.get('to') || '')
    setDateError(false)
    if (from && to && from > to) { setDateError(true); return }
    const params = new URLSearchParams()
    for (const name of ['action', 'actorId']) {
      const value = String(fields.get(name) || '')
      if (value) params.set(name, value)
    }
    // Date fields refer to the viewer's local calendar days. The API uses an exclusive upper bound.
    try {
      if (from) params.set('from', new Date(`${from}T00:00:00`).toISOString())
      if (to) {
        const until = new Date(`${to}T00:00:00`)
        until.setDate(until.getDate() + 1)
        params.set('until', until.toISOString())
      }
    } catch { setDateError(true); return }
    setPage(0); setQuery(params.toString()); setRefresh((value) => value + 1)
  }

  const totalPages = data ? Math.ceil(data.totalElements / PAGE_SIZE) : 0
  return <section className={platform ? 'admin-page audit-page' : 'workspace-page audit-page'}>
    <div className="admin-heading">
      <div><p className="eyebrow">{platform ? t('platform.ownerPanel') : t('academy.workspace')}</p>
        <h1>{t('audit.title')}</h1><p>{t(platform ? 'audit.platformIntro' : 'audit.academyIntro')}</p></div>
      <button className="button button--secondary button--small" type="button" onClick={() => setRefresh((value) => value + 1)}>{t('audit.refresh')}</button>
    </div>
    <form className="audit-filters" onSubmit={apply}>
      <label className="field"><span>{t('audit.action')}</span><select name="action" defaultValue="">
        <option value="">{t('audit.allActions')}</option>{actions.map((action) => <option key={action} value={action}>{t(`audit.action.${action}`)}</option>)}
      </select></label>
      <label className="field"><span>{t('audit.actor')}</span><select name="actorId" defaultValue="">
        <option value="">{t('audit.allActors')}</option>{authors.map((actor) => <option key={actor.id} value={actor.id}>{actor.name}</option>)}
      </select></label>
      <label className="field"><span>{t('audit.from')}</span><input name="from" type="date" /></label>
      <label className="field"><span>{t('audit.to')}</span><input name="to" type="date" /></label>
      <div className="audit-filters__actions">
        <button className="button button--small" type="submit">{t('audit.apply')}</button>
        <button className="button button--secondary button--small" type="reset" onClick={() => { setQuery(''); setPage(0); setDateError(false); setRefresh((value) => value + 1) }}>{t('audit.reset')}</button>
      </div>
    </form>
    {dateError && <div className="alert alert--error" role="alert">{t('audit.invalidDates')}</div>}
    {failure !== undefined && <div className="alert alert--error" role="alert">{errorMessage(failure)}</div>}
    {authorError !== undefined && <div className="alert alert--error" role="alert">{t('audit.actorsError')} {errorMessage(authorError)}</div>}
    {loading ? <div className="list-state" role="status">{t('common.loading')}</div> : data && <>
      <p className="audit-count" role="status">{t('audit.count', { count: data.totalElements })}</p>
      {data.items.length ? <div className="audit-table-wrap"><table className="audit-table">
        <thead><tr><th scope="col">{t('audit.date')}</th><th scope="col">{t('audit.actor')}</th><th scope="col">{t('audit.action')}</th><th scope="col">{t('audit.object')}</th></tr></thead>
        <tbody>{data.items.map((event) => <tr key={event.id}>
          <td><time dateTime={event.occurredAt}>{formatter.format(new Date(event.occurredAt))}</time></td>
          <td>{event.actorName}</td><td>{t(`audit.action.${event.action}`)}</td>
          <td>{event.action === 'PLAYERS_IMPORTED' ? t('audit.importCount', { count: event.targetName }) : event.targetName}</td>
        </tr>)}</tbody>
      </table></div> : <div className="list-state"><strong>{t('audit.empty')}</strong><span>{t('audit.emptyHint')}</span></div>}
      {totalPages > 1 && <nav className="pagination" aria-label={t('audit.pages')}>
        <button className="button button--secondary button--small" type="button" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>{t('common.back')}</button>
        <span>{t('common.pageOf', { page: page + 1, total: totalPages })}</span>
        <button className="button button--secondary button--small" type="button" disabled={page + 1 >= totalPages} onClick={() => setPage((value) => value + 1)}>{t('common.next')}</button>
      </nav>}
    </>}
    <p className="audit-note">{t('audit.note')}</p>
  </section>
}
