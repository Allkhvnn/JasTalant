import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { I18nContext, type Locale } from './I18nContext'
import { messages } from './messages'
import { getCurrentLocale, setCurrentLocale, STORAGE_KEY, localeMap } from './locale'

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, updateLocale] = useState<Locale>(getCurrentLocale)

  useEffect(() => {
    document.documentElement.lang = locale
    document.querySelector('meta[name="description"]')?.setAttribute('content', messages[locale]['site.description'])
    try { localStorage.setItem(STORAGE_KEY, locale) } catch { /* Storage may be disabled. */ }
  }, [locale])

  const setLocale = useCallback((nextLocale: Locale) => {
    setCurrentLocale(nextLocale)
    updateLocale(nextLocale)
  }, [])
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
