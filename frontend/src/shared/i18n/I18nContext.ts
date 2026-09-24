import { createContext } from 'react'

export type Locale = 'kk' | 'ru' | 'en'

export type I18nValue = {
  locale: Locale
  intlLocale: string
  setLocale: (locale: Locale) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

export const I18nContext = createContext<I18nValue | null>(null)
