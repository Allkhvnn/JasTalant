import { getCurrentLocale, localeMap } from '../i18n/locale.ts'
import { errorMessages, translateApiError } from '../i18n/errorMessages.ts'

type ApiRequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
  token?: string | null
}

type ProblemDetails = {
  title?: string
  detail?: string
  status?: number
}

// Keep backend details intact so the presentation layer can select the active language.

export class ApiError extends Error {
  readonly status: number
  readonly detail: string

  constructor(
    status: number,
    detail: string,
  ) {
    super(translateApiError(detail, status, getCurrentLocale()))
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { body, token, headers, ...requestOptions } = options
  const requestHeaders = new Headers(headers)
  requestHeaders.set('Accept-Language', localeMap[getCurrentLocale()])

  if (body !== undefined) {
    requestHeaders.set('Content-Type', 'application/json')
  }
  if (token) {
    requestHeaders.set('Authorization', `Bearer ${token}`)
  }

  let response: Response
  try {
    response = await fetch(path, {
      ...requestOptions,
      credentials: 'same-origin',
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR')
  }

  if (response.status === 204) {
    return undefined as T
  }

  const contentType = response.headers.get('content-type')?.toLowerCase() || ''
  const isJson = contentType.includes('application/json') || contentType.includes('+json')
  const payload = isJson ? ((await response.json()) as ProblemDetails | T) : await response.text()

  if (!response.ok) {
    const problem = typeof payload === 'object' && payload !== null ? (payload as ProblemDetails) : null
    const detail = problem?.detail || problem?.title || 'HTTP_ERROR'
    throw new ApiError(response.status, detail)
  }

  return payload as T
}

export async function apiMultipartRequest<T>(path: string, token: string, formData: FormData, method = 'PUT'): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: { Authorization: `Bearer ${token}`, 'Accept-Language': localeMap[getCurrentLocale()] },
      body: formData,
    })
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR')
  }
  if (!response.ok) await throwResponseError(response)
  return response.json() as Promise<T>
}

export async function apiBlobRequest(path: string, token: string): Promise<Blob> {
  let response: Response
  try {
    response = await fetch(path, { credentials: 'same-origin', headers: { Authorization: `Bearer ${token}`, 'Accept-Language': localeMap[getCurrentLocale()] } })
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR')
  }
  if (!response.ok) await throwResponseError(response)
  return response.blob()
}

async function throwResponseError(response: Response): Promise<never> {
  const contentType = response.headers.get('content-type')?.toLowerCase() || ''
  const payload = contentType.includes('json') ? await response.json() as ProblemDetails : null
  const detail = payload?.detail || payload?.title || 'HTTP_ERROR'
  throw new ApiError(response.status, detail)
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return translateApiError(error.detail, error.status, getCurrentLocale())
  }
  return errorMessages[getCurrentLocale()].UNKNOWN_ERROR
}
