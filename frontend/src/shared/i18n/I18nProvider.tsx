import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { I18nContext, type Locale } from './I18nContext'
import { messages } from './messages'

const STORAGE_KEY = 'jastalant.locale'
const localeMap: Record<Locale, string> = { kk: 'kk-KZ', ru: 'ru-RU', en: 'en-US' }

function initialLocale(): Locale {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'kk' || stored === 'ru' || stored === 'en') return stored
  return navigator.language.toLowerCase().startsWith('kk') ? 'kk' : 'ru'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, updateLocale] = useState<Locale>(initialLocale)

  useEffect(() => {
    document.documentElement.lang = locale
    localStorage.setItem(STORAGE_KEY, locale)
  }, [locale])

  const setLocale = useCallback((nextLocale: Locale) => updateLocale(nextLocale), [])
  const t = useCallback((key: string, params: Record<string, string | number> = {}) => {
    let value = messages[locale][key as keyof typeof messages.ru] ?? messages.ru[key as keyof typeof messages.ru] ?? key
    Object.entries(params).forEach(([name, replacement]) => {
      value = value.replaceAll(`{${name}}`, String(replacement))
    })
    return value
  }, [locale])

  const value = useMemo(() => ({ locale, intlLocale: localeMap[locale], setLocale, t }), [locale, setLocale, t])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
