import type { Locale } from '../i18n/I18nContext'
import { useI18n } from '../i18n/useI18n'

const languages: Array<{ value: Locale; label: string }> = [
  { value: 'kk', label: 'ҚАЗ' },
  { value: 'ru', label: 'РУС' },
  { value: 'en', label: 'ENG' },
]

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useI18n()
  return (
    <div className={compact ? 'language-switcher language-switcher--compact' : 'language-switcher'} aria-label="Language">
      <select value={locale} aria-label="Language" onChange={(event) => setLocale(event.target.value as Locale)}>
        {languages.map((language) => <option value={language.value} key={language.value}>{language.label}</option>)}
      </select>
      {languages.map((language) => (
        <button key={language.value} type="button" className={locale === language.value ? 'active' : ''}
          aria-pressed={locale === language.value} onClick={() => setLocale(language.value)}>
          {language.label}
        </button>
      ))}
    </div>
  )
}
