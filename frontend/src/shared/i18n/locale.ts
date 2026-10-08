import type { Locale } from './I18nContext.ts'

export const STORAGE_KEY = 'jastalant.locale'
export const localeMap: Record<Locale, string> = { kk: 'kk-KZ', ru: 'ru-RU', en: 'en-US' }

function supportedLocale(value: string | null | undefined): Locale | null {
  return value === 'kk' || value === 'ru' || value === 'en' ? value : null
}

export function initialLocale(): Locale {
  // Email links carry a validated language choice without changing the token.
  const linked = typeof location === 'undefined' ? null : supportedLocale(new URLSearchParams(location.search).get('lang'))
  if (linked) return linked
  try {
    const stored = typeof localStorage === 'undefined' ? null : supportedLocale(localStorage.getItem(STORAGE_KEY))
    if (stored) return stored
  } catch { /* Storage may be disabled by the browser. */ }
  const language = typeof navigator === 'undefined' ? 'ru' : navigator.language.toLowerCase().split('-')[0]
  return supportedLocale(language) || 'ru'
}

let currentLocale = initialLocale()

export function getCurrentLocale(): Locale {
  return currentLocale
}

export function setCurrentLocale(locale: Locale) {
  currentLocale = locale
}
