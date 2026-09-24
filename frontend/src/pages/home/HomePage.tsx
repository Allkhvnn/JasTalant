import { Link } from 'react-router-dom'
import { useAuth } from '../../features/auth/model/useAuth'
import { useI18n } from '../../shared/i18n/useI18n'
import { BrandMark } from '../../shared/ui/BrandMark'
import { LanguageSwitcher } from '../../shared/ui/LanguageSwitcher'

export function HomePage() {
  const { isAuthenticated } = useAuth()
  const { t } = useI18n()
  const features = [
    ['◉', 'home.feature.players', 'home.feature.playersText'], ['▦', 'home.feature.schedule', 'home.feature.scheduleText'],
    ['✓', 'home.feature.attendance', 'home.feature.attendanceText'], ['↗', 'home.feature.development', 'home.feature.developmentText'],
  ] as const
  const roles = [['01', 'home.role.admin', 'home.role.adminText'], ['02', 'home.role.coach', 'home.role.coachText'], ['03', 'home.role.parent', 'home.role.parentText']] as const
  const steps = [['01', 'home.step.one', 'home.step.oneText'], ['02', 'home.step.two', 'home.step.twoText'], ['03', 'home.step.three', 'home.step.threeText']] as const

  return <main className="landing-home">
    <section className="landing-hero" id="top">
      <header className="landing-nav">
        <Link className="landing-nav__brand" to="/" aria-label="JasTalant"><BrandMark /></Link>
        <nav className="landing-nav__links" aria-label="Landing navigation">
          <a href="#about">{t('home.nav.about')}</a>
          <div className="landing-nav__dropdown"><button type="button">{t('home.nav.features')} <span>⌄</span></button><div><a href="#features">{t('home.feature.players')}</a><a href="#features">{t('home.feature.attendance')}</a><a href="#features">{t('home.feature.development')}</a></div></div>
          <a href="#audience">{t('home.nav.audience')}</a><a href="#how-it-works">{t('home.nav.how')}</a>
        </nav>
        <div className="landing-nav__actions"><LanguageSwitcher compact />{isAuthenticated
          ? <Link className="landing-nav__login" to="/dashboard">{t('home.openDashboard')}</Link>
          : <><Link className="landing-nav__text-link" to="/login">{t('common.login')}</Link><Link className="landing-nav__login" to="/register">{t('common.connect')}</Link></>}</div>
      </header>
      <div className="landing-hero__content"><p className="landing-kicker"><span /> {t('home.kicker')}</p><h1>{t('home.title')}</h1><p>{t('home.subtitle')}</p><div className="landing-hero__actions"><Link className="landing-button landing-button--primary" to={isAuthenticated ? '/dashboard' : '/register'}>{isAuthenticated ? t('home.openDashboard') : t('common.connect')}</Link><a className="landing-button landing-button--ghost" href="#about">{t('home.learnMore')}</a></div></div>
      <a className="landing-scroll-cue" href="#about" aria-label={t('home.learnMore')}>↓</a>
    </section>

    <section className="landing-section landing-about" id="about"><div className="landing-section__heading"><p>{t('home.about.eyebrow')}</p><h2>{t('home.about.title')}</h2></div><p className="landing-about__text">{t('home.about.text')}</p></section>
    <section className="landing-section landing-section--tinted" id="features"><div className="landing-section__heading"><p>{t('home.features.eyebrow')}</p><h2>{t('home.features.title')}</h2></div><div className="landing-capability-grid">{features.map(([icon, title, text]) => <article key={title}><span>{icon}</span><h3>{t(title)}</h3><p>{t(text)}</p></article>)}</div></section>
    <section className="landing-section" id="audience"><div className="landing-section__heading"><p>{t('home.audience.eyebrow')}</p><h2>{t('home.audience.title')}</h2></div><div className="landing-role-grid">{roles.map(([number, title, text]) => <article key={title}><span>{number}</span><h3>{t(title)}</h3><p>{t(text)}</p></article>)}</div></section>
    <section className="landing-section landing-section--steps" id="how-it-works"><div className="landing-section__heading"><p>{t('home.how.eyebrow')}</p><h2>{t('home.how.title')}</h2></div><div className="landing-steps">{steps.map(([number, title, text]) => <article key={title}><span>{number}</span><div><h3>{t(title)}</h3><p>{t(text)}</p></div></article>)}</div></section>
    <section className="landing-section landing-faq"><div className="landing-section__heading"><p>FAQ</p><h2>{t('home.faq.title')}</h2></div><div>{(['one', 'two', 'three'] as const).map((key) => <details key={key}><summary>{t(`home.faq.${key}`)}<span>+</span></summary><p>{t(`home.faq.${key}Text`)}</p></details>)}</div></section>
    <section className="landing-final-cta"><div><h2>{t('home.cta.title')}</h2><p>{t('home.cta.text')}</p></div><Link className="landing-button landing-button--primary" to={isAuthenticated ? '/dashboard' : '/register'}>{isAuthenticated ? t('home.openDashboard') : t('common.connect')}</Link></section>
    <footer className="landing-footer"><BrandMark /><span>© 2026 JasTalant · Kazakhstan</span><a href="#top">↑</a></footer>
  </main>
}
