import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useI18n } from '../i18n/useI18n'

export function MobileMenu({ title, children }: {
  title?: string
  children: ReactNode | ((close: () => void) => ReactNode)
}) {
  const { t } = useI18n()
  const id = useId()
  const dialog = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  useEffect(() => {
    const element = dialog.current
    if (!open) {
      if (element?.open) element.close()
      return
    }
    if (!element?.open) element?.showModal()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const desktop = window.matchMedia('(min-width: 981px)')
    const onResize = () => { if (desktop.matches) setOpen(false) }
    desktop.addEventListener('change', onResize)
    return () => {
      document.body.style.overflow = previousOverflow
      desktop.removeEventListener('change', onResize)
    }
  }, [open])

  return <div className="mobile-menu">
    <button className="mobile-menu__trigger" type="button" aria-label={t('layout.openMenu')}
      aria-expanded={open} aria-controls={id} aria-haspopup="dialog"
      onClick={() => setOpen(true)}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
    <dialog ref={dialog} id={id} className="mobile-menu__dialog" aria-labelledby={`${id}-title`}
      onClose={() => setOpen(false)} onClick={(event) => {
        if (event.target === event.currentTarget || (event.target instanceof Element && event.target.closest('a'))) close()
      }}>
      <div className="mobile-menu__panel">
        <div className="mobile-menu__heading">
          <strong id={`${id}-title`}>{title || t('layout.navigation')}</strong>
          <button type="button" className="mobile-menu__close" onClick={close} aria-label={t('layout.closeMenu')}>×</button>
        </div>
        <div className="mobile-menu__content">{typeof children === 'function' ? children(close) : children}</div>
      </div>
    </dialog>
  </div>
}
