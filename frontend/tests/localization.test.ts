import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { apiRequest, apiMultipartRequest, apiBlobRequest, ApiError, errorMessage } from '../src/shared/api/apiClient.ts'
import { getCurrentLocale, initialLocale, setCurrentLocale } from '../src/shared/i18n/locale.ts'
import { errorMessages, translateApiError } from '../src/shared/i18n/errorMessages.ts'
import { messages } from '../src/shared/i18n/messages.ts'

const originalFetch = globalThis.fetch
const originalLocale = getCurrentLocale()
afterEach(() => {
  globalThis.fetch = originalFetch
  setCurrentLocale(originalLocale)
})

test('an error retains its backend detail and can be translated after a language change', () => {
  const error = new ApiError(401, 'Invalid email or password')
  assert.equal(error.detail, 'Invalid email or password')
  setCurrentLocale('kk')
  assert.equal(errorMessage(error), 'Email немесе құпиясөз қате.')
  setCurrentLocale('en')
  assert.equal(errorMessage(error), 'Invalid email or password')
  setCurrentLocale('ru')
  assert.equal(errorMessage(error), 'Неверный email или пароль.')
})

test('JSON, multipart and download requests carry the selected language and keep Bearer authorization', async () => {
  for (const [locale, header] of [['ru', 'ru-RU'], ['kk', 'kk-KZ'], ['en', 'en-US']] as const) {
    setCurrentLocale(locale)
    globalThis.fetch = async (_input, options) => {
      assert.equal(new Headers(options?.headers).get('Accept-Language'), header)
      assert.equal(new Headers(options?.headers).get('Authorization'), 'Bearer test-token')
      return Response.json({ detail: 'Invitation has expired' }, { status: 400 })
    }
    const requests = [
      () => apiRequest('/api/test', { token: 'test-token', method: 'POST', body: {} }),
      () => apiMultipartRequest('/api/test', 'test-token', new FormData()),
      () => apiBlobRequest('/api/test', 'test-token'),
    ]
    for (const request of requests) {
      await assert.rejects(request, (error: unknown) => {
        assert.equal(errorMessage(error), errorMessages[locale]['Invitation has expired'])
        return true
      })
    }
  }
})

test('empty security responses, unknown server details and network failures have localized fallbacks', async () => {
  setCurrentLocale('kk')
  globalThis.fetch = async () => new Response('', { status: 403 })
  await assert.rejects(() => apiRequest('/api/test'), (error: unknown) => {
    assert.equal(errorMessage(error), 'Бұл әрекет үшін құқықтарыңыз жеткіліксіз.')
    return true
  })
  assert.equal(translateApiError('internal database details', 500, 'en'), 'The server returned error 500.')
  assert.equal(translateApiError('HTTP_ERROR', 502, 'ru'), 'Сервер вернул ошибку 502.')
  globalThis.fetch = async () => { throw new TypeError('fetch failed') }
  await assert.rejects(() => apiBlobRequest('/api/test', 'test-token'), (error: unknown) => {
    assert.equal(errorMessage(error), 'Серверге қосылу мүмкін болмады. Қайталап көріңіз.')
    return true
  })
})

test('all dictionaries have the same keys and placeholder parameters across languages', () => {
  const placeholders = (value: string) => [...value.matchAll(/\{(\w+)\}/g)].map((item) => item[1]).sort()
  for (const dictionaries of [messages, errorMessages]) {
    const ru = dictionaries.ru as Record<string, string>
    for (const locale of ['kk', 'en'] as const) {
      const translated = dictionaries[locale] as Record<string, string>
      assert.deepEqual(Object.keys(translated).sort(), Object.keys(ru).sort())
      for (const key of Object.keys(ru)) {
        assert.ok(translated[key].trim(), `${locale}:${key}`)
        assert.deepEqual(placeholders(translated[key]), placeholders(ru[key]), `${locale}:${key}`)
      }
    }
  }
})

test('email link language overrides saved language and invalid choices do not', () => {
  const originalLocation = Object.getOwnPropertyDescriptor(globalThis, 'location')
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  try {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => 'ru' } })
    Object.defineProperty(globalThis, 'location', { configurable: true, value: { search: '?token=untouched&lang=kk' } })
    assert.equal(initialLocale(), 'kk')
    Object.defineProperty(globalThis, 'location', { configurable: true, value: { search: '?lang=unsupported' } })
    assert.equal(initialLocale(), 'ru')
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => { throw new Error('blocked') } } })
    assert.ok(['ru', 'kk', 'en'].includes(initialLocale()))
  } finally {
    if (originalLocation) Object.defineProperty(globalThis, 'location', originalLocation)
    else Reflect.deleteProperty(globalThis, 'location')
    if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  }
})
